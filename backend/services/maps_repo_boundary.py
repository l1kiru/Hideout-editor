from __future__ import annotations

import json
from typing import Any

from backend.services.maps_sqlite import db_conn, init_db


def get_boundary_order_doc(map_id: int) -> dict[str, Any] | None:
    init_db()
    with db_conn() as c:
        r = c.execute(
            "SELECT boundary_json FROM map_boundaries WHERE map_id=?",
            (map_id,),
        ).fetchone()
        if not r:
            return None
        return json.loads(r["boundary_json"])


def save_boundary_order(
    map_id: int,
    doc: dict[str, Any],
    *,
    template_hideout_json: str | None = None,
    clear_template: bool = False,
) -> None:
    init_db()
    text = json.dumps(doc, ensure_ascii=False, indent=2) + "\n"
    if clear_template:
        conflict_tpl = "template_hideout_json = NULL"
        tpl_bind: str | None = None
    else:
        conflict_tpl = """template_hideout_json = CASE
                WHEN excluded.template_hideout_json IS NOT NULL
                THEN excluded.template_hideout_json
                ELSE map_boundaries.template_hideout_json
              END"""
        tpl_bind = template_hideout_json
    with db_conn() as c:
        c.execute(
            f"""
            INSERT INTO map_boundaries (map_id, boundary_json, template_hideout_json, updated_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(map_id) DO UPDATE SET
              boundary_json = excluded.boundary_json,
              updated_at = excluded.updated_at,
              {conflict_tpl}
            """,
            (map_id, text, tpl_bind),
        )


def get_map_template_hideout_json(map_id: int) -> str | None:
    init_db()
    with db_conn() as c:
        r = c.execute(
            "SELECT template_hideout_json FROM map_boundaries WHERE map_id=?",
            (map_id,),
        ).fetchone()
        if not r:
            return None
        raw = r["template_hideout_json"]
        return None if raw is None else str(raw)
