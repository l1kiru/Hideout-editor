from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.schemas.scene import BoundaryModel
from backend.services.scene_convert import boundary_to_xy_tuples
from hideout_core.geometry.polygon_zone import point_allowed

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("/cli-reference")
def cli_reference() -> dict[str, object]:
    # Web-only project: desktop/GUI utilities were removed from the distribution.
    return {
        "mode": "web-only",
        "message": "Используйте React-интерфейс и FastAPI. Отдельные desktop/Qt/Tk режимы удалены.",
    }


class PointAllowedRequest(BaseModel):
    world_x: float
    world_y: float
    margin: float = Field(ge=0.0)
    boundary: BoundaryModel


@router.post("/point-allowed")
def point_allowed_endpoint(body: PointAllowedRequest) -> dict[str, bool]:
    xi = int(round(body.world_x))
    yi = int(round(body.world_y))
    b = boundary_to_xy_tuples(body.boundary)
    ok = point_allowed(xi, yi, boundary=b, margin=float(body.margin))
    return {"allowed": ok}
