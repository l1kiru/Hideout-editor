import type {
    AssetKey,
    Background,
    PaintedBatch,
    Tool,
    UiState,
} from '../../../types/scene';
import { DRAWING_ASSET_KEYS } from '../../../lib/sceneDecorations';

export function currentInputImageName(bgPath: string): string {
    const prefix = '/input/images/';
    if (!bgPath.startsWith(prefix)) return '';
    try {
        return decodeURIComponent(bgPath.slice(prefix.length));
    } catch {
        return '';
    }
}

export function defaultTool(): Tool {
    return {
        variant: 'select',
        draw_style: 'object',
        asset_key: 'faridun_ropes4',
        line_asset_key: 'faridun_ropes4',
        fill_asset_key: 'faridun_ropes4',
        spacing: 0,
        margin: 2,
        fv: 3,
        brush_width_view: 18,
        fill_step_world: 4,
        fill_max_placements: 120,
        fill_margin_world: -4,
        fill_mode: 'four_way',
        fill_mode_params: {
            radius_world: 24,
            min_passage_width_world: 2,
            cardinal_cost: 1,
            diagonal_cost: 1.4,
        },
        fill_connectivity: 4,
        fill_walls_scope: 'all_layers',
        eraser_targets: Object.fromEntries(
            DRAWING_ASSET_KEYS.map((k) => [k, true]),
        ) as Record<AssetKey, boolean>,
    };
}

export function defaultBackground(): Background {
    return {
        path: '',
        opacity: 0.55,
        scale: 1,
        rotation_deg: 0,
        crop_left_pct: 0,
        crop_top_pct: 0,
        crop_right_pct: 100,
        crop_bottom_pct: 100,
        offset_x: 0,
        offset_y: 0,
        width_view_base: null,
        locked: false,
    };
}

export function defaultUi(): UiState {
    return {
        drawing_enabled: true,
        show_template_dots: true,
        placement_preview_scale: 1,
    };
}

export function cloneBatches(batches: PaintedBatch[]): PaintedBatch[] {
    return batches.map((b) => ({
        ...b,
        placements: b.placements.map((p) => ({ ...p })),
    }));
}

export function eraserAffectsAsset(tool: Tool, key: AssetKey): boolean {
    const et = tool.eraser_targets;
    if (!et) return true;
    return et[key] !== false;
}

export function pointsFromBoundaryDoc(
    j: Record<string, unknown>,
): [number, number][] {
    const seq = j.points;
    if (!Array.isArray(seq)) return [];
    const out: [number, number][] = [];
    for (const item of seq) {
        if (Array.isArray(item) && item.length >= 2)
            out.push([Number(item[0]), Number(item[1])]);
        else if (item && typeof item === 'object' && 'x' in item && 'y' in item)
            out.push([
                Number((item as { x: number }).x),
                Number((item as { y: number }).y),
            ]);
    }
    return out.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
}
