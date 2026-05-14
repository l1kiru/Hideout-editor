import type { PaintLayer, PaintedBatch } from '../../../types/scene';
import { createUserPaintLayer } from './editorLayers';
import { layerId, type LayerId } from './editorIds';
import type { PlacementRef, SelectionState } from '../model/editorSessionTypes';
import { partitionRefsForCountChange } from './editorPlacementEligibility';
import { normalizeSelectionLayer0 } from './placementSelection';

type MoveSelectionFailureReason =
    | 'empty_selection'
    | 'no_eligible_refs'
    | 'missing_placement';

export type MoveSelectionToNewLayerResult =
    | {
          ok: false;
          reason: MoveSelectionFailureReason;
      }
    | {
          ok: true;
          nextLayers: PaintLayer[];
          targetLayerIdx: LayerId;
          nextSelected: PlacementRef[];
          movedCount: number;
          skippedCount: number;
      };

type ValidatedRef = {
    ref: PlacementRef;
    batch: PaintedBatch;
};

function compareRefs(a: PlacementRef, b: PlacementRef): number {
    return (
        a.layerIdx - b.layerIdx ||
        a.batchIdx - b.batchIdx ||
        a.placementIdx - b.placementIdx
    );
}

function validateSelectionRefs(
    layers: ReadonlyArray<PaintLayer>,
    selected: SelectionState,
): { validated: ValidatedRef[]; skippedCount: number } | MoveSelectionToNewLayerResult {
    if (selected.length === 0) {
        return { ok: false, reason: 'empty_selection' };
    }
    const { eligibleRefs, skippedRefs } = partitionRefsForCountChange(
        layers,
        selected,
    );
    const refs = [...eligibleRefs].sort(compareRefs);
    if (refs.length === 0) {
        return { ok: false, reason: 'no_eligible_refs' };
    }

    const validated: ValidatedRef[] = [];
    for (const ref of refs) {
        const batch = layers[ref.layerIdx]?.batches[ref.batchIdx];
        const placement = batch?.placements[ref.placementIdx];
        if (!batch || !placement) {
            return { ok: false, reason: 'missing_placement' };
        }
        validated.push({ ref, batch });
    }

    return { validated, skippedCount: skippedRefs.length };
}

export function moveSelectionToNewLayer(
    layers: ReadonlyArray<PaintLayer>,
    selected: SelectionState,
): MoveSelectionToNewLayerResult {
    const validated = validateSelectionRefs(layers, selected);
    if (!('validated' in validated)) {
        return validated;
    }
    const { validated: validatedRefs, skippedCount } = validated;

    const refsByBatch = new Map<string, PlacementRef[]>();
    for (const { ref } of validatedRefs) {
        const batchKey = `${ref.layerIdx}:${ref.batchIdx}`;
        const batchRefs = refsByBatch.get(batchKey);
        if (batchRefs) {
            batchRefs.push(ref);
        } else {
            refsByBatch.set(batchKey, [ref]);
        }
    }

    const destinationBatches: PaintedBatch[] = [];
    const nextSelected: PlacementRef[] = [];
    let destinationBatchIdx = 0;

    for (const { ref, batch } of validatedRefs) {
        const batchKey = `${ref.layerIdx}:${ref.batchIdx}`;
        if (!refsByBatch.has(batchKey)) {
            continue;
        }

        const batchRefs = refsByBatch.get(batchKey)!;
        refsByBatch.delete(batchKey);
        batchRefs.sort((a, b) => a.placementIdx - b.placementIdx);

        const placements = batchRefs.map((batchRef) => ({
            ...batch.placements[batchRef.placementIdx]!,
        }));
        destinationBatches.push({
            template_name_ru: batch.template_name_ru,
            template_hash: batch.template_hash,
            placements,
            facet_fv: batch.facet_fv,
            line_stroke: batch.line_stroke,
        });

        for (let placementIdx = 0; placementIdx < placements.length; placementIdx += 1) {
            nextSelected.push({
                layerIdx: layerId(layers.length),
                batchIdx: destinationBatchIdx,
                placementIdx,
            });
        }
        destinationBatchIdx += 1;
    }

    const removalKeys = new Set(
        validatedRefs.map(
            ({ ref }) => `${ref.layerIdx}:${ref.batchIdx}:${ref.placementIdx}`,
        ),
    );
    const nextLayers = layers.map((layer, layerIdxNumber) => ({
        ...layer,
        batches: layer.batches
            .map((batch, batchIdx) => ({
                ...batch,
                placements: batch.placements.filter(
                    (_, placementIdx) =>
                        !removalKeys.has(
                            `${layerIdxNumber}:${batchIdx}:${placementIdx}`,
                        ),
                ),
            }))
            .filter((batch) => batch.placements.length > 0),
    }));

    const targetLayerIdx = layerId(nextLayers.length);
    return {
        ok: true,
        nextLayers: [...nextLayers, createUserPaintLayer(destinationBatches)],
        targetLayerIdx,
        nextSelected: normalizeSelectionLayer0(nextSelected),
        movedCount: nextSelected.length,
        skippedCount,
    };
}
