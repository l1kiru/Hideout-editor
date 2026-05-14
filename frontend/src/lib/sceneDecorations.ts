import {
    EDITOR_ASSETS,
    EDITOR_ASSET_ORDER,
    LINE_FOOTPRINTS,
    TOOL_FV_ASSET_KEY as GENERATED_TOOL_FV_ASSET_KEY,
    UNKNOWN_DOODAD_VIEW_BOX as GENERATED_UNKNOWN_DOODAD_VIEW_BOX,
} from '../shared/generated/editorAssets';
import type { AssetKey } from '../types/scene';

export const DRAWING_ASSET_KEYS: AssetKey[] = [...EDITOR_ASSET_ORDER] as AssetKey[];

type Decoration = {
    title: string;
    nameRu: string;
    hash: number;
    fv: number;
    src: string;
    widthView: number;
    heightView: number;
};

export const DECORATIONS: Record<AssetKey, Decoration> = Object.fromEntries(
    DRAWING_ASSET_KEYS.map((key) => {
        const spec = EDITOR_ASSETS[key];
        return [
            key,
            {
                title: spec.title,
                nameRu: spec.nameRu,
                hash: spec.templateHash,
                fv: spec.defaultFv,
                src: spec.src,
                widthView: spec.widthView,
                heightView: spec.heightView,
            },
        ];
    }),
) as Record<AssetKey, Decoration>;

// Line tool step: matches the rope's widthView/heightView before preview icon scaling.
export const ROPE_POLYLINE_FOOTPRINT = LINE_FOOTPRINTS[
    GENERATED_TOOL_FV_ASSET_KEY
];
export const TOOL_FV_ASSET_KEY: AssetKey = GENERATED_TOOL_FV_ASSET_KEY;
export const LINE_STROKE_ANALYSIS_FOOTPRINT = {
    widthView: DECORATIONS[TOOL_FV_ASSET_KEY].widthView,
    heightView: DECORATIONS[TOOL_FV_ASSET_KEY].heightView,
};

export function assetKeyForTemplate(
    hash: number,
    facetFv?: number | null,
): AssetKey | null {
    const fvNum = facetFv == null ? null : Number(facetFv);
    if (fvNum != null && Number.isFinite(fvNum)) {
        for (const k of DRAWING_ASSET_KEYS) {
            const a = DECORATIONS[k];
            if (a.hash === hash && a.fv === fvNum)
                return k;
        }
    }
    // Legacy fallback for old scenes/batches without facet_fv.
    for (const k of DRAWING_ASSET_KEYS) {
        const a = DECORATIONS[k];
        if (a.hash === hash) {
            if (k === 'faridun_ropes4')
                return k;
            return k;
        }
    }
    return null;
}

// Fallback footprint for .hideout doodads that have no local asset (hit-test and zone checks).
export const UNKNOWN_DOODAD_VIEW_BOX = GENERATED_UNKNOWN_DOODAD_VIEW_BOX;

// Sprite size in view coordinates (used by hit-test, selection frame, zone limits).
export function templatePlacementFootprintView(
    templateHash: number,
    facetFv?: number | null,
): {
    widthView: number;
    heightView: number;
} {
    const ak = assetKeyForTemplate(templateHash, facetFv);
    if (ak) {
        const a = DECORATIONS[ak];
        return { widthView: a.widthView, heightView: a.heightView };
    }
    return UNKNOWN_DOODAD_VIEW_BOX;
}
