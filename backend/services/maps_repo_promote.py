from __future__ import annotations

from backend.services.maps_sqlite import db_conn, init_db


def promote_map_to_base(
    map_id: int,
    *,
    export_hideout_display_name: str | None,
    export_hideout_hash: int | None,
) -> None:
    init_db()
    with db_conn() as c:
        row = c.execute(
            "SELECT is_base, base_priority FROM hideout_maps WHERE id=?",
            (map_id,),
        ).fetchone()
        if not row:
            raise ValueError("Карта не найдена")
        is_already = bool(int(row["is_base"]))
        if is_already:
            c.execute(
                """
                UPDATE hideout_maps SET
                  export_hideout_display_name=?,
                  export_hideout_hash=?
                WHERE id=?
                """,
                (export_hideout_display_name, export_hideout_hash, map_id),
            )
            return
        rmax = c.execute(
            "SELECT COALESCE(MAX(base_priority), -1) AS m FROM hideout_maps WHERE is_base=1",
        ).fetchone()
        next_pri = int(rmax["m"]) + 1 if rmax and rmax["m"] is not None else 0
        c.execute(
            """
            UPDATE hideout_maps SET is_base=1, base_priority=?,
              export_hideout_display_name=?,
              export_hideout_hash=?
            WHERE id=?
            """,
            (
                next_pri,
                export_hideout_display_name,
                export_hideout_hash,
                map_id,
            ),
        )
