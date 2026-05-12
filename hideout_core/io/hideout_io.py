# Read/write .hideout text while preserving doodad order and duplicate keys.

from __future__ import annotations

import json
import re
from pathlib import Path


def skip_ws(text: str, pos: int) -> int:
    while pos < len(text) and text[pos] in " \t\n\r":
        pos += 1
    return pos


# Index of the closing `}` paired with `{` at open_brace_idx; respects string literals.
def match_brace_object(text: str, open_brace_idx: int) -> int | None:
    if open_brace_idx >= len(text) or text[open_brace_idx] != "{":
        return None
    depth = 0
    i = open_brace_idx
    in_str = False
    esc = False
    while i < len(text):
        c = text[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    return None


# Parse a JSON string value starting at a leading `"`.
def read_json_string(text: str, pos: int) -> tuple[str, int] | None:
    if pos >= len(text) or text[pos] != '"':
        return None
    i = pos + 1
    out: list[str] = []
    while i < len(text):
        c = text[i]
        if c == '"':
            return "".join(out), i + 1
        if c == "\\" and i + 1 < len(text):
            n = text[i + 1]
            if n == '"':
                out.append('"')
            elif n == "\\":
                out.append("\\")
            elif n == "/":
                out.append("/")
            elif n == "b":
                out.append("\b")
            elif n == "f":
                out.append("\f")
            elif n == "n":
                out.append("\n")
            elif n == "r":
                out.append("\r")
            elif n == "t":
                out.append("\t")
            elif n == "u" and i + 5 < len(text):
                out.append(chr(int(text[i + 2 : i + 6], 16)))
                i += 5
            else:
                out.append(n)
            i += 2
            continue
        out.append(c)
        i += 1
    return None


def parse_meta_fields(raw: str) -> tuple[int, str, str, int]:
    mv = re.search(r'"version"\s*:\s*(\d+)', raw)
    ml = re.search(r'"language"\s*:\s*"((?:[^"\\]|\\.)*)"', raw)
    mh = re.search(r'"hideout_name"\s*:\s*"((?:[^"\\]|\\.)*)"', raw)
    mj = re.search(r'"hideout_hash"\s*:\s*(\d+)', raw)
    if not (mv and ml and mh and mj):
        raise ValueError(
            "Top-level version, language, name or hideout hash fields not found"
        )
    return (
        int(mv.group(1)),
        json.loads(f'"{ml.group(1)}"'),
        json.loads(f'"{mh.group(1)}"'),
        int(mj.group(1)),
    )


# Returns (ordered (name, spec) list, index after doodads `}`, index of doodads closing `}`).
def parse_doodads_ordered(raw: str) -> tuple[list[tuple[str, dict]], int, int]:
    m = re.search(r'"doodads"\s*:\s*\{', raw)
    if not m:
        raise ValueError('No "doodads": { block')
    brace_open = raw.index("{", m.end() - 1)
    doodads_pairs: list[tuple[str, dict]] = []
    pos = brace_open + 1
    while True:
        pos = skip_ws(raw, pos)
        if pos >= len(raw):
            raise ValueError("Unclosed doodads")
        if raw[pos] == "}":
            end_doodads = pos
            closing = skip_ws(raw, pos + 1)
            break
        read = read_json_string(raw, pos)
        if read is None:
            raise ValueError(f"Could not read key at position {pos}")
        key, pos = read
        pos = skip_ws(raw, pos)
        if pos >= len(raw) or raw[pos] != ":":
            raise ValueError("Colon required after name")
        pos = skip_ws(raw, pos + 1)
        if pos >= len(raw) or raw[pos] != "{":
            raise ValueError("Expected doodad object after key")
        end_obj = match_brace_object(raw, pos)
        if end_obj is None:
            raise ValueError("Unclosed doodad object")
        obj_src = raw[pos : end_obj + 1]
        doodads_pairs.append((key, json.loads(obj_src)))
        pos = skip_ws(raw, end_obj + 1)
        if pos < len(raw) and raw[pos] == ",":
            pos += 1
            continue
        if pos < len(raw) and raw[pos] == "}":
            end_doodads = pos
            closing = skip_ws(raw, pos + 1)
            break
        raise ValueError("Expected , or } after doodad")
    return doodads_pairs, closing, end_doodads


# Loads version, language, hideout_name, hideout_hash, and doodads as list[(name, spec)]
# with file order and duplicate names preserved.
def load_hideout_ordered(path: Path | str) -> dict:
    raw = Path(path).read_text(encoding="utf-8-sig")
    vi, ln, hn, hj = parse_meta_fields(raw)
    pairs, closing, _inner = parse_doodads_ordered(raw)
    trailing = skip_ws(raw, closing)
    tail = ""
    while (
        trailing < len(raw)
        and raw[trailing] not in ("\n", "\r", " ")
        and raw[trailing] != "}"
    ):
        trailing += 1
    trailing = skip_ws(raw, trailing)
    if trailing < len(raw) and raw[trailing] == "}":
        tail = ""
    return {
        "version": vi,
        "language": ln,
        "hideout_name": hn,
        "hideout_hash": hj,
        "doodads": pairs,
    }


def _fmt_doodle(name: str, spec: dict) -> str:
    keys_ord = ["hash", "x", "y", "r", "fv"]
    seen: set[str] = set(keys_ord)
    blob: list[str] = []
    for k in keys_ord:
        if k not in spec:
            continue
        blob.append(f'"{k}": {json.dumps(spec[k], ensure_ascii=False)}')
    for k in spec:
        if k in seen:
            continue
        blob.append(f'"{k}": {json.dumps(spec[k], ensure_ascii=False)}')
    obj_body = ",\n      ".join(blob)
    return json.dumps(name, ensure_ascii=False) + ": {\n      " + obj_body + "\n    }"


# meta: version, language, hideout_name, hideout_hash, doodads=list[(name, dict)].
# Missing header keys (common on older map templates) use defaults so export does not KeyError.
# Written like the game client: UTF-8 with BOM, LF only (no CRLF on Windows).
def write_hideout_ordered(path: Path | str, meta: dict) -> None:
    pairs = meta["doodads"]
    if not isinstance(pairs, list):
        raise TypeError("doodads must be list of pairs (name, dict)")
    vr = meta.get("version", 1)
    version = int(vr if vr is not None else 1)
    language = meta.get("language") or "Russian"
    hideout_name = meta.get("hideout_name") or "Убежище"
    hh = meta.get("hideout_hash", 0)
    hideout_hash = int(hh if hh is not None else 0)
    blocks = [_fmt_doodle(name, dict(spec)) for name, spec in pairs]
    body = ",\n    ".join(blocks)
    out = "".join(
        [
            "{\n",
            f'  "version": {version},\n',
            f'  "language": {json.dumps(language, ensure_ascii=False)},\n',
            f'  "hideout_name": {json.dumps(hideout_name, ensure_ascii=False)},\n',
            f'  "hideout_hash": {hideout_hash},\n',
            '  "doodads": {\n    ',
            body,
            "\n  }\n}\n",
        ]
    )
    Path(path).write_bytes(b"\xef\xbb\xbf" + out.encode("utf-8"))
