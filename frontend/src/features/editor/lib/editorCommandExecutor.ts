import type { Background, PaintLayer, PaintedBatch } from '../../../types/scene';
import { cloneBatches, cloneLayers } from './editorDefaults';
import { layerId, type LayerId } from './editorIds';
import { refKey } from './placementSelection';
import type {
    EditorCommand,
    PlacementRef,
    PlacementTransformUpdate,
    RemovedBatchSnapshot,
} from '../model/editorSessionTypes';

export type EditorCommandTargetState = {
    layers: PaintLayer[];
    background: Background;
    bgSelected: boolean;
    selected?: PlacementRef[];
    layerIdx?: LayerId;
};

function batchKey(layerIdx: LayerId, batchIdx: number): string {
    return `${layerIdx}:${batchIdx}`;
}

function cloneRef(ref: PlacementRef): PlacementRef {
    return {
        layerIdx: ref.layerIdx,
        batchIdx: ref.batchIdx,
        placementIdx: ref.placementIdx,
    };
}

function cloneSelection(selection: PlacementRef[]): PlacementRef[] {
    return selection.map(cloneRef);
}

function clonePlacementTransformUpdates(
    updates: PlacementTransformUpdate[],
): PlacementTransformUpdate[] {
    return updates.map((update) => ({
        ref: cloneRef(update.ref),
        x: update.x,
        y: update.y,
        r: update.r,
    }));
}

function cloneRemovedSnapshot(
    snapshot: RemovedBatchSnapshot,
): RemovedBatchSnapshot {
    return {
        layerIdx: snapshot.layerIdx,
        batchIdx: snapshot.batchIdx,
        itemIdx: snapshot.itemIdx,
        batch: cloneBatches([snapshot.batch])[0]!,
    };
}

function cloneRemovedSnapshots(
    snapshots: RemovedBatchSnapshot[],
): RemovedBatchSnapshot[] {
    return snapshots.map(cloneRemovedSnapshot);
}

function setSelectedIfPresent(
    state: EditorCommandTargetState,
    selected: PlacementRef[],
): void {
    if ('selected' in state) {
        state.selected = cloneSelection(selected);
    }
}

function setActiveLayerIfPresent(
    state: EditorCommandTargetState,
    activeLayerIdx: LayerId,
): void {
    if ('layerIdx' in state) {
        state.layerIdx = activeLayerIdx;
    }
}

function clearBgSelectionIfRequested(
    state: EditorCommandTargetState,
    clearBgSelection: boolean | undefined,
): void {
    if (clearBgSelection) {
        state.bgSelected = false;
    }
}

function applyPlacementTransformsToLayers(
    layers: PaintLayer[],
    updates: PlacementTransformUpdate[],
): PaintLayer[] {
    if (updates.length === 0) return layers;

    const updatesByRefKey = new Map(
        updates.map((update) => [refKey(update.ref), update] as const),
    );

    return layers.map((layer, layerIndex) => ({
        ...layer,
        batches: layer.batches.map((batch, batchIndex) => ({
            ...batch,
            placements: batch.placements.map((placement, placementIndex) => {
                const update = updatesByRefKey.get(
                    refKey({
                        layerIdx: layerId(layerIndex),
                        batchIdx: batchIndex,
                        placementIdx: placementIndex,
                    }),
                );
                if (!update) return placement;
                return {
                    ...placement,
                    x: update.x,
                    y: update.y,
                    r: update.r,
                };
            }),
        })),
    }));
}

function applyPlacementAppendToLayers(
    layers: PaintLayer[],
    layerIdx: LayerId,
    batches: PaintedBatch[],
    insertAt: number,
): PaintLayer[] {
    return layers.map((layer, currentLayerIdx) => {
        if (currentLayerIdx !== layerIdx) return layer;
        const boundedInsertAt = Math.max(
            0,
            Math.min(insertAt, layer.batches.length),
        );
        const nextBatches = cloneBatches(batches);
        return {
            ...layer,
            batches: [
                ...layer.batches.slice(0, boundedInsertAt),
                ...nextBatches,
                ...layer.batches.slice(boundedInsertAt),
            ],
        };
    });
}

function applyPlacementDeleteToLayers(
    layers: PaintLayer[],
    refs: PlacementRef[],
    removed: RemovedBatchSnapshot[],
): PaintLayer[] {
    if (refs.length === 0 && removed.length === 0) return layers;

    const wholeBatchKeys = new Set(
        removed
            .filter((snapshot) => snapshot.itemIdx == null)
            .map((snapshot) => batchKey(snapshot.layerIdx, snapshot.batchIdx)),
    );
    const itemKeys = new Set([
        ...refs.map(refKey),
        ...removed
            .filter((snapshot) => snapshot.itemIdx != null)
            .map((snapshot) =>
                refKey({
                    layerIdx: snapshot.layerIdx,
                    batchIdx: snapshot.batchIdx,
                    placementIdx: snapshot.itemIdx!,
                }),
            ),
    ]);

    return layers.map((layer, layerIndex) => ({
        ...layer,
        batches: layer.batches
            .map((batch, batchIndex): PaintedBatch | null => {
                const currentLayerIdx = layerId(layerIndex);
                if (wholeBatchKeys.has(batchKey(currentLayerIdx, batchIndex))) {
                    return null;
                }
                const placements = batch.placements.filter(
                    (_, placementIndex) =>
                        !itemKeys.has(
                            refKey({
                                layerIdx: currentLayerIdx,
                                batchIdx: batchIndex,
                                placementIdx: placementIndex,
                            }),
                        ),
                );
                if (placements.length === 0) return null;
                return { ...batch, placements };
            })
            .filter((batch): batch is PaintedBatch => batch !== null),
    }));
}

