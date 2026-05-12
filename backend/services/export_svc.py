from __future__ import annotations

# Assemble .hideout bytes from scene + current template.

import tempfile
from pathlib import Path

from hideout_core.rope_paint.export import build_export_document

from backend.schemas.scene import SceneModel
from backend.services import maps_repo
from backend.services import template_store as store
from backend.services.maps_sqlite import db_conn, init_db
from backend.services.scene_convert import scene_batches_for_hideout_export
from hideout_core.io.hideout_io import write_hideout_ordered


def _effective_base_display_casefold(scene: SceneModel) -> str | None:
    # Base map display_name (casefold) when scene targets a base map or a fork under it.
    init_db()
    candidates: list[str] = []
    if scene.lineage_base_display_name:
        candidates.append(str(scene.lineage_base_display_name).strip())
    if scene.hideout_map_display_name:
        candidates.append(str(scene.hideout_map_display_name).strip())
    with db_conn() as c:
        for cand in candidates:
            if not cand:
                continue
            row = c.execute(
                """
                SELECT display_name FROM hideout_maps
                WHERE is_base = 1 AND display_name = ? COLLATE NOCASE
                LIMIT 1
                """,
                (cand,),
            ).fetchone()
            if row:
                return str(row["display_name"]).strip().casefold()
    return None


def _meta_shell_for_export(scene: SceneModel, meta_shell: dict) -> dict:
    out = dict(meta_shell)
    eff = _effective_base_display_casefold(scene)
    if not eff:
        return out
    db_meta = maps_repo.export_hideout_meta_for_base_display_casefold(eff)
    if not db_meta:
        raise ValueError(
            "Для базовой карты в SQLite не заданы export_hideout_display_name "
            "или export_hideout_hash — выполните миграцию / init_db.",
        )
    hn, hh = db_meta
    out["hideout_name"] = hn
    out["hideout_hash"] = hh
    return out


def export_hideout_bytes(scene: SceneModel) -> tuple[bytes, dict[str, int | str]]:
    stored = store.get(scene.template.template_id)
    if not stored:
        raise KeyError(f"Неизвестный template_id={scene.template.template_id}")

    default_map_batches, paint_batches = scene_batches_for_hideout_export(scene)
    shell = _meta_shell_for_export(scene, stored["meta_shell"])
    merged = build_export_document(
        shell,
        stored["doodads_pairs"],
        paint_batches,
        int(scene.tool.fv),
        default_map_batches=default_map_batches,
    )
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".hideout", delete=False, encoding="utf-8",
    ) as f:
        p = Path(f.name)
    try:
        write_hideout_ordered(p, merged)
        data = p.read_bytes()
    finally:
        p.unlink(missing_ok=True)

    export_batches = (
        [*default_map_batches, *paint_batches]
        if default_map_batches is not None
        else paint_batches
    )
    meta: dict[str, int | str] = {
        "batches_exported": len(export_batches),
        "placements_exported": sum(b.count() for b in export_batches),
        "filename": "ropes_generated.hideout",
    }
    return data, meta
