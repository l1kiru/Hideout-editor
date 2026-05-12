from __future__ import annotations

# SQLite SSOT for hideout base maps — smoke tests (isolated DB file).

import tempfile
import unittest
from pathlib import Path

import backend.database as database
from backend.services.maps_repo import (
    create_new_map,
    delete_map_by_id,
    get_map_template_hideout_json,
    init_db,
    list_maps,
    promote_map_to_base,
    save_boundary_order,
    save_editor_scene_json,
    split_import_pairs_for_base_map,
)
from backend.services.maps_sqlite import db_conn
from backend.services.maps_sqlite import POE2_LOCALE_SUFFIXES
from backend.services.poe2_object_catalog import (
    layer_index_for_doodad_name,
    split_pairs_by_layer,
)


class TestHideoutMapsSsot(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        database.MAPS_SQLITE_PATH = Path(self._tmpdir.name) / "hideout_maps_test.sqlite"

    def tearDown(self) -> None:
        try:
            self._tmpdir.cleanup()
        except OSError:
            pass

    def test_init_db_starts_with_no_maps(self) -> None:
        init_db()
        self.assertEqual(len(list_maps()), 0)

    def test_create_map_strict_rejects_duplicate_name(self) -> None:
        init_db()
        from backend.services.maps_repo import create_map

        create_map("strict-unique-once")
        with self.assertRaises(ValueError) as ctx:
            create_map("strict-unique-once", allow_existing=False)
        self.assertIn("уже существует", str(ctx.exception).lower())

    def test_user_template_hideout_json_round_trip(self) -> None:
        init_db()
        m = create_new_map("user-tpl-map")
        mid = int(m["id"])
        doc = {
            "points": [
                {"x": 0, "y": 0},
                {"x": 10, "y": 0},
                {"x": 10, "y": 10},
            ],
        }
        tpl_json = '{"meta_shell": {"hideout_name": "X"}, "doodads_pairs": []}'
        save_boundary_order(mid, doc, template_hideout_json=tpl_json)
        self.assertEqual(get_map_template_hideout_json(mid), tpl_json)

    def test_reserved_display_name_matches_any_base_row(self) -> None:
        init_db()
        m = create_new_map("ssot-reserved-base-name")
        promote_map_to_base(
            int(m["id"]),
            export_hideout_display_name="X",
            export_hideout_hash=1,
        )
        name = m["display_name"]
        with self.assertRaises(ValueError):
            create_new_map(name)

    def test_split_import_without_template_is_all_extra(self) -> None:
        init_db()
        user = create_new_map("ssot-user-map-xyz")
        pairs = [
            ("Тайник", {"hash": 1, "x": 0, "y": 0, "r": 0}),
        ]
        base_part, extra_part = split_import_pairs_for_base_map(int(user["id"]), pairs)
        self.assertEqual(base_part, [])
        self.assertEqual(len(extra_part), 1)

    def _insert_catalog_row(
        self,
        *,
        category: str,
        name_ru: str,
        name_en: str | None = None,
        names_by_locale: dict[str, str] | None = None,
    ) -> None:
        init_db()
        from backend.services.poe2_object_catalog import normalize_doodad_name

        localized = {suffix: "" for suffix in POE2_LOCALE_SUFFIXES}
        localized["ru"] = name_ru
        localized["en"] = name_en or ""
        for suffix, value in (names_by_locale or {}).items():
            if suffix in localized:
                localized[suffix] = value
        localized_cf = {
            suffix: (normalize_doodad_name(value) if value else "")
            for suffix, value in localized.items()
        }
        name_columns = [f"name_{suffix}" for suffix in POE2_LOCALE_SUFFIXES]
        name_cf_columns = [f"name_{suffix}_cf" for suffix in POE2_LOCALE_SUFFIXES]
        placeholders = ", ".join(["?"] * (2 + len(name_columns) + len(name_cf_columns)))
        with db_conn() as c:
            c.execute(
                f"""
                INSERT INTO poe2_hideout_objects (
                  category, subcategory, {", ".join(name_columns)}, {", ".join(name_cf_columns)}
                ) VALUES ({placeholders})
                """,
                [
                    category,
                    "",
                    *[localized[suffix] or None for suffix in POE2_LOCALE_SUFFIXES],
                    *[localized_cf[suffix] or None for suffix in POE2_LOCALE_SUFFIXES],
                ],
            )

    def test_catalog_unknown_name_is_layer1(self) -> None:
        init_db()
        self.assertEqual(layer_index_for_doodad_name("NoSuchDoodad"), 1)

    def test_catalog_split_stash_layer0_tree_layer1(self) -> None:
        init_db()
        self._insert_catalog_row(category="Постоянные", name_ru="Тайник")
        self._insert_catalog_row(category="Украшения", name_ru="Лесное дерево")
        l0, l1 = split_pairs_by_layer(
            [
                ("Тайник", {"hash": 1, "x": 0, "y": 0, "r": 0, "fv": 0}),
                ("Лесное дерево", {"hash": 2, "x": 1, "y": 1, "r": 0, "fv": 1}),
                ("Missing", {"hash": 3, "x": 2, "y": 2, "r": 0, "fv": 0}),
            ],
        )
        self.assertEqual(len(l0), 1)
        self.assertEqual(l0[0][0], "Тайник")
        self.assertEqual(len(l1), 2)
        names_l1 = {t[0] for t in l1}
        self.assertEqual(names_l1, {"Лесное дерево", "Missing"})

    def test_catalog_lookup_by_tw_locale_name(self) -> None:
        init_db()
        self._insert_catalog_row(
            category="Постоянные",
            name_ru="Сундук для реликвий",
            name_en="Relic Locker",
            names_by_locale={"tw": "裝飾物：聖域鎖櫃"},
        )
        self.assertEqual(layer_index_for_doodad_name("裝飾物：聖域鎖櫃"), 0)
        l0, l1 = split_pairs_by_layer(
            [
                ("裝飾物：聖域鎖櫃", {"hash": 1, "x": 0, "y": 0, "r": 0, "fv": 0}),
                ("Unknown", {"hash": 2, "x": 1, "y": 1, "r": 0, "fv": 0}),
            ],
        )
        self.assertEqual(len(l0), 1)
        self.assertEqual(l0[0][0], "裝飾物：聖域鎖櫃")
        self.assertEqual(len(l1), 1)
        self.assertEqual(l1[0][0], "Unknown")

    def test_split_pairs_empty_catalog_all_layer0(self) -> None:
        init_db()
        pairs = [
            ("A", {"hash": 1, "x": 0, "y": 0, "r": 0}),
            ("B", {"hash": 2, "x": 1, "y": 1, "r": 0}),
        ]
        l0, l1 = split_pairs_by_layer(pairs)
        self.assertEqual(l0, pairs)
        self.assertEqual(l1, [])

    def test_delete_map_cascades_forked_children(self) -> None:
        init_db()
        a = create_new_map("cascade-root")
        b = create_new_map("cascade-child")
        with db_conn() as c:
            c.execute(
                "UPDATE hideout_maps SET forked_from_map_id=? WHERE id=?",
                (int(a["id"]), int(b["id"])),
            )
        aid, bid = int(a["id"]), int(b["id"])
        self.assertTrue(delete_map_by_id(aid))
        with db_conn() as c:
            n = c.execute(
                "SELECT COUNT(*) AS n FROM hideout_maps WHERE id IN (?, ?)",
                (aid, bid),
            ).fetchone()
        self.assertEqual(int(n["n"]), 0)

    def test_promote_map_to_base_sets_export_meta(self) -> None:
        init_db()
        m = create_new_map("promote-me")
        mid = int(m["id"])
        promote_map_to_base(
            mid,
            export_hideout_display_name="Export Name",
            export_hideout_hash=12345,
        )
        with db_conn() as c:
            r = c.execute(
                "SELECT is_base, export_hideout_display_name, export_hideout_hash "
                "FROM hideout_maps WHERE id=?",
                (mid,),
            ).fetchone()
        self.assertEqual(int(r["is_base"]), 1)
        self.assertEqual(str(r["export_hideout_display_name"]), "Export Name")
        self.assertEqual(int(r["export_hideout_hash"]), 12345)

    def test_init_db_does_not_recreate_maps_after_user_deletes_all(self) -> None:
        init_db()
        create_new_map("temp-before-wipe")
        with db_conn() as c:
            c.execute("DELETE FROM hideout_maps")
        init_db()
        init_db()
        maps = list_maps()
        self.assertEqual(len(maps), 0)

    def test_save_editor_scene_rejected_for_base_map(self) -> None:
        init_db()
        m = create_new_map("ssot-base-for-scene-guard")
        promote_map_to_base(int(m["id"]), export_hideout_display_name=None, export_hideout_hash=None)
        with self.assertRaises(ValueError):
            save_editor_scene_json(int(m["id"]), "{}")


if __name__ == "__main__":
    unittest.main()
