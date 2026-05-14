import type { useEditorCanvasWorkflow } from '../useEditorCanvasWorkflow';
import type { useEditorControllerScaffold } from '../useEditorControllerScaffold';

type EditorControllerScaffold = ReturnType<typeof useEditorControllerScaffold>;
type CanvasWorkflowArgs = Parameters<typeof useEditorCanvasWorkflow>[0];

export function useCanvasWorkflowArgs(
    scaffold: EditorControllerScaffold,
): CanvasWorkflowArgs {
    const {
        documentState,
        interactionState,
        viewportState,
        appSessionActions,
        documentActions,
        interactionActions,
        viewportActions,
        sceneReadOnly,
        bgNaturalSize,
        svgRef,
        spaceDownRef,
        viewBoxRef,
        cameraDegRef,
        boundaryRef,
        toolMarginRef,
        layersRef,
        backgroundRef,
        bgNaturalSizeRef,
    } = scaffold;
    const {
        templateDots,
        boundary,
        layers,
        layerIdx,
        cameraDeg,
        tool,
        ui,
        background,
    } = documentState;
    const {
        bgSelected,
        panDrag,
        selected,
        cursorView,
    } = interactionState;
    const { viewBox } = viewportState;

    return {
        undoStack: {
            setStatus: appSessionActions.setStatus,
        },
        layerActions: {
            setStatus: appSessionActions.setStatus,
        },
        derivedSceneState: {
            layers,
            layerIdx,
            tool,
            selected,
            cameraDeg,
            boundary,
            templateDots,
            uiPlacementPreviewScale: ui.placement_preview_scale,
            cursorView,
            viewBox,
            background,
            bgNaturalSize,
            bgSelected,
        },
        placementActions: {
            layers,
            layerIdx,
            setLayerIdx: documentActions.setLayerIdx,
            cameraDeg,
            tool,
            boundary,
            selected,
            setSelected: interactionActions.setSelected,
            setStatus: appSessionActions.setStatus,
            viewBoxRef,
            boundaryRef,
            cameraDegRef,
            toolMarginRef,
        },
        canvasGestures: {
            svgRef,
            viewBoxRef,
            cameraDegRef,
            boundaryRef,
            toolMarginRef,
            layersRef,
            spaceDownRef,
            ui,
            tool,
            viewBox,
            layers,
            layerIdx,
            selected,
            setSelected: interactionActions.setSelected,
            setPanDrag: interactionActions.setPanDrag,
            setViewBox: viewportActions.setViewBox,
            setCursorView: interactionActions.setCursorView,
            setLineDraft: interactionActions.setLineDraft,
            setStatus: appSessionActions.setStatus,
            panDrag,
            cameraDeg,
            sceneReadOnly,
            backgroundRef,
            bgNaturalSizeRef,
            setBackground: documentActions.setBackground,
            setBgSelected: interactionActions.setBgSelected,
        },
        documentCommands: {
            svgRef,
            layers,
            boundary,
            cameraDeg,
            setSelected: interactionActions.setSelected,
            setBgSelected: interactionActions.setBgSelected,
            setStatus: appSessionActions.setStatus,
            setViewBox: viewportActions.setViewBox,
            resetEditorDocument: documentActions.resetEditorDocument,
        },
    };
}
