import type {
    Dispatch,
    MutableRefObject,
    SetStateAction,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useCallback, useRef, useState } from 'react';
import { cloneBatches } from '../lib/editorDefaults';
import { layerIndicesFromRefs } from '../lib/placementSelection';
import { MAX_UNDO } from '../lib/editorConstants';
import type { PlacementRef, SelectionState, UndoEntry } from '../model/editorSessionTypes';
import type { LayerId } from '../lib/editorIds';
import type { Background, PaintLayer } from '../../../types/scene';

export type UseEditorUndoStackArgs = {
    layersRef: MutableRefObject<PaintLayer[]>;
    backgroundRef?: MutableRefObject<Background>;
    layers: PaintLayer[];
    layerIdx: LayerId;
    setLayers: Dispatch<SetStateAction<PaintLayer[]>>;
    setSelected: Dispatch<SetStateAction<SelectionState>>;
    setStatus: Dispatch<SetStateAction<string>>;
    setBackground?: Dispatch<SetStateAction<Background>>;
    clearTransientSelection?: () => void;
};

export function useEditorUndoStack({
    layersRef,
    backgroundRef,
    layers,
    layerIdx,
    setLayers,
    setSelected,
    setStatus,
    setBackground,
    clearTransientSelection,
}: UseEditorUndoStackArgs) {
    const { t } = useTranslation('editor');
    const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
    const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);
    const undoStackRef = useRef<UndoEntry[]>([]);
    const redoStackRef = useRef<UndoEntry[]>([]);

    const pushUndo = useCallback((entry: UndoEntry) => {
        const next = [...undoStackRef.current, entry];
        const trimmed = next.length > MAX_UNDO ? next.slice(-MAX_UNDO) : next;
        undoStackRef.current = trimmed;
        setUndoStack(trimmed);
        redoStackRef.current = [];
        setRedoStack([]);
    }, []);

    const pushRedo = useCallback((entry: UndoEntry) => {
        const next = [...redoStackRef.current, entry];
        const trimmed = next.length > MAX_UNDO ? next.slice(-MAX_UNDO) : next;
        redoStackRef.current = trimmed;
        setRedoStack(trimmed);
    }, []);

    const saveLayerSnapshot = useCallback(
        (label: string) => {
            const ly = layers[layerIdx];
            if (!ly) return;
            pushUndo({
                kind: 'snapshot',
                layerIdx,
                batches: cloneBatches(ly.batches),
                label,
            });
        },
        [layers, layerIdx, pushUndo],
    );

    const saveLayerSnapshotAt = useCallback(
        (li: LayerId, label: string) => {
            const ly = layers[li];
            if (!ly) return;
            pushUndo({
                kind: 'snapshot',
                layerIdx: li,
                batches: cloneBatches(ly.batches),
                label,
            });
        },
        [layers, pushUndo],
    );

    const pushMultiUndoForRefs = useCallback(
        (refs: PlacementRef[], label: string) => {
            const ls = layersRef.current;
            const indices = layerIndicesFromRefs(refs);
            pushUndo({
                kind: 'multi',
                snapshots: indices.map((li) => ({
                    layerIdx: li,
                    batches: cloneBatches(ls[li]?.batches ?? []),
                })),
                label,
            });
        },
        [layersRef, pushUndo],
    );

    const pushBackgroundUndo = useCallback(
        (snapshot: Background, label: string) => {
            pushUndo({
                kind: 'background',
                snapshot: { ...snapshot },
                label,
            });
        },
        [pushUndo],
    );

    const discardLastUndo = useCallback(() => {
        undoStackRef.current = undoStackRef.current.slice(0, -1);
        setUndoStack(undoStackRef.current);
    }, []);

    const clearUndoStack = useCallback(() => {
        undoStackRef.current = [];
        setUndoStack([]);
        redoStackRef.current = [];
        setRedoStack([]);
    }, []);

    const inverseFromCurrent = useCallback(
        (entry: UndoEntry): UndoEntry | null => {
            const ls = layersRef.current;
            if (entry.kind === 'snapshot') {
                const ly = ls[entry.layerIdx];
                if (!ly) return null;
                return {
                    kind: 'snapshot',
                    layerIdx: entry.layerIdx,
                    batches: cloneBatches(ly.batches),
                    label: entry.label,
                };
            }
            if (entry.kind === 'multi') {
                return {
                    kind: 'multi',
                    snapshots: entry.snapshots.map((snap) => ({
                        layerIdx: snap.layerIdx,
                        batches: cloneBatches(ls[snap.layerIdx]?.batches ?? []),
                    })),
                    label: entry.label,
                };
            }
            if (!backgroundRef?.current) return null;
            return {
                kind: 'background',
                snapshot: { ...backgroundRef.current },
                label: entry.label,
            };
        },
        [layersRef, backgroundRef],
    );

    const undo = useCallback(() => {
        const stack = undoStackRef.current;
        const last = stack.at(-1);
        if (!last) {
            setStatus(t('status.nothingToUndo'));
            return;
        }
        const next = stack.slice(0, -1);
        undoStackRef.current = next;
        setUndoStack(next);
        const redoEntry = inverseFromCurrent(last);
        if (redoEntry) pushRedo(redoEntry);
        if (last.kind === 'background') {
            setBackground?.({ ...last.snapshot });
            clearTransientSelection?.();
            setSelected([]);
            setStatus(t('status.undo', { label: last.label }));
            return;
        }
        setLayers((ls) => {
            if (last.kind === 'snapshot') {
                return ls.map((l, i) =>
                    i === last.layerIdx
                        ? { ...l, batches: cloneBatches(last.batches) }
                        : l,
                );
            }
            let out = ls;
            for (const snap of last.snapshots) {
                out = out.map((l, i) =>
                    i === snap.layerIdx
                        ? { ...l, batches: cloneBatches(snap.batches) }
                        : l,
                );
            }
            return out;
        });
        setSelected([]);
        clearTransientSelection?.();
        setStatus(t('status.undo', { label: last.label }));
    }, [
        clearTransientSelection,
        inverseFromCurrent,
        pushRedo,
        setBackground,
        setLayers,
        setSelected,
        setStatus,
        t,
    ]);

    const redo = useCallback(() => {
        const stack = redoStackRef.current;
        const last = stack.at(-1);
        if (!last) {
            setStatus(t('status.nothingToRedo'));
            return;
        }
        const next = stack.slice(0, -1);
        redoStackRef.current = next;
        setRedoStack(next);
        const undoEntry = inverseFromCurrent(last);
        if (undoEntry) {
            const nextUndo = [...undoStackRef.current, undoEntry];
            const trimmed =
                nextUndo.length > MAX_UNDO ? nextUndo.slice(-MAX_UNDO) : nextUndo;
            undoStackRef.current = trimmed;
            setUndoStack(trimmed);
        }
        if (last.kind === 'background') {
            setBackground?.({ ...last.snapshot });
            clearTransientSelection?.();
            setSelected([]);
            setStatus(t('status.redo', { label: last.label }));
            return;
        }
        setLayers((ls) => {
            if (last.kind === 'snapshot') {
                return ls.map((l, i) =>
                    i === last.layerIdx
                        ? { ...l, batches: cloneBatches(last.batches) }
                        : l,
                );
            }
            let out = ls;
            for (const snap of last.snapshots) {
                out = out.map((l, i) =>
                    i === snap.layerIdx
                        ? { ...l, batches: cloneBatches(snap.batches) }
                        : l,
                );
            }
            return out;
        });
        setSelected([]);
        clearTransientSelection?.();
        setStatus(t('status.redo', { label: last.label }));
    }, [
        setStatus,
        inverseFromCurrent,
        setBackground,
        clearTransientSelection,
        setSelected,
        setLayers,
        t,
    ]);

    return {
        undoStack,
        redoStack,
        undoStackRef,
        redoStackRef,
        pushUndo,
        saveLayerSnapshot,
        saveLayerSnapshotAt,
        pushMultiUndoForRefs,
        pushBackgroundUndo,
        discardLastUndo,
        undo,
        redo,
        clearUndoStack,
    };
}
