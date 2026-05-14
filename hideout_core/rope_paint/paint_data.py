# Layout and batch types for doodad export.

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class PaintedBatch:
    template_name_ru: str
    template_hash: int
    placements: list[tuple[int, int, int]]
    facet_fv: int | None = None
    line_stroke: bool | None = None

    def count(self) -> int:
        return len(self.placements)
