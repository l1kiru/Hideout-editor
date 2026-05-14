import { useMemo } from 'react';

import type { EditorSvgSceneProps } from '../components/EditorSvgScene';

type UseEditorSvgScenePropsArgs = {
    zonePolygonPoints: EditorSvgSceneProps['zonePolygonPoints'];
    boundaryViewLen: EditorSvgSceneProps['boundaryViewLen'];
    backgroundSvg: EditorSvgSceneProps['backgroundSvg'];
    showTemplateDots: EditorSvgSceneProps['showTemplateDots'];
    dotsViewSvg: EditorSvgSceneProps['dotsViewSvg'];
    templateDotRadius: EditorSvgSceneProps['templateDotRadius'];
    layers: EditorSvgSceneProps['layers'];
    layerIdx: EditorSvgSceneProps['layerIdx'];
    cameraDeg: EditorSvgSceneProps['cameraDeg'];
    selected: EditorSvgSceneProps['selected'];
    viewBox: EditorSvgSceneProps['viewBox'];
    activeAssetKey: EditorSvgSceneProps['activeAssetKey'];
    fillPreviewPlacements: EditorSvgSceneProps['fillPreviewPlacements'];
    toolFillStepWorld: number | undefined;
    lineDraft: EditorSvgSceneProps['lineDraft'];
    toolSpacing: EditorSvgSceneProps['toolSpacing'];
    toolMargin: EditorSvgSceneProps['toolMargin'];
    cursorView: EditorSvgSceneProps['cursorView'];
    eraserVariant: EditorSvgSceneProps['eraserVariant'];
    eraserRadius: EditorSvgSceneProps['eraserRadius'];
    lineWidthVU: EditorSvgSceneProps['lineWidthVU'];
    boundary: EditorSvgSceneProps['boundary'];
    marqueeView: EditorSvgSceneProps['marqueeView'];
    backgroundSelectionSvgPoints: EditorSvgSceneProps['backgroundSelectionSvgPoints'];
    hiddenKeys: EditorSvgSceneProps['hiddenKeys'];
    dragOverlay: EditorSvgSceneProps['dragOverlay'];
    dragOverlayRef: EditorSvgSceneProps['dragOverlayRef'];
};

export function useEditorSvgSceneProps(args: UseEditorSvgScenePropsArgs) {
    const {
        zonePolygonPoints,
        boundaryViewLen,
        backgroundSvg,
        showTemplateDots,
        dotsViewSvg,
        templateDotRadius,
        layers,
        layerIdx,
        cameraDeg,
        selected,
        viewBox,
        activeAssetKey,
        fillPreviewPlacements,
        toolFillStepWorld,
        lineDraft,
        toolSpacing,
        toolMargin,
        cursorView,
        eraserVariant,
        eraserRadius,
        lineWidthVU,
        boundary,
        marqueeView,
        backgroundSelectionSvgPoints,
        hiddenKeys,
        dragOverlay,
        dragOverlayRef,
    } = args;

    return useMemo(
        () =>
            ({
                zonePolygonPoints,
                boundaryViewLen,
                backgroundSvg,
                showTemplateDots,
                dotsViewSvg,
                templateDotRadius,
                layers,
                layerIdx,
                cameraDeg,
                selected,
                viewBox,
                activeAssetKey,
                fillPreviewPlacements,
                fillPreviewSpacingWorld: Math.max(
                    1,
                    Math.round(toolFillStepWorld ?? 4),
                ),
                lineDraft,
                toolSpacing,
                toolMargin,
                cursorView,
                eraserVariant,
                eraserRadius,
                lineWidthVU,
                boundary,
                marqueeView,
                backgroundSelectionSvgPoints,
                hiddenKeys,
                dragOverlay,
                dragOverlayRef,
            }) satisfies EditorSvgSceneProps,
        [
            zonePolygonPoints,
            boundaryViewLen,
            backgroundSvg,
            showTemplateDots,
            dotsViewSvg,
            templateDotRadius,
            layers,
            layerIdx,
            cameraDeg,
            selected,
            viewBox,
            activeAssetKey,
            fillPreviewPlacements,
            toolFillStepWorld,
            lineDraft,
            toolSpacing,
            toolMargin,
            cursorView,
            eraserVariant,
            eraserRadius,
            lineWidthVU,
            boundary,
            marqueeView,
            backgroundSelectionSvgPoints,
            hiddenKeys,
            dragOverlay,
            dragOverlayRef,
        ],
    );
}
