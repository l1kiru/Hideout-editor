from __future__ import annotations

# CRUD for hideout maps and reading boundary_order from SQLite.

import json
import tempfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, Response, UploadFile

from hideout_core.config.settings import settings

from backend.schemas.hideout_map import HideoutMapCreate, HideoutMapOut
from backend.schemas.scene import TemplateLoadResponse
from backend.services import maps_repo
from backend.services.base_map_template_doodad_names import (
    doodad_template_ordered_names_ru_from_hideout_json,
)
from backend.services.hideout_template_ingest import (
    extract_hideout_shell_and_pairs,
    ingest_doodads_pairs,
)
from backend.services.api_errors import api_error

router = APIRouter(prefix="/maps", tags=["maps"])

_MAX_UPLOAD_BYTES = settings.max_upload_size_bytes


@router.get("", response_model=list[HideoutMapOut])
def list_hideout_maps() -> list[HideoutMapOut]:
    maps_repo.init_db()
    return [HideoutMapOut.model_validate(m) for m in maps_repo.list_maps()]


@router.get("/{map_id}/layer0-doodad-names", response_model=list[str])
def layer0_doodad_names(map_id: int) -> list[str]:
    # Layer-0 template doodad names from template_hideout_json (empty if missing).
    maps_repo.init_db()
    if maps_repo.get_map_by_id(map_id) is None:
        raise api_error(
            status_code=404,
            code="maps.map_not_found",
            detail="Карта не найдена",
            params={"map_id": map_id},
        )
    raw = maps_repo.get_map_template_hideout_json(map_id)
    return doodad_template_ordered_names_ru_from_hideout_json(raw)


@router.post("", response_model=HideoutMapOut)
def create_hideout_map(body: HideoutMapCreate) -> HideoutMapOut:
    maps_repo.init_db()
    try:
        m = maps_repo.create_map(body.display_name)
    except ValueError as e:
        raise api_error(
            status_code=400,
            code="maps.invalid_request",
            detail=str(e),
        ) from e
    summary = maps_repo.hideout_map_summary(int(m["id"]))
    return HideoutMapOut.model_validate(summary)


@router.post("/from-hideout-on-base", response_model=HideoutMapOut)
async def create_map_from_hideout_on_base_route(
    base_map_id: int = Form(),
    file: UploadFile = File(...),
    display_name: str | None = Form(default=None),
) -> HideoutMapOut:
    # New map from filename or display_name: base boundary, doodads from .hideout.
    maps_repo.init_db()
    fn = file.filename or ""
    if not fn.lower().endswith(".hideout"):
        raise api_error(
            status_code=400,
            code="maps.invalid_hideout_extension",
            detail="Ожидается файл .hideout",
        )
    raw = await file.read()
    if len(raw) > _MAX_UPLOAD_BYTES:
        raise api_error(
            status_code=413,
            code="maps.upload_too_large",
            detail="Файл слишком большой",
            params={"max_bytes": _MAX_UPLOAD_BYTES},
        )

    tmp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            suffix=".hideout",
            delete=False,
        ) as tf:
            tmp_path = Path(tf.name)
            tf.write(raw)
        assert tmp_path is not None
        shell, pairs = extract_hideout_shell_and_pairs(tmp_path)
        stem = (display_name or "").strip() or None
        summary = maps_repo.create_map_from_hideout_on_base(
            base_map_id=base_map_id,
            meta_shell=shell,
            doodads_pairs=pairs,
            display_name_stem=stem,
            filename_for_default_stem=Path(fn).name,
        )
        return HideoutMapOut.model_validate(summary)
    except ValueError as e:
        raise api_error(
            status_code=400,
            code="maps.invalid_request",
            detail=str(e),
        ) from e
    finally:
        if tmp_path is not None:
            tmp_path.unlink(missing_ok=True)


@router.post("/{map_id}/load-template", response_model=TemplateLoadResponse)
def load_map_template(map_id: int) -> TemplateLoadResponse:
    # Register the map's stored .hideout template from map_boundaries.template_hideout_json.
    maps_repo.init_db()
    m = maps_repo.get_map_by_id(map_id)
    if not m:
        raise api_error(
            status_code=404,
            code="maps.map_not_found",
            detail="Карта не найдена",
            params={"map_id": map_id},
        )
    raw_tpl = maps_repo.get_map_template_hideout_json(map_id)
    if raw_tpl:
        try:
            data = json.loads(raw_tpl)
            meta = dict(data.get("meta_shell") or {})
            seq = data.get("doodads_pairs") or []
            pairs: list[tuple[str, dict[str, Any]]] = []
            for item in seq:
                if (
                    isinstance(item, (list, tuple))
                    and len(item) >= 2
                    and isinstance(item[1], dict)
                ):
                    pairs.append((str(item[0]), dict(item[1])))
            if pairs:
                stable_tid = f"map_tpl_{map_id}"
                return ingest_doodads_pairs(
                    meta,
                    pairs,
                    template_id_override=stable_tid,
                )
        except (json.JSONDecodeError, TypeError, ValueError, KeyError):
            pass
    raise api_error(
        status_code=404,
        code="maps.template_missing",
        detail="Для этой карты нет сохранённого .hideout-шаблона — загрузите .hideout вручную",
    )


