import type { PaintedBatch, PaintLayer } from '../../../types/scene';

import {
    DEFAULT_MAP_LAYER_INDEX,
    DEFAULT_MAP_LAYER_TITLE,
} from './editorConstants';

// Initial state: layer 0 (map template, locked) plus one editable layer.
export function createInitialEditorLayers(): PaintLayer[] {
    return [
        {
            title: DEFAULT_MAP_LAYER_TITLE,
            visible: true,
            locked: true,
            batches: [],
        },
        {
            title: 'Слой 1',
            visible: true,
            locked: false,
            batches: [],
        },
    ];
}

// Default drawing layer when multiple layers exist: never the template layer.
export function preferredDrawingLayerIndex(layers: PaintLayer[]): number {
    return layers.length > 1 ? 1 : DEFAULT_MAP_LAYER_INDEX;
}

// Inserts an empty layer 0 (map template) when the first layer is not it.
// Used when loading older scenes that have no doodads layer.
export function ensureDefaultMapLayerFirst(layers: PaintLayer[]): PaintLayer[] {
    if (layers.length === 0) return createInitialEditorLayers();
    if (layers[DEFAULT_MAP_LAYER_INDEX]?.title === DEFAULT_MAP_LAYER_TITLE)
        return layers;
    return [
        {
            title: DEFAULT_MAP_LAYER_TITLE,
            visible: true,
            locked: true,
            batches: [],
        },
        ...layers,
    ];
}

// Deep copy of batches from the API response for writing into layers[0].batches.
export function cloneDefaultLayerBatches(
    raw: PaintedBatch[] | null | undefined,
): PaintedBatch[] {
    if (!raw?.length) return [];
    return raw.map((b) => ({
        template_name_ru: String(b.template_name_ru ?? ''),
        template_hash: Number(b.template_hash),
        placements: (b.placements ?? []).map((p) => ({
            x: Math.round(Number(p.x)),
            y: Math.round(Number(p.y)),
            r: Math.round(Number(p.r)),
        })),
        facet_fv:
            b.facet_fv === undefined || b.facet_fv === null
                ? b.facet_fv
                : Number(b.facet_fv),
        line_stroke: Boolean(b.line_stroke),
    }));
}