function compareRemovedSnapshots(
    a: RemovedBatchSnapshot,
    b: RemovedBatchSnapshot,
): number {
    return (
        a.layerIdx - b.layerIdx ||
        a.batchIdx - b.batchIdx ||
        (a.itemIdx ?? -1) - (b.itemIdx ?? -1)
    );
}

function applyPlacementRestoreToLayers(
    layers: PaintLayer[],
    removed: RemovedBatchSnapshot[],
): PaintLayer[] {
    if (removed.length === 0) return layers;

    const nextLayers = cloneLayers(layers);
    const wholeBatchSnapshots = removed
        .filter((snapshot) => snapshot.itemIdx == null)
        .sort(compareRemovedSnapshots);
    const partialSnapshots = removed
        .filter((snapshot) => snapshot.itemIdx != null)
        .sort(compareRemovedSnapshots);

    for (const snapshot of wholeBatchSnapshots) {
        const layer = nextLayers[snapshot.layerIdx];
        if (!layer) continue;
        const insertAt = Math.max(
            0,
            Math.min(snapshot.batchIdx, layer.batches.length),
        );
        layer.batches.splice(insertAt, 0, cloneBatches([snapshot.batch])[0]!);
    }

    for (const snapshot of partialSnapshots) {
        const itemIdx = snapshot.itemIdx;
        if (itemIdx == null) continue;
        const layer = nextLayers[snapshot.layerIdx];
        const targetBatch = layer?.batches[snapshot.batchIdx];
        const placement = snapshot.batch.placements[itemIdx];
        if (!targetBatch || !placement) continue;
        const insertAt = Math.max(
            0,
            Math.min(itemIdx, targetBatch.placements.length),
        );
        targetBatch.placements.splice(insertAt, 0, { ...placement });
    }

    return nextLayers;
}

function refsFromRemovedSnapshots(
    removed: RemovedBatchSnapshot[],
): PlacementRef[] {
    return removed.flatMap((snapshot) => {
        if (snapshot.itemIdx != null) {
            return [
                {
                    layerIdx: snapshot.layerIdx,
                    batchIdx: snapshot.batchIdx,
                    placementIdx: snapshot.itemIdx,
                },
            ];
        }
        return snapshot.batch.placements.map((_, placementIdx) => ({
            layerIdx: snapshot.layerIdx,
            batchIdx: snapshot.batchIdx,
            placementIdx,
        }));
    });
}

export function placementRefsForInsertedBatches(
    layerIdx: LayerId,
    batches: PaintedBatch[],
    insertAt: number,
): PlacementRef[] {
    return batches.flatMap((batch, batchOffset) =>
        batch.placements.map((_, placementIdx) => ({
            layerIdx,
            batchIdx: insertAt + batchOffset,
            placementIdx,
        })),
    );
}

export function collectRemovedBatchSnapshots(
    layers: PaintLayer[],
    refs: PlacementRef[],
): RemovedBatchSnapshot[] {
    const refsByBatch = new Map<string, Set<number>>();
    for (const ref of refs) {
        if (ref.placementIdx < 0) continue;
        const key = batchKey(ref.layerIdx, ref.batchIdx);
        const placementIndices = refsByBatch.get(key) ?? new Set<number>();
        placementIndices.add(ref.placementIdx);
        refsByBatch.set(key, placementIndices);
    }

    const removed: RemovedBatchSnapshot[] = [];
    layers.forEach((layer, layerIndex) => {
        const currentLayerIdx = layerId(layerIndex);
        layer.batches.forEach((batch, batchIdx) => {
            const selectedIndices = refsByBatch.get(
                batchKey(currentLayerIdx, batchIdx),
            );
            if (!selectedIndices) return;
            const validIndices = [...selectedIndices]
                .filter((itemIdx) => itemIdx >= 0 && itemIdx < batch.placements.length)
                .sort((a, b) => a - b);
            if (validIndices.length === 0) return;

            const clonedBatch = cloneBatches([batch])[0]!;
            if (validIndices.length >= batch.placements.length) {
                removed.push({
                    layerIdx: currentLayerIdx,
                    batchIdx,
                    batch: clonedBatch,
                });
                return;
            }

            for (const itemIdx of validIndices) {
                removed.push({
                    layerIdx: currentLayerIdx,
                    batchIdx,
                    itemIdx,
                    batch: clonedBatch,
                });
            }
        });
    });

    return removed;
}

