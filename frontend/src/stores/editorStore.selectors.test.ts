import { describe, expect, it } from 'vitest';

import {
    defaultBackground,
    defaultTool,
    defaultUi,
} from '../features/editor/lib/editorDefaults';
import { validateEditorSceneJson } from '../features/editor/lib/editorSceneJsonValidate';
import { sharedMinimalEditorScene } from '../test-utils/fixtures/sharedMinimalEditorScene';
import {
    buildSceneFromEditorState,
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
} from './editorStore.selectors';
import useEditorStore, { createInitialEditorStoreData } from './editorStore';

describe('editorStore selectors', () => {
    it('buildSceneFromEditorState produces a normalized scene payload', () => {
        const base = createInitialEditorStoreData();

        const scene = buildSceneFromEditorState({
            ...base,
            boundary: [
                [1, 2],
                [3, 4],
                [5, 6],
            ],
            templateId: 'tpl-1',
            templateDots: [[7, 8]],
            tool: {
                ...defaultTool(),
                variant: 'fill',
                fill_asset_key: 'moss',
            },
            background: {
                opacity: 0.2,
            },
            ui: {
                placement_preview_scale: 1.5,
            },
            activeMapDisplayName: 'My map',
            lineageBaseDisplayName: 'Base map',
        });

        expect(scene).toEqual({
            scene_version: 2,
            camera_deg: 45,
            boundary: {
                points: [
                    { x: 1, y: 2 },
                    { x: 3, y: 4 },
                    { x: 5, y: 6 },
                ],
            },
            template: { template_id: 'tpl-1' },
            layers: base.layers,
            tool: {
                ...defaultTool(),
                variant: 'fill',
                fill_asset_key: 'moss',
                draw_style: 'object',
            },
            background: {
                ...defaultBackground(),
                opacity: 0.2,
            },
            ui: {
                placement_preview_scale: 1.5,
            },
            template_dots_cache: [{ x: 7, y: 8 }],
            hideout_map_display_name: 'My map',
            lineage_base_display_name: 'Base map',
        });
    });

    it('buildSceneFromEditorState stays backend-compatible with the shared minimal fixture', () => {
        const fixture = sharedMinimalEditorScene();

        const scene = buildSceneFromEditorState({
            ...createInitialEditorStoreData(),
            cameraDeg: fixture.camera_deg,
            boundary: fixture.boundary.points.map(
                (point): [number, number] => [point.x, point.y],
            ),
            templateId: fixture.template.template_id,
            layers: fixture.layers,
            tool: {
                ...defaultTool(),
                variant: fixture.tool.variant,
            },
            background: fixture.background,
            ui: defaultUi(),
            templateDots: [],
            activeMapDisplayName: '',
            lineageBaseDisplayName: null,
        });

        expect(scene).toMatchObject({
            scene_version: fixture.scene_version,
            camera_deg: fixture.camera_deg,
            boundary: fixture.boundary,
            template: fixture.template,
            layers: fixture.layers,
            tool: {
                ...defaultTool(),
                variant: fixture.tool.variant,
                draw_style: 'object',
            },
            background: {
                ...defaultBackground(),
                ...fixture.background,
            },
            ui: defaultUi(),
        });
        expect(scene.template_dots_cache).toEqual([]);
        expect(scene.hideout_map_display_name).toBe('');
        expect(scene.lineage_base_display_name).toBeNull();
        expect(
            validateEditorSceneJson(JSON.parse(JSON.stringify(scene))).ok,
        ).toBe(true);
    });

    it('selectCanRedo reflects redo stack availability', () => {
        expect(
            selectCanRedo({
                ...createInitialEditorStoreData(),
                redoStack: [],
            }),
        ).toBe(false);

        expect(
            selectCanRedo({
                ...createInitialEditorStoreData(),
                redoStack: [
                    {
                        kind: 'background',
                        snapshot: defaultBackground(),
                        label: 'redo',
                    },
                ],
            }),
        ).toBe(true);
    });

    it('app session selectors expose app/session fields only', () => {
        const base = createInitialEditorStoreData();
        const selectedState = selectEditorAppSessionState({
            ...base,
            status: 'ready',
            showTopPanel: false,
        });
        expect(selectedState).toEqual({
            apiOk: null,
            showTopPanel: false,
            status: 'ready',
            hideoutMaps: [],
            activeMapId: null,
            activeMapDisplayName: '',
            inputImageNames: [],
        });

        const selectedActions = selectEditorAppSessionActions(
            useEditorStore.getState(),
        );
        expect(selectedActions.setStatus).toBe(useEditorStore.getState().setStatus);
        expect(selectedActions.setActiveMapId).toBe(
            useEditorStore.getState().setActiveMapId,
        );
    });

    it('document selectors expose persistent scene fields only', () => {
        const base = createInitialEditorStoreData();
        const selectedState = selectEditorDocumentState({
            ...base,
            templateId: 'tpl-doc',
        });
        expect(selectedState.templateId).toBe('tpl-doc');
        expect(selectedState.layers).toBe(base.layers);
        expect(selectedState.tool).toBe(base.tool);

        const selectedActions = selectEditorDocumentActions(
            useEditorStore.getState(),
        );
        expect(selectedActions.setLayers).toBe(useEditorStore.getState().setLayers);
        expect(selectedActions.getSceneSnapshot).toBe(
            useEditorStore.getState().getSceneSnapshot,
        );
        expect(selectedActions.resetEditorDocument).toBe(
            useEditorStore.getState().resetEditorDocument,
        );
    });

    it('interaction selectors expose transient editor interaction fields only', () => {
        const base = createInitialEditorStoreData();
        const selectedState = selectEditorInteractionState({
            ...base,
            bgSelected: true,
            cursorView: [10, 20],
        });
        expect(selectedState.bgSelected).toBe(true);
        expect(selectedState.cursorView).toEqual([10, 20]);
        expect(selectedState.selected).toEqual([]);
        expect(selectedState.lineDraft).toBeNull();

        const selectedActions = selectEditorInteractionActions(
            useEditorStore.getState(),
        );
        expect(selectedActions.setBgSelected).toBe(
            useEditorStore.getState().setBgSelected,
        );
        expect(selectedActions.setSelected).toBe(
            useEditorStore.getState().setSelected,
        );
    });

    it('viewport selectors expose viewport fields only', () => {
        const base = createInitialEditorStoreData();
        const selectedState = selectEditorViewportState({
            ...base,
            viewBox: {
                x: 1,
                y: 2,
                width: 3,
                height: 4,
            },
        });
        expect(selectedState.viewBox).toEqual({
            x: 1,
            y: 2,
            width: 3,
            height: 4,
        });
        expect(selectedState.cameraDeg).toBe(base.cameraDeg);
        expect(selectedState.boundary).toBe(base.boundary);

        const selectedActions = selectEditorViewportActions(
            useEditorStore.getState(),
        );
        expect(selectedActions.setViewBox).toBe(
            useEditorStore.getState().setViewBox,
        );
    });

    it('selectSceneReadOnly is true only for active base maps', () => {
        expect(
            selectSceneReadOnly({
                activeMapId: null,
                hideoutMaps: [],
            }),
        ).toBe(false);

        expect(
            selectSceneReadOnly({
                activeMapId: 2,
                hideoutMaps: [
                    {
                        id: 2,
                        display_name: 'Base',
                        created_at: '2026-01-01T00:00:00Z',
                        has_boundary: true,
                        is_base: true,
                    },
                ],
            }),
        ).toBe(true);

        expect(
            selectSceneReadOnly({
                activeMapId: 3,
                hideoutMaps: [
                    {
                        id: 3,
                        display_name: 'Child',
                        created_at: '2026-01-01T00:00:00Z',
                        has_boundary: true,
                        is_base: false,
                    },
                ],
            }),
        ).toBe(false);
    });
});
