from __future__ import annotations

# Build PoE2 hideout seed CSV in backend-compatible format.

import csv
import html
import re
import time
from pathlib import Path
from typing import Callable
from urllib.parse import urlparse

import httpx

LANGUAGES = ("ru", "us", "tw", "cn", "kr", "jp", "pt", "th", "fr", "de", "sp")
LANGUAGE_TO_SUFFIX = {
    "ru": "RU",
    "us": "EN",
    "tw": "TW",
    "cn": "CN",
    "kr": "KR",
    "jp": "JP",
    "pt": "PT",
    "th": "TH",
    "fr": "FR",
    "de": "DE",
    "sp": "SP",
}
CSV_HEADERS = (
    "Категория",
    "Подкатегория",
    "Имя RU",
    "Имя EN",
    "Имя TW",
    "Имя CN",
    "Имя KR",
    "Имя JP",
    "Имя PT",
    "Имя TH",
    "Имя FR",
    "Имя DE",
    "Имя SP",
)

PERMANENT = ("https://poe2db.tw/ru/Utility", "https://poe2db.tw/us/NPCs")
OPTIONAL = (
    "https://poe2db.tw/us/Hideout_Item",
    "https://poe2db.tw/us/Miscellaneous#MiscellaneousDoodadCategory",
)
DECORATIONS = (
    "https://poe2db.tw/ru/Forest",
    "https://poe2db.tw/ru/Vaal_City#VaalCityDoodadCategory",
    "https://poe2db.tw/ru/Arcane",
    "https://poe2db.tw/ru/Cave",
    "https://poe2db.tw/ru/Coastal",
    "https://poe2db.tw/ru/Encampment",
    "https://poe2db.tw/ru/Faridun#FaridunDoodadCategory",
    "https://poe2db.tw/ru/Maraketh",
    "https://poe2db.tw/us/Oriath",
)

GROUPS = {
    "Постоянные": PERMANENT,
    "Опциональные": OPTIONAL,
    "Украшения": DECORATIONS,
}

_REPO_ROOT = Path(__file__).resolve().parents[2]
_CANONICAL_SEED_CSV = _REPO_ROOT / "backend" / "seed_data" / "poe2_objects_database_all.csv"

_BLACKLIST = {
    "PoE2 DB",
    "Item",
    "Предмет",
    "Gem",
    "Камень",
    "Skill Gems",
    "Камни умений",
    "Support Gems",
    "Камни поддержки",
    "Modifiers",
    "Свойства",
    "Quest",
    "Задание",
    "Patreon",
    "Edit",
    "Privacy",
    "Disclaimers",
    "GGG Tracker",
    "Concurrent Players",
    "US English",
    "RU Русский",
    "TW 正體中文",
    "CN 简体中文",
    "KR 한국어",
    "JP Japanese",
    "PO Português",
    "PT Português",
    "TH ภาษาไทย",
    "FR Français",
    "DE Deutsch",
    "ES Spanish",
    "poedb.tw",
    "tlidb.com",
    "poe2db.tw",
    "paldb.cc",
}
_SCRIPT_STYLE_RE = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", flags=re.IGNORECASE | re.DOTALL)
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_TAB_LINK_RE = re.compile(
    r'<a[^>]+href="#(?P<id>[^"]+)"[^>]*>(?P<body>.*?)</a>',
    flags=re.IGNORECASE | re.DOTALL,
)
_DIV_TAG_RE = re.compile(r"</?div\b[^>]*>", flags=re.IGNORECASE)
_ITEM_CARD_RE = re.compile(
    r"<a\b[^>]*href=[\"'](?P<href>[^\"']+)[\"'][^>]*>(?P<body>(?:(?!<img\b).)*?)</a>\s*<div\b[^>]*class=[\"'][^\"']*implicitMod[^\"']*[\"'][^>]*>",
    flags=re.IGNORECASE | re.DOTALL,
)
_ANCHOR_RE = re.compile(
    r"<a\b[^>]*href\s*=\s*['\"]?(?P<href>[^'\" >]+)[^>]*>(?P<body>.*?)</a>",
    flags=re.IGNORECASE | re.DOTALL,
)

Fetcher = Callable[[str], str]


def to_lang_url(url: str, lang: str) -> str:
    parsed = urlparse(url)
    parts = parsed.path.split("/")
    if len(parts) > 1 and parts[1] in set(LANGUAGES):
        parts[1] = lang
    else:
        parts.insert(1, lang)
    return parsed._replace(path="/".join(parts)).geturl()


def page_slug(url: str) -> str:
    return Path(urlparse(url).path).name


def clean_text(raw: str) -> str:
    text = html.unescape(_HTML_TAG_RE.sub(" ", raw))
    return re.sub(r"\s+", " ", text).strip()


def default_fetch_html(url: str) -> str:
    r = httpx.get(
        url,
        headers={"User-Agent": "Mozilla/5.0 hideout-editor/1.0"},
        timeout=30.0,
        follow_redirects=True,
    )
    r.raise_for_status()
    return r.text


def _div_block_by_id(html_text: str, div_id: str) -> str:
    start = re.search(
        r'<div[^>]+id="' + re.escape(div_id) + r'"[^>]*>',
        html_text,
        flags=re.IGNORECASE,
    )
    if start is None:
        return ""
    depth = 1
    for tag in _DIV_TAG_RE.finditer(html_text, start.end()):
        if tag.group(0).startswith("</"):
            depth -= 1
            if depth == 0:
                return html_text[start.start() : tag.end()]
            continue
        depth += 1
    return html_text[start.start() :]


