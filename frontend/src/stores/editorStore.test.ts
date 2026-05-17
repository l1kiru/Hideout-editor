import { beforeEach, describe, expect, it } from 'vitest';

import {
    defaultBackground,
    defaultTool,
    defaultUi,
} from '../features/editor/lib/editorDefaults';
import { createInitialEditorLayers } from '../features/editor/lib/editorDefaultMapLayer';
import { invertEditorCommand } from '../features/editor/lib/editorCommandExecutor';
import { layerId } from '../features/editor/lib/editorIds';
import {
    createDefaultPaintLayer,
    createImportedDecorationsLayer,
    createUserPaintLayer,
} from '../features/editor/lib/editorLayers';
import { limitsToViewBox, zoneViewLimitsWithPad } from '../lib/viewLimits';
import type { Scene } from '../types/scene';
import useEditorStore, {
    createInitialAppSessionStoreData,
    createInitialEditorDocumentStoreData,
    createInitialEditorStoreData,
    INITIAL_EDITOR_VIEW_BOX,
} from './editorStore';

function makeBatch(
    templateHash: number,
    placements: Array<{ x: number; y: number; r: number }>,
) {
    return {
        template_name_ru: `batch-${templateHash}`,
        template_hash: templateHash,
        placements,
    };
}

beforeEach(() => {
    useEditorStore.setState(createInitialEditorStoreData());
});

