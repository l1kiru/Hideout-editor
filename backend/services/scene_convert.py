from __future__ import annotations

# Convert JSON scene payloads into rope_paint domain structures.

from hideout_core.config.constants import EXCLUDE_FROM_OUTPUT
from hideout_core.rope_paint.paint_data import PaintedBatch

from backend.schemas.scene import BoundaryModel, PaintedBatchModel, SceneModel, XYZRPlacement


def boundary_to_xy_tuples(b: BoundaryModel) -> list[tuple[int, int]]:
    return [(int(p.x), int(p.y)) for p in b.points]


def placements_to_domain(pls: list[XYZRPlacement]) -> list[tuple[int, int, int]]:
    return [(p.x, p.y, p.r) for p in pls]


def scene_to_flat_painted_batches(scene: SceneModel) -> list[PaintedBatch]:
    # All layers (including hidden-from-canvas); bottom-to-top matches layers[] order.
    # Otherwise toggling layer visibility for preview would drop objects from .hideout export.
    out: list[PaintedBatch] = []
    for layer in scene.layers:
        for batch in layer.batches:
            out.append(
                PaintedBatch(
                    template_name_ru=batch.template_name_ru,
                    template_hash=int(batch.template_hash),
                    placements=placements_to_domain(batch.placements),
                    facet_fv=batch.facet_fv,
                    line_stroke=batch.line_stroke,
                )
            )
    return out


def scene_batches_for_hideout_export(
    scene: SceneModel,
) -> tuple[list[PaintedBatch] | None, list[PaintedBatch]]:
    # Split batches for .hideout export: if layer 0 has any placement, map doodads come
    # from layer 0 (moves export); layers 1+ append. Otherwise same as scene_to_flat_painted_batches.
    layers = scene.layers
    if not layers:
        return None, []

    layer0 = layers[0]
    has_layer0_placements = any(len(b.placements) > 0 for b in layer0.batches)

    def to_batch(batch: PaintedBatchModel) -> PaintedBatch:
        return PaintedBatch(
            template_name_ru=batch.template_name_ru,
            template_hash=int(batch.template_hash),
            placements=placements_to_domain(batch.placements),
            facet_fv=batch.facet_fv,
            line_stroke=batch.line_stroke,
        )

    if not has_layer0_placements:
        return None, scene_to_flat_painted_batches(scene)

    map_batches = [to_batch(b) for b in layer0.batches]
    rest: list[PaintedBatch] = []
    for layer in layers[1:]:
        for batch in layer.batches:
            rest.append(to_batch(batch))
    return map_batches, rest


def dots_from_doodads(doodads_pairs: list[tuple[str, dict]]) -> list[tuple[int, int]]:
    tpl_d: list[tuple[int, int]] = []
    for name, spec in doodads_pairs:
        if name in EXCLUDE_FROM_OUTPUT:
            continue
        if isinstance(spec, dict) and "x" in spec and "y" in spec:
            tpl_d.append((int(spec["x"]), int(spec["y"])))
    return tpl_d

