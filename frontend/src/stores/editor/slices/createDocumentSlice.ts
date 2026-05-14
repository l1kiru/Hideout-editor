import { limitsToViewBox, zoneViewLimitsWithPad } from '../../../lib/viewLimits';
import { createUserPaintLayer } from '../../../features/editor/lib/editorLayers';
import { isNonDeletableSystemLayer } from '../../../features/editor/lib/editorLayers';
import { layerId } from '../../../features/editor/lib/editorIds';
import { buildSceneFromEditorState } from '../../editorStore.selectors';
import type {
    EditorDocumentData,
    EditorStoreActions,
    EditorStoreGet,
    EditorStoreSet,
} from '../editorStoreTypes';
import {
    createInitialEditorDocumentStoreData,
    hydrateEditorDocumentState,
    resolveUpdater,
} from '../editorStoreTypes';

function pruneLockedSelection(
    state: Pick<EditorDocumentData, 'layers' | 'selected'>,
): void {
    state.selected = state.selected.filter((ref) => {
        const layer = state.layers[ref.layerIdx];
        return Boolean(layer && !layer.locked);
    });
}

export function createDocumentSlice(
    set: EditorStoreSet,
    get: EditorStoreGet,
): EditorDocumentData &
    Pick<
        EditorStoreActions,
        | 'setLayers'
        | 'replaceDocumentLayers'
        | 'setLayerIdx'
        | 'addUserLayer'
        | 'removeLayer'
        | 'setLayerLocked'
        | 'setLayerVisible'
        | 'renameLayer'
        | 'updateLayer'
        | 'setSelected'
        | 'setTool'
        | 'setUi'
        | 'setBackground'
        | 'setBoundary'
        | 'setCameraDeg'
        | 'setTemplateId'
        | 'setTemplateDots'
        | 'getSceneSnapshot'
        | 'resetEditorDocument'
        | 'hydrateFromScene'
    > {
    return {
        ...createInitialEditorDocumentStoreData(),

        setLayers: (updater) =>
            set((state) => {
                state.layers = resolveUpdater(state.layers, updater);
            }),

        replaceDocumentLayers: ({ layers }) =>
            set((state) => {
                state.layers = layers;
            }),

        setLayerIdx: (updater) =>
            set((state) => {
                state.layerIdx = resolveUpdater(state.layerIdx, updater);
            }),

        addUserLayer: () =>
            set((state) => {
                state.layers = [...state.layers, createUserPaintLayer()];
                state.layerIdx = layerId(state.layers.length - 1);
            }),

        removeLayer: (index) =>
            set((state) => {
                if (index < 0 || index >= state.layers.length) return;
                if (isNonDeletableSystemLayer(state.layers[index])) return;
                if (state.layers.length <= 2) return;

                const maxLayerIdx = state.layers.length - 2;
                state.layers = state.layers.filter(
                    (_, layerIndex) => layerIndex !== index,
                );
                state.layerIdx = layerId(
                    Math.max(0, Math.min(Number(state.layerIdx), maxLayerIdx)),
                );
                state.selected = [];
                if (state.layer0UnlockLocksBackup) {
                    state.layer0UnlockLocksBackup =
                        state.layer0UnlockLocksBackup.filter(
                        (_, layerIndex) => layerIndex !== index - 1,
                    );
                }
            }),

        setLayerLocked: (index, locked) =>
            set((state) => {
                if (index < 0 || index >= state.layers.length) return;

                if (index === 0) {
                    if (!locked) {
                        state.layer0UnlockLocksBackup = state.layers
                            .slice(1)
                            .map((layer) => layer.locked);
                        state.layers = state.layers.map((layer, layerIndex) =>
                            layerIndex === 0
                                ? { ...layer, locked: false }
                                : { ...layer, locked: true },
                        );
                        pruneLockedSelection(state);
                        return;
                    }

                    const backup = state.layer0UnlockLocksBackup;
                    state.layer0UnlockLocksBackup = null;
                    state.layers = state.layers.map((layer, layerIndex) => {
                        if (layerIndex === 0) {
                            return { ...layer, locked: true };
                        }
                        const previousLock = backup?.[layerIndex - 1];
                        return previousLock !== undefined
                            ? { ...layer, locked: previousLock }
                            : layer;
                    });
                    pruneLockedSelection(state);
                    return;
                }

                const defaultLayer = state.layers[0];
                if (defaultLayer && !defaultLayer.locked && !locked) {
                    return;
                }

                state.layers = state.layers.map((layer, layerIndex) =>
                    layerIndex === index ? { ...layer, locked } : layer,
                );
                pruneLockedSelection(state);
            }),

        setLayerVisible: (index, visible) =>
            set((state) => {
                if (index < 0 || index >= state.layers.length) return;
                state.layers = state.layers.map((layer, layerIndex) =>
                    layerIndex === index ? { ...layer, visible } : layer,
                );
            }),

        renameLayer: (index, title) =>
            set((state) => {
                if (index < 0 || index >= state.layers.length) return;
                const trimmedTitle = title.trim();
                state.layers = state.layers.map((layer, layerIndex) => {
                    if (layerIndex !== index) return layer;
                    if (!trimmedTitle) {
                        const nextLayer = { ...layer };
                        delete nextLayer.title;
                        return nextLayer;
                    }
                    return { ...layer, title: trimmedTitle };
                });
            }),

        updateLayer: (index, updater) =>
            set((state) => {
                if (index < 0 || index >= state.layers.length) return;
                state.layers = state.layers.map((layer, layerIndex) =>
                    layerIndex === index ? updater(layer) : layer,
                );
                pruneLockedSelection(state);
            }),

        setSelected: (updater) =>
            set((state) => {
                state.selected = resolveUpdater(state.selected, updater);
            }),

        setTool: (updater) =>
            set((state) => {
                state.tool = resolveUpdater(state.tool, updater);
            }),

        setUi: (updater) =>
            set((state) => {
                state.ui = resolveUpdater(state.ui, updater);
            }),

        setBackground: (updater) =>
            set((state) => {
                state.background = resolveUpdater(state.background, updater);
            }),

        setBoundary: (updater) =>
            set((state) => {
                state.boundary = resolveUpdater(state.boundary, updater);
            }),

        setCameraDeg: (updater) =>
            set((state) => {
                state.cameraDeg = resolveUpdater(state.cameraDeg, updater);
            }),

        setTemplateId: (updater) =>
            set((state) => {
                state.templateId = resolveUpdater(state.templateId, updater);
            }),

        setTemplateDots: (updater) =>
            set((state) => {
                state.templateDots = resolveUpdater(state.templateDots, updater);
            }),

        getSceneSnapshot: () => {
            const state = get();
            const lineageBaseDisplayName =
                state.activeMapId == null
                    ? null
                    : (state.hideoutMaps.find(
                          (map) => map.id === state.activeMapId,
                      )?.lineage_base_display_name ?? null);

            return buildSceneFromEditorState({
                cameraDeg: state.cameraDeg,
                boundary: state.boundary,
                templateId: state.templateId,
                layers: state.layers,
                tool: state.tool,
                background: state.background,
                ui: state.ui,
                templateDots: state.templateDots,
                activeMapDisplayName: state.activeMapDisplayName,
                lineageBaseDisplayName,
            });
        },

        resetEditorDocument: () =>
            set((state) => {
                Object.assign(state, createInitialEditorDocumentStoreData());
            }),

        hydrateFromScene: (scene) =>
            set((state) => {
                hydrateEditorDocumentState(state, scene);
                const limits = zoneViewLimitsWithPad(state.boundary, scene.camera_deg);
                if (limits) {
                    state.viewBox = limitsToViewBox(limits);
                }
            }),
    };
}
