import type { ReactNode, Ref } from 'react';

import type { AssetKey, PaintLayer } from '../../../types/scene';
import type { LayerId } from '../lib/editorIds';
import type { ViewBox } from '../lib/editorViewport';
import type { SelectionState } from '../model/editorSessionTypes';
import { EditorSvgDecorLayer } from './scene/EditorSvgDecorLayer';
import { EditorSvgFillPreview } from './scene/EditorSvgFillPreview';
import { EditorSvgLineDraft } from './scene/EditorSvgLineDraft';
import { EditorSvgOverlays } from './scene/EditorSvgOverlays';
import {
    DragOverlayLayer,
    type DragOverlayData,
    type DragOverlayHandle,
} from './scene/DragOverlayLayer';

export type EditorSvgSceneProps = {
    zonePolygonPoints: string;
    boundaryViewLen: number;
    backgroundSvg: ReactNode;
    showTemplateDots: boolean;
    dotsViewSvg: [number, number][];
    templateDotRadius: number;
    layers: PaintLayer[];
    layerIdx: LayerId;
    cameraDeg: number;
    selected: SelectionState;
    viewBox: ViewBox;
    activeAssetKey: AssetKey;
    fillPreviewPlacements: { x: number; y: number; r: number }[];
    fillPreviewSpacingWorld: number;
    lineDraft: { points: [number, number][] } | null;
    toolSpacing: number;
    toolMargin: number;
    cursorView: [number, number] | null;
    eraserVariant: boolean;
    eraserRadius: number;
    lineWidthVU: number;
    // Outline of the selected background (points in SVG user space).
    backgroundSelectionSvgPoints?: string | null;
    boundary: [number, number][];
    // Selection marquee rectangle in view coordinates: x0, y0, x1, y1.
    marqueeView: [number, number, number, number] | null;
    // Keys of placements hidden under the drag-overlay; the overlay renders them, the main scene skips them.
    hiddenKeys?: ReadonlySet<string> | null;
    // Data for the drag-overlay (null means drag is inactive).
    dragOverlay?: DragOverlayData | null;
    // Imperative API for the drag-overlay so gestures can move it without a re-render.
    dragOverlayRef?: Ref<DragOverlayHandle>;
};

export function EditorSvgScene(props: EditorSvgSceneProps) {
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
        fillPreviewSpacingWorld,
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
    } = props;

    return (
        <>
            <EditorSvgDecorLayer
                zonePolygonPoints={zonePolygonPoints}
                boundaryViewLen={boundaryViewLen}
                backgroundSvg={backgroundSvg}
                showTemplateDots={showTemplateDots}
                dotsViewSvg={dotsViewSvg}
                templateDotRadius={templateDotRadius}
                layers={layers}
                layerIdx={layerIdx}
                cameraDeg={cameraDeg}
                selected={selected}
                viewBox={viewBox}
                lineWidthVU={lineWidthVU}
                hiddenKeys={hiddenKeys ?? null}
            />
            <DragOverlayLayer
                ref={dragOverlayRef}
                data={dragOverlay ?? null}
                cameraDeg={cameraDeg}
                viewBox={viewBox}
                lineWidthVU={lineWidthVU}
            />
            {fillPreviewPlacements.length > 0 ? (
                <EditorSvgFillPreview
                    placements={fillPreviewPlacements}
                    activeAssetKey={activeAssetKey}
                    cameraDeg={cameraDeg}
                    viewBox={viewBox}
                    lineWidthVU={lineWidthVU}
                    spacingWorld={fillPreviewSpacingWorld}
                />
            ) : null}
            {lineDraft ? (
                <EditorSvgLineDraft
                    lineDraft={lineDraft}
                    activeAssetKey={activeAssetKey}
                    toolSpacing={toolSpacing}
                    cameraDeg={cameraDeg}
                    boundary={boundary}
                    toolMargin={toolMargin}
                    viewBox={viewBox}
                    lineWidthVU={lineWidthVU}
                />
            ) : null}
            <EditorSvgOverlays
                viewBox={viewBox}
                lineWidthVU={lineWidthVU}
                backgroundSelectionSvgPoints={backgroundSelectionSvgPoints}
                marqueeView={marqueeView}
                eraserVariant={eraserVariant}
                cursorView={cursorView}
                eraserRadius={eraserRadius}
            />
        </>
    );
}
