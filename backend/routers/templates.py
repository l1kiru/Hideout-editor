from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, File, UploadFile

from backend.schemas.scene import TemplateLoadResponse
from backend.services.api_errors import api_error
from backend.services.hideout_template_ingest import ingest_hideout_path
from hideout_core.config.settings import settings

router = APIRouter(prefix="/templates", tags=["templates"])

_MAX_BYTES = settings.max_upload_size_bytes


@router.post("/upload", response_model=TemplateLoadResponse)
async def upload_hideout(file: UploadFile = File(...)) -> TemplateLoadResponse:
    if not file.filename or not file.filename.lower().endswith(".hideout"):
        raise api_error(
            status_code=400,
            code="templates.expected_hideout",
            detail="Ожидается файл .hideout",
        )
    raw = await file.read()
    if len(raw) > _MAX_BYTES:
        raise api_error(
            status_code=413,
            code="templates.upload_too_large",
            detail="Файл слишком большой",
            params={"max_bytes": _MAX_BYTES},
        )

    with tempfile.NamedTemporaryFile(mode="wb", suffix=".hideout", delete=False) as f:
        p = Path(f.name)
        f.write(raw)
    try:
        try:
            return ingest_hideout_path(p)
        except (OSError, ValueError) as e:
            raise api_error(
                status_code=400,
                code="templates.invalid_hideout",
                detail=f"Некорректный hideout: {e}",
                params={"reason": str(e)},
            ) from e
    finally:
        p.unlink(missing_ok=True)