def _target_tab_blocks(html_text: str, fragment: str | None) -> list[tuple[str, str]]:
    blocks: list[tuple[str, str]] = []
    for match in _TAB_LINK_RE.finditer(html_text):
        tab_id = str(match.group("id") or "").strip()
        label = clean_text(match.group("body"))
        if "Doodad Category" not in label and "MTX" not in label:
            continue
        block = _div_block_by_id(html_text, tab_id)
        if block:
            kind = "mtx" if "MTX" in label else "doodad"
            blocks.append((kind, block))
    if fragment:
        fragment_block = _div_block_by_id(html_text, fragment)
        if fragment_block and all(fragment_block != block for _, block in blocks):
            blocks.insert(0, ("doodad", fragment_block))
    return blocks


def _category_blocks(html_text: str, fragment: str | None) -> list[str]:
    blocks = _target_tab_blocks(html_text, fragment)
    return [block for _, block in blocks] or [html_text]


def _is_valid_card_href(href: str) -> bool:
    href_low = href.casefold()
    if not href or href_low.startswith(("#", "javascript:", "mailto:")):
        return False
    if href_low.startswith("http") and "poe2db.tw" not in href_low:
        return False
    if href_low.startswith("/image/") or "/image/" in href_low:
        return False
    return True


def _append_unique_name(names: list[str], href: str, raw_text: str) -> None:
    text = clean_text(raw_text)
    if not text or text in _BLACKLIST or text.startswith("Image") or len(text) > 120:
        return
    if text in {"Reset", "Name", "Show Full Descriptions", "Loading"}:
        return
    if not _is_valid_card_href(href):
        return
    if text not in names:
        names.append(text)


def extract_items_from_poe2db_html(
    html_text: str,
    *,
    fragment: str | None = None,
) -> list[str]:
    body = _SCRIPT_STYLE_RE.sub(" ", html_text)
    names: list[str] = []
    typed_blocks = _target_tab_blocks(body, fragment)
    blocks = [block for _, block in typed_blocks] or [body]

    for block in blocks:
        for match in _ITEM_CARD_RE.finditer(block):
            _append_unique_name(
                names,
                str(match.group("href") or "").strip(),
                str(match.group("body") or ""),
            )

    # MTX tabs often use plain anchors instead of item-card markup.
    generic_blocks = [block for kind, block in typed_blocks if kind == "mtx"]
    if not names and not typed_blocks:
        generic_blocks = [body]
    for block in generic_blocks:
        for match in _ANCHOR_RE.finditer(block):
            raw_text = str(match.group("body") or "")
            _append_unique_name(
                names,
                str(match.group("href") or "").strip(),
                raw_text,
            )
    return names


def build_seed_rows(
    *,
    fetch_html: Fetcher | None = None,
    sleep_seconds: float = 0.25,
) -> list[dict[str, str]]:
    fetcher = fetch_html or default_fetch_html
    rows: list[dict[str, str]] = []
    for big_category, urls in GROUPS.items():
        for original_url in urls:
            names_by_lang: dict[str, list[str]] = {}
            for lang in LANGUAGES:
                lang_url = to_lang_url(original_url, lang)
                html_text = fetcher(lang_url)
                names_by_lang[lang] = extract_items_from_poe2db_html(
                    html_text,
                    fragment=urlparse(lang_url).fragment or None,
                )
                if sleep_seconds > 0:
                    time.sleep(sleep_seconds)
            subcategory = page_slug(original_url).replace("_", " ")
            max_len = max((len(items) for items in names_by_lang.values()), default=0)
            for idx in range(max_len):
                row: dict[str, str] = {
                    "Категория": big_category,
                    "Подкатегория": subcategory,
                }
                for lang in LANGUAGES:
                    suffix = LANGUAGE_TO_SUFFIX[lang]
                    names = names_by_lang[lang]
                    row[f"Имя {suffix}"] = names[idx] if idx < len(names) else ""
                rows.append(row)
    return rows


def _preferred_seed_csv_lineterminator(output_path: Path) -> str:
    references = [output_path, _CANONICAL_SEED_CSV]
    for ref in references:
        try:
            if not ref.is_file():
                continue
            raw = ref.read_bytes()
        except OSError:
            continue
        if b"\r\n" in raw:
            return "\r\n"
        if b"\n" in raw:
            return "\n"
    return "\n"


def write_seed_csv(rows: list[dict[str, str]], output_path: Path) -> int:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    lineterminator = _preferred_seed_csv_lineterminator(output_path)
    with output_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=list(CSV_HEADERS),
            delimiter=";",
            lineterminator=lineterminator,
        )
        writer.writeheader()
        for row in rows:
            writer.writerow({k: str(row.get(k, "")) for k in CSV_HEADERS})
    return len(rows)


def read_seed_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        return [{k: str(v or "") for k, v in row.items()} for row in reader]


def generate_seed_csv(
    output_path: Path,
    *,
    fetch_html: Fetcher | None = None,
    sleep_seconds: float = 0.25,
) -> int:
    rows = build_seed_rows(fetch_html=fetch_html, sleep_seconds=sleep_seconds)
    return write_seed_csv(rows, output_path)
