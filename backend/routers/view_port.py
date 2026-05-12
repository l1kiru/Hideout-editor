from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from backend.schemas.scene import BoundaryModel
from backend.services.scene_convert import boundary_to_xy_tuples
from hideout_core.rope_paint.view import CameraViewTransform, zone_view_limits_with_pad

router = APIRouter(prefix="/view", tags=["view"])


class ZoneLimitsRequest(BaseModel):
    boundary: BoundaryModel
    camera_deg: float


@router.post("/zone-limits")
def zone_limits(body: ZoneLimitsRequest) -> dict[str, float]:
    xy = boundary_to_xy_tuples(body.boundary)
    xf = CameraViewTransform(max(-180.0, min(180.0, float(body.camera_deg))))
    lims = zone_view_limits_with_pad(xy, xf)
    if lims is None:
        return {"xmin": 0.0, "xmax": 1.0, "ymin": 0.0, "ymax": 1.0}
    xmin, xmax, ymin, ymax = lims
    return {
        "xmin": float(xmin),
        "xmax": float(xmax),
        "ymin": float(ymin),
        "ymax": float(ymax),
    }
