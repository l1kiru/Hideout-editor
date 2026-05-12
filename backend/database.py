from __future__ import annotations

# Path to SQLite (storage for hideout maps and associated boundary_order).

from pathlib import Path

from hideout_core.config.settings import settings

REPO_ROOT = Path(__file__).resolve().parent.parent


def _resolve_repo_path(path: Path) -> Path:
    # Relative paths are resolved from repo root (same SQLite regardless of cwd).
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


MAPS_SQLITE_PATH = _resolve_repo_path(settings.hideout_maps_sqlite)
TEMPLATE_CACHE_DIR = _resolve_repo_path(settings.hideout_template_cache_dir)
