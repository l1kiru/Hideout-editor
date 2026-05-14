from __future__ import annotations

# Import boundary from JSON (boundary_order) and parse .hideout uploads.

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, UploadFile

from backend.schemas.hideout_boundary import (
    BoundaryOrderPublish,
    HideoutPlacementOut,
    HideoutPlacementsParsed,
)
from backend.schemas.scene import XY, BoundaryModel
from backend.services import maps_repo
from backend.services.hideout_placements_svc import (
    boundary_order_document,
    hideout_dict_from_upload_text_prefer_ordered,
)
from backend.services.api_errors import api_error
from hideout_core.config.settings import settings

router = APIRouter(prefix="/boundary", tags=["boundary"])

_MAX_BYTES = settings.max_upload_size_bytes // 6  # Smaller limit for boundary files


def _points_from_boundary_dict(raw: dict[str, Any]) -> list[XY]:
    seq = raw.get("points")
    if not isinstance(seq, list):
        raise api_error(
            status_code=400,
            code="boundary.points_key_required",
            detail="Нужен ключ points (массив)",
        )
    out: list[XY] = []
    for item in seq:
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            out.append(XY(x=int(item[0]), y=int(item[1])))
        elif isinstance(item, dict) and "x" in item and "y" in item:
            out.append(XY(x=int(item["x"]), y=int(item["y"])))
    if len(out) < 3:
        raise api_error(
            status_code=400,
            code="boundary.need_min_3_vertices",
            detail="Нужно минимум 3 вершины",
        )
    return out


@router.post("/validate")
def validate_boundary(b: BoundaryModel) -> dict[str, int | bool]:
    pts = list(b.points)
    if len(pts) < 3:
        raise api_error(
            status_code=400,
            code="boundary.need_min_3_vertices",
            detail="Нужно минимум 3 вершины",
        )
    return {"vertex_count": len(pts), "validated": True}


@router.post("/upload-json-file", response_model=BoundaryModel)
async def upload_boundary_json_file(
    file: UploadFile = File(...),
) -> BoundaryModel:
    if not file.filename or not file.filename.lower().endswith(".json"):
        raise api_error(
            status_code=400,
            code="boundary.expected_json",
            detail="Ожидается .json",
        )
    raw_b = await file.read()
    if len(raw_b) > _MAX_BYTES:
        raise api_error(
            status_code=413,
            code="maps.upload_too_large",
            detail="Файл слишком большой",
            params={"max_bytes": _MAX_BYTES},
        )
    try:
        text = raw_b.decode("utf-8-sig")
        data = json.loads(text)
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise api_error(
            status_code=400,
            code="boundary.invalid_json",
            detail=f"Некорректный JSON: {e}",
            params={"reason": str(e)},
        ) from e
    if not isinstance(data, dict):
        raise api_error(
            status_code=400,
            code="boundary.json_root_object_required",
            detail="Корень JSON должен быть объектом",
        )
    pts = _points_from_boundary_dict(data)
    return BoundaryModel(points=pts)


def _guess_hideout_extensions(filename: str) -> bool:
    lower = filename.lower()
    return lower.endswith(".hideout") or lower.endswith(".json")


@router.post("/parse-hideout-placements", response_model=HideoutPlacementsParsed)
async def parse_hideout_placements(
    file: UploadFile = File(...),
) -> HideoutPlacementsParsed:
    if not file.filename or not _guess_hideout_extensions(file.filename):
        raise api_error(
            status_code=400,
            code="boundary.expected_hideout_or_json",
            detail="Ожидается файл .hideout или JSON",
        )
    raw_b = await file.read()
    if len(raw_b) > _MAX_BYTES:
        raise api_error(
            status_code=413,
            code="maps.upload_too_large",
            detail="Файл слишком большой",
            params={"max_bytes": _MAX_BYTES},
        )
    try:
        text = raw_b.decode("utf-8-sig")
        data = hideout_dict_from_upload_text_prefer_ordered(text)
    except (UnicodeDecodeError, ValueError, json.JSONDecodeError) as e:
        raise api_error(
            status_code=400,
            code="boundary.invalid_file",
            detail=f"Некорректный файл: {e}",
            params={"reason": str(e)},
        ) from e
    rows_in = data.get("_placements_ordered")
    if not isinstance(rows_in, list):
        raise api_error(
            status_code=400,
            code="boundary.placements_extract_failed",
            detail="Не удалось извлечь размещения doodads",
        )
    placements = [HideoutPlacementOut.model_validate(r) for r in rows_in]
    return HideoutPlacementsParsed(
        hideout_hash=data.get("hideout_hash"),
        placements=placements,
    )


