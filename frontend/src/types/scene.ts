// JSON scene type for the hideout-editor web app.
import editorSchema from '../shared/editorSchema.json';

export type PaintVariant =
    | 'faridun_ropes4'
    | 'faridun_ropes1'
    | 'moss'
    | 'sand'
    | 'maraketh_rubble1'
    | 'faridun_tools5'
    | 'leaf_pile3'
    | 'eraser'
    | 'select'
    | 'fill'
    | 'line';
// Runtime tool list sourced from the shared schema file (used by the validator).
export const TOOL_VARIANTS = editorSchema.toolVariants as PaintVariant[];
export type AssetKey =
    | 'faridun_ropes4'
    | 'faridun_ropes1'
    | 'moss'
    | 'sand'
    | 'maraketh_rubble1'
    | 'faridun_tools5'
    | 'leaf_pile3';
export type DrawStyle = 'object';
export type FillConnectivity = 4 | 8;
export type FillWallsScope = 'all_layers' | 'active_layer';
export type FillMode =
    | 'four_way'
    | 'eight_way_free'
    | 'eight_way_corner_safe'
    | 'orthogonal_first'
    | 'radius_limited'
    | 'narrow_passage_block'
    | 'weighted';
export const FILL_MODES = editorSchema.fillModes as FillMode[];
export type FillModeParams = {
    radius_world?: number;
    min_passage_width_world?: number;
    cardinal_cost?: number;
    diagonal_cost?: number;
};

export interface XY {
    x: number;
    y: number;
}

export interface XYZRPlacement {
    x: number;
    y: number;
    r: number;
}

export interface Boundary {
    points: XY[];
}

export interface PaintedBatch {
    template_name_ru: string;
    template_hash: number;
    placements: XYZRPlacement[];
    // When set, the .hideout export writes this fv on the batch doodads.
    facet_fv?: number | null;
    // Stored r value as in .hideout; faridun_ropes4 also receives a preview-time visual correction.
    line_stroke?: boolean;
}

export interface PaintLayer {
    title: string;
    visible: boolean;
    locked: boolean;
    batches: PaintedBatch[];
}

export interface Tool {
    variant: PaintVariant;
    draw_style: DrawStyle;
    // Last asset chosen in single-asset mode.
    asset_key?: AssetKey;
    // Asset chosen for the Line tool. Does not affect Fill.
    line_asset_key?: AssetKey;
    // Asset chosen for the Fill tool. Does not affect Line.
    fill_asset_key?: AssetKey;
    spacing: number;
    margin: number;
    fv: number;
    brush_width_view: number;
    // Fill: world-grid traversal step and distance between neighbouring placements (>= 1).
    fill_step_world?: number;
    // Fill: cap on placements added in a single run.
    fill_max_placements?: number;
    // Fill: zone-edge margin (world units). Negative values allow fill slightly
    // outside the boundary. UI displays the value with a +4 offset (default
    // -4 maps to 0 on screen).
    fill_margin_world?: number;
    // Fill: main flood-fill traversal mode.
    fill_mode?: FillMode;
    // Extra fill-mode parameters (radius, passage width, step weights).
    fill_mode_params?: FillModeParams;
    // Fill: flood-fill connectivity (4-way or 8-way).
    fill_connectivity?: FillConnectivity;
    // Fill: which layers are treated as walls.
    fill_walls_scope?: FillWallsScope;
    // When variant === 'eraser': which decoration kinds the eraser affects. Missing key means "all".
    eraser_targets?: Partial<Record<AssetKey, boolean>>;
}

export interface Background {
    path?: string;
    opacity?: number;
    scale?: number;
    rotation_deg?: number;
    crop_left_pct?: number;
    crop_top_pct?: number;
    crop_right_pct?: number;
    crop_bottom_pct?: number;
    offset_x?: number;
    offset_y?: number;
    width_view_base?: number | null;
    locked?: boolean;
    lock_anchor_view_x?: number | null;
    lock_anchor_view_y?: number | null;
    asset_id?: string | null;
}

export interface TemplateRef {
    template_id: string;
}

export interface UiState {
    drawing_enabled: boolean;
    show_template_dots: boolean;
    placement_preview_scale: number;
}

export interface Scene {
    scene_version: number;
    camera_deg: number;
    boundary: Boundary;
    template: TemplateRef;
    layers: PaintLayer[];
    tool: Tool;
    background: Background;
    ui?: UiState;
    template_dots_cache?: XY[] | null;
    hideout_map_display_name?: string | null;
    // Base map along the fork chain. Used for the .hideout export's
    // hideout_name (built-in or user-created base).
    lineage_base_display_name?: string | null;
}

export interface TemplateUploadResponse {
    template_id: string;
    hideout_name: string | null;
    hideout_hash: number | null;
    doodads_kept_count: number;
    dots: XY[];
    // Doodad placements for the "Default objects" layer (index 0).
    default_layer_batches?: PaintedBatch[];
    // Decorations without palette / non-standard fv: layer 1 when split, otherwise all decorations.
    decorations_layer_batches?: PaintedBatch[];
    // Palette decorations (rope, moss, sand identified by hash+fv): layer 2.
    decorations_palette_layer_batches?: PaintedBatch[];
}
