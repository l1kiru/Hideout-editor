from __future__ import annotations

# SQLite connection and schema bootstrap for hideout maps DB.

import csv
import logging
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import backend.database as _dbc

_REPO_ROOT = Path(__file__).resolve().parents[2]

POE2_LOCALE_SUFFIXES = ("ru", "en", "tw", "cn", "kr", "jp", "pt", "th", "fr", "de", "sp")
POE2_NAME_COLUMNS = tuple(f"name_{suffix}" for suffix in POE2_LOCALE_SUFFIXES)
POE2_NAME_CF_COLUMNS = tuple(f"name_{suffix}_cf" for suffix in POE2_LOCALE_SUFFIXES)

# Marker that schema/meta tables were bootstrapped (single row in hideout_maps_meta).
_BOOTSTRAP_META_KEY = "hideout_maps_bootstrapped_v1"
_LOG = logging.getLogger(__name__)


def _ensure_hideout_maps_is_base_column(c: sqlite3.Connection) -> None:
    cols = {
        str(r["name"])
        for r in c.execute("PRAGMA table_info(hideout_maps)").fetchall()
    }
    if "is_base" not in cols:
        c.execute(
            "ALTER TABLE hideout_maps ADD COLUMN is_base INTEGER NOT NULL DEFAULT 0",
        )


def _ensure_hideout_maps_base_priority_column(c: sqlite3.Connection) -> None:
    cols = {
        str(r["name"])
        for r in c.execute("PRAGMA table_info(hideout_maps)").fetchall()
    }
    if "base_priority" not in cols:
        c.execute(
            "ALTER TABLE hideout_maps ADD COLUMN base_priority INTEGER",
        )


def _ensure_hideout_maps_export_columns(c: sqlite3.Connection) -> None:
    cols = {
        str(r["name"])
        for r in c.execute("PRAGMA table_info(hideout_maps)").fetchall()
    }
    if "export_hideout_display_name" not in cols:
        c.execute(
            "ALTER TABLE hideout_maps ADD COLUMN export_hideout_display_name TEXT",
        )
    if "export_hideout_hash" not in cols:
        c.execute(
            "ALTER TABLE hideout_maps ADD COLUMN export_hideout_hash INTEGER",
        )


def _ensure_poe2_hideout_objects_table(c: sqlite3.Connection) -> None:
    indexes_sql = "\n".join(
        (
            f"CREATE INDEX IF NOT EXISTS idx_poe2_obj_{suffix}_cf "
            f"ON poe2_hideout_objects(name_{suffix}_cf);"
        )
        for suffix in POE2_LOCALE_SUFFIXES
    )
    c.executescript(
        f"""
            CREATE TABLE IF NOT EXISTS poe2_hideout_objects (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              category TEXT NOT NULL,
              subcategory TEXT NOT NULL DEFAULT '',
              name_ru TEXT NOT NULL,
              name_en TEXT,
              name_tw TEXT,
              name_cn TEXT,
              name_kr TEXT,
              name_jp TEXT,
              name_pt TEXT,
              name_th TEXT,
              name_fr TEXT,
              name_de TEXT,
              name_sp TEXT,
              name_ru_cf TEXT NOT NULL,
              name_en_cf TEXT,
              name_tw_cf TEXT,
              name_cn_cf TEXT,
              name_kr_cf TEXT,
              name_jp_cf TEXT,
              name_pt_cf TEXT,
              name_th_cf TEXT,
              name_fr_cf TEXT,
              name_de_cf TEXT,
              name_sp_cf TEXT
            );
            """,
    )
    cols = {
        str(r["name"])
        for r in c.execute("PRAGMA table_info(poe2_hideout_objects)").fetchall()
    }
    for suffix in POE2_LOCALE_SUFFIXES:
        name_col = f"name_{suffix}"
        name_cf_col = f"name_{suffix}_cf"
        if name_col not in cols:
            c.execute(f"ALTER TABLE poe2_hideout_objects ADD COLUMN {name_col} TEXT")
        if name_cf_col not in cols:
            c.execute(f"ALTER TABLE poe2_hideout_objects ADD COLUMN {name_cf_col} TEXT")
    c.executescript(indexes_sql)


