import { assetKeyForTemplate } from '../../../lib/sceneDecorations';
import type { AssetKey, PaintLayer, PaintedBatch } from '../../../types/scene';

import type { PlacementRef } from '../model/editorSessionTypes';
import { isDefaultMapLayer } from './editorLayers';
import { uniqRefs } from './placementSelection';

type BatchLike = Pick<PaintedBatch, 'template_hash' | 'facet_fv' | 'line_stroke'>;

type ClipboardBatchLike = BatchLike & {
    placements: ReadonlyArray<unknown>;
};

export type PlacementEligibility = {
    assetKey: AssetKey | null;
    hasKnownPreview: boolean;
    isLineStroke: boolean;
    eligibleForCountChange: boolean;
};

export function getPlacementEligibility(
    batch: BatchLike | null | undefined,
): PlacementEligibility {
    if (!batch) {
        return {
            assetKey: null,
            hasKnownPreview: false,
            isLineStroke: false,
            eligibleForCountChange: false,
        };
    }

    const assetKey = assetKeyForTemplate(batch.template_hash, batch.facet_fv);
    const isLineStroke = batch.line_stroke === true;
    return {
        assetKey,
        hasKnownPreview: assetKey !== null,
        isLineStroke,
        eligibleForCountChange: assetKey !== null,
    };
}

export function isBatchEligibleForCountChange(
    batch: BatchLike | null | undefined,
): boolean {
    return getPlacementEligibility(batch).eligibleForCountChange;
}

export function isBatchEligibleForClipboard(
    batch: BatchLike | null | undefined,
): boolean {
    return getPlacementEligibility(batch).hasKnownPreview;
}

export function isRefEligibleForCountChange(
    layers: ReadonlyArray<PaintLayer>,
    ref: PlacementRef,
): boolean {
    const layer = layers[ref.layerIdx];
    if (!layer) {
        return false;
    }
    return isBatchEligibleForCountChange(layer.batches[ref.batchIdx]);
}

export function partitionSelectionForCountChange(
    layers: ReadonlyArray<PaintLayer>,
    refs: ReadonlyArray<PlacementRef>,
): {
    lockedRefs: PlacementRef[];
    defaultLayerRefs: PlacementRef[];
    eligibleRefs: PlacementRef[];
    skippedRefs: PlacementRef[];
} {
    const lockedRefs: PlacementRef[] = [];
    const defaultLayerRefs: PlacementRef[] = [];
    const eligibleRefs: PlacementRef[] = [];
    const skippedRefs: PlacementRef[] = [];

    for (const ref of uniqRefs(refs)) {
        const layer = layers[ref.layerIdx];
        if (!layer) {
            skippedRefs.push(ref);
            continue;
        }
        if (layer.locked) {
            lockedRefs.push(ref);
            continue;
        }
        if (isDefaultMapLayer(layer)) {
            defaultLayerRefs.push(ref);
            continue;
        }
        if (isRefEligibleForCountChange(layers, ref)) {
            eligibleRefs.push(ref);
            continue;
        }
        skippedRefs.push(ref);
    }

    return {
        lockedRefs,
        defaultLayerRefs,
        eligibleRefs,
        skippedRefs,
    };
}

export function partitionSelectionForClipboard(
    layers: ReadonlyArray<PaintLayer>,
    refs: ReadonlyArray<PlacementRef>,
): {
    lockedRefs: PlacementRef[];
    defaultLayerRefs: PlacementRef[];
    eligibleRefs: PlacementRef[];
    skippedRefs: PlacementRef[];
} {
    const lockedRefs: PlacementRef[] = [];
    const defaultLayerRefs: PlacementRef[] = [];
    const eligibleRefs: PlacementRef[] = [];
    const skippedRefs: PlacementRef[] = [];

    for (const ref of uniqRefs(refs)) {
        const layer = layers[ref.layerIdx];
        if (!layer) {
            skippedRefs.push(ref);
            continue;
        }
        if (layer.locked) {
            lockedRefs.push(ref);
            continue;
        }
        if (isDefaultMapLayer(layer)) {
            defaultLayerRefs.push(ref);
            continue;
        }
        if (isBatchEligibleForClipboard(layer.batches[ref.batchIdx])) {
            eligibleRefs.push(ref);
            continue;
        }
        skippedRefs.push(ref);
    }

    return {
        lockedRefs,
        defaultLayerRefs,
        eligibleRefs,
        skippedRefs,
    };
}

export function partitionRefsForCountChange(
    layers: ReadonlyArray<PaintLayer>,
    refs: ReadonlyArray<PlacementRef>,
): {
    eligibleRefs: PlacementRef[];
    skippedRefs: PlacementRef[];
} {
    const eligibleRefs: PlacementRef[] = [];
    const skippedRefs: PlacementRef[] = [];

    for (const ref of uniqRefs(refs)) {
        if (isRefEligibleForCountChange(layers, ref)) {
            eligibleRefs.push(ref);
        } else {
            skippedRefs.push(ref);
        }
    }

    return { eligibleRefs, skippedRefs };
}

export function layerContainsIneligibleCountChangeObjects(
    layer: PaintLayer | null | undefined,
): boolean {
    if (!layer) {
        return false;
    }
    return layer.batches.some(
        (batch) =>
            batch.placements.length > 0 && !isBatchEligibleForCountChange(batch),
    );
}

export function partitionClipboardBatchesForCountChange<
    T extends ClipboardBatchLike,
>(batches: ReadonlyArray<T>): {
    eligibleBatches: T[];
    skippedBatches: T[];
    eligiblePlacementCount: number;
    skippedPlacementCount: number;
} {
    const eligibleBatches: T[] = [];
    const skippedBatches: T[] = [];
    let eligiblePlacementCount = 0;
    let skippedPlacementCount = 0;

    for (const batch of batches) {
        if (isBatchEligibleForCountChange(batch)) {
            eligibleBatches.push(batch);
            eligiblePlacementCount += batch.placements.length;
        } else {
            skippedBatches.push(batch);
            skippedPlacementCount += batch.placements.length;
        }
    }

    return {
        eligibleBatches,
        skippedBatches,
        eligiblePlacementCount,
        skippedPlacementCount,
    };
}

export function partitionClipboardBatchesForClipboard<
    T extends ClipboardBatchLike,
>(batches: ReadonlyArray<T>): {
    eligibleBatches: T[];
    skippedBatches: T[];
    eligiblePlacementCount: number;
    skippedPlacementCount: number;
} {
    const eligibleBatches: T[] = [];
    const skippedBatches: T[] = [];
    let eligiblePlacementCount = 0;
    let skippedPlacementCount = 0;

    for (const batch of batches) {
        if (isBatchEligibleForClipboard(batch)) {
            eligibleBatches.push(batch);
            eligiblePlacementCount += batch.placements.length;
        } else {
            skippedBatches.push(batch);
            skippedPlacementCount += batch.placements.length;
        }
    }

    return {
        eligibleBatches,
        skippedBatches,
        eligiblePlacementCount,
        skippedPlacementCount,
    };
}
