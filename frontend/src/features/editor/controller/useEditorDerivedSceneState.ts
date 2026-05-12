import { useMemo } from 'react';

import { mplViewPointToSvg, worldToView } from '../../../lib/coords';
import {
    DECORATIONS,
    DRAWING_ASSET_KEYS,
    assetKeyForTemplate,
} from '../../../lib/sceneDecorations';
import type { AssetKey, Background, PaintLayer, Tool } from '../../../types/scene';
import type { LayerId } from '../lib/editorIds';
import {
    backgroundCornersPolygonSvgPoints,
    resolveBackgroundDisplayMetrics,
} from '../lib/editorBackgroundGeometry';
import { computeFillPlacements } from '../lib/editorFill';
import type { SelectionState } from '../model/editorSessionTypes';
import type { ViewBox } from '../lib/editorViewport';
import { normalizedFillModeParams, resolvedFillMode } from './placement-actions/fillConfig';

type UseEditorDerivedSceneStateArgs = {
    layers: PaintLayer[];
    layerIdx: LayerId;
    tool: Tool;
    selected: SelectionState;
    cameraDeg: number;
    boundary: [number, number][];
    templateDots: [number, number][];
    uiPlacementPreviewScale: number | undefined;
    cursorView: [number, number] | null;
    viewBox: ViewBox;
    background: Background;
    bgNaturalSize: { w: number; h: number } | null;
    bgSelected: boolean;
};

export function useEditorDerivedSceneState(args: UseEditorDerivedSceneStateArgs) {
    const {
        layers,
        layerIdx,
        tool,
        selected,
        cameraDeg,
        boundary,
        templateDots,
        uiPlacementPreviewScale,
        cursorView,
        viewBox,
        background,
        bgNaturalSize,
        bgSelected,
    } = args;

    const activeAssetKey: AssetKey =
        DRAWING_ASSET_KEYS.includes(tool.variant as AssetKey)
            ? (tool.variant as AssetKey)
            : tool.variant === 'line'
              ? (tool.line_asset_key ?? 'faridun_ropes4')
              : tool.variant === 'fill'
                ? (tool.fill_asset_key ?? 'faridun_ropes4')
                : (tool.asset_key ?? 'faridun_ropes4');

    const boundaryView = useMemo(
        () =>
            boundary.map(
                ([x, y]) => worldToView(x, y, cameraDeg) as [number, number],
            ),
        [boundary, cameraDeg],
    );

    const boundaryViewSvg = useMemo(
        () => boundaryView.map(([vx, vy]) => mplViewPointToSvg(vx, vy, viewBox)),
        [boundaryView, viewBox],
    );

    const layer0DotsWorld = useMemo((): [number, number][] => {
        const ly = layers[0];
        const out: [number, number][] = [];
        if (!ly) return out;
        for (const b of ly.batches) {
            for (const p of b.placements) out.push([p.x, p.y]);
        }
        return out;
    }, [layers]);

    const dotsForOverlay =
        layer0DotsWorld.length > 0 ? layer0DotsWorld : templateDots;

    const dotsViewSvg = useMemo(
        () =>
            dotsForOverlay.map(([x, y]) =>
                mplViewPointToSvg(...worldToView(x, y, cameraDeg), viewBox),
            ),
        [dotsForOverlay, cameraDeg, viewBox],
    );

    const fillPreviewPlacements = useMemo(() => {
        if (tool.variant !== 'fill') return [];
        if (!cursorView) return [];
        if (layerIdx === 0) return [];
        const ly = layers[layerIdx];
        if (!ly || ly.locked || !ly.visible) return [];
        if (boundary.length < 3) return [];
        const res = computeFillPlacements({
            layers,
            layerIdx,
            boundary,
            cameraDeg,
            toolMargin: tool.margin,
            fillStepWorld: tool.fill_step_world ?? 4,
            fillMaxPlacements: Math.min(
                800,
                Math.max(1, Math.round(tool.fill_max_placements ?? 120)),
            ),
            fillMarginWorld: tool.fill_margin_world,
            fillMode: resolvedFillMode(tool),
            fillModeParams: normalizedFillModeParams(tool.fill_mode_params),
            fillConnectivity: tool.fill_connectivity ?? 4,
            fillWallsScope: tool.fill_walls_scope ?? 'all_layers',
            activeAssetKey,
            seedView: cursorView,
            viewBox,
            maxBfsVisits: 70_000,
        });
        if (res.status !== 'ok' || res.openArea) return [];
        return res.placements.slice(0, 800);
    }, [
        tool,
        cursorView,
        layerIdx,
        layers,
        boundary,
        cameraDeg,
        activeAssetKey,
        viewBox,
    ]);

    const placementStats = useMemo(() => {
        let placements = 0;
        let batches = 0;
        for (const ly of layers) {
            for (const b of ly.batches) {
                batches += 1;
                placements += b.placements.length;
            }
        }
        return { placements, batches, placementsTotal: placements };
    }, [layers]);

    const selectionDetail = useMemo(() => {
        if (selected.length !== 1) return null;
        const s = selected[0];
        const ly = layers[s.layerIdx];
        if (!ly) return null;
        const b = ly.batches[s.batchIdx];
        if (!b) return null;
        const p = b.placements[s.placementIdx];
        if (!p) return null;
        const ak = assetKeyForTemplate(b.template_hash, b.facet_fv);
        if (!ak) return null;
        return { p, ly, title: DECORATIONS[ak].title };
    }, [selected, layers]);

    const viewBoxStr = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
    const lineWidthVU = Math.max(viewBox.width * 0.0025, 0.8);
    const eraserRadius = Math.max(tool.brush_width_view * 0.5, 2);
    const zonePolygonPoints =
        boundaryViewSvg.length >= 3
            ? boundaryViewSvg.map(([x, y]) => `${x},${y}`).join(' ')
            : '';

    const backgroundSelectionSvgPoints = useMemo(() => {
        if (!bgSelected || Boolean(background.locked)) return null;
        const p = background.path?.trim();
        if (!p || !bgNaturalSize || bgNaturalSize.w < 1 || bgNaturalSize.h < 1)
            return null;
        const m = resolveBackgroundDisplayMetrics(
            background,
            bgNaturalSize,
            boundary,
            cameraDeg,
            viewBox,
        );
        if (!m) return null;
        return backgroundCornersPolygonSvgPoints(m, viewBox);
    }, [bgSelected, background, bgNaturalSize, boundary, cameraDeg, viewBox]);

    const templateDotRadius =
        Math.max(viewBox.width * 0.0065, 2) * (uiPlacementPreviewScale ?? 1);

    return {
        activeAssetKey,
        boundaryView,
        boundaryViewSvg,
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
    };
}
