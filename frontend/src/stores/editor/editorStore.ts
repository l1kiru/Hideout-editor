import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { createAppSessionSlice } from './slices/createAppSessionSlice';
import { createDocumentSlice } from './slices/createDocumentSlice';
import { createPlacementCommandSlice } from './slices/createPlacementCommandSlice';
import { createUndoSlice } from './slices/createUndoSlice';
import { createViewportSlice } from './slices/createViewportSlice';
import {
    createInitialEditorStoreData,
    type EditorStoreGet,
    type EditorStoreSet,
    type EditorStoreState,
} from './editorStoreTypes';

// Editor state ownership:
// - Zustand is the source of truth for document/session/viewport/selection/history state.
// - React refs are allowed only for in-progress pointer/keyboard gestures and DOM handles.
// - Derived scene/view data must be exposed through selectors, not duplicated in React state.
const useEditorStore = create<EditorStoreState>()(
    devtools(
        immer((set, get) => {
            const setEditorStore: EditorStoreSet = (recipe) =>
                set(recipe as Parameters<typeof set>[0]);
            const getEditorStore: EditorStoreGet = () => get();

            return {
                resetEditorStore: () =>
                    setEditorStore((state) => {
                        Object.assign(state, createInitialEditorStoreData());
                    }),
                ...createAppSessionSlice(setEditorStore),
                ...createDocumentSlice(setEditorStore, getEditorStore),
                ...createPlacementCommandSlice(setEditorStore, getEditorStore),
                ...createViewportSlice(setEditorStore),
                ...createUndoSlice(setEditorStore),
            };
        }),
    ),
);

export default useEditorStore;
