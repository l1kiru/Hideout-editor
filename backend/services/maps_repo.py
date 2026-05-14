from __future__ import annotations

# SQLite CRUD: named hideout maps <-> JSON boundary_order (vertex chain).

import copy
import json
import sqlite3
from pathlib import Path
from typing import Any

from backend.schemas.scene import (
    BoundaryModel,
    PaintLayerModel,
    SceneModel,
    TemplateRefModel,
    XY,
)
from backend.services.hideout_decoration_layers import (
    split_decoration_pairs_for_hideout_import,
)
from backend.services.hideout_template_ingest import painted_batches_from_doodad_pairs
from backend.services.poe2_object_catalog import split_pairs_by_layer
from backend.services.maps_sqlite import db_conn, init_db
from backend.services.scene_convert import dots_from_doodads
from backend.services.maps_repo_boundary import (
    get_boundary_order_doc as get_boundary_order_doc_impl,
    get_map_template_hideout_json as get_map_template_hideout_json_impl,
    save_boundary_order as save_boundary_order_impl,
)
from backend.services.maps_repo_delete import delete_map_by_id as delete_map_by_id_impl
from backend.services.maps_repo_promote import (
    promote_map_to_base as promote_map_to_base_impl,
)
from backend.services.maps_repo_scene import (
    get_editor_scene_json as get_editor_scene_json_impl,
    save_editor_scene_json as save_editor_scene_json_impl,
)


def _reject_reserved_base_map_name(name: str) -> None:
    stripped = name.strip()
    init_db()
    with db_conn() as c:
        row = c.execute(
            """
            SELECT 1 FROM hideout_maps
            WHERE is_base = 1 AND display_name = ? COLLATE NOCASE
            LIMIT 1
            """,
            (stripped,),
        ).fetchone()
    if row:
        raise ValueError(
            f"Имя «{stripped}» зарезервировано для карты типа «Базовая карта»",
        )


def _list_maps_sort_key(rec: dict[str, Any]) -> tuple[Any, ...]:
    if rec["is_base"]:
        bp = rec.get("base_priority")
        return (
            0,
            bp if bp is not None else 999_999,
            rec["display_name"].casefold(),
        )
    return (1, rec["display_name"].casefold())


def _lineage_base_display_name(
    by_id: dict[int, dict[str, Any]],
    map_id: int,
) -> str | None:
    # "Forked from …" label: nearest base map along forked_from_map_id chain.
    row = by_id.get(map_id)
    if not row or row["is_base"]:
        return None
    pid = row.get("forked_from_map_id")
    hops = 0
    while pid is not None and hops < 64:
        hops += 1
        parent = by_id.get(pid)
        if not parent:
            return None
        if parent["is_base"]:
            return parent["display_name"]
        pid = parent.get("forked_from_map_id")
    return None


def list_maps() -> list[dict[str, Any]]:
    init_db()
    with db_conn() as c:
        rows = c.execute(
            """
            SELECT m.id, m.display_name, m.created_at, m.is_base,
              m.base_priority,
              m.forked_from_map_id,
              m.export_hideout_display_name, m.export_hideout_hash,
              EXISTS(SELECT 1 FROM map_boundaries b WHERE b.map_id = m.id) AS has_boundary
            FROM hideout_maps m
            ORDER BY m.id
            """,
        ).fetchall()

    by_id: dict[int, dict[str, Any]] = {}
    out_rows: list[dict[str, Any]] = []
    for r in rows:
        mid = int(r["id"])
        fk_raw = r["forked_from_map_id"]
        fk = None if fk_raw is None else int(fk_raw)
        edn = r["export_hideout_display_name"]
        eh = r["export_hideout_hash"]
        bp_raw = r["base_priority"]
        bp = None if bp_raw is None else int(bp_raw)
        rec = {
            "id": mid,
            "display_name": str(r["display_name"]),
            "created_at": str(r["created_at"]),
            "is_base": bool(int(r["is_base"])),
            "base_priority": bp,
            "forked_from_map_id": fk,
            "has_boundary": bool(r["has_boundary"]),
            "export_hideout_display_name": (
                None if edn is None else str(edn)
            ),
            "export_hideout_hash": None if eh is None else int(eh),
        }
        by_id[mid] = rec
        out_rows.append(rec)

    for rec in out_rows:
        rec["lineage_base_display_name"] = _lineage_base_display_name(
            by_id,
            rec["id"],
        )

    out_rows.sort(key=_list_maps_sort_key)
    return out_rows


def hideout_map_summary(map_id: int) -> dict[str, Any]:
    for m in list_maps():
        if int(m["id"]) == int(map_id):
            return dict(m)
    raise RuntimeError(f"Карта id={map_id} не найдена после операции")


