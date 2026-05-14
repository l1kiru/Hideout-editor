import {
    applyEditorCommand,
    collectRemovedBatchSnapshots,
    invertEditorCommand,
} from '../../../features/editor/lib/editorCommandExecutor';
import { cloneBatches, cloneLayers } from '../../../features/editor/lib/editorDefaults';
import { refKey } from '../../../features/editor/lib/placementSelection';
import type {
    EditorStoreActions,
    EditorStoreGet,
    EditorStoreSet,
} from '../editorStoreTypes';

export function createPlacementCommandSlice(
    set: EditorStoreSet,
    get: EditorStoreGet,
): Pick<
    EditorStoreActions,
    | 'deleteSelected'
    | 'executeEditorCommand'
    | 'applyPlacementTransforms'
    | 'rotateSelected'
    | 'mirrorSelected'
    | 'transformBackground'
    | 'replaceLayerBatches'
    | 'appendBatchToLayer'
    | 'appendBatchesToLayer'
    | 'applyLayerStructureChange'
> {
    const applyPlacementTransforms = (
        refs: Parameters<EditorStoreActions['applyPlacementTransforms']>[0]['refs'],
        updates: Parameters<EditorStoreActions['applyPlacementTransforms']>[0]['updates'],
        label: string,
    ) => {
        if (refs.length === 0 || updates.length === 0) return;

        const before = refs
            .map((ref) => {
                const placement =
                    get().layers[ref.layerIdx]?.batches[ref.batchIdx]?.placements[
                        ref.placementIdx
                    ];
                if (!placement) return null;
                return {
                    ref,
                    x: placement.x,
                    y: placement.y,
                    r: placement.r,
                };
            })
            .filter((update) => update !== null);
        const validRefs = new Set(before.map((update) => refKey(update.ref)));
        const after = updates.filter((update) => validRefs.has(refKey(update.ref)));
        if (before.length === 0 || after.length === 0) return;

        executeEditorCommand(
            {
                type: 'placement_transform',
                before,
                after,
                clearBgSelection: true,
            },
            label,
        );
    };

    const executeEditorCommand = (
        command: Parameters<EditorStoreActions['executeEditorCommand']>[0]['command'],
        label: string,
    ) => {
        get().pushCommandUndo(invertEditorCommand(command), label);
        set((state) => {
            applyEditorCommand(state, command);
        });
    };

    return {
        deleteSelected: ({ refs, label }) => {
            if (refs.length === 0) return;

            const removed = collectRemovedBatchSnapshots(get().layers, refs);
            if (removed.length === 0) return;

            executeEditorCommand(
                {
                    type: 'placement_delete',
                    refs,
                    removed,
                    previousSelection: get().selected,
                    nextSelection: [],
                    clearBgSelection: true,
                },
                label,
            );
        },

        applyPlacementTransforms: ({ refs, updates, label }) => {
            applyPlacementTransforms(refs, updates, label);
        },

        executeEditorCommand: ({ command, label }) => {
            executeEditorCommand(command, label);
        },

        rotateSelected: ({ refs, updates, label }) => {
            applyPlacementTransforms(refs, updates, label);
        },

        mirrorSelected: ({ refs, updates, label }) => {
            applyPlacementTransforms(refs, updates, label);
        },

        transformBackground: ({
            label,
            updater,
            clearBgSelection = false,
            recordUndo = true,
        }) => {
            const before = { ...get().background };
            const command = {
                type: 'background_transform' as const,
                before,
                after: updater(before),
                clearBgSelection,
            };

            if (recordUndo) {
                executeEditorCommand(command, label);
                return;
            }

            set((state) => {
                applyEditorCommand(state, command);
            });
        },

        replaceLayerBatches: ({ layerIdx, batches, label, nextSelected = [] }) => {
            const layer = get().layers[layerIdx];
            if (!layer) return;

            executeEditorCommand(
                {
                    type: 'layer_replace_batches',
                    layerIdx,
                    before: cloneBatches(layer.batches),
                    after: cloneBatches(batches),
                    previousSelection: get().selected,
                    nextSelection: nextSelected,
                },
                label,
            );
        },

        appendBatchToLayer: ({ layerIdx, batch, label, nextSelected = [] }) => {
            get().appendBatchesToLayer({
                layerIdx,
                batches: [batch],
                label,
                nextSelected,
            });
        },

        appendBatchesToLayer: ({
            layerIdx,
            batches,
            label,
            nextSelected = [],
            clearBgSelection = false,
        }) => {
            const layer = get().layers[layerIdx];
            if (!layer || batches.length === 0) return;
            const insertAt = layer.batches.length;

            executeEditorCommand(
                {
                    type: 'placement_append',
                    layerIdx,
                    batches: cloneBatches(batches),
                    insertAt,
                    selectInserted: nextSelected.length > 0,
                    previousSelection: get().selected,
                    nextSelection: nextSelected,
                    clearBgSelection,
                },
                label,
            );
        },

        applyLayerStructureChange: ({
            layers,
            layerIdx,
            selected,
            label,
            clearBgSelection = false,
        }) => {
            executeEditorCommand(
                {
                    type: 'layer_structure',
                    before: cloneLayers(get().layers),
                    after: cloneLayers(layers),
                    previousActiveLayerIdx: get().layerIdx,
                    nextActiveLayerIdx: layerIdx,
                    previousSelection: get().selected,
                    nextSelection: selected,
                    clearBgSelection,
                },
                label,
            );
        },
    };
}
