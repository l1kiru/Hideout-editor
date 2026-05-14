from __future__ import annotations

# JSON scene: boundary, template ref, layers, batches, background, tool.

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from hideout_core.config.editor_assets import (
    asset_specs_by_key,
    drawing_asset_keys,
    legacy_asset_aliases,
    load_editor_assets_manifest,
)

SCENE_VERSION = 2
MIN_SCENE_COORD = -1_000_000
MAX_SCENE_COORD = 1_000_000
MIN_SCENE_ROTATION = -360_000
MAX_SCENE_ROTATION = 360_000
MAX_TEMPLATE_HASH = 4_294_967_295

PAINT_LAYER_KINDS = ("default", "decorations", "palette", "user")
DRAW_STYLES = ("line", "brush", "object")
TOOL_MODE_VARIANTS = ("eraser", "select", "line", "fill")
FILL_MODES = (
    "four_way",
    "eight_way_free",
    "eight_way_corner_safe",
    "orthogonal_first",
    "radius_limited",
    "narrow_passage_block",
    "weighted",
)
FILL_CONNECTIVITY = (4, 8)
FILL_WALLS_SCOPE = ("all_layers", "active_layer")
TOOL_VARIANTS = (*drawing_asset_keys(), *TOOL_MODE_VARIANTS)
# Runtime import seam: persisted/uploaded scenes may still arrive with a legacy
# alias such as `rope`, even though the editor now stores manifest-backed asset
# keys in the canonical tool contract.
LEGACY_TOOL_VARIANTS = tuple(legacy_asset_aliases().keys())
ACCEPTED_TOOL_VARIANTS = (*TOOL_VARIANTS, *LEGACY_TOOL_VARIANTS)
DEFAULT_TOOL_VARIANT = str(load_editor_assets_manifest()["toolFvAssetKey"])
DEFAULT_TOOL_FV = int(asset_specs_by_key()[DEFAULT_TOOL_VARIANT]["defaultFv"])


def build_editor_scene_contract_artifact() -> dict[str, object]:
    return {
        "sceneVersion": SCENE_VERSION,
        "paintLayerKinds": list(PAINT_LAYER_KINDS),
        "drawStyles": list(DRAW_STYLES),
        "toolVariants": list(TOOL_VARIANTS),
        "legacyToolVariants": list(LEGACY_TOOL_VARIANTS),
        "acceptedToolVariants": list(ACCEPTED_TOOL_VARIANTS),
        "fillModes": list(FILL_MODES),
        "fillConnectivity": list(FILL_CONNECTIVITY),
        "fillWallsScope": list(FILL_WALLS_SCOPE),
    }


class XY(BaseModel):
    x: int = Field(ge=MIN_SCENE_COORD, le=MAX_SCENE_COORD)
    y: int = Field(ge=MIN_SCENE_COORD, le=MAX_SCENE_COORD)


class XYZRPlacement(BaseModel):
    x: int = Field(ge=MIN_SCENE_COORD, le=MAX_SCENE_COORD)
    y: int = Field(ge=MIN_SCENE_COORD, le=MAX_SCENE_COORD)
    r: int = Field(ge=MIN_SCENE_ROTATION, le=MAX_SCENE_ROTATION)


class BoundaryModel(BaseModel):
    points: list[XY] = Field(min_length=3)


class PaintedBatchModel(BaseModel):
    template_name_ru: str
    template_hash: int = Field(ge=0, le=MAX_TEMPLATE_HASH)
    placements: list[XYZRPlacement] = Field(default_factory=list)
    facet_fv: int | None = Field(
        default=None,
        ge=0,
        description="Fv в экспорте .hideout; если None — берётся tool.fv сцены.",
    )
    line_stroke: bool | None = Field(
        default=None,
        description="Штрих «Линия»; r хранится для экспорта .hideout (frontend может применять preview-коррекцию legacy-спрайтов).",
    )


class PaintLayerModel(BaseModel):
    kind: Literal["default", "decorations", "palette", "user"] | None = None
    title: str | None = None
    visible: bool = True
    locked: bool = False
    batches: list[PaintedBatchModel] = Field(default_factory=list)