def create_map(display_name: str, *, allow_existing: bool = True) -> dict[str, Any]:
    name = display_name.strip()
    if not name:
        raise ValueError("Пустое имя карты")
    _reject_reserved_base_map_name(name)
    init_db()
    ex = get_map_by_name(name)
    if ex:
        if allow_existing:
            return ex
        raise ValueError(
            f"Карта с именем «{name}» уже существует — укажите другое имя.",
        )
    with db_conn() as c:
        cur = c.execute(
            "INSERT INTO hideout_maps (display_name, is_base) VALUES (?, 0)",
            (name,),
        )
        mid = int(cur.lastrowid)
    g = get_map_by_id(mid)
    if not g:
        raise RuntimeError("INSERT hideout_maps не вернул строку")
    return g


def pick_unique_map_display_name(stem: str, *, filename_fallback: str) -> str:
    # Unique map name from stem or filename; avoids collisions with SQLite.
    raw = (stem or "").strip()
    base_src = raw if raw else filename_fallback
    base_part = (
        Path(base_src).stem
        if str(base_src).lower().endswith((".hideout", ".json"))
        else Path(base_src).name
    )
    base = base_part.strip() or "hideout-import"
    for ch in '<>:"/\\|?*':
        base = base.replace(ch, "_")
    if not base.strip():
        base = "hideout-import"
    for suffix in range(500):
        candidate = base if suffix == 0 else f"{base} ({suffix})"
        try:
            _reject_reserved_base_map_name(candidate)
        except ValueError:
            continue
        if get_map_by_name(candidate) is not None:
            continue
        return candidate
    raise ValueError("Не удалось подобрать свободное имя карты")


def _boundary_xy_list_from_doc(doc: dict[str, Any]) -> list[XY]:
    seq = doc.get("points")
    if not isinstance(seq, list):
        raise ValueError("В документе границы нет списка points")
    out: list[XY] = []
    for item in seq:
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            out.append(XY(x=int(item[0]), y=int(item[1])))
        elif isinstance(item, dict) and "x" in item and "y" in item:
            out.append(XY(x=int(item["x"]), y=int(item["y"])))
    if len(out) < 3:
        raise ValueError("Нужно минимум три точки контура карты")
    return out


def _editor_scene_json_for_hideout_import(
    *,
    map_display_name: str,
    map_id: int,
    boundary_doc: dict[str, Any],
    base_pairs: list[tuple[str, dict[str, Any]]],
    decoration_pairs: list[tuple[str, dict[str, Any]]],
) -> str:
    # Layer 0: permanent/optional; decorations -> layer 1 and optionally layer 2 (palette).
    pts = _boundary_xy_list_from_doc(boundary_doc)
    boundary = BoundaryModel(points=pts)
    layer0_batches = painted_batches_from_doodad_pairs(base_pairs)
    deco_other, deco_palette, split_deco = split_decoration_pairs_for_hideout_import(
        decoration_pairs,
    )
    if split_deco:
        layer1_batches = painted_batches_from_doodad_pairs(deco_other)
        layer2_batches = painted_batches_from_doodad_pairs(deco_palette)
        paint_layers: list[PaintLayerModel] = [
            PaintLayerModel(
                kind="decorations",
                visible=True,
                locked=False,
                batches=layer1_batches,
            ),
            PaintLayerModel(
                kind="palette",
                visible=True,
                locked=False,
                batches=layer2_batches,
            ),
        ]
    else:
        layer1_batches = painted_batches_from_doodad_pairs(decoration_pairs)
        paint_layers = [
            PaintLayerModel(
                kind="decorations" if layer1_batches else "user",
                visible=True,
                locked=False,
                batches=layer1_batches,
            ),
        ]
    dots_xy = dots_from_doodads([*base_pairs, *decoration_pairs])
    dots_cache = [XY(x=x, y=y) for x, y in dots_xy]
    scene = SceneModel(
        boundary=boundary,
        layers=[
            PaintLayerModel(
                kind="default",
                visible=True,
                locked=True,
                batches=layer0_batches,
            ),
            *paint_layers,
        ],
        template=TemplateRefModel(template_id=f"map_tpl_{map_id}"),
        hideout_map_display_name=map_display_name,
        template_dots_cache=dots_cache,
    )
    return json.dumps(
        scene.model_dump(mode="json", exclude_none=True),
        ensure_ascii=False,
    )


