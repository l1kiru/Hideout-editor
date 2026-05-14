import { MAX_UNDO } from '../../../features/editor/lib/editorConstants';
import {
    applyEditorCommand,
    invertEditorCommand,
} from '../../../features/editor/lib/editorCommandExecutor';
import type {
    EditorStoreActions,
    EditorStoreData,
    EditorStoreSet,
    UndoMutationResult,
} from '../editorStoreTypes';

function trimHistoryStack<T>(entries: T[]): T[] {
    return entries.length > MAX_UNDO ? entries.slice(-MAX_UNDO) : entries;
}

function pushUndoEntry(
    state: EditorStoreData,
    entry: EditorStoreData['undoStack'][number],
    clearRedoStack = true,
): void {
    state.undoStack = trimHistoryStack([...state.undoStack, entry]);
    if (clearRedoStack) {
        state.redoStack = [];
    }
}

function pushRedoEntry(
    state: EditorStoreData,
    entry: EditorStoreData['redoStack'][number],
): void {
    state.redoStack = trimHistoryStack([...state.redoStack, entry]);
}

function createInverseUndoEntry(
    state: EditorStoreData,
    entry: EditorStoreData['undoStack'][number],
) {
    if (entry.kind === 'command') {
        return {
            kind: 'command' as const,
            command: invertEditorCommand(entry.command),
            label: entry.label,
        };
    }

    return {
        kind: 'background' as const,
        snapshot: { ...state.background },
        label: entry.label,
    };
}

function applyUndoEntry(
    state: EditorStoreData,
    entry: EditorStoreData['undoStack'][number],
): void {
    if (entry.kind === 'background') {
        state.background = { ...entry.snapshot };
    } else if (entry.kind === 'command') {
        applyEditorCommand(state, entry.command);
        return;
    }

    state.selected = [];
    state.bgSelected = false;
}

export function createUndoSlice(
    set: EditorStoreSet,
): Pick<
    EditorStoreActions,
    | 'pushBackgroundUndo'
    | 'pushCommandUndo'
    | 'undo'
    | 'redo'
    | 'clearUndoStack'
> {
    return {
        pushBackgroundUndo: (snapshot, label) =>
            set((state) => {
                pushUndoEntry(state, {
                    kind: 'background',
                    snapshot: { ...snapshot },
                    label,
                });
            }),

        pushCommandUndo: (command, label) =>
            set((state) => {
                pushUndoEntry(state, {
                    kind: 'command',
                    command,
                    label,
                });
            }),

        undo: () => {
            let result: UndoMutationResult = { applied: false };

            set((state) => {
                const last = state.undoStack.at(-1);
                if (!last) return;

                state.undoStack = state.undoStack.slice(0, -1);
                const redoEntry = createInverseUndoEntry(state, last);
                if (redoEntry) {
                    pushRedoEntry(state, redoEntry);
                }
                applyUndoEntry(state, last);
                result = { applied: true, label: last.label };
            });

            return result;
        },

        redo: () => {
            let result: UndoMutationResult = { applied: false };

            set((state) => {
                const last = state.redoStack.at(-1);
                if (!last) return;

                state.redoStack = state.redoStack.slice(0, -1);
                const undoEntry = createInverseUndoEntry(state, last);
                if (undoEntry) {
                    pushUndoEntry(state, undoEntry, false);
                }
                applyUndoEntry(state, last);
                result = { applied: true, label: last.label };
            });

            return result;
        },

        clearUndoStack: () =>
            set((state) => {
                state.undoStack = [];
                state.redoStack = [];
            }),
    };
}
