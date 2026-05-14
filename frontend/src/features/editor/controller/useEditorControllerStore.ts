import { useShallow } from 'zustand/react/shallow';

import useEditorStore from '../../../stores/editorStore';
import {
    selectCanRedo,
    selectEditorAppSessionActions,
    selectEditorAppSessionState,
    selectEditorDocumentActions,
    selectEditorDocumentState,
    selectEditorInteractionActions,
    selectEditorInteractionState,
    selectEditorViewportActions,
    selectEditorViewportState,
    selectSceneReadOnly,
} from '../../../stores/editorStore.selectors';

export function useEditorControllerStore() {
    const appSession = useEditorStore(
        useShallow(selectEditorAppSessionState),
    );
    const documentState = useEditorStore(
        useShallow(selectEditorDocumentState),
    );
    const interactionState = useEditorStore(
        useShallow(selectEditorInteractionState),
    );
    const viewportState = useEditorStore(
        useShallow(selectEditorViewportState),
    );
    const appSessionActions = useEditorStore(
        useShallow(selectEditorAppSessionActions),
    );
    const documentActions = useEditorStore(
        useShallow(selectEditorDocumentActions),
    );
    const interactionActions = useEditorStore(
        useShallow(selectEditorInteractionActions),
    );
    const viewportActions = useEditorStore(
        useShallow(selectEditorViewportActions),
    );
    const canRedo = useEditorStore(selectCanRedo);
    const sceneReadOnly = useEditorStore(selectSceneReadOnly);

    return {
        appSession,
        documentState,
        interactionState,
        viewportState,
        appSessionActions,
        documentActions,
        interactionActions,
        viewportActions,
        canRedo,
        sceneReadOnly,
    };
}