def create_map_from_hideout_on_base(
    *,
    base_map_id: int,
    meta_shell: dict[str, Any],
    doodads_pairs: list[tuple[str, dict[str, Any]]],
    display_name_stem: str | None,
    filename_for_default_stem: str,
) -> dict[str, Any]:
    # New user map: base boundary contour, doodads from uploaded .hideout.
    init_db()
    base = get_map_by_id(base_map_id)
    if not base:
        raise ValueError("Базовая карта не найдена")
    if not base["is_base"]:
        raise ValueError(
            "Выберите базовую карту проекта (тип «Базовая карта» в списке карт)",
        )
    doc = get_boundary_order_doc(base_map_id)
    if doc is None:
        raise ValueError(
            "У выбранной базовой карты нет контура границы — откройте её в редакторе или задайте разметку",
        )

    unique_name = pick_unique_map_display_name(
        display_name_stem or "",
        filename_fallback=filename_for_default_stem,
    )
    new_row = create_new_map(unique_name)
    nid = int(new_row["id"])

    layer0_pairs, layer1_pairs = split_pairs_by_layer(doodads_pairs)

    tpl_obj: dict[str, Any] = {
        "meta_shell": meta_shell,
        "doodads_pairs": [[n, d] for n, d in doodads_pairs],
    }
    meta_shell_store = dict(meta_shell)
    merge_export_meta_into_shell(base, meta_shell_store)
    tpl_obj["meta_shell"] = meta_shell_store
    tpl_json = json.dumps(tpl_obj, ensure_ascii=False)
    save_boundary_order(nid, copy.deepcopy(doc), template_hideout_json=tpl_json)

    scene_txt = _editor_scene_json_for_hideout_import(
        map_display_name=unique_name,
        map_id=nid,
        boundary_doc=doc,
        base_pairs=layer0_pairs,
        decoration_pairs=layer1_pairs,
    )
    save_editor_scene_json(nid, scene_txt)

    with db_conn() as c:
        c.execute(
            "UPDATE hideout_maps SET forked_from_map_id=? WHERE id=?",
            (base_map_id, nid),
        )
    return hideout_map_summary(nid)


def create_new_map(display_name: str) -> dict[str, Any]:
    # Insert a new user map; raises if the name is already taken.
    name = display_name.strip()
    if not name:
        raise ValueError("Пустое имя карты")
    _reject_reserved_base_map_name(name)
    init_db()
    if get_map_by_name(name):
        raise ValueError("Карта с таким именем уже есть")
    with db_conn() as c:
        cur = c.execute(
            "INSERT INTO hideout_maps (display_name, is_base) VALUES (?, 0)",
            (name,),
        )
        mid = int(cur.lastrowid)
    g = get_map_by_id(mid)
    if not g:
        raise RuntimeError("INSERT hideout_maps не вернул строку")
    return g


def duplicate_hideout_map(source_map_id: int, display_name: str) -> dict[str, Any]:
    # New map copying boundary, template JSON, and saved editor scene.
    init_db()
    if get_map_by_id(source_map_id) is None:
        raise ValueError("Исходная карта не найдена")
    new_map = create_new_map(display_name)
    nid = int(new_map["id"])
    doc = get_boundary_order_doc(source_map_id)
    if doc is not None:
        tpl = get_map_template_hideout_json(source_map_id)
        save_boundary_order(nid, doc, template_hideout_json=tpl)
    with db_conn() as c:
        sr = c.execute(
            "SELECT editor_scene_json FROM hideout_maps WHERE id=?",
            (source_map_id,),
        ).fetchone()
        src_blob = sr["editor_scene_json"] if sr else None
        src_txt = None if src_blob is None else str(src_blob)
        c.execute(
            """
            UPDATE hideout_maps SET forked_from_map_id=?, editor_scene_json=?
            WHERE id=?
            """,
            (source_map_id, src_txt, nid),
        )
    return hideout_map_summary(nid)


def get_map_by_id(map_id: int) -> dict[str, Any] | None:
    init_db()
    with db_conn() as c:
        r = c.execute(
            """
            SELECT id, display_name, created_at, is_base, base_priority, forked_from_map_id,
              export_hideout_display_name, export_hideout_hash
            FROM hideout_maps WHERE id=?
            """,
            (map_id,),
        ).fetchone()
        if not r:
            return None
        fk_raw = r["forked_from_map_id"]
        edn = r["export_hideout_display_name"]
        eh = r["export_hideout_hash"]
        bp_raw = r["base_priority"]
        return {
            "id": int(r["id"]),
            "display_name": str(r["display_name"]),
            "created_at": str(r["created_at"]),
            "is_base": bool(int(r["is_base"])),
            "base_priority": (
                None if bp_raw is None else int(bp_raw)
            ),
            "forked_from_map_id": (
                None if fk_raw is None else int(fk_raw)
            ),
            "export_hideout_display_name": (
                None if edn is None else str(edn)
            ),
            "export_hideout_hash": None if eh is None else int(eh),
        }


