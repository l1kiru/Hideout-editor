import { describe, expect, it } from 'vitest';

import { DRAWING_ASSET_KEYS, DECORATIONS } from '../../../lib/sceneDecorations';
import type { AssetKey, PaintLayer, PaintedBatch } from '../../../types/scene';
import { defaultTool } from './editorDefaults';
import { computeFillPlacements } from './editorFill';
import { layerId } from './editorIds';
import { createDefaultPaintLayer, createUserPaintLayer } from './editorLayers';
import { placementsForPolyline } from './editorLineBrush';
import type { ViewBox } from './editorViewport';

const CAMERA_DEG = 0;
const BOUNDARY: [number, number][] = [
    [-160, -160],
    [160, -160],
    [160, 160],
    [-160, 160],
];
const VIEW_BOX: ViewBox = {
    x: -180,
    y: -180,
    width: 360,
    height: 360,
};

function buildCircleViewPoints(
    radius: number,
    segments: number,
): [number, number][] {
    const out: [number, number][] = [];
    for (let i = 0; i <= segments; i += 1) {
        const angle = (i / segments) * Math.PI * 2;
        out.push([
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
        ]);
    }
    return out;
}

function makeCircleBatch(assetKey: AssetKey): PaintedBatch {
    const asset = DECORATIONS[assetKey];
    const tool = defaultTool();
    const placements = placementsForPolyline(
        buildCircleViewPoints(60, 96),
        asset,
        tool.spacing,
        CAMERA_DEG,
        assetKey,
        BOUNDARY,
        tool.margin,
    );

    return {
        template_name_ru: asset.nameRu,
        template_hash: asset.hash,
        facet_fv: asset.fv,
        line_stroke: true,
        placements,
    };
}

function makeLayers(batch: PaintedBatch): PaintLayer[] {
    return [
        createDefaultPaintLayer(),
        createUserPaintLayer([batch], 'Circle'),
    ];
}

function computeCircleFillResult(
    wallAssetKey: AssetKey,
    fillAssetKey: AssetKey,
) {
    const batch = makeCircleBatch(wallAssetKey);
    const tool = defaultTool();

    return {
        wallAssetKey,
        fillAssetKey,
        circlePlacements: batch.placements.length,
        ...computeFillPlacements({
            layers: makeLayers(batch),
            layerIdx: layerId(1),
            boundary: BOUNDARY,
            cameraDeg: CAMERA_DEG,
            toolMargin: tool.margin,
            fillStepWorld: tool.fill_step_world ?? 4,
            fillMaxPlacements: 5_000,
            fillMarginWorld: tool.fill_margin_world,
            fillMode: tool.fill_mode,
            fillModeParams: tool.fill_mode_params,
            fillConnectivity: tool.fill_connectivity ?? 4,
            fillWallsScope: tool.fill_walls_scope ?? 'all_layers',
            activeAssetKey: fillAssetKey,
            seedView: [0, 0],
            viewBox: VIEW_BOX,
            maxBfsVisits: 200_000,
        }),
    };
}

describe('editorFill line-stroke walls', () => {
    it('applies the same line-circle fill behavior to every asset', () => {
        const results = DRAWING_ASSET_KEYS.map((wallAssetKey) =>
            computeCircleFillResult(wallAssetKey, 'moss'),
        );

        expect(new Set(results.map((result) => result.circlePlacements))).toEqual(
            new Set([64]),
        );
        expect(new Set(results.map((result) => result.placements.length))).toEqual(
            new Set([678]),
        );
        expect(results.every((result) => result.openArea === false)).toBe(true);
        expect(
            results.every((result) => result.maxPlacementsHit === false),
        ).toBe(true);
    });

    it('rope4 wall behavior is independent of which asset is used for fill', () => {
        const fillCounts = new Set(
            DRAWING_ASSET_KEYS.map(
                (fillAssetKey) =>
                    computeCircleFillResult(
                        'faridun_ropes4',
                        fillAssetKey,
                    ).placements.length,
            ),
        );
        expect(fillCounts.size).toBe(1);
    });
});
