import { useLayoutEffect } from 'react';

import useEditorStore from '../../../stores/editorStore';

let editorStoreInitialized = false;

export function useInitializeEditorStore() {
    useLayoutEffect(() => {
        if (editorStoreInitialized) return;
        editorStoreInitialized = true;
        useEditorStore.getState().resetEditorStore();
    }, []);
}
