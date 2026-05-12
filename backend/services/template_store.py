from __future__ import annotations

# .hideout template cache for finalize/export: RAM + on-disk JSON files.
# On restart, templates reload from template_cache (settings). map_tpl_{N} ids are
# lazy-loaded from SQLite map_boundaries.template_hideout_json when missing from RAM
# or disk (covers newly created maps and server restarts).

import json
import re
import uuid
from pathlib import Path
from typing import TypedDict

import backend.database as _dbc


class StoredTemplate(TypedDict):
    meta_shell: dict
    doodads_pairs: list[tuple[str, dict]]


_store: dict[str, StoredTemplate] = {}

_CACHE_ROOT: Path = _dbc.TEMPLATE_CACHE_DIR

_OVERRIDE_RE = re.compile(r"^[a-z][a-z0-9_]{2,94}$")
_MAP_TPL_RE = re.compile(r"^map_tpl_(\d+)$")


def _path_for_tid(template_id: str) -> Path:
    if "/" in template_id or "\\" in template_id or template_id.startswith("."):
        msg = "Недопустимый template_id"
        raise ValueError(msg)
    return _CACHE_ROOT / f"{template_id}.json"


def _persist_disk(tid: str, st: StoredTemplate) -> None:
    _CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    payload = {
        "meta_shell": st["meta_shell"],
        "doodads_pairs": [[n, d] for n, d in st["doodads_pairs"]],
    }
    target = _path_for_tid(tid)
    tmp = _CACHE_ROOT / f".{tid}.tmp.json"
    text = json.dumps(payload, ensure_ascii=False, indent=None)
    tmp.write_text(text + "\n", encoding="utf-8")
    tmp.replace(target)


def _load_disk(tid: str) -> StoredTemplate | None:
    try:
        path = _path_for_tid(tid)
    except ValueError:
        return None
    if not path.is_file():
        return None
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        seq = raw["doodads_pairs"]
        pairs = [(str(item[0]), dict(item[1])) for item in seq]
        return StoredTemplate(meta_shell=dict(raw["meta_shell"]), doodads_pairs=pairs)
    except (KeyError, TypeError, ValueError, json.JSONDecodeError, IndexError):
        return None


def put(
    meta_shell: dict,
    doodads_pairs: list[tuple[str, dict]],
    *,
    template_id_override: str | None = None,
) -> str:
    if template_id_override is not None:
        tid = template_id_override.strip()
        if not _OVERRIDE_RE.fullmatch(tid):
            msg = (
                "Недопустимый template_id_override "
                "(латиница, цифры и _, от 4 до 96 символов, с буквы)"
            )
            raise ValueError(msg)
    else:
        tid = uuid.uuid4().hex
    st = StoredTemplate(meta_shell=meta_shell, doodads_pairs=doodads_pairs)
    _store[tid] = st
    try:
        _persist_disk(tid, st)
    except OSError:
        # Export from in-memory store still works within this process.
        pass
    return tid


def _load_from_sqlite_for_map(map_id: int) -> StoredTemplate | None:
    # Load meta_shell + doodads_pairs from map_boundaries.template_hideout_json.
    # Import maps_repo lazily to avoid a circular import.
    try:
        from backend.services import maps_repo  # noqa: PLC0415
    except ImportError:
        return None
    raw = maps_repo.get_map_template_hideout_json(map_id)
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    meta = data.get("meta_shell") or {}
    seq = data.get("doodads_pairs") or []
    if not isinstance(meta, dict) or not isinstance(seq, list):
        return None
    pairs: list[tuple[str, dict]] = []
    for item in seq:
        if (
            isinstance(item, (list, tuple))
            and len(item) >= 2
            and isinstance(item[1], dict)
        ):
            pairs.append((str(item[0]), dict(item[1])))
    if not pairs:
        return None
    return StoredTemplate(meta_shell=dict(meta), doodads_pairs=pairs)


def get(template_id: str) -> StoredTemplate | None:
    tid = template_id.strip()
    if not tid:
        return None
    hit = _store.get(tid)
    if hit is not None:
        return hit
    loaded = _load_disk(tid)
    if loaded is not None:
        _store[tid] = loaded
        return loaded
    # map_tpl_{N}: template is always in SQLite (create/duplicate write template_hideout_json)
    # but may not yet be in RAM or the file cache.
    m = _MAP_TPL_RE.match(tid)
    if m is not None:
        loaded = _load_from_sqlite_for_map(int(m.group(1)))
        if loaded is not None:
            _store[tid] = loaded
            try:
                _persist_disk(tid, loaded)
            except OSError:
                pass
            return loaded
    return None

