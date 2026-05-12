# Layout and batch types for doodad export.

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class PaintedBatch:
    template_name_ru: str
    template_hash: int
    placements: list[tuple[int, int, int]]
    facet_fv: int | None = None
    line_stroke: bool | None = None

    def count(self) -> int:
        return len(self.placements)


@dataclass
class PaintLayer:
    visible: bool = True
    locked: bool = False
    title: str = "Layer"
    batches: list[PaintedBatch] = field(default_factory=list)
