import type { AssetKey } from '../types/scene';

export const DRAWING_ASSET_KEYS: AssetKey[] = [
    'faridun_ropes4',
    'faridun_ropes1',
    'moss',
    'sand',
    'maraketh_rubble1',
    'faridun_tools5',
    'leaf_pile3',
];

export const DECORATIONS: Record<
    AssetKey,
    {
        title: string;
        nameRu: string;
        hash: number;
        fv: number;
        src: string;
        widthView: number;
        heightView: number;
    }
> = {
    faridun_ropes4: {
        title: 'Faridun Ropes 4',
        nameRu: 'Фаридунские верёвки 4',
        hash: 1675705915,
        fv: 3,
        src: '/decorations/FaridunRopes.webp',
        widthView: 10,
        heightView: 14,
    },
    faridun_ropes1: {
        title: 'Faridun Ropes 1',
        nameRu: 'Фаридунские верёвки 1',
        hash: 1675705915,
        fv: 0,
        src: '/decorations/faridun_ropes1.png',
        widthView: 13,
        heightView: 13,
    },
    sand: {
        title: 'Falling Sand 1',
        nameRu: 'Летающий песок',
        hash: 3853073345,
        fv: 0,
        src: '/decorations/FallingSand.webp',
        widthView: 12,
        heightView: 12,
    },
    moss: {
        title: 'Fringe Moss 3',
        nameRu: 'Мох с опушки 3',
        hash: 1459723677,
        fv: 2,
        src: '/decorations/FringeMoss.webp',
        widthView: 11,
        heightView: 10,
    },
    maraketh_rubble1: {
        title: 'Maraketh Rubble 1',
        nameRu: 'Маракетский щебень 1',
        hash: 3012657298,
        fv: 0,
        src: '/decorations/maraketh_rubble1.png',
        widthView: 15,
        heightView: 15,
    },
    faridun_tools5: {
        title: 'Faridun Tools 5',
        nameRu: 'Фаридунские инструменты 5',
        hash: 2233574719,
        fv: 4,
        src: '/decorations/faridun_tools5.png',
        widthView: 12,
        heightView: 12,
    },
    leaf_pile3: {
        title: 'Leaf Pile 3',
        nameRu: 'Куча листьев 3',
        hash: 4294658310,
        fv: 2,
        src: '/decorations/leaf_pile3.png',
        widthView: 12,
        heightView: 16,
    },
};

// Line tool step: matches the rope's widthView/heightView before preview icon scaling.
export const ROPE_POLYLINE_FOOTPRINT = { widthView: 4, heightView: 5 };
export const TOOL_FV_ASSET_KEY: AssetKey = 'faridun_ropes4';

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

// Legacy helper for old call sites; prefer `assetKeyForTemplate(hash, facetFv)`.
export function assetKeyForHash(hash: number): AssetKey | null {
    return assetKeyForTemplate(hash, null);
}

// Fallback footprint for .hideout doodads that have no local asset (hit-test and zone checks).
export const UNKNOWN_DOODAD_VIEW_BOX = { widthView: 12, heightView: 12 };

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
