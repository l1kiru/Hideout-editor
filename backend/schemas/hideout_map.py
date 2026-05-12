from __future__ import annotations

# Pydantic models for hideout maps stored in SQLite.

from pydantic import BaseModel, Field


class HideoutMapCreate(BaseModel):
    display_name: str = Field(..., min_length=1)


class HideoutMapOut(BaseModel):
    id: int
    display_name: str
    created_at: str
    has_boundary: bool = False
    is_base: bool = False
    base_priority: int | None = None
    forked_from_map_id: int | None = None
    lineage_base_display_name: str | None = None
    export_hideout_display_name: str | None = None
    export_hideout_hash: int | None = None