@router.post("/{map_id}/duplicate", response_model=HideoutMapOut)
def duplicate_hideout_map_route(map_id: int, body: HideoutMapCreate) -> HideoutMapOut:
    maps_repo.init_db()
    try:
        m = maps_repo.duplicate_hideout_map(map_id, body.display_name)
    except ValueError as e:
        raise api_error(
            status_code=400,
            code="maps.invalid_request",
            detail=str(e),
        ) from e
    return HideoutMapOut.model_validate(m)


@router.put("/{map_id}/editor-scene", status_code=204)
def put_editor_scene(map_id: int, body: dict[str, Any]) -> Response:
    maps_repo.init_db()
    if maps_repo.get_map_by_id(map_id) is None:
        raise api_error(
            status_code=404,
            code="maps.map_not_found",
            detail="Карта не найдена",
            params={"map_id": map_id},
        )
    text = json.dumps(body, ensure_ascii=False)
    if len(text.encode("utf-8")) > settings.max_editor_scene_json_bytes:
        raise api_error(
            status_code=413,
            code="maps.scene_too_large",
            detail="Сцена слишком большая",
            params={"max_bytes": settings.max_editor_scene_json_bytes},
        )
    try:
        maps_repo.save_editor_scene_json(map_id, text)
    except ValueError as e:
        raise api_error(
            status_code=400,
            code="maps.invalid_request",
            detail=str(e),
        ) from e
    return Response(status_code=204)


@router.get("/{map_id}/editor-scene")
def get_editor_scene(map_id: int) -> dict[str, Any]:
    maps_repo.init_db()
    if maps_repo.get_map_by_id(map_id) is None:
        raise api_error(
            status_code=404,
            code="maps.map_not_found",
            detail="Карта не найдена",
            params={"map_id": map_id},
        )
    raw = maps_repo.get_editor_scene_json(map_id)
    if raw is None:
        raise api_error(
            status_code=404,
            code="maps.scene_not_found",
            detail="Сохранённой сцены для этой карты нет",
        )
    try:
        out = json.loads(raw)
    except json.JSONDecodeError as e:
        raise api_error(
            status_code=500,
            code="maps.scene_corrupted",
            detail="Повреждённые данные сцены в базе",
        ) from e
    if not isinstance(out, dict):
        raise api_error(
            status_code=500,
            code="maps.scene_not_object",
            detail="Сцена в базе не объект JSON",
        )
    return out


@router.delete("/{map_id}", status_code=204)
def delete_hideout_map(map_id: int) -> Response:
    maps_repo.init_db()
    try:
        deleted = maps_repo.delete_map_by_id(map_id)
    except ValueError as e:
        raise api_error(
            status_code=400,
            code="maps.invalid_request",
            detail=str(e),
        ) from e
    if not deleted:
        raise api_error(
            status_code=404,
            code="maps.map_not_found",
            detail="Карта не найдена",
            params={"map_id": map_id},
        )
    return Response(status_code=204)


@router.get("/{map_id}/boundary-order")
def get_boundary_order_for_map(map_id: int) -> dict[str, Any]:
    maps_repo.init_db()
    m = maps_repo.get_map_by_id(map_id)
    if not m:
        raise api_error(
            status_code=404,
            code="maps.map_not_found",
            detail="Карта не найдена",
            params={"map_id": map_id},
        )
    doc = maps_repo.get_boundary_order_doc(map_id)
    if not doc:
        raise api_error(
            status_code=404,
            code="maps.boundary_not_found",
            detail="Для этой карты ещё нет разметки границы",
            params={"map_id": map_id},
        )
    return doc


@router.get("/{map_id}/meta")
def get_map_meta(map_id: int) -> dict[str, Any]:
    maps_repo.init_db()
    if maps_repo.get_map_by_id(map_id) is None:
        raise api_error(
            status_code=404,
            code="maps.map_not_found",
            detail="Карта не найдена",
            params={"map_id": map_id},
        )
    summary = maps_repo.hideout_map_summary(map_id)
    has_b = maps_repo.get_boundary_order_doc(map_id) is not None
    return {**summary, "has_boundary": has_b}
