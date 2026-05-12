from __future__ import annotations

# Layer-0 template doodad names from template_hideout_json (SQLite).

import json


def doodad_template_ordered_names_ru_from_hideout_json(
    raw: str | None,
) -> list[str]:
    # Doodad names in first-seen order within doodads_pairs.
    if raw is None or not str(raw).strip():
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    seq = data.get("doodads_pairs")
    if not isinstance(seq, list):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for item in seq:
        if isinstance(item, (list, tuple)) and len(item) >= 1:
            nm = str(item[0]).strip()
            if not nm:
                continue
            key = nm.casefold()
            if key in seen:
                continue
            seen.add(key)
            out.append(nm)
    return out


def doodad_names_casefold_set_from_template_hideout_json(
    raw: str | None,
) -> frozenset[str]:
    return frozenset(
        n.casefold()
        for n in doodad_template_ordered_names_ru_from_hideout_json(raw)
    )
