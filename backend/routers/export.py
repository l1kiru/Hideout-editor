from __future__ import annotations

import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.schemas.scene import SceneModel
from backend.services import maps_repo
from backend.services import export_svc
from backend.services.api_errors import api_error

router = APIRouter(prefix="/export", tags=["export"])
logger = logging.getLogger(__name__)


def _resolve_map_id(scene: SceneModel) -> int | None:
    name = (scene.hideout_map_display_name or "").strip()
    if not name:
        return None
    try:
        maps_repo.init_db()
        for row in maps_repo.list_maps():
            dn = str(row.get("display_name") or "").strip()
            if dn.casefold() == name.casefold():
                return int(row["id"])
    except (TypeError, ValueError, KeyError):
        return None
    return None


@router.post("/hideout")
def export_hideout(scene: SceneModel) -> StreamingResponse:
    map_id = _resolve_map_id(scene)
    template_id = scene.template.template_id
    try:
        data, meta = export_svc.export_hideout_bytes(scene)
        logger.info(
            "export_hideout_ok",
            extra={
                "map_id": map_id,
                "template_id": template_id,
                "batches_exported": meta.get("batches_exported"),
                "placements_exported": meta.get("placements_exported"),
            },
        )
    except KeyError as e:
        logger.warning(
            "export_hideout_failed",
            extra={
                "map_id": map_id,
                "template_id": template_id,
                "reason": str(e),
            },
        )
        detail = str(e)
        code = "export.failed"
        params: dict[str, str] = {}
        if "template_id" in detail:
            code = "export.template_missing"
            part = detail.split("template_id=")[-1].strip("'\"")
            params = {"template_id": part}
        raise api_error(
            status_code=400,
            code=code,
            detail=detail,
            params=params,
        ) from e
    except Exception as e:  # noqa: BLE001
        logger.exception(
            "export_hideout_failed",
            extra={
                "map_id": map_id,
                "template_id": template_id,
                "reason": str(e),
            },
        )
        raise api_error(
            status_code=500,
            code="export.failed",
            detail=str(e),
            params={"template_id": template_id},
        ) from e

    fname = str(meta.get("filename", "export.hideout"))
    return StreamingResponse(
        iter([data]),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{fname}"',
            "X-Batches-Exported": str(meta["batches_exported"]),
            "X-Placements-Exported": str(meta["placements_exported"]),
        },
    )
