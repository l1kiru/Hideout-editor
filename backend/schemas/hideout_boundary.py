from __future__ import annotations

# Parsed .hideout payload for the boundary-map UI.

from typing import Any

from pydantic import BaseModel, Field

from backend.schemas.scene import XY


class HideoutPlacementOut(BaseModel):
    seq: int
    name: str
    hash: int = Field(..., description="поле hash из doodad")
    x: int
    y: int
    r: int = Field(default=0, description="ориентация из doodad (.hideout)")
    fv: int = Field(
        default=0,
        description="facet variant — влияет на вид объекта в игре",
    )


class HideoutPlacementsParsed(BaseModel):
    hideout_hash: str | int | None = None
    placements: list[HideoutPlacementOut]


class BoundaryOrderPublish(BaseModel):
    # Save boundary_order: bind to hideout map name and persist to SQLite.

    points: list[XY]
    map_display_name: str = Field(
        ...,
        min_length=1,
        description="Название карты («Убежище в каналах», …), к которой относится эта разметка",
    )
    map_id: int | None = Field(
        default=None,
        description=(
            "Если задано — обновить эту карту (повторное сохранение). "
            "Иначе создаётся новая запись; имя не должно совпадать с уже существующей картой."
        ),
    )
    marker_name: str | None = None
    marker_hash: int | None = None
    source_hideout: str | None = None
    hideout_hash: Any = None
    placements: list[HideoutPlacementOut] | None = Field(
        default=None,
        description=(
            "Все doodads из загруженного .hideout — при записи попадают в SQLite и подхватываются редактором."
        ),
    )
    create_as_base_map: bool = Field(
        default=False,
        description=(
            "После сохранения разметки пометить карту как базовую проекта (тип «Базовая карта»)."
        ),
    )
    export_hideout_display_name: str | None = Field(
        default=None,
        description=(
            "Имя в шапке экспортируемого .hideout; если не задано — по имени файла или карты."
        ),
    )