describe('editorStore', () => {
    it('starts with real editor defaults', () => {
        const s = useEditorStore.getState();

        expect(s.tool).toEqual(defaultTool());
        expect(s.ui).toEqual(defaultUi());
        expect(s.background).toEqual(defaultBackground());
        expect(s.layers).toEqual(createInitialEditorLayers());
        expect(s.layer0UnlockLocksBackup).toBeNull();
        expect(s.layerIdx).toBe(layerId(1));
        expect(s.selected).toEqual([]);
        expect(s.viewBox).toEqual(INITIAL_EDITOR_VIEW_BOX);
        expect(s.panDrag).toBeNull();
        expect(s.spaceHeld).toBe(false);
        expect(s.apiOk).toBeNull();
        expect(s.showTopPanel).toBe(true);
        expect(s.status).toBe('');
        expect(s.hideoutMaps).toEqual([]);
        expect(s.activeMapId).toBeNull();
        expect(s.activeMapDisplayName).toBe('');
        expect(s.inputImageNames).toEqual([]);
    });

    it('resetEditorStore restores the complete initial state and keeps actions', () => {
        const store = useEditorStore.getState();

        store.setStatus('dirty');
        store.setActiveMapId(7);
        store.setLayerIdx(layerId(0));
        store.setSelected([{ layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 }]);
        useEditorStore.setState({
            undoStack: [{ kind: 'background', snapshot: defaultBackground(), label: 'x' }],
            redoStack: [{ kind: 'background', snapshot: defaultBackground(), label: 'y' }],
        });

        store.resetEditorStore();

        const next = useEditorStore.getState();
        expect(next).toMatchObject(createInitialEditorStoreData());
        expect(typeof next.resetEditorStore).toBe('function');
        expect(typeof next.undo).toBe('function');
    });

    it('accepts a direct selected value and a functional selected updater', () => {
        const store = useEditorStore.getState();

        store.setSelected([{ layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 }]);
        store.setSelected((prev) => [
            ...prev,
            { layerIdx: layerId(1), batchIdx: 1, placementIdx: 2 },
        ]);

        expect(useEditorStore.getState().selected).toEqual([
            { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
            { layerIdx: layerId(1), batchIdx: 1, placementIdx: 2 },
        ]);
    });

    it('supports updater actions for layers, tool, background, and viewBox', () => {
        const store = useEditorStore.getState();

        store.setLayers((prev) =>
            prev.map((layer, index) =>
                index === 1 ? { ...layer, title: 'Renamed layer' } : layer,
            ),
        );
        store.setTool((prev) => ({
            ...prev,
            variant: 'fill',
            fill_asset_key: 'moss',
        }));
        store.setBackground((prev) => ({
            ...prev,
            opacity: 0.25,
        }));
        store.setViewBox((prev) => ({
            ...prev,
            x: prev.x + 10,
            y: prev.y + 20,
        }));

        const next = useEditorStore.getState();
        expect(next.layers[1]?.title).toBe('Renamed layer');
        expect(next.tool.variant).toBe('fill');
        expect(next.tool.fill_asset_key).toBe('moss');
        expect(next.background.opacity).toBe(0.25);
        expect(next.viewBox).toEqual({
            x: -190,
            y: -180,
            width: 400,
            height: 400,
        });
    });

    it('addUserLayer appends a user layer and activates it', () => {
        const store = useEditorStore.getState();

        store.addUserLayer();

        const next = useEditorStore.getState();
        expect(next.layers).toHaveLength(3);
        expect(next.layers[2]?.kind).toBe('user');
        expect(next.layerIdx).toBe(layerId(2));
    });

    it('removeLayer deletes a user layer and clears selection', () => {
        const initialLayers = [
            createInitialEditorLayers()[0],
            createUserPaintLayer([], 'A'),
            createUserPaintLayer([], 'B'),
        ];

        useEditorStore.setState({
            layers: initialLayers,
            layerIdx: layerId(2),
            selected: [{ layerIdx: layerId(2), batchIdx: 0, placementIdx: 0 }],
        });

        useEditorStore.getState().removeLayer(2);

        const next = useEditorStore.getState();
        expect(next.layers).toHaveLength(2);
        expect(next.layerIdx).toBe(layerId(1));
        expect(next.selected).toEqual([]);
    });

    it('removeLayer deletes a user layer even when it contains line_stroke batches', () => {
        const initialLayers = [
            createInitialEditorLayers()[0],
            createUserPaintLayer(
                [
                    {
                        template_name_ru: 'stroke',
                        template_hash: 1,
                        facet_fv: 0,
                        line_stroke: true,
                        placements: [{ x: 1, y: 2, r: 0 }],
                    },
                ],
                'Stroke layer',
            ),
            createUserPaintLayer([], 'Other'),
        ];

        useEditorStore.setState({
            layers: initialLayers,
            layerIdx: layerId(2),
            selected: [{ layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 }],
        });

        useEditorStore.getState().removeLayer(1);

        const next = useEditorStore.getState();
        expect(next.layers).toHaveLength(2);
        expect(next.layers[1]?.title).toBe('Other');
        expect(next.layerIdx).toBe(layerId(1));
        expect(next.selected).toEqual([]);
    });

    it('removeLayer keeps imported decorations layer', () => {
        const initialLayers = [
            createInitialEditorLayers()[0],
            {
                ...createUserPaintLayer([], 'Imported'),
                kind: 'decorations' as const,
            },
            createUserPaintLayer([], 'Other'),
        ];

        useEditorStore.setState({
            layers: initialLayers,
            layerIdx: layerId(2),
            selected: [{ layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 }],
        });

        useEditorStore.getState().removeLayer(1);

        const next = useEditorStore.getState();
        expect(next.layers).toEqual(initialLayers);
        expect(next.layerIdx).toBe(layerId(2));
        expect(next.selected).toEqual([
            { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
        ]);
    });

    it('setLayerLocked keeps layer 0 unlock semantics and prunes locked selections', () => {
        useEditorStore.setState({
            layers: [
                createInitialEditorLayers()[0],
                { ...createUserPaintLayer([], 'A'), locked: false },
                { ...createUserPaintLayer([], 'B'), locked: false },
            ],
            selected: [
                { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                { layerIdx: layerId(2), batchIdx: 0, placementIdx: 0 },
            ],
        });

        const store = useEditorStore.getState();
        store.setLayerLocked(0, false);

        let next = useEditorStore.getState();
        expect(next.layers[0]?.locked).toBe(false);
        expect(next.layers[1]?.locked).toBe(true);
        expect(next.layers[2]?.locked).toBe(true);
        expect(next.selected).toEqual([]);

        store.setLayerLocked(0, true);

        next = useEditorStore.getState();
        expect(next.layers[0]?.locked).toBe(true);
        expect(next.layers[1]?.locked).toBe(false);
        expect(next.layers[2]?.locked).toBe(false);
    });

    it('keeps layer 0 unlock backup inside store state and resets it with the document', () => {
        useEditorStore.setState({
            layers: [
                createInitialEditorLayers()[0],
                { ...createUserPaintLayer([], 'A'), locked: false },
                { ...createUserPaintLayer([], 'B'), locked: true },
            ],
        });

        const store = useEditorStore.getState();
        store.setLayerLocked(0, false);

        let next = useEditorStore.getState();
        expect(next.layer0UnlockLocksBackup).toEqual([false, true]);

        store.resetEditorDocument();

        next = useEditorStore.getState();
        expect(next.layer0UnlockLocksBackup).toBeNull();

        store.setLayerLocked(0, false);
        expect(useEditorStore.getState().layer0UnlockLocksBackup).toEqual([false]);

        store.hydrateFromScene({
            scene_version: 2,
            camera_deg: 45,
            boundary: {
                points: [
                    { x: 0, y: 0 },
                    { x: 10, y: 0 },
                    { x: 10, y: 10 },
                ],
            },
            template: { template_id: '' },
            layers: [],
            tool: defaultTool(),
            background: defaultBackground(),
        });

        expect(useEditorStore.getState().layer0UnlockLocksBackup).toBeNull();
    });

    it('setLayerVisible and updateLayer update only the targeted layer', () => {
        useEditorStore.setState({
            layers: [
                createInitialEditorLayers()[0],
                createUserPaintLayer([], 'Layer A'),
            ],
        });

        const store = useEditorStore.getState();
        store.setLayerVisible(1, false);
        store.updateLayer(1, (layer) => ({ ...layer, title: 'Layer Renamed' }));

        const next = useEditorStore.getState();
        expect(next.layers[1]).toMatchObject({
            visible: false,
            title: 'Layer Renamed',
        });
        expect(next.layers[0]?.visible).toBe(true);
    });

    it('resetEditorDocument restores document defaults and clears session state', () => {
        const store = useEditorStore.getState();

        store.setTemplateId('tpl-1');
        store.setTemplateDots([[1, 2]]);
        store.setBoundary([[3, 4]]);
        store.setLayerIdx(layerId(0));
        store.setSelected([{ layerIdx: layerId(0), batchIdx: 0, placementIdx: 0 }]);
        store.setBgSelected(true);
        store.setPanDrag({ lastCx: 10, lastCy: 20 });
        store.setSpaceHeld(true);
        store.setCursorView([9, 8]);
        store.setLineDraft({ points: [[5, 6]] });
        useEditorStore.setState({
            undoStack: [{ kind: 'background', snapshot: defaultBackground(), label: 'x' }],
            redoStack: [{ kind: 'background', snapshot: defaultBackground(), label: 'y' }],
        });

        store.resetEditorDocument();

        const next = useEditorStore.getState();
        expect(next).toMatchObject(createInitialEditorStoreData());
    });

    it('resetEditorDocument keeps app/session state intact', () => {
        useEditorStore.setState({
            ...createInitialAppSessionStoreData(),
            ...createInitialEditorDocumentStoreData(),
            apiOk: true,
            showTopPanel: false,
            status: 'hello',
            hideoutMaps: [
                {
                    id: 1,
                    display_name: 'Map A',
                    created_at: '2026-01-01T00:00:00Z',
                    has_boundary: true,
                    is_base: true,
                    forked_from_map_id: null,
                    lineage_base_display_name: 'Map A',
                },
            ],
            activeMapId: 1,
            activeMapDisplayName: 'Map A',
            inputImageNames: ['img.png'],
            templateId: 'dirty',
            boundary: [[1, 2]],
        });

        useEditorStore.getState().resetEditorDocument();

        const next = useEditorStore.getState();
        expect(next.apiOk).toBe(true);
        expect(next.showTopPanel).toBe(false);
        expect(next.status).toBe('hello');
        expect(next.hideoutMaps).toHaveLength(1);
        expect(next.activeMapId).toBe(1);
        expect(next.activeMapDisplayName).toBe('Map A');
        expect(next.inputImageNames).toEqual(['img.png']);
        expect(next.templateId).toBe('');
        expect(next.boundary).toEqual([]);
    });

    it('hydrateFromScene loads scene data, clears transient state, and computes a home view', () => {
        const store = useEditorStore.getState();
        const scene: Scene = {
            scene_version: 2,
            camera_deg: 90,
            boundary: {
                points: [
                    { x: 10, y: 20 },
                    { x: 110, y: 20 },
                    { x: 110, y: 120 },
                    { x: 10, y: 120 },
                ],
            },
            template: { template_id: 'tpl-scene' },
            layers: [],
            tool: {
                ...defaultTool(),
                variant: 'line',
                line_asset_key: 'moss',
                spacing: 12,
            },
            background: {
                opacity: 0.3,
                rotation_deg: 15,
            },
            ui: {
                placement_preview_scale: 1.5,
            },
            template_dots_cache: [
                { x: 7, y: 8 },
                { x: 9, y: 10 },
            ],
            hideout_map_display_name: 'Ignored here',
        };

        store.setSelected([{ layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 }]);
        store.setBgSelected(true);
        store.setPanDrag({ lastCx: 1, lastCy: 2 });
        store.setSpaceHeld(true);
        store.setCursorView([100, 200]);
        store.setLineDraft({ points: [[11, 12]] });
        useEditorStore.setState({
            undoStack: [{ kind: 'background', snapshot: defaultBackground(), label: 'undo' }],
            redoStack: [{ kind: 'background', snapshot: defaultBackground(), label: 'redo' }],
        });

        store.hydrateFromScene(scene);

        const next = useEditorStore.getState();
        const expectedViewBox = limitsToViewBox(
            zoneViewLimitsWithPad(
                scene.boundary.points.map((point): [number, number] => [point.x, point.y]),
                scene.camera_deg,
            )!,
        );

        expect(next.cameraDeg).toBe(90);
        expect(next.templateId).toBe('tpl-scene');
        expect(next.boundary).toEqual([
            [10, 20],
            [110, 20],
            [110, 120],
            [10, 120],
        ]);
        expect(next.layers).toEqual(createInitialEditorLayers());
        expect(next.layerIdx).toBe(layerId(1));
        expect(next.tool).toMatchObject({
            variant: 'line',
            line_asset_key: 'moss',
            spacing: 12,
            draw_style: 'object',
        });
        expect(next.ui).toEqual({
            placement_preview_scale: 1.5,
        });
        expect(next.background).toEqual({
            ...defaultBackground(),
            opacity: 0.3,
            rotation_deg: 15,
        });
        expect(next.templateDots).toEqual([
            [7, 8],
            [9, 10],
        ]);
        expect(next.viewBox).toEqual(expectedViewBox);
        expect(next.selected).toEqual([]);
        expect(next.bgSelected).toBe(false);
        expect(next.panDrag).toBeNull();
        expect(next.spaceHeld).toBe(false);
        expect(next.cursorView).toBeNull();
        expect(next.lineDraft).toBeNull();
        expect(next.undoStack).toEqual([]);
        expect(next.redoStack).toEqual([]);
    });

    it('clearUndoStack removes both history stacks', () => {
        useEditorStore.setState({
            undoStack: [{ kind: 'background', snapshot: defaultBackground(), label: 'undo' }],
            redoStack: [{ kind: 'background', snapshot: defaultBackground(), label: 'redo' }],
        });

        useEditorStore.getState().clearUndoStack();

        expect(useEditorStore.getState().undoStack).toEqual([]);
        expect(useEditorStore.getState().redoStack).toEqual([]);
    });

    it('getSceneSnapshot builds a scene from current store state', () => {
        useEditorStore.setState({
            activeMapId: 5,
            activeMapDisplayName: 'Map Five',
            hideoutMaps: [
                {
                    id: 5,
                    display_name: 'Map Five',
                    created_at: '2026-01-01T00:00:00Z',
                    has_boundary: true,
                    lineage_base_display_name: 'Base Map',
                },
            ],
            templateId: 'tpl-scene',
            boundary: [
                [1, 2],
                [3, 4],
                [5, 6],
            ],
            templateDots: [[7, 8]],
        });

        const scene = useEditorStore.getState().getSceneSnapshot();

        expect(scene.template.template_id).toBe('tpl-scene');
        expect(scene.hideout_map_display_name).toBe('Map Five');
        expect(scene.lineage_base_display_name).toBe('Base Map');
        expect(scene.boundary.points).toEqual([
            { x: 1, y: 2 },
            { x: 3, y: 4 },
            { x: 5, y: 6 },
        ]);
        expect(scene.template_dots_cache).toEqual([{ x: 7, y: 8 }]);
    });

    it('pushBackgroundUndo drives store-based undo and redo for background', () => {
        const store = useEditorStore.getState();
        const initialBackground = {
            ...defaultBackground(),
            path: '/input/images/one.png',
            opacity: 0.4,
        };
        const changedBackground = {
            ...defaultBackground(),
            path: '/input/images/two.png',
            opacity: 0.8,
            rotation_deg: 33,
        };

        useEditorStore.setState({
            background: initialBackground,
            selected: [{ layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 }],
            bgSelected: true,
        });

        store.pushBackgroundUndo(initialBackground, 'bg-transform');
        store.setBackground(changedBackground);

        expect(store.undo()).toEqual({ applied: true, label: 'bg-transform' });
        expect(useEditorStore.getState().background).toEqual(initialBackground);
        expect(useEditorStore.getState().selected).toEqual([]);
        expect(useEditorStore.getState().bgSelected).toBe(false);

        expect(store.redo()).toEqual({ applied: true, label: 'bg-transform' });
        expect(useEditorStore.getState().background).toEqual(changedBackground);
    });

    it('deleteSelected removes placements, clears selection, and records undo', () => {
        const initialLayers = [
            createInitialEditorLayers()[0],
            {
                ...createUserPaintLayer([], 'Layer A'),
                batches: [
                    makeBatch(21, [
                        { x: 1, y: 2, r: 0 },
                        { x: 3, y: 4, r: 0 },
                    ]),
                ],
            },
            {
                ...createUserPaintLayer([], 'Layer B'),
                batches: [makeBatch(22, [{ x: 5, y: 6, r: 0 }])],
            },
        ];

        useEditorStore.setState({
            layers: initialLayers,
            selected: [
                { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                { layerIdx: layerId(2), batchIdx: 0, placementIdx: 0 },
            ],
            bgSelected: true,
        });

        const store = useEditorStore.getState();
        store.deleteSelected({
            refs: [
                { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                { layerIdx: layerId(2), batchIdx: 0, placementIdx: 0 },
            ],
            label: 'delete-selected',
        });

        let next = useEditorStore.getState();
        expect(next.layers[1]?.batches[0]?.placements).toEqual([
            { x: 3, y: 4, r: 0 },
        ]);
        expect(next.layers[2]?.batches).toEqual([]);
        expect(next.selected).toEqual([]);
        expect(next.bgSelected).toBe(false);
        expect(next.undoStack.at(-1)?.kind).toBe('command');
        expect(next.undoStack.at(-1)?.label).toBe('delete-selected');

        expect(store.undo()).toEqual({ applied: true, label: 'delete-selected' });
        next = useEditorStore.getState();
        expect(next.layers).toEqual(initialLayers);
        expect(next.selected).toEqual([
            { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
            { layerIdx: layerId(2), batchIdx: 0, placementIdx: 0 },
        ]);

        expect(store.redo()).toEqual({ applied: true, label: 'delete-selected' });
        next = useEditorStore.getState();
        expect(next.layers[1]?.batches[0]?.placements).toEqual([
            { x: 3, y: 4, r: 0 },
        ]);
        expect(next.layers[2]?.batches).toEqual([]);
        expect(next.selected).toEqual([]);
    });

    it('applyPlacementTransforms applies prepared updates and records undo', () => {
        const initialLayers = [
            createInitialEditorLayers()[0],
            {
                ...createUserPaintLayer([], 'Layer A'),
                batches: [makeBatch(31, [{ x: 5, y: 6, r: 7 }])],
            },
        ];

        useEditorStore.setState({
            layers: initialLayers,
            bgSelected: true,
        });

        const store = useEditorStore.getState();
        store.applyPlacementTransforms({
            refs: [{ layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 }],
            updates: [
                {
                    ref: { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                    x: 15,
                    y: 16,
                    r: 17,
                },
            ],
            label: 'apply-placement-transforms',
        });

        let next = useEditorStore.getState();
        expect(next.layers[1]?.batches[0]?.placements[0]).toEqual({
            x: 15,
            y: 16,
            r: 17,
        });
        expect(next.bgSelected).toBe(false);
        expect(next.undoStack.at(-1)?.kind).toBe('command');
        expect(next.undoStack.at(-1)?.label).toBe('apply-placement-transforms');

        expect(store.undo()).toEqual({
            applied: true,
            label: 'apply-placement-transforms',
        });
        next = useEditorStore.getState();
        expect(next.layers).toEqual(initialLayers);

    });

    it('rotateSelected applies prepared updates and records undo', () => {
        const initialLayers = [
            createInitialEditorLayers()[0],
            {
                ...createUserPaintLayer([], 'Layer A'),
                batches: [makeBatch(31, [{ x: 10, y: 20, r: 0 }])],
            },
        ];

        useEditorStore.setState({
            layers: initialLayers,
            bgSelected: true,
        });

        const store = useEditorStore.getState();
        store.rotateSelected({
            refs: [{ layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 }],
            updates: [
                {
                    ref: { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                    x: 15,
                    y: 25,
                    r: 4096,
                },
            ],
            label: 'rotate-selected',
        });

        let next = useEditorStore.getState();
        expect(next.layers[1]?.batches[0]?.placements[0]).toEqual({
            x: 15,
            y: 25,
            r: 4096,
        });
        expect(next.bgSelected).toBe(false);
        expect(next.undoStack.at(-1)?.kind).toBe('command');
        expect(next.undoStack.at(-1)?.label).toBe('rotate-selected');

        expect(store.undo()).toEqual({ applied: true, label: 'rotate-selected' });
        next = useEditorStore.getState();
        expect(next.layers).toEqual(initialLayers);
    });

    it('mirrorSelected applies prepared updates and records undo', () => {
        const initialLayers = [
            createInitialEditorLayers()[0],
            {
                ...createUserPaintLayer([], 'Layer A'),
                batches: [makeBatch(41, [{ x: 10, y: 20, r: 0 }])],
            },
        ];

        useEditorStore.setState({
            layers: initialLayers,
            bgSelected: true,
        });

        const store = useEditorStore.getState();
        store.mirrorSelected({
            refs: [{ layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 }],
            updates: [
                {
                    ref: { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                    x: -10,
                    y: 20,
                    r: 32768,
                },
            ],
            label: 'mirror-selected',
        });

        let next = useEditorStore.getState();
        expect(next.layers[1]?.batches[0]?.placements[0]).toEqual({
            x: -10,
            y: 20,
            r: 32768,
        });
        expect(next.bgSelected).toBe(false);
        expect(next.undoStack.at(-1)?.kind).toBe('command');
        expect(next.undoStack.at(-1)?.label).toBe('mirror-selected');

        expect(store.undo()).toEqual({ applied: true, label: 'mirror-selected' });
        next = useEditorStore.getState();
        expect(next.layers).toEqual(initialLayers);
    });

    it('transformBackground updates background and records undo', () => {
        const initialBackground = {
            ...defaultBackground(),
            path: '/input/images/original.png',
            rotation_deg: 0,
        };

        useEditorStore.setState({
            background: initialBackground,
            bgSelected: true,
        });

        const store = useEditorStore.getState();
        store.transformBackground({
            label: 'bg-rotate',
            updater: (prev) => ({
                ...prev,
                rotation_deg: 30,
            }),
            clearBgSelection: true,
        });

        let next = useEditorStore.getState();
        expect(next.background.rotation_deg).toBe(30);
        expect(next.bgSelected).toBe(false);
        expect(next.undoStack.at(-1)?.kind).toBe('command');
        expect(next.undoStack.at(-1)?.label).toBe('bg-rotate');

        expect(store.undo()).toEqual({ applied: true, label: 'bg-rotate' });
        next = useEditorStore.getState();
        expect(next.background).toEqual(initialBackground);
    });

    it('applyLayerStructureChange updates layers, selection, active layer, and records undo', () => {
        const initialLayers = [
            createInitialEditorLayers()[0],
            {
                ...createUserPaintLayer([], 'Layer A'),
                batches: [makeBatch(51, [{ x: 1, y: 2, r: 0 }])],
            },
        ];
        const changedLayers = [
            initialLayers[0]!,
            {
                ...createUserPaintLayer([], 'Layer A'),
                batches: [],
            },
            {
                ...createUserPaintLayer([], 'Moved'),
                batches: [makeBatch(51, [{ x: 1, y: 2, r: 0 }])],
            },
        ];

        useEditorStore.setState({
            layers: initialLayers,
            layerIdx: layerId(1),
            selected: [{ layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 }],
            bgSelected: true,
        });

        const store = useEditorStore.getState();
        store.applyLayerStructureChange({
            layers: changedLayers,
            layerIdx: layerId(2),
            selected: [{ layerIdx: layerId(2), batchIdx: 0, placementIdx: 0 }],
            label: 'move-to-new-layer',
            clearBgSelection: true,
        });

        let next = useEditorStore.getState();
        expect(next.layers).toEqual(changedLayers);
        expect(next.layerIdx).toBe(layerId(2));
        expect(next.selected).toEqual([
            { layerIdx: layerId(2), batchIdx: 0, placementIdx: 0 },
        ]);
        expect(next.bgSelected).toBe(false);
        expect(next.undoStack.at(-1)?.kind).toBe('command');
        expect(next.undoStack.at(-1)?.label).toBe('move-to-new-layer');

        expect(store.undo()).toEqual({
            applied: true,
            label: 'move-to-new-layer',
        });
        next = useEditorStore.getState();
        expect(next.layers).toEqual(initialLayers);
        expect(next.layerIdx).toBe(layerId(1));
    });

    it('appendBatchesToLayer appends batches, updates selection, and records undo', () => {
        const initialLayers = [
            createInitialEditorLayers()[0],
            {
                ...createUserPaintLayer([], 'Layer A'),
                batches: [makeBatch(61, [{ x: 1, y: 1, r: 0 }])],
            },
        ];
        const appendedBatches = [
            makeBatch(62, [{ x: 2, y: 2, r: 0 }]),
            makeBatch(63, [{ x: 3, y: 3, r: 0 }]),
        ];

        useEditorStore.setState({
            layers: initialLayers,
            bgSelected: true,
        });

        const store = useEditorStore.getState();
        store.appendBatchesToLayer({
            layerIdx: layerId(1),
            batches: appendedBatches,
            label: 'append-batches',
            nextSelected: [
                { layerIdx: layerId(1), batchIdx: 1, placementIdx: 0 },
                { layerIdx: layerId(1), batchIdx: 2, placementIdx: 0 },
            ],
            clearBgSelection: true,
        });

        let next = useEditorStore.getState();
        expect(next.layers[1]?.batches).toHaveLength(3);
        expect(next.layers[1]?.batches.slice(1)).toEqual(appendedBatches);
        expect(next.selected).toEqual([
            { layerIdx: layerId(1), batchIdx: 1, placementIdx: 0 },
            { layerIdx: layerId(1), batchIdx: 2, placementIdx: 0 },
        ]);
        expect(next.bgSelected).toBe(false);
        expect(next.undoStack.at(-1)?.kind).toBe('command');
        expect(next.undoStack.at(-1)?.label).toBe('append-batches');

        expect(store.undo()).toEqual({
            applied: true,
            label: 'append-batches',
        });
        next = useEditorStore.getState();
        expect(next.layers).toEqual(initialLayers);

        expect(store.redo()).toEqual({
            applied: true,
            label: 'append-batches',
        });
        next = useEditorStore.getState();
        expect(next.layers[1]?.batches.slice(1)).toEqual(appendedBatches);
        expect(next.selected).toEqual([
            { layerIdx: layerId(1), batchIdx: 1, placementIdx: 0 },
            { layerIdx: layerId(1), batchIdx: 2, placementIdx: 0 },
        ]);
    });

    it('replaceLayerBatches replaces one layer and records command undo', () => {
        const initialLayers = [
            createInitialEditorLayers()[0],
            {
                ...createUserPaintLayer([], 'Layer A'),
                batches: [makeBatch(64, [{ x: 1, y: 1, r: 0 }])],
            },
        ];
        const replacementBatches = [
            makeBatch(65, [{ x: 9, y: 9, r: 1024 }]),
        ];

        useEditorStore.setState({
            layers: initialLayers,
            selected: [{ layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 }],
        });

        const store = useEditorStore.getState();
        store.replaceLayerBatches({
            layerIdx: layerId(1),
            batches: replacementBatches,
            label: 'replace-batches',
            nextSelected: [{ layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 }],
        });

        let next = useEditorStore.getState();
        expect(next.layers[1]?.batches).toEqual(replacementBatches);
        expect(next.undoStack.at(-1)?.kind).toBe('command');

        expect(store.undo()).toEqual({
            applied: true,
            label: 'replace-batches',
        });
        next = useEditorStore.getState();
        expect(next.layers).toEqual(initialLayers);
    });

    it('can undo a grouped eraser drag as one layer_replace_batches command', () => {
        const initialLayers = [
            createInitialEditorLayers()[0],
            {
                ...createUserPaintLayer([], 'Layer A'),
                batches: [
                    makeBatch(64, [{ x: 1, y: 1, r: 0 }]),
                    makeBatch(65, [{ x: 2, y: 2, r: 0 }]),
                    makeBatch(66, [{ x: 3, y: 3, r: 0 }]),
                ],
            },
        ];
        const erasedBatches = [
            makeBatch(66, [{ x: 3, y: 3, r: 0 }]),
        ];
        const previousSelection = [
            { layerIdx: layerId(1), batchIdx: 1, placementIdx: 0 },
        ];

        useEditorStore.setState({
            layers: initialLayers,
            selected: previousSelection,
            bgSelected: false,
        });

        const store = useEditorStore.getState();
        useEditorStore.setState((state) => {
            state.layers[1] = {
                ...state.layers[1]!,
                batches: erasedBatches,
            };
            state.selected = [];
        });
        store.pushCommandUndo(
            invertEditorCommand({
                type: 'layer_replace_batches',
                layerIdx: layerId(1),
                before: initialLayers[1]!.batches,
                after: erasedBatches,
                previousSelection,
                nextSelection: [],
                clearBgSelection: false,
            }),
            'eraser',
        );

        let next = useEditorStore.getState();
        expect(next.layers[1]?.batches).toEqual(erasedBatches);
        expect(next.undoStack).toHaveLength(1);

        expect(store.undo()).toEqual({
            applied: true,
            label: 'eraser',
        });
        next = useEditorStore.getState();
        expect(next.layers).toEqual(initialLayers);
        expect(next.selected).toEqual(previousSelection);

        expect(store.redo()).toEqual({
            applied: true,
            label: 'eraser',
        });
        next = useEditorStore.getState();
        expect(next.layers[1]?.batches).toEqual(erasedBatches);
        expect(next.selected).toEqual([]);
    });

    it('replaceDocumentLayers swaps document layers without recording undo', () => {
        const initialLayers = [
            createInitialEditorLayers()[0],
            createUserPaintLayer([], 'Layer A'),
        ];
        const nextLayers = [
            createDefaultPaintLayer([]),
            createImportedDecorationsLayer([]),
        ];

        useEditorStore.setState({
            layers: initialLayers,
            selected: [{ layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 }],
            undoStack: [],
        });

        const store = useEditorStore.getState();
        store.replaceDocumentLayers({ layers: nextLayers });

        const next = useEditorStore.getState();
        expect(next.layers).toEqual(nextLayers);
        expect(next.undoStack).toEqual([]);
    });

    it('undo and redo apply command entries', () => {
        useEditorStore.setState({
            layers: [
                createInitialEditorLayers()[0],
                {
                    ...createUserPaintLayer([], 'Layer A'),
                    batches: [makeBatch(71, [{ x: 20, y: 30, r: 40 }])],
                },
            ],
            undoStack: [
                {
                    kind: 'command',
                    label: 'command-move',
                    command: {
                        type: 'placement_transform',
                        before: [
                            {
                                ref: {
                                    layerIdx: layerId(1),
                                    batchIdx: 0,
                                    placementIdx: 0,
                                },
                                x: 20,
                                y: 30,
                                r: 40,
                            },
                        ],
                        after: [
                            {
                                ref: {
                                    layerIdx: layerId(1),
                                    batchIdx: 0,
                                    placementIdx: 0,
                                },
                                x: 10,
                                y: 15,
                                r: 25,
                            },
                        ],
                        clearBgSelection: true,
                    },
                },
            ],
            redoStack: [],
            bgSelected: true,
        });

        const store = useEditorStore.getState();
        expect(store.undo()).toEqual({ applied: true, label: 'command-move' });

        let next = useEditorStore.getState();
        expect(next.layers[1]?.batches[0]?.placements[0]).toEqual({
            x: 10,
            y: 15,
            r: 25,
        });
        expect(next.redoStack.at(-1)?.kind).toBe('command');
        expect(next.bgSelected).toBe(false);

        expect(store.redo()).toEqual({ applied: true, label: 'command-move' });
        next = useEditorStore.getState();
        expect(next.layers[1]?.batches[0]?.placements[0]).toEqual({
            x: 20,
            y: 30,
            r: 40,
        });
    });

    it('executeEditorCommand applies a forward command and records the inverse', () => {
        useEditorStore.setState({
            layers: [
                createInitialEditorLayers()[0],
                {
                    ...createUserPaintLayer([], 'Layer A'),
                    batches: [makeBatch(81, [{ x: 1, y: 2, r: 3 }])],
                },
            ],
            bgSelected: true,
        });

        const store = useEditorStore.getState();
        store.executeEditorCommand({
            command: {
                type: 'placement_transform',
                before: [
                    {
                        ref: { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                        x: 1,
                        y: 2,
                        r: 3,
                    },
                ],
                after: [
                    {
                        ref: { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                        x: 11,
                        y: 12,
                        r: 13,
                    },
                ],
                clearBgSelection: true,
            },
            label: 'execute-command',
        });

        let next = useEditorStore.getState();
        expect(next.layers[1]?.batches[0]?.placements[0]).toEqual({
            x: 11,
            y: 12,
            r: 13,
        });
        expect(next.bgSelected).toBe(false);
        expect(next.undoStack.at(-1)?.kind).toBe('command');

        expect(store.undo()).toEqual({ applied: true, label: 'execute-command' });
        next = useEditorStore.getState();
        expect(next.layers[1]?.batches[0]?.placements[0]).toEqual({
            x: 1,
            y: 2,
            r: 3,
        });
    });

    it('supports undo and redo across command entries', () => {
        useEditorStore.setState({
            layers: [
                createInitialEditorLayers()[0],
                {
                    ...createUserPaintLayer([], 'Layer A'),
                    batches: [makeBatch(91, [{ x: 0, y: 0, r: 0 }])],
                },
            ],
        });

        const store = useEditorStore.getState();
        store.applyPlacementTransforms({
            refs: [{ layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 }],
            updates: [
                {
                    ref: { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                    x: 10,
                    y: 0,
                    r: 0,
                },
            ],
            label: 'snapshot-step',
        });
        store.executeEditorCommand({
            command: {
                type: 'placement_transform',
                before: [
                    {
                        ref: { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                        x: 10,
                        y: 0,
                        r: 0,
                    },
                ],
                after: [
                    {
                        ref: { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                        x: 20,
                        y: 0,
                        r: 0,
                    },
                ],
                clearBgSelection: true,
            },
            label: 'command-step',
        });

        let next = useEditorStore.getState();
        expect(next.undoStack.map((entry) => entry.kind)).toEqual([
            'command',
            'command',
        ]);
        expect(next.layers[1]?.batches[0]?.placements[0]).toEqual({
            x: 20,
            y: 0,
            r: 0,
        });

        expect(store.undo()).toEqual({ applied: true, label: 'command-step' });
        next = useEditorStore.getState();
        expect(next.layers[1]?.batches[0]?.placements[0]).toEqual({
            x: 10,
            y: 0,
            r: 0,
        });

        expect(store.undo()).toEqual({ applied: true, label: 'snapshot-step' });
        next = useEditorStore.getState();
        expect(next.layers[1]?.batches[0]?.placements[0]).toEqual({
            x: 0,
            y: 0,
            r: 0,
        });

        expect(store.redo()).toEqual({ applied: true, label: 'snapshot-step' });
        next = useEditorStore.getState();
        expect(next.layers[1]?.batches[0]?.placements[0]).toEqual({
            x: 10,
            y: 0,
            r: 0,
        });

        expect(store.redo()).toEqual({ applied: true, label: 'command-step' });
        next = useEditorStore.getState();
        expect(next.layers[1]?.batches[0]?.placements[0]).toEqual({
            x: 20,
            y: 0,
            r: 0,
        });
    });

    it('undo history remains capped at 96 entries', () => {
        const store = useEditorStore.getState();

        for (let i = 0; i < 100; i += 1) {
            store.pushBackgroundUndo(defaultBackground(), `step-${i}`);
        }

        expect(useEditorStore.getState().undoStack).toHaveLength(96);
        expect(useEditorStore.getState().undoStack[0]?.label).toBe('step-4');
        expect(useEditorStore.getState().undoStack.at(-1)?.label).toBe('step-99');
        expect(useEditorStore.getState().redoStack).toEqual([]);
    });

});
