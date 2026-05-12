from __future__ import annotations

# Split decorations on .hideout import: editor palette vs everything else.

from typing import Any

from hideout_core.config.constants import (
    FLYING_SAND_HASH,
    MOSS_EDGE_3_HASH,
    ROPE_TEMPLATE_HASH,
)

# Object hash as in the editor (icons) -> default fv in the palette
_EDITOR_PALETTE_HASH_TO_FV: dict[int, int] = {
    FLYING_SAND_HASH: 0,
    MOSS_EDGE_3_HASH: 2,
    ROPE_TEMPLATE_HASH: 3,
}


def is_editor_palette_exact_doodad(spec: dict[str, Any]) -> bool:
    # Same hash+fv as rope/moss/sand tools in the palette (no icon -> no match).
    try:
        h = int(spec["hash"])
    except (KeyError, TypeError, ValueError):
        return False
    want_fv = _EDITOR_PALETTE_HASH_TO_FV.get(h)
    if want_fv is None:
        return False
    fv_raw = spec.get("fv")
    if fv_raw is None:
        return False
    try:
        got = int(fv_raw)
    except (TypeError, ValueError):
        return False
    return got == want_fv


def split_decoration_pairs_for_hideout_import(
    decoration_pairs: list[tuple[str, dict[str, Any]]],
) -> tuple[
    list[tuple[str, dict[str, Any]]],
    list[tuple[str, dict[str, Any]]],
    bool,
]:
    # Other decorations vs palette-exact; bool = whether a third layer is needed.
    # Palette layer is created only when both "other" (not palette / different fv) and
    # palette-matching hash+fv decorations exist; otherwise all decorations stay on layer 1.
    if not decoration_pairs:
        return [], [], False
    other: list[tuple[str, dict[str, Any]]] = []
    exact: list[tuple[str, dict[str, Any]]] = []
    for pair in decoration_pairs:
        if is_editor_palette_exact_doodad(pair[1]):
            exact.append(pair)
        else:
            other.append(pair)
    if not other or not exact:
        return list(decoration_pairs), [], False
    return other, exact, True

