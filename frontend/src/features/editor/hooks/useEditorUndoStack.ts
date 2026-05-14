import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import useEditorStore from '../../../stores/editorStore';

export type UseEditorUndoStackArgs = {
    setStatus: Dispatch<SetStateAction<string>>;
};

export function useEditorUndoStack({ setStatus }: UseEditorUndoStackArgs) {
    const { t } = useTranslation('editor');

    const redoStack = useEditorStore((state) => state.redoStack);
    const pushBackgroundUndo = useEditorStore(
        (state) => state.pushBackgroundUndo,
    );
    const clearUndoStack = useEditorStore((state) => state.clearUndoStack);
    const storeUndo = useEditorStore((state) => state.undo);
    const storeRedo = useEditorStore((state) => state.redo);

    const undo = useCallback(() => {
        const result = storeUndo();
        if (!result.applied) {
            setStatus(t('status.nothingToUndo'));
            return;
        }
        setStatus(t('status.undo', { label: result.label }));
    }, [setStatus, storeUndo, t]);

    const redo = useCallback(() => {
        const result = storeRedo();
        if (!result.applied) {
            setStatus(t('status.nothingToRedo'));
            return;
        }
        setStatus(t('status.redo', { label: result.label }));
    }, [setStatus, storeRedo, t]);

    return {
        redoStack,
        pushBackgroundUndo,
        undo,
        redo,
        clearUndoStack,
    };
}
