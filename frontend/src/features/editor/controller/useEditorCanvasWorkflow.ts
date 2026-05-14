import { useEditorCanvasGestures } from '../hooks/useEditorCanvasGestures';
import { useEditorUndoStack } from '../hooks/useEditorUndoStack';
import { useEditorDerivedSceneState } from './useEditorDerivedSceneState';
import { useEditorDocumentCommands } from './useEditorDocumentCommands';
import { useEditorLayerActions } from './useEditorLayerActions';
import { useEditorLineBrushBridge } from './useEditorLineBrushBridge';
import { useEditorPlacementActions } from './useEditorPlacementActions';

type UseEditorCanvasWorkflowArgs = {
    undoStack: Parameters<typeof useEditorUndoStack>[0];
    layerActions: Parameters<typeof useEditorLayerActions>[0];
    derivedSceneState: Parameters<typeof useEditorDerivedSceneState>[0];
    placementActions: Omit<
        Parameters<typeof useEditorPlacementActions>[0],
        | 'activeAssetKey'
        | 'eraserRadius'
    >;
    canvasGestures: Omit<
        Parameters<typeof useEditorCanvasGestures>[0],
        | 'lineBrushActiveRef'
        | 'lineDraftRef'
        | 'placeStrokeRef'
        | 'eraseAt'
        | 'placeObjectAt'
        | 'placeFillAt'
        | 'pushBackgroundUndo'
        | 'undo'
    >;
    documentCommands: Omit<
        Parameters<typeof useEditorDocumentCommands>[0],
        'abortCanvasInteractions'
    >;
};

export function useEditorCanvasWorkflow(args: UseEditorCanvasWorkflowArgs) {
    const {
        undoStack,
        layerActions,
        derivedSceneState,
        placementActions,
        canvasGestures,
        documentCommands,
    } = args;

    const {
        pushBackgroundUndo,
        undo,
        redo,
    } = useEditorUndoStack(undoStack);

    const {
        addLayer,
        removeLayer,
        onLayerLockedToggle,
        onLayerVisibilityToggle,
    } = useEditorLayerActions(layerActions);

    const {
        activeAssetKey,
        boundaryView,
        dotsViewSvg,
        fillPreviewPlacements,
        placementStats,
        selectionDetail,
        viewBoxStr,
        lineWidthVU,
        eraserRadius,
        zonePolygonPoints,
        backgroundSelectionSvgPoints,
        templateDotRadius,
    } = useEditorDerivedSceneState(derivedSceneState);

    const {
        eraseAt,
        placeObjectAt,
        placeStrokeAt,
        placeFillAt,
        rotateSelected,
        mirrorSelectedHorizontal,
        mirrorSelectedVertical,
        moveSelectedToNewLayer,
        deleteSelected,
    } = useEditorPlacementActions({
        ...placementActions,
        activeAssetKey,
        eraserRadius,
    });

    const {
        lineBrushActiveRef,
        lineDraftRef,
        placeStrokeRef,
    } = useEditorLineBrushBridge({
        placeStrokeAt,
    });

    const {
        selectDrag,
        selectRmbRotate,
        marqueeView,
        dragOverlay,
        dragOverlayHandleRef,
        abortCanvasInteractions,
        onPointerDownSvg,
        onPointerMoveSvg,
        finishSelectRotatePointer,
        onMouseDownSvg,
        onMouseMoveSvg,
    } = useEditorCanvasGestures({
        ...canvasGestures,
        lineBrushActiveRef,
        lineDraftRef,
        placeStrokeRef,
        eraseAt,
        placeObjectAt,
        placeFillAt,
        pushBackgroundUndo,
        undo,
    });

    const {
        applyBundledDefaultLayerBatches,
        onSelectSidebarPlacement,
        resetEditorForMapSwitch,
        applyHomeView,
    } = useEditorDocumentCommands({
        ...documentCommands,
        abortCanvasInteractions,
    });

    return {
        undo,
        redo,
        addLayer,
        removeLayer,
        onLayerLockedToggle,
        onLayerVisibilityToggle,
        activeAssetKey,
        boundaryView,
        dotsViewSvg,
        fillPreviewPlacements,
        placementStats,
        selectionDetail,
        viewBoxStr,
        lineWidthVU,
        eraserRadius,
        zonePolygonPoints,
        backgroundSelectionSvgPoints,
        templateDotRadius,
        rotateSelected,
        mirrorSelectedHorizontal,
        mirrorSelectedVertical,
        moveSelectedToNewLayer,
        deleteSelected,
        lineBrushActiveRef,
        selectDrag,
        selectRmbRotate,
        marqueeView,
        dragOverlay,
        dragOverlayHandleRef,
        abortCanvasInteractions,
        onPointerDownSvg,
        onPointerMoveSvg,
        finishSelectRotatePointer,
        onMouseDownSvg,
        onMouseMoveSvg,
        applyBundledDefaultLayerBatches,
        onSelectSidebarPlacement,
        resetEditorForMapSwitch,
        applyHomeView,
    };
}
