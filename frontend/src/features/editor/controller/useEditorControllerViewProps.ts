import type { MutableRefObject } from 'react';

import { defaultBackground } from '../lib/editorDefaults';
import { useEditorCanvasClassName } from './useEditorCanvasBindings';
import { useEditorSidebarBindings } from './useEditorSidebarBindings';
import { useEditorSvgSceneProps } from './useEditorSvgSceneProps';
import type { EditorCanvasProps } from '../components/EditorCanvas';
import type { EditorSvgSceneProps } from '../components/EditorSvgScene';
import type { EditorSidebarProps } from '../sidebar/editorSidebarTypes';
import type { EditorHeaderBarProps } from '../../../pages/editor/EditorHeaderBar';
import type { Background, Tool, UiState } from '../../../types/scene';
import type { LayerId } from '../lib/editorIds';
import type { PlacementRef } from '../model/editorSessionTypes';

type UseEditorControllerViewPropsArgs = {
    appSession: {
        apiOk: boolean | null;
        showTopPanel: boolean;
        hideoutMaps: EditorSidebarProps['files']['hideoutMaps'];
        activeMapId: number | null;
        inputImageNames: string[];
    };
    documentState: {
        background: Background;
        boundary: [number, number][];
        layers: EditorSvgSceneProps['layers'];
        layerIdx: LayerId;
        cameraDeg: number;
        tool: Tool;
        ui: UiState;
    };
    interactionState: {
        selected: PlacementRef[];
        bgSelected: boolean;
        panDrag: { lastCx: number; lastCy: number } | null;
        spaceHeld: boolean;
        cursorView: EditorSvgSceneProps['cursorView'];
        lineDraft: EditorSvgSceneProps['lineDraft'];
    };
    appSessionActions: {
        setShowTopPanel: EditorHeaderBarProps['setShowTopPanel'];
        setStatus: (updater: string | ((prev: string) => string)) => void;
    };
    documentActions: {
        setBackground: (updater: Background | ((prev: Background) => Background)) => void;
        setLayerIdx: EditorSidebarProps['layers']['setLayerIdx'];
        setTool: (updater: Tool | ((prev: Tool) => Tool)) => void;
        setUi: (updater: UiState | ((prev: UiState) => UiState)) => void;
    };
    interactionActions: {
        setPanDrag: EditorCanvasProps['setPanDrag'];
        setCursorView: EditorCanvasProps['setCursorView'];
        setLineDraft: EditorCanvasProps['setLineDraft'];
    };
    refs: {
        svgWrapRef: EditorCanvasProps['svgWrapRef'];
        svgRef: EditorCanvasProps['svgRef'];
    };
    backgroundViewState: {
        bgSelectValue: string;
        bgLocked: boolean;
        bgOrphanSelect: boolean;
        backgroundSvg: EditorSvgSceneProps['backgroundSvg'];
    };
    canvasWorkflow: {
        placementStats: EditorSidebarProps['layers']['placementStats'];
        lineBrushActiveRef: MutableRefObject<boolean>;
        selectDrag: unknown;
        selectRmbRotate: boolean;
        marqueeView: EditorSvgSceneProps['marqueeView'];
        viewBoxStr: string;
        activeAssetKey: EditorSvgSceneProps['activeAssetKey'];
        boundaryView: [number, number][];
        dotsViewSvg: EditorSvgSceneProps['dotsViewSvg'];
        fillPreviewPlacements: EditorSvgSceneProps['fillPreviewPlacements'];
        selectionDetail: EditorSidebarProps['tool']['selectionDetail'];
        lineWidthVU: number;
        eraserRadius: number;
        zonePolygonPoints: EditorSvgSceneProps['zonePolygonPoints'];
        backgroundSelectionSvgPoints: EditorSvgSceneProps['backgroundSelectionSvgPoints'];
        templateDotRadius: number;
        onPointerDownSvg: EditorCanvasProps['onPointerDownSvg'];
        onPointerMoveSvg: EditorCanvasProps['onPointerMoveSvg'];
        finishSelectRotatePointer: EditorCanvasProps['finishSelectRotatePointer'];
        onMouseDownSvg: EditorCanvasProps['onMouseDownSvg'];
        onMouseMoveSvg: EditorCanvasProps['onMouseMoveSvg'];
        rotateSelected: (deltaR: number) => void;
        mirrorSelectedHorizontal: () => void;
        mirrorSelectedVertical: () => void;
        moveSelectedToNewLayer: () => void;
        deleteSelected: () => void;
        redo: () => void;
        addLayer: EditorSidebarProps['layers']['addLayer'];
        removeLayer: EditorSidebarProps['layers']['removeLayer'];
        onLayerVisibilityToggle: EditorSidebarProps['layers']['setLayerVisible'];
        onSelectSidebarPlacement: EditorSidebarProps['layers']['onSelectSidebarPlacement'];
        onLayerLockedToggle: EditorSidebarProps['layers']['onLayerLockedToggle'];
        applyHomeView: EditorSidebarProps['files']['applyHomeView'];
        dragOverlay: EditorSvgSceneProps['dragOverlay'];
        dragOverlayRef: EditorSvgSceneProps['dragOverlayRef'];
    };
    lifecycle: {
        onHideoutMapSelect: EditorSidebarProps['files']['onHideoutMapSelect'];
        onDeleteActiveHideoutMap: EditorSidebarProps['files']['onDeleteActiveHideoutMap'];
        onExport: EditorSidebarProps['files']['onExport'];
        onSaveMapAsNew: EditorSidebarProps['files']['onSaveMapAsNew'];
        onCreateMapFromHideoutFile: EditorSidebarProps['files']['onCreateMapFromHideoutFile'];
        refreshInputImages: () => Promise<string[]>;
    };
    viewState: {
        viewBox: EditorSvgSceneProps['viewBox'];
    };
    interactionEffects: {
        applyBackgroundFitToZone: () => void;
    };
    placementCount: number;
    sceneReadOnly: boolean;
    canRedo: boolean;
};

