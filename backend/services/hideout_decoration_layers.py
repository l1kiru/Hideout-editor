from __future__ import annotations

# Split decorations on .hideout import: editor palette vs everything else.

from typing import Any

from hideout_core.config.editor_assets import (
    is_palette_exact_doodad_spec,
)

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
        if is_palette_exact_doodad_spec(pair[1]):
            exact.append(pair)
        else:
            other.append(pair)
    if not other or not exact:
        return list(decoration_pairs), [], False
    return other, exact, True

