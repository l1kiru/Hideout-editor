from __future__ import annotations

import sqlite3
from collections import deque

from backend.services.maps_sqlite import db_conn, init_db


def _subtree_map_ids_conn(c: sqlite3.Connection, root_id: int) -> list[int]:
    seen: set[int] = set()
    out: list[int] = []
    q = deque([root_id])
    while q:
        mid = q.popleft()
        if mid in seen:
            continue
        seen.add(mid)
        out.append(mid)
        for r in c.execute(
            "SELECT id FROM hideout_maps WHERE forked_from_map_id=?",
            (mid,),
        ):
            q.append(int(r["id"]))
    return out


def _delete_map_ids_in_safe_order(c: sqlite3.Connection, ids: list[int]) -> None:
    remaining = set(ids)
    while remaining:
        has_child_in_remaining: set[int] = set()
        for mid in remaining:
            for r in c.execute(
                "SELECT id FROM hideout_maps WHERE forked_from_map_id=?",
                (mid,),
            ):
                cid = int(r["id"])
                if cid in remaining:
                    has_child_in_remaining.add(mid)
                    break
        leaves = remaining - has_child_in_remaining
        if not leaves:
            lid = next(iter(remaining))
            c.execute("DELETE FROM hideout_maps WHERE id=?", (lid,))
            remaining.discard(lid)
            continue
        for lid in leaves:
            c.execute("DELETE FROM hideout_maps WHERE id=?", (lid,))
            remaining.discard(lid)


def delete_map_by_id(map_id: int) -> bool:
    init_db()
    with db_conn() as c:
        row = c.execute("SELECT id FROM hideout_maps WHERE id=?", (map_id,)).fetchone()
        if not row:
            return False
        ids = _subtree_map_ids_conn(c, map_id)
        _delete_map_ids_in_safe_order(c, ids)
        return True