export function useEditorControllerViewProps(
    args: UseEditorControllerViewPropsArgs,
) {
    const {
        appSession,
        documentState,
        interactionState,
        appSessionActions,
        documentActions,
        interactionActions,
        refs,
        backgroundViewState,
        canvasWorkflow,
        lifecycle,
        viewState,
        interactionEffects,
        placementCount,
        sceneReadOnly,
        canRedo,
    } = args;

    const sidebarProps = useEditorSidebarBindings({
        chrome: { showTopPanel: appSession.showTopPanel },
        sceneReadOnly,
        files: {
            hideoutMaps: appSession.hideoutMaps,
            activeMapId: appSession.activeMapId,
            onHideoutMapSelect: lifecycle.onHideoutMapSelect,
            onDeleteActiveHideoutMap: lifecycle.onDeleteActiveHideoutMap,
            onExport: lifecycle.onExport,
            onSaveMapAsNew: lifecycle.onSaveMapAsNew,
            applyHomeView: canvasWorkflow.applyHomeView,
            onCreateMapFromHideoutFile: lifecycle.onCreateMapFromHideoutFile,
        },
        background: {
            bgSelectValue: backgroundViewState.bgSelectValue,
            bgLocked: backgroundViewState.bgLocked,
            setBackground: documentActions.setBackground,
            defaultBackground,
            inputImageNames: appSession.inputImageNames,
            bgOrphanSelect: backgroundViewState.bgOrphanSelect,
            refreshInputImages: lifecycle.refreshInputImages,
            setStatus: appSessionActions.setStatus,
            background: documentState.background,
            applyBackgroundFitToZone: interactionEffects.applyBackgroundFitToZone,
        },
        tool: {
            ui: documentState.ui,
            setUi: documentActions.setUi,
            tool: documentState.tool,
            setTool: documentActions.setTool,
            selected: interactionState.selected,
            rotateSelected: canvasWorkflow.rotateSelected,
            mirrorSelectedHorizontal: canvasWorkflow.mirrorSelectedHorizontal,
            mirrorSelectedVertical: canvasWorkflow.mirrorSelectedVertical,
            moveSelectedToNewLayer: canvasWorkflow.moveSelectedToNewLayer,
            deleteSelected: canvasWorkflow.deleteSelected,
            redo: canvasWorkflow.redo,
            canRedo,
            selectionDetail: canvasWorkflow.selectionDetail,
        },
        layers: {
            boundary: documentState.boundary,
            setLayerVisible: canvasWorkflow.onLayerVisibilityToggle,
            layers: documentState.layers,
            layerIdx: documentState.layerIdx,
            setLayerIdx: documentActions.setLayerIdx,
            addLayer: canvasWorkflow.addLayer,
            removeLayer: canvasWorkflow.removeLayer,
            placementStats: canvasWorkflow.placementStats,
            selected: interactionState.selected,
            onSelectSidebarPlacement: canvasWorkflow.onSelectSidebarPlacement,
            onLayerLockedToggle: canvasWorkflow.onLayerLockedToggle,
        },
    });

    const canvasClassName = useEditorCanvasClassName({
        panDrag: interactionState.panDrag,
        spaceHeld: interactionState.spaceHeld,
        toolVariant: documentState.tool.variant,
        selectDrag: canvasWorkflow.selectDrag,
        selectRmbRotate: canvasWorkflow.selectRmbRotate,
        marqueeView: canvasWorkflow.marqueeView,
        bgSelected: interactionState.bgSelected,
    });

    const sceneProps = useEditorSvgSceneProps({
        zonePolygonPoints: canvasWorkflow.zonePolygonPoints,
        boundaryViewLen: canvasWorkflow.boundaryView.length,
        backgroundSvg: backgroundViewState.backgroundSvg,
        showTemplateDots: documentState.ui.show_template_dots,
        dotsViewSvg: canvasWorkflow.dotsViewSvg,
        templateDotRadius: canvasWorkflow.templateDotRadius,
        layers: documentState.layers,
        layerIdx: documentState.layerIdx,
        cameraDeg: documentState.cameraDeg,
        selected: interactionState.selected,
        viewBox: viewState.viewBox,
        activeAssetKey: canvasWorkflow.activeAssetKey,
        fillPreviewPlacements: canvasWorkflow.fillPreviewPlacements,
        toolFillStepWorld: documentState.tool.fill_step_world,
        lineDraft: interactionState.lineDraft,
        toolSpacing: documentState.tool.spacing,
        toolMargin: documentState.tool.margin,
        cursorView: interactionState.cursorView,
        eraserVariant: documentState.tool.variant === 'eraser',
        eraserRadius: canvasWorkflow.eraserRadius,
        lineWidthVU: canvasWorkflow.lineWidthVU,
        boundary: documentState.boundary,
        marqueeView: canvasWorkflow.marqueeView,
        backgroundSelectionSvgPoints: canvasWorkflow.backgroundSelectionSvgPoints,
        hiddenKeys: canvasWorkflow.dragOverlay?.hiddenKeys ?? null,
        dragOverlay: canvasWorkflow.dragOverlay ?? null,
        dragOverlayRef: canvasWorkflow.dragOverlayRef,
    });

    const headerProps: EditorHeaderBarProps = {
        apiOk: appSession.apiOk,
        placementCount,
        showTopPanel: appSession.showTopPanel,
        setShowTopPanel: appSessionActions.setShowTopPanel,
    };

    const canvasProps: EditorCanvasProps = {
        svgWrapRef: refs.svgWrapRef,
        svgRef: refs.svgRef,
        svgClassName: canvasClassName,
        viewBoxStr: canvasWorkflow.viewBoxStr,
        toolVariant: documentState.tool.variant,
        lineBrushActiveRef: canvasWorkflow.lineBrushActiveRef,
        onPointerDownSvg: canvasWorkflow.onPointerDownSvg,
        onPointerMoveSvg: canvasWorkflow.onPointerMoveSvg,
        finishSelectRotatePointer: canvasWorkflow.finishSelectRotatePointer,
        onMouseDownSvg: canvasWorkflow.onMouseDownSvg,
        onMouseMoveSvg: canvasWorkflow.onMouseMoveSvg,
        setPanDrag: interactionActions.setPanDrag,
        setCursorView: interactionActions.setCursorView,
        setLineDraft: interactionActions.setLineDraft,
        sceneProps,
    };

    return {
        sidebarProps,
        headerProps,
        canvasProps,
    };
}
