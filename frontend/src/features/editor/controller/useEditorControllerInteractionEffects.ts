import { useEditorBackgroundController } from './useEditorBackgroundController';
import { useEditorClipboard } from './useEditorClipboard';
import { useEditorKeyboardShortcuts } from './useEditorKeyboardShortcuts';
import { useEditorViewportInteractions } from './useEditorViewportInteractions';

type UseEditorControllerInteractionEffectsArgs = {
    refs: {
        svgWrapRef: Parameters<typeof useEditorViewportInteractions>[0]['svgWrapRef'];
        svgRef: Parameters<typeof useEditorViewportInteractions>[0]['svgRef'];
        spaceDownRef: Parameters<typeof useEditorKeyboardShortcuts>[0]['spaceDownRef'];
        layersRef: Parameters<typeof useEditorClipboard>[0]['layersRef'];
        boundaryRef: Parameters<typeof useEditorClipboard>[0]['boundaryRef'];
        cameraDegRef: Parameters<typeof useEditorClipboard>[0]['cameraDegRef'];
        toolMarginRef: Parameters<typeof useEditorClipboard>[0]['toolMarginRef'];
        viewBoxRef: Parameters<typeof useEditorClipboard>[0]['viewBoxRef'];
        cursorViewRef: Parameters<typeof useEditorClipboard>[0]['cursorViewRef'];
        backgroundRef: Parameters<typeof useEditorBackgroundController>[0]['backgroundRef'];
        bgSelectedRef: Parameters<typeof useEditorBackgroundController>[0]['bgSelectedRef'];
    };
    documentState: {
        background: Parameters<typeof useEditorBackgroundController>[0]['background'];
        boundary: Parameters<typeof useEditorBackgroundController>[0]['boundary'];
        cameraDeg: Parameters<typeof useEditorBackgroundController>[0]['cameraDeg'];
        layerIdx: Parameters<typeof useEditorClipboard>[0]['layerIdx'];
        tool: Parameters<typeof useEditorClipboard>[0]['tool'];
    };
    interactionState: {
        selected: Parameters<typeof useEditorClipboard>[0]['selected'];
        bgSelected: Parameters<typeof useEditorKeyboardShortcuts>[0]['bgSelected'];
    };
    appSessionActions: {
        setStatus: Parameters<typeof useEditorClipboard>[0]['setStatus'];
        setShowTopPanel: Parameters<typeof useEditorKeyboardShortcuts>[0]['setShowTopPanel'];
    };
    documentActions: {
        setViewBox: Parameters<typeof useEditorViewportInteractions>[0]['setViewBox'];
        setTool: Parameters<typeof useEditorKeyboardShortcuts>[0]['setTool'];
    };
    interactionActions: {
        setSelected: Parameters<typeof useEditorClipboard>[0]['setSelected'];
        setSpaceHeld: Parameters<typeof useEditorKeyboardShortcuts>[0]['setSpaceHeld'];
    };
    backgroundViewState: {
        bgNaturalSize: Parameters<typeof useEditorBackgroundController>[0]['bgNaturalSize'];
    };
    canvasWorkflow: {
        undo: Parameters<typeof useEditorKeyboardShortcuts>[0]['undo'];
        redo: Parameters<typeof useEditorKeyboardShortcuts>[0]['redo'];
        lineBrushActiveRef: Parameters<typeof useEditorKeyboardShortcuts>[0]['lineBrushActiveRef'];
        deleteSelected: Parameters<typeof useEditorKeyboardShortcuts>[0]['deleteSelected'];
        rotateSelected: Parameters<typeof useEditorKeyboardShortcuts>[0]['rotateSelected'];
    };
    sceneReadOnly: Parameters<typeof useEditorKeyboardShortcuts>[0]['sceneReadOnly'];
};

export function useEditorControllerInteractionEffects(
    args: UseEditorControllerInteractionEffectsArgs,
) {
    const {
        refs,
        documentState,
        interactionState,
        appSessionActions,
        documentActions,
        interactionActions,
        backgroundViewState,
        canvasWorkflow,
        sceneReadOnly,
    } = args;

    const { copySelected, pasteClipboard } = useEditorClipboard({
        layersRef: refs.layersRef,
        layerIdx: documentState.layerIdx,
        selected: interactionState.selected,
        tool: documentState.tool,
        boundaryRef: refs.boundaryRef,
        cameraDegRef: refs.cameraDegRef,
        toolMarginRef: refs.toolMarginRef,
        viewBoxRef: refs.viewBoxRef,
        cursorViewRef: refs.cursorViewRef,
        setSelected: interactionActions.setSelected,
        setStatus: appSessionActions.setStatus,
    });
    const {
        rotateBackground,
        clearBackground,
        handleBackgroundCtrlWheel,
        applyBackgroundFitToZone,
    } = useEditorBackgroundController({
        background: documentState.background,
        backgroundRef: refs.backgroundRef,
        bgSelectedRef: refs.bgSelectedRef,
        bgNaturalSize: backgroundViewState.bgNaturalSize,
        boundary: documentState.boundary,
        cameraDeg: documentState.cameraDeg,
        setStatus: appSessionActions.setStatus,
    });

    useEditorKeyboardShortcuts({
        sceneReadOnly,
        spaceDownRef: refs.spaceDownRef,
        lineBrushActiveRef: canvasWorkflow.lineBrushActiveRef,
        setSpaceHeld: interactionActions.setSpaceHeld,
        undo: canvasWorkflow.undo,
        redo: canvasWorkflow.redo,
        setShowTopPanel: appSessionActions.setShowTopPanel,
        deleteSelected: canvasWorkflow.deleteSelected,
        rotateSelected: canvasWorkflow.rotateSelected,
        setTool: documentActions.setTool,
        copySelected,
        pasteClipboard,
        bgSelected: interactionState.bgSelected,
        rotateBackground,
        clearBackground,
    });

    useEditorViewportInteractions({
        svgWrapRef: refs.svgWrapRef,
        svgRef: refs.svgRef,
        viewBoxRef: refs.viewBoxRef,
        setViewBox: documentActions.setViewBox,
        onCtrlWheel: handleBackgroundCtrlWheel,
    });

    return {
        applyBackgroundFitToZone,
    };
}
