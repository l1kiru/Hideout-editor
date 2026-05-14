# Build merged hideout document for rope paint export.

from __future__ import annotations

from typing import Any

from hideout_core.config.constants import (
    EXCLUDE_FROM_OUTPUT,
    ROT_FULL,
)
from hideout_core.config.editor_assets import export_fv_for_batch, export_name_for_batch
from hideout_core.rope_paint.paint_data import PaintedBatch


# Appends batch placements as doodad pairs (same shape as manual editor strokes).
def append_painted_batch_as_doodads(
    new_pairs: list[tuple[str, dict[str, Any]]],
    batch: PaintedBatch,
    fv: int,
) -> None:
    tpl_hash = batch.template_hash
    th = int(tpl_hash)
    export_name = export_name_for_batch(
        th,
        int(batch.facet_fv) if batch.facet_fv is not None else None,
    ) or batch.template_name_ru
    eff_fv = export_fv_for_batch(
        th,
        batch_facet_fv=int(batch.facet_fv) if batch.facet_fv is not None else None,
        scene_tool_fv=int(fv),
    )
    for bx, by, br in batch.placements:
        out_r = int(br) % ROT_FULL
        new_pairs.append(
            (
                export_name,
                {
                    "hash": tpl_hash,
                    "x": bx,
                    "y": by,
                    "r": out_r,
                    "fv": eff_fv,
                },
            )
        )


# Returns meta_shell merged with doodads for writing.
# If default_map_batches is set (editor layer 0 / map objects), template doodads are not copied;
# those batches replace them with current x/y/r. Otherwise base_doodads is copied then painted_batches appended.
def build_export_document(
    meta_shell: dict[str, Any],
    base_doodads: list[tuple[str, dict]],
    painted_batches: list[PaintedBatch],
    fv: int,
    *,
    default_map_batches: list[PaintedBatch] | None = None,
) -> dict[str, Any]:
    new_pairs: list[tuple[str, dict[str, Any]]] = []

    if default_map_batches is not None:
        for batch in default_map_batches:
            append_painted_batch_as_doodads(new_pairs, batch, fv)
    else:
        for name, spec in base_doodads:
            if name in EXCLUDE_FROM_OUTPUT:
                continue
            new_pairs.append((name, dict(spec)))

    for batch in painted_batches:
        append_painted_batch_as_doodads(new_pairs, batch, fv)

    merged = dict(meta_shell)
    merged["doodads"] = new_pairs
    return merged
