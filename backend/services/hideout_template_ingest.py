from __future__ import annotations

# Parse .hideout path and register in template_store (RAM + disk cache).

from pathlib import Path
from typing import Any

from hideout_core.io.hideout_io import load_hideout_ordered

from backend.schemas.scene import (
    PaintedBatchModel,
    TemplateLoadResponse,
    XY,
    XYZRPlacement,
)
from backend.services import template_store as store
from backend.services.hideout_decoration_layers import (
    split_decoration_pairs_for_hideout_import,
)
from backend.services.poe2_object_catalog import split_pairs_by_layer
from backend.services.scene_convert import dots_from_doodads


def painted_batches_from_doodad_pairs(
    pairs: list[tuple[str, dict[str, Any]]],
) -> list[PaintedBatchModel]:
    # Editor batches built from doodad (name, spec) pairs from .hideout.
    return _batches_from_doodads_pairs(pairs)


def _batches_from_doodads_pairs(pairs: list) -> list[PaintedBatchModel]:
    out: list[PaintedBatchModel] = []
    for item in pairs:
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            continue
        name_raw, spec = item[0], item[1]
        if not isinstance(spec, dict):
            continue
        try:
            h = int(spec["hash"])
            x = int(spec["x"])
            y = int(spec["y"])
            r = int(spec.get("r", 0))
        except (KeyError, TypeError, ValueError):
            continue
        fv_raw = spec.get("fv")
        fv: int | None
        try:
            fv = int(fv_raw) if fv_raw is not None else None
        except (TypeError, ValueError):
            fv = None
        line_raw = spec.get("line_stroke")
        line_stroke = bool(line_raw) if line_raw is not None else False
        out.append(
            PaintedBatchModel(
                template_name_ru=str(name_raw),
                template_hash=h,
                placements=[XYZRPlacement(x=x, y=y, r=r)],
                facet_fv=fv,
                line_stroke=line_stroke,
            ),
        )
    return out


def ingest_doodads_pairs(
    meta_shell: dict[str, Any],
    doodads_pairs: list[tuple[str, dict]],
    *,
    template_id_override: str | None = None,
) -> TemplateLoadResponse:
    tid = store.put(
        meta_shell,
        doodads_pairs,
        template_id_override=template_id_override,
    )
    dots_xy = dots_from_doodads(doodads_pairs)
    layer0_pairs, layer1_pairs = split_pairs_by_layer(
        list(doodads_pairs),
    )
    default_batches = _batches_from_doodads_pairs(layer0_pairs)
    deco_other, deco_palette, split_deco = split_decoration_pairs_for_hideout_import(
        layer1_pairs,
    )
    if split_deco:
        decorations_batches = _batches_from_doodads_pairs(deco_other)
        decorations_palette_batches = _batches_from_doodads_pairs(deco_palette)
    else:
        decorations_batches = _batches_from_doodads_pairs(layer1_pairs)
        decorations_palette_batches = []
    hn = meta_shell.get("hideout_name")
    hh_int: int | None = None
    try:
        v = meta_shell.get("hideout_hash")
        if v is not None:
            hh_int = int(v)
    except (TypeError, ValueError):
        hh_int = None

    return TemplateLoadResponse(
        template_id=tid,
        hideout_name=str(hn) if hn is not None else None,
        hideout_hash=hh_int,
        doodads_kept_count=len(doodads_pairs),
        dots=[XY(x=x, y=y) for x, y in dots_xy],
        default_layer_batches=default_batches,
        decorations_layer_batches=decorations_batches,
        decorations_palette_layer_batches=decorations_palette_batches,
    )


def ingest_hideout_path(
    path: Path,
    *,
    template_id_override: str | None = None,
) -> TemplateLoadResponse:
    if not path.is_file():
        raise FileNotFoundError(str(path))

    meta = load_hideout_ordered(path)

    pairs = meta.get("doodads", [])
    if not isinstance(pairs, list):
        raise ValueError("Некорректный формат doodads")

    shell = {k: meta[k] for k in meta if k != "doodads"}
    pairs_norm = [(str(n), dict(s)) for n, s in pairs]
    return ingest_doodads_pairs(
        shell,
        pairs_norm,
        template_id_override=template_id_override,
    )


def extract_hideout_shell_and_pairs(path: Path) -> tuple[dict[str, Any], list[tuple[str, dict[str, Any]]]]:
    # Parse .hideout: metadata (no doodads) plus (name, spec) pairs for SQLite storage.
    meta = load_hideout_ordered(path)
    pairs = meta.get("doodads", [])
    if not isinstance(pairs, list) or not pairs:
        raise ValueError("В файле нет doodads или список пуст")
    shell = {k: meta[k] for k in meta if k != "doodads"}
    pairs_norm: list[tuple[str, dict[str, Any]]] = []
    for item in pairs:
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            continue
        n, s = item[0], item[1]
        if not isinstance(s, dict):
            continue
        pairs_norm.append((str(n), dict(s)))
    if not pairs_norm:
        raise ValueError("Не удалось разобрать ни одного doodad из файла")
    return shell, pairs_norm