def _should_autoseed_poe2_catalog_db() -> bool:
    # Skip catalog seed during unit tests (isolated *hideout_maps_test*.sqlite).
    try:
        p = str(_dbc.MAPS_SQLITE_PATH)
    except Exception:
        return False
    return "hideout_maps_test" not in p.casefold()


def _seed_poe2_objects_from_default_csv_if_empty(c: sqlite3.Connection) -> None:
    row = c.execute("SELECT COUNT(*) AS n FROM poe2_hideout_objects").fetchone()
    if row is not None and int(row["n"]) > 0:
        return
    if not _should_autoseed_poe2_catalog_db():
        return
    csv_path = _REPO_ROOT / "backend" / "seed_data" / "poe2_objects_database_all.csv"
    if not csv_path.is_file():
        try:
            from backend.services.poe2_seed_csv import generate_seed_csv

            _LOG.info("poe2 seed csv is missing, building: %s", csv_path)
            rows_written = generate_seed_csv(csv_path)
            _LOG.info("poe2 seed csv built: %s rows=%s", csv_path, rows_written)
        except Exception as exc:  # pragma: no cover - fail-safe path
            _LOG.warning("poe2 seed csv build failed: %s", exc)
            return
    if not csv_path.is_file():
        return

    def _norm(s: str) -> str:
        return str(s).strip().casefold()

    def _pick_header_idx(
        by_header: dict[str, int],
        candidates: tuple[str, ...],
    ) -> int | None:
        for candidate in candidates:
            idx = by_header.get(candidate.casefold())
            if idx is not None:
                return idx
        return None

    locale_header_aliases: dict[str, tuple[str, ...]] = {
        "ru": ("Имя RU", "name ru", "ru"),
        "en": ("Имя EN", "name en", "en"),
        "tw": ("Имя TW", "name tw", "tw"),
        "cn": ("Имя CN", "name cn", "cn"),
        "kr": ("Имя KR", "name kr", "kr"),
        "jp": ("Имя JP", "name jp", "jp"),
        "pt": ("Имя PT", "name pt", "pt"),
        "th": ("Имя TH", "name th", "th"),
        "fr": ("Имя FR", "name fr", "fr"),
        "de": ("Имя DE", "name de", "de"),
        "sp": ("Имя SP", "name sp", "sp"),
    }

    try:
        with csv_path.open(encoding="utf-8-sig", newline="") as f:
            reader = csv.reader(f, delimiter=";")
            try:
                raw_header = next(reader)
            except StopIteration:
                return
            by_header = {
                str(h).strip().casefold(): i
                for i, h in enumerate(raw_header)
                if str(h).strip()
            }
            category_idx = _pick_header_idx(by_header, ("Категория", "category"))
            subcategory_idx = _pick_header_idx(by_header, ("Подкатегория", "subcategory"))
            locale_to_idx = {
                suffix: _pick_header_idx(by_header, aliases)
                for suffix, aliases in locale_header_aliases.items()
            }
            if category_idx is None or locale_to_idx["ru"] is None:
                return
            for row_csv in reader:
                category = str(row_csv[category_idx]).strip() if category_idx < len(row_csv) else ""
                subcategory = (
                    str(row_csv[subcategory_idx]).strip()
                    if subcategory_idx is not None and subcategory_idx < len(row_csv)
                    else ""
                )
                names_by_suffix: dict[str, str] = {}
                for suffix, idx in locale_to_idx.items():
                    if idx is None or idx >= len(row_csv):
                        names_by_suffix[suffix] = ""
                        continue
                    names_by_suffix[suffix] = str(row_csv[idx]).strip()
                name_ru = names_by_suffix["ru"]
                if not category or not name_ru:
                    continue
                names_cf_by_suffix = {
                    suffix: (_norm(name) if name else "")
                    for suffix, name in names_by_suffix.items()
                }
                if not names_cf_by_suffix["ru"]:
                    continue
                insert_values: list[str | None] = []
                for suffix in POE2_LOCALE_SUFFIXES:
                    val = names_by_suffix.get(suffix, "")
                    insert_values.append(val or None)
                for suffix in POE2_LOCALE_SUFFIXES:
                    val = names_cf_by_suffix.get(suffix, "")
                    insert_values.append(val or None)
                value_placeholders = ", ".join(["?"] * (2 + len(insert_values)))
                c.execute(
                    f"""
                    INSERT INTO poe2_hideout_objects (
                      category, subcategory, {", ".join(POE2_NAME_COLUMNS)}, {", ".join(POE2_NAME_CF_COLUMNS)}
                    ) VALUES ({value_placeholders})
                    """,
                    [category, subcategory, *insert_values],
                )
    except OSError:
        return


