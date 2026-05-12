from __future__ import annotations

from typing import Any, Callable

from backend.services.maps_sqlite import db_conn, init_db


def save_editor_scene_json(
    map_id: int,
    json_text: str,
    *,
    get_map_by_id: Callable[[int], dict[str, Any] | None],
) -> None:
    init_db()
    m = get_map_by_id(map_id)
    if not m:
        raise ValueError("Карта не найдена")
    if m["is_base"]:
        raise ValueError(
            "Базовую карту нельзя изменять в редакторе — создайте дочернюю карту для рисования",
        )
    with db_conn() as c:
        c.execute(
            "UPDATE hideout_maps SET editor_scene_json=? WHERE id=?",
            (json_text, map_id),
        )


def get_editor_scene_json(map_id: int) -> str | None:
    init_db()
    with db_conn() as c:
        r = c.execute(
            "SELECT editor_scene_json FROM hideout_maps WHERE id=?",
            (map_id,),
        ).fetchone()
        if not r:
            return None
        raw = r["editor_scene_json"]
        return None if raw is None else str(raw)
