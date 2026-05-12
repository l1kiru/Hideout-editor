from __future__ import annotations

# Parse JSON .hideout: placements in doodad traversal order.

import json
from typing import Any

from hideout_core.io.hideout_io import parse_doodads_ordered, parse_meta_fields


def merge_duplicate_keys(pairs: list[tuple[str, object]]) -> dict[str, object]:
    # Preserve duplicate doodads keys as a list of values, matching .hideout semantics.
    out: dict[str, object] = {}
    for k, v in pairs:
      if k == "doodads" and k in out:
        prev = out[k]
        if isinstance(prev, list):
          prev.append(v)
        else:
          out[k] = [prev, v]
      else:
        out[k] = v
    return out


def iter_placements(doodads: object) -> list[tuple[str, dict[str, int]]]:
    rows: list[tuple[str, dict[str, int]]] = []
    if isinstance(doodads, dict):
      iterable = doodads.items()
    elif isinstance(doodads, list):
      iterable = []
      for item in doodads:
        if isinstance(item, dict):
          iterable += list(item.items())
        elif isinstance(item, (list, tuple)) and len(item) == 2:
          iterable.append((item[0], item[1]))
    else:
      iterable = []
    for name, spec in iterable:
      if isinstance(spec, dict) and all(k in spec for k in ("hash", "x", "y")):
        rows.append((str(name), spec))
    return rows


def hideout_dict_from_upload_text(text: str) -> dict[str, Any]:
    raw = json.loads(text, object_pairs_hook=merge_duplicate_keys)
    if not isinstance(raw, dict):
        raise ValueError("Ожидался корневой JSON-объект")
    return raw


def _placement_row_dict(seq: int, name: str, d: dict) -> dict[str, int | str]:
    # Doodad fields for boundary API and template persistence (includes r and fv).
    rv = d.get("r", 0)
    fv = d.get("fv", 0)
    try:
        ri = int(rv) if rv is not None else 0
    except (TypeError, ValueError):
        ri = 0
    try:
        fvi = int(fv) if fv is not None else 0
    except (TypeError, ValueError):
        fvi = 0
    return {
        "seq": seq,
        "name": str(name),
        "hash": int(d["hash"]),
        "x": int(d["x"]),
        "y": int(d["y"]),
        "r": ri,
        "fv": fvi,
    }


def placement_rows_raw(doodads: object) -> list[dict[str, int | str]]:
    out: list[dict[str, int | str]] = []
    for seq, (name, d) in enumerate(iter_placements(doodads)):
        out.append(_placement_row_dict(seq, name, d))
    return out


def _placement_rows_from_ordered_pairs(
    pairs: list[tuple[str, dict]],
) -> list[dict[str, int | str]]:
    # Same as placement_rows_raw but from ordered (name, spec) pairs preserving file order.
    out: list[dict[str, int | str]] = []
    seq = 0
    for name, d in pairs:
        if isinstance(d, dict) and all(k in d for k in ("hash", "x", "y")):
            out.append(_placement_row_dict(seq, name, d))
            seq += 1
    return out


def _hideout_hash_best_effort(text: str) -> object | None:
    try:
        return parse_meta_fields(text)[3]
    except ValueError:
        try:
            blob = json.loads(text)
            return blob.get("hideout_hash") if isinstance(blob, dict) else None
        except (json.JSONDecodeError, TypeError):
            return None


def hideout_dict_from_upload_text_prefer_ordered(text: str) -> dict[str, Any]:
    # Like json.loads output, but doodads prefer ordered parse so duplicate keys in the
    # "doodads": { ... } object survive (plain JSON keeps only the last key).
    text_clean = text.lstrip("\ufeff").strip()
    try:
        pairs, _, _ = parse_doodads_ordered(text_clean)
        rows = _placement_rows_from_ordered_pairs(pairs)
        hh = _hideout_hash_best_effort(text_clean)
        return {
            "hideout_hash": hh,
            "doodads": pairs,
            "_placements_ordered": rows,
        }
    except ValueError:
        data = hideout_dict_from_upload_text(text_clean)
        rows = placement_rows_raw(data.get("doodads"))
        out = dict(data)
        out["_placements_ordered"] = rows
        return out


def boundary_order_document(
    points: list[tuple[int, int]],
    *,
    source_hideout: str | None,
    marker_name: str | None,
    marker_hash: int | None,
    hideout_hash: object | None,
) -> dict[str, Any]:
    return {
        "version": 2,
        "points": [[int(x), int(y)] for x, y in points],
        "source_hideout": source_hideout,
        "marker_name": marker_name,
        "marker_hash": marker_hash,
        "hideout_hash": hideout_hash,
    }
