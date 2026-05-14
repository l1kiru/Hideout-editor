import {
    defaultBackground,
    defaultUi,
} from '../features/editor/lib/editorDefaults';
import { isBaseHideoutMap } from '../features/editor/lib/editorConstants';
import { normalizePaintLayers } from '../features/editor/lib/editorLayers';
import { SCENE_VERSION, type Scene } from '../types/scene';

import type {
    EditorStoreData,
    EditorStoreState,
} from './editor/editorStoreTypes';

export type BuildSceneFromEditorStateArgs = Pick<
    EditorStoreData,
    | 'cameraDeg'
    | 'boundary'
    | 'templateId'
    | 'layers'
    | 'tool'
    | 'background'
    | 'ui'
    | 'templateDots'
> & {
    activeMapDisplayName: string;
    lineageBaseDisplayName?: string | null;
};

export function buildSceneFromEditorState(
    args: BuildSceneFromEditorStateArgs,
): Scene {
    const {
        cameraDeg,
        boundary,
        templateId,
        layers,
        tool,
        background,
        ui,
        templateDots,
        activeMapDisplayName,
        lineageBaseDisplayName = null,
    } = args;

    return {
        scene_version: SCENE_VERSION,
        camera_deg: cameraDeg,
        boundary: { points: boundary.map(([x, y]) => ({ x, y })) },
        template: { template_id: templateId },
        layers: normalizePaintLayers(layers),
        tool: { ...tool, draw_style: 'object' },
        background: { ...defaultBackground(), ...background },
        ui: { ...defaultUi(), ...ui },
        template_dots_cache: templateDots.map(([x, y]) => ({ x, y })),
        hideout_map_display_name: activeMapDisplayName,
        lineage_base_display_name: lineageBaseDisplayName,
    };
}

export const selectEditorAppSessionState = (
    state: Pick<
        EditorStoreData,
        | 'apiOk'
        | 'showTopPanel'
        | 'status'
        | 'hideoutMaps'
        | 'activeMapId'
        | 'activeMapDisplayName'
        | 'inputImageNames'
    >,
) => ({
    apiOk: state.apiOk,
    showTopPanel: state.showTopPanel,
    status: state.status,
    hideoutMaps: state.hideoutMaps,
    activeMapId: state.activeMapId,
    activeMapDisplayName: state.activeMapDisplayName,
    inputImageNames: state.inputImageNames,
});

export const selectEditorDocumentState = (
    state: Pick<
        EditorStoreData,
        | 'templateId'
        | 'templateDots'
        | 'boundary'
        | 'layers'
        | 'layerIdx'
        | 'cameraDeg'
        | 'tool'
        | 'ui'
        | 'background'
    >,
) => ({
    templateId: state.templateId,
    templateDots: state.templateDots,
    boundary: state.boundary,
    layers: state.layers,
    layerIdx: state.layerIdx,
    cameraDeg: state.cameraDeg,
    tool: state.tool,
    ui: state.ui,
    background: state.background,
});

export const selectEditorInteractionState = (
    state: Pick<
        EditorStoreData,
        | 'bgSelected'
        | 'selected'
        | 'cursorView'
        | 'lineDraft'
        | 'spaceHeld'
        | 'panDrag'
    >,
) => ({
    bgSelected: state.bgSelected,
    panDrag: state.panDrag,
    spaceHeld: state.spaceHeld,
    selected: state.selected,
    cursorView: state.cursorView,
    lineDraft: state.lineDraft,
});

export const selectEditorViewportState = (
    state: Pick<EditorStoreData, 'viewBox' | 'cameraDeg' | 'boundary'>,
) => ({
    viewBox: state.viewBox,
    cameraDeg: state.cameraDeg,
    boundary: state.boundary,
});

export const selectEditorAppSessionActions = (
    state: Pick<
        EditorStoreState,
        | 'setApiOk'
        | 'setShowTopPanel'
        | 'setStatus'
        | 'setHideoutMaps'
        | 'setActiveMapId'
        | 'setActiveMapDisplayName'
        | 'setInputImageNames'
    >,
) => ({
    setApiOk: state.setApiOk,
    setShowTopPanel: state.setShowTopPanel,
    setStatus: state.setStatus,
    setHideoutMaps: state.setHideoutMaps,
    setActiveMapId: state.setActiveMapId,
    setActiveMapDisplayName: state.setActiveMapDisplayName,
    setInputImageNames: state.setInputImageNames,
});

export const selectEditorDocumentActions = (
    state: Pick<
        EditorStoreState,
        | 'setTemplateId'
        | 'setTemplateDots'
        | 'setBoundary'
        | 'setLayers'
        | 'setLayerIdx'
        | 'setTool'
        | 'setUi'
        | 'setBackground'
        | 'getSceneSnapshot'
        | 'resetEditorDocument'
        | 'hydrateFromScene'
    >,
) => ({
    setTemplateId: state.setTemplateId,
    setTemplateDots: state.setTemplateDots,
    setBoundary: state.setBoundary,
    setLayers: state.setLayers,
    setLayerIdx: state.setLayerIdx,
    setTool: state.setTool,
    setUi: state.setUi,
    setBackground: state.setBackground,
    getSceneSnapshot: state.getSceneSnapshot,
    resetEditorDocument: state.resetEditorDocument,
    hydrateFromScene: state.hydrateFromScene,
});

export const selectEditorInteractionActions = (
    state: Pick<
        EditorStoreState,
        | 'setBgSelected'
        | 'setPanDrag'
        | 'setSpaceHeld'
        | 'setSelected'
        | 'setCursorView'
        | 'setLineDraft'
    >,
) => ({
    setBgSelected: state.setBgSelected,
    setPanDrag: state.setPanDrag,
    setSpaceHeld: state.setSpaceHeld,
    setSelected: state.setSelected,
    setCursorView: state.setCursorView,
    setLineDraft: state.setLineDraft,
});

export const selectEditorViewportActions = (
    state: Pick<EditorStoreState, 'setViewBox'>,
) => ({
    setViewBox: state.setViewBox,
});

export const selectCanRedo = (state: Pick<EditorStoreData, 'redoStack'>) =>
    state.redoStack.length > 0;

export const selectSceneReadOnly = (
    state: Pick<EditorStoreData, 'activeMapId' | 'hideoutMaps'>,
) => {
    if (state.activeMapId == null) return false;
    const map = state.hideoutMaps.find((item) => item.id === state.activeMapId);
    return map != null && isBaseHideoutMap(map);
};
