import type { useEditorCanvasWorkflow } from '../useEditorCanvasWorkflow';
import type { useEditorControllerInteractionEffects } from '../useEditorControllerInteractionEffects';
import type { useEditorControllerScaffold } from '../useEditorControllerScaffold';
import type { useEditorControllerViewProps } from '../useEditorControllerViewProps';
import type { useEditorMapLifecycle } from '../useEditorMapLifecycle';

type EditorControllerScaffold = ReturnType<typeof useEditorControllerScaffold>;
type EditorCanvasWorkflow = ReturnType<typeof useEditorCanvasWorkflow>;
type EditorSessionLifecycle = ReturnType<typeof useEditorMapLifecycle>;
type InteractionEffects = ReturnType<typeof useEditorControllerInteractionEffects>;
type ControllerViewPropsArgs = Parameters<typeof useEditorControllerViewProps>[0];

type UseControllerViewPropsArgsInput = {
    scaffold: EditorControllerScaffold;
    canvasWorkflow: EditorCanvasWorkflow;
    lifecycle: EditorSessionLifecycle;
    interactionEffects: InteractionEffects;
};

export function useControllerViewPropsArgs(
    input: UseControllerViewPropsArgsInput,
): ControllerViewPropsArgs {
    const { scaffold, canvasWorkflow, lifecycle, interactionEffects } = input;
    const {
        appSession,
        documentState,
        interactionState,
        viewportState,
        appSessionActions,
        documentActions,
        interactionActions,
        sceneReadOnly,
        canRedo,
        bgLocked,
        bgSelectValue,
        bgOrphanSelect,
        backgroundSvg,
        svgWrapRef,
        svgRef,
    } = scaffold;

    return {
        appSession: {
            apiOk: appSession.apiOk,
            showTopPanel: appSession.showTopPanel,
            hideoutMaps: appSession.hideoutMaps,
            activeMapId: appSession.activeMapId,
            inputImageNames: appSession.inputImageNames,
        },
        documentState: {
            background: documentState.background,
            boundary: documentState.boundary,
            layers: documentState.layers,
            layerIdx: documentState.layerIdx,
            cameraDeg: documentState.cameraDeg,
            tool: documentState.tool,
            ui: documentState.ui,
        },
        interactionState: {
            selected: interactionState.selected,
            bgSelected: interactionState.bgSelected,
            panDrag: interactionState.panDrag,
            spaceHeld: interactionState.spaceHeld,
            cursorView: interactionState.cursorView,
            lineDraft: interactionState.lineDraft,
        },
        appSessionActions: {
            setShowTopPanel: appSessionActions.setShowTopPanel,
            setStatus: appSessionActions.setStatus,
        },
        documentActions: {
            setBackground: documentActions.setBackground,
            setLayerIdx: documentActions.setLayerIdx,
            setTool: documentActions.setTool,
        },
        interactionActions: {
            setPanDrag: interactionActions.setPanDrag,
            setCursorView: interactionActions.setCursorView,
            setLineDraft: interactionActions.setLineDraft,
        },
        refs: {
            svgWrapRef,
            svgRef,
        },
        backgroundViewState: {
            bgSelectValue,
            bgLocked,
            bgOrphanSelect,
            backgroundSvg,
        },
        canvasWorkflow: {
            placementStats: canvasWorkflow.placementStats,
            lineBrushActiveRef: canvasWorkflow.lineBrushActiveRef,
            selectDrag: canvasWorkflow.selectDrag,
            selectRmbRotate: canvasWorkflow.selectRmbRotate,
            marqueeView: canvasWorkflow.marqueeView,
            viewBoxStr: canvasWorkflow.viewBoxStr,
            activeAssetKey: canvasWorkflow.activeAssetKey,
            boundaryView: canvasWorkflow.boundaryView,
            dotsViewSvg: canvasWorkflow.dotsViewSvg,
            fillPreviewPlacements: canvasWorkflow.fillPreviewPlacements,
            selectionDetail: canvasWorkflow.selectionDetail,
            lineWidthVU: canvasWorkflow.lineWidthVU,
            eraserRadius: canvasWorkflow.eraserRadius,
            zonePolygonPoints: canvasWorkflow.zonePolygonPoints,
            backgroundSelectionSvgPoints:
                canvasWorkflow.backgroundSelectionSvgPoints,
            templateDotRadius: canvasWorkflow.templateDotRadius,
            onPointerDownSvg: canvasWorkflow.onPointerDownSvg,
            onPointerMoveSvg: canvasWorkflow.onPointerMoveSvg,
            finishSelectRotatePointer: canvasWorkflow.finishSelectRotatePointer,
            onMouseDownSvg: canvasWorkflow.onMouseDownSvg,
            onMouseMoveSvg: canvasWorkflow.onMouseMoveSvg,
            rotateSelected: canvasWorkflow.rotateSelected,
            mirrorSelectedHorizontal: canvasWorkflow.mirrorSelectedHorizontal,
            mirrorSelectedVertical: canvasWorkflow.mirrorSelectedVertical,
            moveSelectedToNewLayer: canvasWorkflow.moveSelectedToNewLayer,
            deleteSelected: canvasWorkflow.deleteSelected,
            redo: canvasWorkflow.redo,
            addLayer: canvasWorkflow.addLayer,
            removeLayer: canvasWorkflow.removeLayer,
            onLayerVisibilityToggle: canvasWorkflow.onLayerVisibilityToggle,
            onSelectSidebarPlacement: canvasWorkflow.onSelectSidebarPlacement,
            onLayerLockedToggle: canvasWorkflow.onLayerLockedToggle,
            applyHomeView: canvasWorkflow.applyHomeView,
            dragOverlay: canvasWorkflow.dragOverlay,
            dragOverlayRef: canvasWorkflow.dragOverlayHandleRef,
        },
        lifecycle: {
            onHideoutMapSelect: lifecycle.onHideoutMapSelect,
            onDeleteActiveHideoutMap: lifecycle.onDeleteActiveHideoutMap,
            onExport: lifecycle.onExport,
            onSaveMapAsNew: lifecycle.onSaveMapAsNew,
            onCreateMapFromHideoutFile: lifecycle.onCreateMapFromHideoutFile,
            refreshInputImages: lifecycle.refreshInputImages,
        },
        viewState: {
            viewBox: viewportState.viewBox,
        },
        interactionEffects: {
            applyBackgroundFitToZone: interactionEffects.applyBackgroundFitToZone,
        },
        placementCount: canvasWorkflow.placementStats.placementsTotal,
        sceneReadOnly,
        canRedo,
    };
}
