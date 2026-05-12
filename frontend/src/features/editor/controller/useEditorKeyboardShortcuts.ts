import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useEffect } from 'react';

import { ROT_FULL, ROT_STEP } from '../lib/editorConstants';

// Background rotation step in degrees for Q/E, matched to the placement rotation step.
const BG_ROT_STEP_DEG = (ROT_STEP / ROT_FULL) * 360;

export function useEditorKeyboardShortcuts(opts: {
    sceneReadOnly: boolean;
    spaceDownRef: MutableRefObject<boolean>;
    lineBrushActiveRef: MutableRefObject<boolean>;
    setSpaceHeld: Dispatch<SetStateAction<boolean>>;
    undo: () => void;
    redo: () => void;
    setShowTopPanel: Dispatch<SetStateAction<boolean>>;
    deleteSelected: () => void;
    rotateSelected: (delta: number) => void;
    copySelected: () => void;
    pasteClipboard: () => void;
    bgSelected: boolean;
    rotateBackground: (deltaDeg: number) => void;
    clearBackground: () => void;
}) {
    const {
        sceneReadOnly,
        spaceDownRef,
        lineBrushActiveRef,
        setSpaceHeld,
        undo,
        redo,
        setShowTopPanel,
        deleteSelected,
        rotateSelected,
        copySelected,
        pasteClipboard,
        bgSelected,
        rotateBackground,
        clearBackground,
    } = opts;

    useEffect(() => {
        const kd = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName;
            const inInput =
                tag === 'INPUT' ||
                tag === 'TEXTAREA' ||
                tag === 'SELECT' ||
                target?.isContentEditable;
            if (e.code === 'Space' && !inInput) {
                e.preventDefault();
                spaceDownRef.current = true;
                setSpaceHeld(true);
            }
            if (inInput) return;
            if (e.key === 'F9') setShowTopPanel((v) => !v);
            if (sceneReadOnly) {
                if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyZ') {
                    e.preventDefault();
                    return;
                }
                if (
                    (e.ctrlKey || e.metaKey) &&
                    ((e.shiftKey && e.code === 'KeyZ') || e.code === 'KeyY')
                ) {
                    e.preventDefault();
                    return;
                }
                if (e.code === 'Delete' || e.code === 'Backspace')
                    e.preventDefault();
                if (e.code === 'KeyQ' || e.code === 'KeyE')
                    e.preventDefault();
                if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyC' || e.code === 'KeyV')) {
                    e.preventDefault();
                }
                return;
            }
            if (lineBrushActiveRef.current) {
                if (
                    (e.ctrlKey || e.metaKey) &&
                    (e.code === 'KeyC' || e.code === 'KeyV')
                ) {
                    e.preventDefault();
                    return;
                }
                if (
                    e.code === 'KeyQ' ||
                    e.code === 'KeyE' ||
                    e.code === 'Delete' ||
                    e.code === 'Backspace'
                ) {
                    return;
                }
            }
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyZ') {
                e.preventDefault();
                undo();
            }
            if (
                (e.ctrlKey || e.metaKey) &&
                ((e.shiftKey && e.code === 'KeyZ') || e.code === 'KeyY')
            ) {
                e.preventDefault();
                redo();
            }
            if (
                (e.ctrlKey || e.metaKey) &&
                !e.shiftKey &&
                e.code === 'KeyC'
            ) {
                e.preventDefault();
                copySelected();
                return;
            }
            if (
                (e.ctrlKey || e.metaKey) &&
                !e.shiftKey &&
                e.code === 'KeyV'
            ) {
                e.preventDefault();
                pasteClipboard();
                return;
            }
            if (e.code === 'Delete' || e.code === 'Backspace') {
                if (bgSelected) clearBackground();
                else deleteSelected();
            }
            if (e.code === 'KeyQ') {
                if (bgSelected) rotateBackground(-BG_ROT_STEP_DEG);
                else rotateSelected(ROT_STEP);
            }
            if (e.code === 'KeyE' && !e.shiftKey) {
                if (bgSelected) rotateBackground(BG_ROT_STEP_DEG);
                else rotateSelected(-ROT_STEP);
            }
        };
        const ku = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                spaceDownRef.current = false;
                setSpaceHeld(false);
            }
        };
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);
        return () => {
            window.removeEventListener('keydown', kd);
            window.removeEventListener('keyup', ku);
        };
    }, [
        sceneReadOnly,
        spaceDownRef,
        lineBrushActiveRef,
        setSpaceHeld,
        undo,
        redo,
        setShowTopPanel,
        deleteSelected,
        rotateSelected,
        copySelected,
        pasteClipboard,
        bgSelected,
        rotateBackground,
        clearBackground,
    ]);
}
