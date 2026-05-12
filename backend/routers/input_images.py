from __future__ import annotations

# User background image directory: files live under settings.input_images_dir (resolved from
# repo root so backend cwd does not matter) and are served at /input/images/{name}. This
# router adds writes: GET /api/input-images, POST /api/input-images/upload,
# DELETE /api/input-images/{name}.

import re
from pathlib import Path

from fastapi import APIRouter, File, UploadFile

from hideout_core.config.settings import settings
from backend.services.api_errors import api_error

router = APIRouter(prefix="/input-images", tags=["input_images"])

_ALLOWED_EXTS = {".png", ".jpg", ".jpeg", ".jfif", ".webp", ".gif", ".svg"}
_SAFE_NAME_RE = re.compile(r"^[\w\-. ()\[\]\u0400-\u04FF]+$", re.UNICODE)
_MAX_UPLOAD_BYTES = settings.max_upload_size_bytes

# Image directory is resolved from repo root to match vite/dist static serving
# (backend cwd may be backend/, not the repo root).
_REPO_ROOT = Path(__file__).resolve().parents[2]


def _images_root() -> Path:
    raw = Path(settings.input_images_dir)
    p = raw if raw.is_absolute() else (_REPO_ROOT / raw)
    p.mkdir(parents=True, exist_ok=True)
    return p


def _validate_safe_name(raw_name: str) -> str:
    base = Path(raw_name).name.strip()
    if not base:
        raise api_error(
            status_code=400,
            code="input_images.empty_name",
            detail="Имя файла пустое",
        )
    if not _SAFE_NAME_RE.match(base):
        raise api_error(
            status_code=400,
            code="input_images.invalid_name",
            detail="Недопустимое имя файла (разрешены буквы/цифры/.-_ ()[])",
        )
    if Path(base).suffix.lower() not in _ALLOWED_EXTS:
        raise api_error(
            status_code=400,
            code="input_images.unsupported_extension",
            detail=(
                "Неподдерживаемое расширение. Разрешено: "
                + ", ".join(sorted(_ALLOWED_EXTS))
            ),
            params={"exts": ", ".join(sorted(_ALLOWED_EXTS))},
        )
    return base


def _list_image_filenames(root: Path) -> list[str]:
    items: list[str] = []
    if not root.is_dir():
        return items
    for entry in root.iterdir():
        if entry.is_file() and entry.suffix.lower() in _ALLOWED_EXTS:
            items.append(entry.name)
    items.sort(key=str.casefold)
    return items


@router.get("")
def list_input_images() -> list[str]:
    return _list_image_filenames(_images_root())


@router.post("/upload")
async def upload_input_image(
    file: UploadFile = File(...),
) -> dict[str, str]:
    name = _validate_safe_name(file.filename or "")
    raw = await file.read()
    if len(raw) == 0:
        raise api_error(
            status_code=400,
            code="input_images.empty_file",
            detail="Файл пуст",
        )
    if len(raw) > _MAX_UPLOAD_BYTES:
        raise api_error(
            status_code=413,
            code="input_images.upload_too_large",
            detail="Файл слишком большой",
            params={"max_bytes": _MAX_UPLOAD_BYTES},
        )
    target = _images_root() / name
    target.write_bytes(raw)
    return {"name": name}


@router.delete("/{name}")
def delete_input_image(name: str) -> dict[str, str]:
    safe = _validate_safe_name(name)
    target = _images_root() / safe
    if not target.is_file():
        raise api_error(
            status_code=404,
            code="input_images.file_not_found",
            detail="Файл не найден",
            params={"name": safe},
        )
    target.unlink()
    return {"deleted": safe}
