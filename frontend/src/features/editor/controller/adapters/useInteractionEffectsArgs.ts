import type { useEditorCanvasWorkflow } from '../useEditorCanvasWorkflow';
import type { useEditorControllerInteractionEffects } from '../useEditorControllerInteractionEffects';
import type { useEditorControllerScaffold } from '../useEditorControllerScaffold';

type EditorControllerScaffold = ReturnType<typeof useEditorControllerScaffold>;
type EditorCanvasWorkflow = ReturnType<typeof useEditorCanvasWorkflow>;
type InteractionEffectsArgs = Parameters<
    typeof useEditorControllerInteractionEffects
>[0];

type UseInteractionEffectsArgsInput = {
    scaffold: EditorControllerScaffold;
    canvasWorkflow: EditorCanvasWorkflow;
};

export function useInteractionEffectsArgs(
    input: UseInteractionEffectsArgsInput,
): InteractionEffectsArgs {
    const { scaffold, canvasWorkflow } = input;
    const {
        documentState,
        interactionState,
        appSessionActions,
        interactionActions,
        viewportActions,
        sceneReadOnly,
        bgNaturalSize,
        svgWrapRef,
        svgRef,
        spaceDownRef,
        layersRef,
        boundaryRef,
        cameraDegRef,
        toolMarginRef,
        viewBoxRef,
        cursorViewRef,
        backgroundRef,
        bgSelectedRef,
    } = scaffold;

    return {
        refs: {
            svgWrapRef,
            svgRef,
            spaceDownRef,
            layersRef,
            boundaryRef,
            cameraDegRef,
            toolMarginRef,
            viewBoxRef,
            cursorViewRef,
            backgroundRef,
            bgSelectedRef,
        },
        documentState: {
            background: documentState.background,
            boundary: documentState.boundary,
            cameraDeg: documentState.cameraDeg,
            layerIdx: documentState.layerIdx,
            tool: documentState.tool,
        },
        interactionState: {
            selected: interactionState.selected,
            bgSelected: interactionState.bgSelected,
        },
        appSessionActions: {
            setStatus: appSessionActions.setStatus,
            setShowTopPanel: appSessionActions.setShowTopPanel,
        },
        documentActions: {
            setViewBox: viewportActions.setViewBox,
            setTool: scaffold.documentActions.setTool,
        },
        interactionActions: {
            setSelected: interactionActions.setSelected,
            setSpaceHeld: interactionActions.setSpaceHeld,
        },
        backgroundViewState: {
            bgNaturalSize,
        },
        canvasWorkflow: {
            undo: canvasWorkflow.undo,
            redo: canvasWorkflow.redo,
            lineBrushActiveRef: canvasWorkflow.lineBrushActiveRef,
            deleteSelected: canvasWorkflow.deleteSelected,
            rotateSelected: canvasWorkflow.rotateSelected,
        },
        sceneReadOnly,
    };
}
