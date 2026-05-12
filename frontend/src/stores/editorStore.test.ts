import { beforeEach, describe, expect, it, vi } from 'vitest';

import useEditorStore from './editorStore';

const INITIAL_TOOL = { type: 'select' as const };
const INITIAL_VIEW_BOX = { x: 0, y: 0, width: 800, height: 600 };

let uuidCounter = 0;
beforeEach(() => {
    uuidCounter = 0;
    vi.stubGlobal('crypto', {
        randomUUID: vi.fn(() => {
            uuidCounter += 1;
            return `uuid-${uuidCounter}` as `${string}-${string}-${string}-${string}-${string}`;
        }),
    });
    useEditorStore.setState({
        activeTool: INITIAL_TOOL,
        selectedObjects: [],
        layers: [],
        activeLayerId: '',
        viewBox: INITIAL_VIEW_BOX,
        scale: 1,
        isPanning: false,
        scene: null,
        undoStack: [],
        redoStack: [],
    });
});

describe('editorStore', () => {
    it('starts with a select tool and an empty selection', () => {
        const s = useEditorStore.getState();
        expect(s.activeTool).toEqual(INITIAL_TOOL);
        expect(s.selectedObjects).toEqual([]);
        expect(s.viewBox).toEqual(INITIAL_VIEW_BOX);
    });

    it('setActiveTool replaces the active tool', () => {
        useEditorStore.getState().setActiveTool({ type: 'brush', brushSize: 8 });
        expect(useEditorStore.getState().activeTool).toEqual({
            type: 'brush',
            brushSize: 8,
        });
    });

    it('setSelectedObjects stores the provided ids', () => {
        useEditorStore.getState().setSelectedObjects(['a', 'b']);
        expect(useEditorStore.getState().selectedObjects).toEqual(['a', 'b']);
    });

    it('addLayer appends a layer, assigns a uuid, and seeds activeLayerId', () => {
        useEditorStore.getState().addLayer({
            title: 'L1',
            visible: true,
            locked: false,
            batches: [],
        });
        const s = useEditorStore.getState();
        expect(s.layers).toHaveLength(1);
        expect(s.layers[0]!.title).toBe('L1');
        expect(s.layers[0]!.id).toBe('uuid-1');
        expect(s.activeLayerId).toBe('uuid-1');
    });

    it('addLayer leaves an existing activeLayerId alone', () => {
        useEditorStore
            .getState()
            .addLayer({ title: 'first', visible: true, locked: false, batches: [] });
        useEditorStore
            .getState()
            .addLayer({ title: 'second', visible: true, locked: false, batches: [] });
        expect(useEditorStore.getState().activeLayerId).toBe('uuid-1');
        expect(useEditorStore.getState().layers).toHaveLength(2);
    });

    it('updateLayer mutates only matching layer properties', () => {
        const store = useEditorStore.getState();
        store.addLayer({ title: 'L1', visible: true, locked: false, batches: [] });
        const layerId = useEditorStore.getState().layers[0]!.id;
        store.updateLayer(layerId, { title: 'renamed', locked: true });
        const updated = useEditorStore.getState().layers[0]!;
        expect(updated.title).toBe('renamed');
        expect(updated.locked).toBe(true);
        expect(updated.visible).toBe(true);
    });

    it('setViewBox replaces the view box', () => {
        const next = { x: 10, y: 20, width: 1024, height: 768 };
        useEditorStore.getState().setViewBox(next);
        expect(useEditorStore.getState().viewBox).toEqual(next);
    });

    it('addToUndoStack caps history at 96 entries', () => {
        const store = useEditorStore.getState();
        for (let i = 0; i < 100; i += 1) {
            store.addToUndoStack({ step: i });
        }
        const stack = useEditorStore.getState().undoStack;
        expect(stack).toHaveLength(96);
        expect((stack[0] as { step: number }).step).toBe(4);
        expect((stack[stack.length - 1] as { step: number }).step).toBe(99);
    });
});
