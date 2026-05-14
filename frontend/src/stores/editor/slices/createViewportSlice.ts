import type { EditorStoreActions, EditorStoreSet } from '../editorStoreTypes';
import { resolveUpdater } from '../editorStoreTypes';

export function createViewportSlice(
    set: EditorStoreSet,
): Pick<
    EditorStoreActions,
    | 'setViewBox'
    | 'setBgSelected'
    | 'setCursorView'
    | 'setLineDraft'
    | 'setPanDrag'
    | 'setSpaceHeld'
> {
    return {
        setViewBox: (updater) =>
            set((state) => {
                state.viewBox = resolveUpdater(state.viewBox, updater);
            }),

        setBgSelected: (updater) =>
            set((state) => {
                state.bgSelected = resolveUpdater(state.bgSelected, updater);
            }),

        setCursorView: (updater) =>
            set((state) => {
                state.cursorView = resolveUpdater(state.cursorView, updater);
            }),

        setLineDraft: (updater) =>
            set((state) => {
                state.lineDraft = resolveUpdater(state.lineDraft, updater);
            }),

        setPanDrag: (updater) =>
            set((state) => {
                state.panDrag = resolveUpdater(state.panDrag, updater);
            }),

        setSpaceHeld: (updater) =>
            set((state) => {
                state.spaceHeld = resolveUpdater(state.spaceHeld, updater);
            }),
    };
}
