import type { EditorAppSessionData, EditorStoreActions, EditorStoreSet } from '../editorStoreTypes';
import {
    createInitialAppSessionStoreData,
    resolveUpdater,
} from '../editorStoreTypes';

export function createAppSessionSlice(
    set: EditorStoreSet,
): EditorAppSessionData &
    Pick<
        EditorStoreActions,
        | 'setApiOk'
        | 'setShowTopPanel'
        | 'setStatus'
        | 'setHideoutMaps'
        | 'setActiveMapId'
        | 'setActiveMapDisplayName'
        | 'setInputImageNames'
    > {
    return {
        ...createInitialAppSessionStoreData(),

        setApiOk: (updater) =>
            set((state) => {
                state.apiOk = resolveUpdater(state.apiOk, updater);
            }),

        setShowTopPanel: (updater) =>
            set((state) => {
                state.showTopPanel = resolveUpdater(state.showTopPanel, updater);
            }),

        setStatus: (updater) =>
            set((state) => {
                state.status = resolveUpdater(state.status, updater);
            }),

        setHideoutMaps: (updater) =>
            set((state) => {
                state.hideoutMaps = resolveUpdater(state.hideoutMaps, updater);
            }),

        setActiveMapId: (updater) =>
            set((state) => {
                state.activeMapId = resolveUpdater(state.activeMapId, updater);
            }),

        setActiveMapDisplayName: (updater) =>
            set((state) => {
                state.activeMapDisplayName = resolveUpdater(
                    state.activeMapDisplayName,
                    updater,
                );
            }),

        setInputImageNames: (updater) =>
            set((state) => {
                state.inputImageNames = resolveUpdater(
                    state.inputImageNames,
                    updater,
                );
            }),
    };
}
