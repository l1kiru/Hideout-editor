from __future__ import annotations

# PoE2 hideout object categories in SQLite: layer 0 (permanent/optional) vs 1 (decorations).

from typing import Any

from backend.services.maps_sqlite import (
    POE2_NAME_CF_COLUMNS,
    db_conn,
    init_db,
)

_LAYER0_CATEGORY_CASEFOLD = frozenset({
    "постоянные",
    "опциональные",
    "npcs",
    "нпс",
})


def normalize_doodad_name(name: str) -> str:
    return str(name).strip().casefold()


def category_to_layer_index(category: str) -> int:
    if str(category).strip().casefold() in _LAYER0_CATEGORY_CASEFOLD:
        return 0
    return 1


def layer_index_for_doodad_name(name: str) -> int:
    # Unknown names and the Decorations catalog category map to layer 1.
    cf = normalize_doodad_name(name)
    if not cf:
        return 1
    init_db()
    where_expr = " OR ".join(f"{col} = ?" for col in POE2_NAME_CF_COLUMNS)
    with db_conn() as c:
        row = c.execute(
            f"""
            SELECT category FROM poe2_hideout_objects
            WHERE {where_expr}
            LIMIT 1
            """,
            [cf] * len(POE2_NAME_CF_COLUMNS),
        ).fetchone()
    if row is None:
        return 1
    return category_to_layer_index(str(row["category"]))


def _name_layer_map_for_normalized_names(
    keys: set[str],
) -> dict[str, int]:
    # Normalized name (RU or EN) -> 0 | 1 for keys present in the lookup set.
    if not keys:
        return {}
    init_db()
    ch = list(keys)
    ph = ",".join("?" * len(ch))
    where_expr = " OR ".join(f"{col} IN ({ph})" for col in POE2_NAME_CF_COLUMNS)
    selected_cols = ", ".join([*POE2_NAME_CF_COLUMNS, "category"])
    out: dict[str, int] = {}
    with db_conn() as c:
        rows = c.execute(
            f"""
            SELECT {selected_cols} FROM poe2_hideout_objects
            WHERE {where_expr}
            """,
            ch * len(POE2_NAME_CF_COLUMNS),
        ).fetchall()
        for r in rows:
            lyr = category_to_layer_index(str(r["category"]))
            for col in POE2_NAME_CF_COLUMNS:
                value_cf = str(r[col]).strip() if r[col] is not None else ""
                if value_cf:
                    out[value_cf] = lyr
    return out


def split_pairs_by_layer(
    pairs: list[tuple[str, dict[str, Any]]],
) -> tuple[list[tuple[str, dict[str, Any]]], list[tuple[str, dict[str, Any]]]]:
    # Split doodad pairs by DB catalog (unknown -> layer 1).
    # If the catalog table is empty (no seed yet), all pairs stay on layer 0.
    if not pairs:
        return [], []
    init_db()
    with db_conn() as c:
        row = c.execute("SELECT COUNT(*) AS n FROM poe2_hideout_objects").fetchone()
        cnt = int(row["n"]) if row is not None else 0
    if cnt == 0:
        return list(pairs), []
    keys = {normalize_doodad_name(n) for n, _ in pairs}
    keys.discard("")
    nl = _name_layer_map_for_normalized_names(keys)
    layer0: list[tuple[str, dict[str, Any]]] = []
    layer1: list[tuple[str, dict[str, Any]]] = []
    for n, d in pairs:
        cf = normalize_doodad_name(n)
        ly = nl.get(cf, 1)
        if ly == 0:
            layer0.append((n, d))
        else:
            layer1.append((n, d))
    return layer0, layer1