export function applyEditorCommand(
    state: EditorCommandTargetState,
    command: EditorCommand,
): void {
    if (command.type === 'placement_transform') {
        state.layers = applyPlacementTransformsToLayers(state.layers, command.after);
        clearBgSelectionIfRequested(state, command.clearBgSelection);
        return;
    }

    if (command.type === 'background_transform') {
        state.background = { ...command.after };
        clearBgSelectionIfRequested(state, command.clearBgSelection);
        return;
    }

    if (command.type === 'placement_append') {
        state.layers = applyPlacementAppendToLayers(
            state.layers,
            command.layerIdx,
            command.batches,
            command.insertAt,
        );
        setSelectedIfPresent(state, command.nextSelection);
        clearBgSelectionIfRequested(state, command.clearBgSelection);
        return;
    }

    if (command.type === 'placement_delete') {
        state.layers = applyPlacementDeleteToLayers(
            state.layers,
            command.refs,
            command.removed,
        );
        setSelectedIfPresent(state, command.nextSelection);
        clearBgSelectionIfRequested(state, command.clearBgSelection);
        return;
    }

    if (command.type === 'placement_restore') {
        state.layers = applyPlacementRestoreToLayers(state.layers, command.removed);
        setSelectedIfPresent(state, command.nextSelection);
        clearBgSelectionIfRequested(state, command.clearBgSelection);
        return;
    }

    if (command.type === 'layer_replace_batches') {
        state.layers = state.layers.map((layer, currentLayerIdx) =>
            currentLayerIdx === command.layerIdx
                ? { ...layer, batches: cloneBatches(command.after) }
                : layer,
        );
        setSelectedIfPresent(state, command.nextSelection);
        clearBgSelectionIfRequested(state, command.clearBgSelection);
        return;
    }

    state.layers = cloneLayers(command.after);
    setActiveLayerIfPresent(state, command.nextActiveLayerIdx);
    setSelectedIfPresent(state, command.nextSelection);
    clearBgSelectionIfRequested(state, command.clearBgSelection);
}

export function invertEditorCommand(command: EditorCommand): EditorCommand {
    if (command.type === 'placement_transform') {
        return {
            type: 'placement_transform',
            before: clonePlacementTransformUpdates(command.after),
            after: clonePlacementTransformUpdates(command.before),
            clearBgSelection: command.clearBgSelection,
        };
    }

    if (command.type === 'background_transform') {
        return {
            type: 'background_transform',
            before: { ...command.after },
            after: { ...command.before },
            clearBgSelection: command.clearBgSelection,
        };
    }

    if (command.type === 'placement_append') {
        const removed = command.batches.map((batch, batchOffset) => ({
            layerIdx: command.layerIdx,
            batchIdx: command.insertAt + batchOffset,
            batch: cloneBatches([batch])[0]!,
        }));
        return {
            type: 'placement_delete',
            refs: placementRefsForInsertedBatches(
                command.layerIdx,
                command.batches,
                command.insertAt,
            ),
            removed,
            previousSelection: cloneSelection(command.nextSelection),
            nextSelection: cloneSelection(command.previousSelection),
            clearBgSelection: command.clearBgSelection,
        };
    }

    if (command.type === 'placement_delete') {
        return {
            type: 'placement_restore',
            removed: cloneRemovedSnapshots(command.removed),
            previousSelection: cloneSelection(command.nextSelection),
            nextSelection: cloneSelection(command.previousSelection),
            clearBgSelection: command.clearBgSelection,
        };
    }

    if (command.type === 'placement_restore') {
        return {
            type: 'placement_delete',
            refs: refsFromRemovedSnapshots(command.removed),
            removed: cloneRemovedSnapshots(command.removed),
            previousSelection: cloneSelection(command.nextSelection),
            nextSelection: cloneSelection(command.previousSelection),
            clearBgSelection: command.clearBgSelection,
        };
    }

    if (command.type === 'layer_replace_batches') {
        return {
            type: 'layer_replace_batches',
            layerIdx: command.layerIdx,
            before: cloneBatches(command.after),
            after: cloneBatches(command.before),
            previousSelection: cloneSelection(command.nextSelection),
            nextSelection: cloneSelection(command.previousSelection),
            clearBgSelection: command.clearBgSelection,
        };
    }

    return {
        type: 'layer_structure',
        before: cloneLayers(command.after),
        after: cloneLayers(command.before),
        previousActiveLayerIdx: command.nextActiveLayerIdx,
        nextActiveLayerIdx: command.previousActiveLayerIdx,
        previousSelection: cloneSelection(command.nextSelection),
        nextSelection: cloneSelection(command.previousSelection),
        clearBgSelection: command.clearBgSelection,
    };
}
