import type { TFunction } from 'i18next';

import type {
    PaintLayer,
    PaintLayerKind,
    PaintedBatch,
} from '../../../types/scene';

// Runtime import seam: uploaded or persisted scenes may still carry localized
// system-layer titles instead of stable `kind` values.
const LEGACY_SYSTEM_LAYER_KINDS: Readonly<Record<string, PaintLayerKind>> = {
    'объекты по умолчанию': 'default',
    'default objects': 'default',
    'украшения': 'decorations',
    'decorations': 'decorations',
    'imported decorations': 'decorations',
    'прочие импортированные объекты': 'decorations',
    'other imported objects': 'decorations',
    'палитра (верёвка, мох, песок)': 'palette',
    'palette decorations': 'palette',
    'объекты, распознанные как палитра': 'palette',
    'palette-recognized objects': 'palette',
};

function normalizeLayerTitle(title: string | null | undefined): string {
    return title?.trim().toLocaleLowerCase('ru') ?? '';
}

export function legacySystemLayerKindFromTitle(
    title: string | null | undefined,
): PaintLayerKind | undefined {
    const key = normalizeLayerTitle(title);
    return key ? LEGACY_SYSTEM_LAYER_KINDS[key] : undefined;
}

export function isDefaultMapLayer(
    layer: PaintLayer | null | undefined,
): boolean {
    return (
        layer?.kind === 'default'
        || legacySystemLayerKindFromTitle(layer?.title) === 'default'
    );
}

export function isImportedDecorationsLayer(
    layer: PaintLayer | null | undefined,
): boolean {
    return (
        layer?.kind === 'decorations'
        || legacySystemLayerKindFromTitle(layer?.title) === 'decorations'
    );
}

export function isNonDeletableSystemLayer(
    layer: PaintLayer | null | undefined,
): boolean {
    return isDefaultMapLayer(layer) || isImportedDecorationsLayer(layer);
}

export function normalizePaintLayer(layer: PaintLayer): PaintLayer {
    const legacyKind = legacySystemLayerKindFromTitle(layer.title);
    const nextKind =
        layer.kind ?? legacyKind ?? (layer.title?.trim() ? undefined : 'user');
    const trimmedTitle = layer.title?.trim() || undefined;
    const nextTitle =
        legacyKind !== undefined && legacyKind === nextKind
            ? undefined
            : trimmedTitle;

    if (
        nextKind === layer.kind
        && nextTitle === trimmedTitle
        && trimmedTitle === layer.title
    ) {
        return layer;
    }

    const nextLayer: PaintLayer = { ...layer };
    if (nextKind) nextLayer.kind = nextKind;
    if (nextTitle) nextLayer.title = nextTitle;
    else delete nextLayer.title;
    return nextLayer;
}

export function normalizePaintLayers(layers: PaintLayer[]): PaintLayer[] {
    return layers.map(normalizePaintLayer);
}

export function getLayerDisplayTitle(
    layer: PaintLayer,
    index: number,
    t: TFunction<'editor'>,
): string {
    const normalized = normalizePaintLayer(layer);
    const customTitle = normalized.title?.trim();
    if (customTitle) return customTitle;

    switch (normalized.kind) {
        case 'default':
            return t('layers.defaultLayerTitle');
        case 'decorations':
            return t('layers.importedDecorationsTitle');
        case 'palette':
            return t('layers.paletteRecognizedTitle');
        default:
            return t('layers.userLayerTitle', {
                index: Math.max(1, index),
            });
    }
}

export function createDefaultPaintLayer(
    batches: PaintedBatch[] = [],
): PaintLayer {
    return {
        kind: 'default',
        visible: true,
        locked: true,
        batches,
    };
}

export function createImportedDecorationsLayer(
    batches: PaintedBatch[] = [],
): PaintLayer {
    return {
        kind: 'decorations',
        visible: true,
        locked: false,
        batches,
    };
}

export function createPalettePaintLayer(
    batches: PaintedBatch[] = [],
): PaintLayer {
    return {
        kind: 'palette',
        visible: true,
        locked: false,
        batches,
    };
}

export function createUserPaintLayer(
    batches: PaintedBatch[] = [],
    title?: string,
): PaintLayer {
    const trimmedTitle = title?.trim();
    return {
        kind: 'user',
        ...(trimmedTitle ? { title: trimmedTitle } : {}),
        visible: true,
        locked: false,
        batches,
    };
}