def get_map_by_name(display_name: str) -> dict[str, Any] | None:
    init_db()
    with db_conn() as c:
        r = c.execute(
            """
            SELECT id, display_name, created_at, is_base, base_priority, forked_from_map_id,
              export_hideout_display_name, export_hideout_hash
            FROM hideout_maps WHERE display_name=? COLLATE NOCASE
            """,
            (display_name.strip(),),
        ).fetchone()
        if not r:
            return None
        fk_raw = r["forked_from_map_id"]
        edn = r["export_hideout_display_name"]
        eh = r["export_hideout_hash"]
        bp_raw = r["base_priority"]
        return {
            "id": int(r["id"]),
            "display_name": str(r["display_name"]),
            "created_at": str(r["created_at"]),
            "is_base": bool(int(r["is_base"])),
            "base_priority": (
                None if bp_raw is None else int(bp_raw)
            ),
            "forked_from_map_id": (
                None if fk_raw is None else int(fk_raw)
            ),
            "export_hideout_display_name": (
                None if edn is None else str(edn)
            ),
            "export_hideout_hash": None if eh is None else int(eh),
        }


def merge_export_meta_into_shell(
    base_row: dict[str, Any],
    shell: dict[str, Any],
) -> None:
    # hideout_name / hideout_hash for .hideout header from the base map row (SQLite).
    if not base_row.get("is_base"):
        return
    hn = base_row.get("export_hideout_display_name")
    hh = base_row.get("export_hideout_hash")
    if hn is not None and str(hn).strip():
        shell["hideout_name"] = str(hn).strip()
    if hh is not None:
        shell["hideout_hash"] = int(hh)


def export_hideout_meta_for_base_display_casefold(
    display_cf: str,
) -> tuple[str, int] | None:
    # (hideout_name, hideout_hash) for export by base map display_name (case-insensitive).
    cf = display_cf.strip().casefold()
    if not cf:
        return None
    init_db()
    with db_conn() as c:
        rows = c.execute(
            """
            SELECT display_name, export_hideout_display_name, export_hideout_hash
            FROM hideout_maps WHERE is_base = 1
            """,
        ).fetchall()
    for r in rows:
        if str(r["display_name"]).strip().casefold() != cf:
            continue
        hn = r["export_hideout_display_name"]
        hh = r["export_hideout_hash"]
        if hn is None or not str(hn).strip() or hh is None:
            return None
        return (str(hn).strip(), int(hh))
    return None


def get_boundary_order_doc(map_id: int) -> dict[str, Any] | None:
    return get_boundary_order_doc_impl(map_id)


def save_boundary_order(
    map_id: int,
    doc: dict[str, Any],
    *,
    template_hideout_json: str | None = None,
    clear_template: bool = False,
) -> None:
    save_boundary_order_impl(
        map_id,
        doc,
        template_hideout_json=template_hideout_json,
        clear_template=clear_template,
    )


def get_map_template_hideout_json(map_id: int) -> str | None:
    return get_map_template_hideout_json_impl(map_id)


def save_editor_scene_json(map_id: int, json_text: str) -> None:
    save_editor_scene_json_impl(map_id, json_text, get_map_by_id=get_map_by_id)


def get_editor_scene_json(map_id: int) -> str | None:
    return get_editor_scene_json_impl(map_id)


def delete_map_by_id(map_id: int) -> bool:
    return delete_map_by_id_impl(map_id)


def promote_map_to_base(
    map_id: int,
    *,
    export_hideout_display_name: str | None,
    export_hideout_hash: int | None,
) -> None:
    if get_map_by_id(map_id) is None:
        raise ValueError("Карта не найдена")
    promote_map_to_base_impl(
        map_id,
        export_hideout_display_name=export_hideout_display_name,
        export_hideout_hash=export_hideout_hash,
    )


__all__ = [
    "connect",
    "init_db",
    "create_map",
    "create_new_map",
    "duplicate_hideout_map",
    "delete_map_by_id",
    "promote_map_to_base",
    "export_hideout_meta_for_base_display_casefold",
    "get_editor_scene_json",
    "hideout_map_summary",
    "get_boundary_order_doc",
    "get_map_template_hideout_json",
    "get_map_by_id",
    "get_map_by_name",
    "list_maps",
    "merge_export_meta_into_shell",
    "save_boundary_order",
    "save_editor_scene_json",
]