@router.post("/publish-hideout-map")
def publish_boundary_order(body: BoundaryOrderPublish) -> dict[str, Any]:
    if len(body.points) < 3:
        raise api_error(
            status_code=400,
            code="boundary.need_min_3_for_editor",
            detail="Для основного редактора нужно минимум 3 вершины",
        )
    name = body.map_display_name.strip()
    if not name:
        raise api_error(
            status_code=400,
            code="boundary.map_name_required",
            detail="Укажите название карты",
        )

    if body.map_id is not None:
        m = maps_repo.get_map_by_id(int(body.map_id))
        if not m:
            raise api_error(
                status_code=404,
                code="maps.map_not_found",
                detail="Карта не найдена",
                params={"map_id": int(body.map_id)},
            )
        if str(m["display_name"]).strip().casefold() != name.casefold():
            raise api_error(
                status_code=400,
                code="boundary.map_name_mismatch",
                detail=(
                    "Имя карты не совпадает с выбранной для сохранения картой — "
                    "смена имени сбрасывает привязку к записи в базе."
                ),
            )
    else:
        if maps_repo.get_map_by_name(name) is not None:
            raise api_error(
                status_code=400,
                code="boundary.map_name_exists",
                detail="Карта с таким именем уже существует. Укажите другое имя.",
            )
        try:
            m = maps_repo.create_map(name, allow_existing=False)
        except ValueError as e:
            raise api_error(
                status_code=400,
                code="maps.invalid_request",
                detail=str(e),
            ) from e

    mid = int(m["id"])
    hideout_hash_doc: Any = body.hideout_hash
    if m.get("is_base"):
        hh_db = m.get("export_hideout_hash")
        if hh_db is not None:
            hideout_hash_doc = int(hh_db)
    doc = boundary_order_document(
        [(int(p.x), int(p.y)) for p in body.points],
        source_hideout=body.source_hideout,
        marker_name=body.marker_name,
        marker_hash=body.marker_hash,
        hideout_hash=hideout_hash_doc,
    )
    tpl_json: str | None = None
    clear_template = False
    if body.placements is not None:
        if len(body.placements) > 0:
            shell: dict[str, Any] = {}
            if m.get("is_base"):
                maps_repo.merge_export_meta_into_shell(m, shell)
            if "hideout_name" not in shell and body.source_hideout:
                shell["hideout_name"] = Path(body.source_hideout).name
            if "hideout_hash" not in shell and body.hideout_hash is not None:
                try:
                    shell["hideout_hash"] = int(body.hideout_hash)
                except (TypeError, ValueError):
                    shell["hideout_hash"] = body.hideout_hash
            pairs_lc = [
                (
                    p.name,
                    {
                        "hash": int(p.hash),
                        "x": int(p.x),
                        "y": int(p.y),
                        "r": int(p.r),
                        "fv": int(p.fv),
                    },
                )
                for p in body.placements
            ]
            tpl_json = json.dumps(
                {"meta_shell": shell, "doodads_pairs": [[n, d] for n, d in pairs_lc]},
                ensure_ascii=False,
            )
        else:
            clear_template = True
    maps_repo.save_boundary_order(
        mid,
        doc,
        template_hideout_json=tpl_json,
        clear_template=clear_template,
    )
    if body.create_as_base_map:
        edn = body.export_hideout_display_name
        if edn is None or not str(edn).strip():
            if body.source_hideout:
                edn = Path(str(body.source_hideout)).stem
            else:
                edn = m["display_name"]
        edn_s = str(edn).strip()
        ehash: int | None = None
        if body.hideout_hash is not None:
            try:
                ehash = int(body.hideout_hash)
            except (TypeError, ValueError):
                ehash = None
        maps_repo.promote_map_to_base(
            mid,
            export_hideout_display_name=edn_s,
            export_hideout_hash=ehash,
        )
        m = maps_repo.get_map_by_id(mid) or m
    return {
        "written": True,
        "map_id": mid,
        "display_name": m["display_name"],
        "sqlite": str(settings.hideout_maps_sqlite),
    }
