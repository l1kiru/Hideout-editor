from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal, TypedDict, cast

ExportFvMode = Literal["scene_tool_or_batch", "fixed", "batch_or_zero"]


class AssetFootprint(TypedDict):
    widthView: int
    heightView: int


class EditorAssetSpec(TypedDict, total=False):
    title: str
    nameRu: str
    exportName: str
    templateHash: int
    defaultFv: int
    src: str
    widthView: int
    heightView: int
    paletteExact: bool
    allowToolFvOverride: bool
    exportFvMode: ExportFvMode
    fixedExportFv: int


class EditorAssetsManifest(TypedDict):
    version: int
    assetOrder: list[str]
    legacyAliases: dict[str, str]
    toolFvAssetKey: str
    unknownDoodadFootprint: AssetFootprint
    lineFootprints: dict[str, AssetFootprint]
    assets: dict[str, EditorAssetSpec]


def _manifest_path() -> Path:
    return Path(__file__).resolve().parents[2] / "shared" / "catalog" / "editorAssets.json"


@lru_cache(maxsize=1)
def load_editor_assets_manifest() -> EditorAssetsManifest:
    raw = json.loads(_manifest_path().read_text(encoding="utf-8"))
    return cast(EditorAssetsManifest, raw)


@lru_cache(maxsize=1)
def drawing_asset_keys() -> tuple[str, ...]:
    return tuple(load_editor_assets_manifest()["assetOrder"])


@lru_cache(maxsize=1)
def legacy_asset_aliases() -> dict[str, str]:
    return dict(load_editor_assets_manifest()["legacyAliases"])


@lru_cache(maxsize=1)
def asset_specs_by_key() -> dict[str, EditorAssetSpec]:
    return {
        key: dict(value)
        for key, value in load_editor_assets_manifest()["assets"].items()
    }


def asset_key_for_template(
    template_hash: int,
    facet_fv: int | None = None,
) -> str | None:
    specs = asset_specs_by_key()
    for key in drawing_asset_keys():
        spec = specs[key]
        if (
            int(spec["templateHash"]) == int(template_hash)
            and facet_fv is not None
            and int(spec["defaultFv"]) == int(facet_fv)
        ):
            return key
    for key in drawing_asset_keys():
        spec = specs[key]
        if int(spec["templateHash"]) == int(template_hash):
            return key
    return None


def export_name_for_batch(
    template_hash: int,
    facet_fv: int | None = None,
) -> str | None:
    key = asset_key_for_template(template_hash, facet_fv)
    if key is None:
        return None
    spec = asset_specs_by_key()[key]
    export_name = spec.get("exportName")
    if export_name is None:
        return None
    return str(export_name).strip() or None


def is_palette_exact_hash_fv(
    template_hash: int,
    facet_fv: int | None,
) -> bool:
    if facet_fv is None:
        return False
    key = asset_key_for_template(template_hash, facet_fv)
    if key is None:
        return False
    spec = asset_specs_by_key()[key]
    return bool(spec.get("paletteExact", False)) and int(spec["defaultFv"]) == int(
        facet_fv,
    )


def is_palette_exact_doodad_spec(spec: dict[str, Any]) -> bool:
    try:
        template_hash = int(spec["hash"])
    except (KeyError, TypeError, ValueError):
        return False
    fv_raw = spec.get("fv")
    if fv_raw is None:
        return False
    try:
        facet_fv = int(fv_raw)
    except (TypeError, ValueError):
        return False
    return is_palette_exact_hash_fv(template_hash, facet_fv)


def export_fv_for_batch(
    template_hash: int,
    *,
    batch_facet_fv: int | None,
    scene_tool_fv: int,
) -> int:
    key = asset_key_for_template(template_hash, batch_facet_fv)
    if key is None:
        return int(batch_facet_fv) if batch_facet_fv is not None else 0
    spec = asset_specs_by_key()[key]
    mode = cast(ExportFvMode, spec.get("exportFvMode", "batch_or_zero"))
    if mode == "fixed":
        fixed = spec.get("fixedExportFv")
        return int(fixed) if fixed is not None else int(spec["defaultFv"])
    if mode == "scene_tool_or_batch":
        return int(batch_facet_fv) if batch_facet_fv is not None else int(scene_tool_fv)
    return int(batch_facet_fv) if batch_facet_fv is not None else 0