class ToolModel(BaseModel):
    # Tool settings are intentionally forward-compatible: frontend may persist
    # tool-specific options unknown to this backend version.
    model_config = ConfigDict(extra="allow")

    variant: str = DEFAULT_TOOL_VARIANT
    draw_style: Literal["line", "brush", "object"] = "object"
    spacing: float = 3.0
    margin: float = 3.0
    fv: int = DEFAULT_TOOL_FV
    brush_width_view: float = 24.0
    fill_step_world: float | None = Field(
        default=None,
        description="Заливка: шаг обхода world-сетки и расстояние между соседними объектами (>=1).",
    )
    fill_max_placements: int | None = Field(
        default=None,
        description="Заливка: максимум добавляемых объектов за один запуск.",
    )
    fill_margin_world: float | None = Field(
        default=None,
        description=(
            "Заливка: отступ от края зоны (мир). Может быть отрицательным — "
            "тогда заливка заходит за границу. UI отображает значение со "
            "смещением +4 (дефолт −4 показан как 0)."
        ),
    )
    fill_mode: Literal[
        "four_way",
        "eight_way_free",
        "eight_way_corner_safe",
        "orthogonal_first",
        "radius_limited",
        "narrow_passage_block",
        "weighted",
    ] | None = Field(
        default=None,
        description="Заливка: режим обхода области.",
    )
    fill_mode_params: dict[str, float] | None = Field(
        default=None,
        description=(
            "Параметры режима заливки: radius_world, min_passage_width_world, "
            "cardinal_cost, diagonal_cost."
        ),
    )
    fill_connectivity: Literal[4, 8] | None = Field(
        default=None,
        description="Заливка: связность flood-fill (4-way или 8-way).",
    )
    fill_walls_scope: Literal["all_layers", "active_layer"] | None = Field(
        default=None,
        description="Заливка: какие слои считать стенами (все или только активный).",
    )
    eraser_targets: dict[str, bool] | None = Field(
        default=None,
        description=(
            "Фронт: для стерки — какие asset key удалять "
            "(включая faridun_ropes4/faridun_ropes1/moss/sand и др.)."
        ),
    )

    @field_validator("variant")
    @classmethod
    def validate_variant(cls, v: str) -> str:
        vv = str(v).strip()
        if vv not in ACCEPTED_TOOL_VARIANTS:
            raise ValueError(
                "Input should be one of: "
                + ", ".join(repr(x) for x in ACCEPTED_TOOL_VARIANTS),
            )
        return vv


class BackgroundModel(BaseModel):
    path: str = ""
    opacity: float = 0.55
    scale: float = 1.0
    rotation_deg: float = 0.0
    crop_left_pct: float = 0.0
    crop_top_pct: float = 0.0
    crop_right_pct: float = 100.0
    crop_bottom_pct: float = 100.0
    offset_x: float = 0.0
    offset_y: float = 0.0
    width_view_base: float | None = None
    locked: bool = False
    lock_anchor_view_x: float | None = None
    lock_anchor_view_y: float | None = None
    asset_id: str | None = None


class TemplateRefModel(BaseModel):
    # Server-side .hideout template id; empty means draft (export unavailable).

    template_id: str = ""


class UiModel(BaseModel):
    drawing_enabled: bool = True
    show_template_dots: bool = True
    placement_preview_scale: float = Field(
        default=1.0,
        ge=0.2,
        le=8.0,
        description="Множитель радиуса маркеров размещения в превью редактора.",
    )


class SceneModel(BaseModel):
    model_config = ConfigDict(extra="ignore")

    scene_version: Literal[2] = SCENE_VERSION
    camera_deg: float = Field(default=45.0, ge=-180, le=180)
    boundary: BoundaryModel
    template: TemplateRefModel = Field(default_factory=TemplateRefModel)
    layers: list[PaintLayerModel] = Field(min_length=1)
    tool: ToolModel = Field(default_factory=ToolModel)
    background: BackgroundModel = Field(default_factory=BackgroundModel)
    ui: UiModel | None = None
    template_dots_cache: list[XY] | None = Field(
        default=None,
        description="Кэш точек шаблона при сохранении сцены в файл (не в .hideout).",
    )
    hideout_map_display_name: str | None = Field(
        default=None,
        description="Имя карты hideout (из SQLite), к которой привязана текущая работа с границей.",
    )
    lineage_base_display_name: str | None = Field(
        default=None,
        description=(
            "Базовая карта по цепочке fork (встроенная или пользовательская); "
            "для экспорта .hideout — выбор hideout_name в шапке файла."
        ),
    )


class TemplateLoadResponse(BaseModel):
    template_id: str
    hideout_name: str | None = None
    hideout_hash: int | None = None
    doodads_kept_count: int
    dots: list[XY]
    default_layer_batches: list[PaintedBatchModel] = Field(
        default_factory=list,
        description="Плейсменты из doodads для слоя 0 редактора (по одному батчу на doodad).",
    )
    decorations_layer_batches: list[PaintedBatchModel] = Field(
        default_factory=list,
        description="Украшения без «точной» палитры — слой 1 при разбиении или все украшения.",
    )
    decorations_palette_layer_batches: list[PaintedBatchModel] = Field(
        default_factory=list,
        description="Верёвка/мох/песок как в палитре (hash+fv) — слой 2 при импорте.",
    )