def _ensure_hideout_maps_fork_and_scene_columns(c: sqlite3.Connection) -> None:
    cols = {
        str(r["name"])
        for r in c.execute("PRAGMA table_info(hideout_maps)").fetchall()
    }
    if "forked_from_map_id" not in cols:
        c.execute(
            """
            ALTER TABLE hideout_maps
              ADD COLUMN forked_from_map_id INTEGER REFERENCES hideout_maps(id)
            """,
        )
    if "editor_scene_json" not in cols:
        c.execute(
            "ALTER TABLE hideout_maps ADD COLUMN editor_scene_json TEXT",
        )


def backfill_null_base_priorities(c: sqlite3.Connection) -> None:
    # Base maps with NULL base_priority (outside sync order): assign by ascending id.
    rows2 = c.execute(
        """
        SELECT id FROM hideout_maps
        WHERE is_base = 1 AND base_priority IS NULL
        ORDER BY id
        """,
    ).fetchall()
    used_rows = c.execute(
        """
        SELECT base_priority FROM hideout_maps
        WHERE is_base = 1 AND base_priority IS NOT NULL
        """,
    ).fetchall()
    used: set[int] = {int(r["base_priority"]) for r in used_rows}
    next_pri = max(used, default=-1) + 1
    for row in rows2:
        while next_pri in used:
            next_pri += 1
        c.execute(
            "UPDATE hideout_maps SET base_priority = ? WHERE id = ?",
            (next_pri, int(row["id"])),
        )
        used.add(next_pri)
        next_pri += 1


def connect() -> sqlite3.Connection:
    p = _dbc.MAPS_SQLITE_PATH
    p.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(p)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys = ON")
    return c


@contextmanager
def db_conn() -> Iterator[sqlite3.Connection]:
    # Connection.__exit__ commits or rolls back but does not close(); always close
    # to avoid ResourceWarning: unclosed database in tests and long-lived workers.
    c = connect()
    try:
        with c:
            yield c
    finally:
        c.close()


def init_db() -> None:
    with db_conn() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS hideout_maps (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              display_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
              created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS map_boundaries (
              map_id INTEGER NOT NULL PRIMARY KEY,
              boundary_json TEXT NOT NULL,
              updated_at TEXT NOT NULL DEFAULT (datetime('now')),
              FOREIGN KEY(map_id) REFERENCES hideout_maps(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_maps_name ON hideout_maps(display_name);
            CREATE TABLE IF NOT EXISTS hideout_maps_meta (
              k TEXT PRIMARY KEY,
              v TEXT NOT NULL
            );
            """,
        )
        boundary_cols = {
            str(r["name"])
            for r in c.execute("PRAGMA table_info(map_boundaries)").fetchall()
        }
        if "template_hideout_json" not in boundary_cols:
            c.execute(
                "ALTER TABLE map_boundaries ADD COLUMN template_hideout_json TEXT",
            )
        _ensure_poe2_hideout_objects_table(c)
        _ensure_hideout_maps_is_base_column(c)
        _ensure_hideout_maps_base_priority_column(c)
        _ensure_hideout_maps_fork_and_scene_columns(c)
        _ensure_hideout_maps_export_columns(c)
        c.execute(
            "INSERT OR IGNORE INTO hideout_maps_meta (k, v) VALUES (?, '1')",
            (_BOOTSTRAP_META_KEY,),
        )
        _seed_poe2_objects_from_default_csv_if_empty(c)
