from __future__ import annotations

import csv
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import backend.database as database
from backend.services import maps_sqlite
from backend.services import poe2_seed_csv


class TestPoe2SeedCsv(unittest.TestCase):
    def test_extract_items_filters_navigation_artifacts(self) -> None:
        html = """
        <html><body>
          <a>PoE2 DB</a>
          <a href="Relic_Locker">Relic Locker</a><div class="implicitMod">Creates an object in your hideout</div>
          <span>ignore me</span>
          <a>Image #42</a>
          <a>Reset</a>
          <a href="Relic_Locker">Relic Locker</a><div class="implicitMod">Creates an object in your hideout</div>
          <a href="Map_Device">Map Device</a><div class="implicitMod">Creates an object in your hideout</div>
          <a>Edit</a>
          <a>ShouldNotAppear</a>
        </body></html>
        """
        got = poe2_seed_csv.extract_items_from_poe2db_html(html)
        self.assertEqual(got, ["Relic Locker", "Map Device"])

    def test_extract_items_uses_requested_fragment_block(self) -> None:
        html = """
        <div id="WantedDoodadCategory">
          <a href="Keep_Me">Keep Me</a><div class="implicitMod">Creates an object in your hideout</div>
        </div>
        <div id="OtherDoodadCategory">
          <a href="Skip_Me">Skip Me</a><div class="implicitMod">Creates an object in your hideout</div>
        </div>
        """
        got = poe2_seed_csv.extract_items_from_poe2db_html(
            html,
            fragment="WantedDoodadCategory",
        )
        self.assertEqual(got, ["Keep Me"])

    def test_extract_items_handles_item_card_with_attrs_before_href(self) -> None:
        html = """
        <div id="AnyDoodadCategory">
          <a class="link" data-x="1" href="Armourers_Workbench">Верстак бронника</a>
          <div class="implicitMod extra"></div>
        </div>
        """
        got = poe2_seed_csv.extract_items_from_poe2db_html(html)
        self.assertEqual(got, ["Верстак бронника"])

    def test_extract_items_collects_doodad_and_mtx_tabs(self) -> None:
        html = """
        <a href="#WantedDoodadCategory">Wanted Doodad Category /2</a>
        <a href="#WantedMTX">Wanted MTX /1</a>
        <a href="#Pet">Pet /1</a>
        <div id="WantedDoodadCategory">
          <a href="A">A</a><div class="implicitMod">Creates an object in your hideout</div>
          <a href="B">B</a><div class="implicitMod">Creates an object in your hideout</div>
        </div>
        <div id="WantedMTX">
          <a href="C">C</a>
        </div>
        <div id="Pet">
          <a href="Pet_A">Pet A</a><div class="implicitMod">Creates an object in your hideout</div>
        </div>
        """
        got = poe2_seed_csv.extract_items_from_poe2db_html(html)
        self.assertEqual(got, ["A", "B", "C"])

    def test_build_seed_rows_collects_npc_item_cards(self) -> None:
        original_groups = dict(poe2_seed_csv.GROUPS)
        poe2_seed_csv.GROUPS = {"Постоянные": ("https://poe2db.tw/us/NPCs",)}
        try:
            def _fetch(_url: str) -> str:
                return """
                <a href="Alva">Alva</a><div class="implicitMod">Creates an object in your hideout</div>
                <a href="Trialmaster_Hideout_Decoration">Trialmaster Hideout Decoration</a><div class="implicitMod">Creates an object in your hideout</div>
                """

            rows = poe2_seed_csv.build_seed_rows(fetch_html=_fetch, sleep_seconds=0)
        finally:
            poe2_seed_csv.GROUPS = original_groups
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["Подкатегория"], "NPCs")
        self.assertEqual(rows[0]["Имя EN"], "Alva")

    def test_write_seed_csv_is_byte_stable_against_golden(self) -> None:
        golden = Path("backend/seed_data/poe2_objects_database_all.csv")
        rows = poe2_seed_csv.read_seed_csv(golden)
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
            out = Path(td) / "generated.csv"
            poe2_seed_csv.write_seed_csv(rows, out)
            self.assertEqual(out.read_bytes(), golden.read_bytes())

    def test_init_db_generates_seed_when_csv_missing(self) -> None:
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
            tmp = Path(td)
            repo_root = tmp / "repo"
            seed_dir = repo_root / "backend" / "seed_data"
            seed_dir.mkdir(parents=True, exist_ok=True)
            csv_path = seed_dir / "poe2_objects_database_all.csv"

            original_db_path = database.MAPS_SQLITE_PATH
            original_repo_root = maps_sqlite._REPO_ROOT
            database.MAPS_SQLITE_PATH = tmp / "hideout_maps_auto.sqlite"
            maps_sqlite._REPO_ROOT = repo_root
            try:
                def _fake_generate(out_path: Path, **_kwargs: object) -> int:
                    with out_path.open("w", encoding="utf-8-sig", newline="") as f:
                        writer = csv.writer(f, delimiter=";", lineterminator="\n")
                        writer.writerow(list(poe2_seed_csv.CSV_HEADERS))
                        writer.writerow(
                            [
                                "Постоянные",
                                "Utility",
                                "Тайник",
                                "Stash",
                                "",
                                "",
                                "",
                                "",
                                "",
                                "",
                                "",
                                "",
                                "",
                            ],
                        )
                    return 1

                with patch(
                    "backend.services.poe2_seed_csv.generate_seed_csv",
                    side_effect=_fake_generate,
                ) as mocked:
                    maps_sqlite.init_db()
                    self.assertEqual(mocked.call_count, 1)
                    self.assertTrue(csv_path.is_file())
                    with maps_sqlite.db_conn() as c:
                        row = c.execute(
                            "SELECT COUNT(*) AS n FROM poe2_hideout_objects",
                        ).fetchone()
                    self.assertEqual(int(row["n"]), 1)
            finally:
                maps_sqlite._REPO_ROOT = original_repo_root
                database.MAPS_SQLITE_PATH = original_db_path

    def test_generate_seed_csv_does_not_use_snapshot_bypass(self) -> None:
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
            tmp = Path(td)
            output = tmp / "poe2_objects_database_all.csv"
            snapshot = tmp / "poe2_objects_database_all.snapshot.csv"
            snapshot.write_text("snapshot must not be copied", encoding="utf-8")

            original_groups = dict(poe2_seed_csv.GROUPS)
            poe2_seed_csv.GROUPS = {"Постоянные": ("https://poe2db.tw/us/Utility",)}
            try:
                def _fetch(_url: str) -> str:
                    return """
                    <a href="Generated">Generated</a><div class="implicitMod">Creates an object in your hideout</div>
                    """

                rows = poe2_seed_csv.generate_seed_csv(
                    output,
                    fetch_html=_fetch,
                    sleep_seconds=0,
                )
            finally:
                poe2_seed_csv.GROUPS = original_groups

            self.assertEqual(rows, 1)
            self.assertNotEqual(output.read_text(encoding="utf-8-sig"), snapshot.read_text(encoding="utf-8"))
            self.assertIn("Generated", output.read_text(encoding="utf-8-sig"))


if __name__ == "__main__":
    unittest.main()
