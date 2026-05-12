import { describe, expect, it } from 'vitest';

import { layerId } from './editorIds';
import {
    aabbCornersInsideBoundary,
    buildSelectionCentersAABB,
    placementCentersAllowedAfterShift,
} from './editorPlacementValidate';
import type { PlacementSnapWorld } from '../model/editorSessionTypes';
import type { PlacementRef } from '../model/editorSessionTypes';
import { refKey } from './placementSelection';

const boundary: [number, number][] = [
    [0, 0],
    [30, 0],
    [30, 30],
    [0, 30],
];
const margin = 0;

const snap = (wx: number, wy: number): PlacementSnapWorld => ({
    wx,
    wy,
    r: 0,
    template_hash: 1,
    facet_fv: 0,
    line_stroke: false,
});

describe('editorPlacementValidate', () => {
    const ra: PlacementRef = { layerIdx: layerId(0), batchIdx: 0, placementIdx: 0 };
    const rb: PlacementRef = { layerIdx: layerId(0), batchIdx: 0, placementIdx: 1 };

    it('buildSelectionCentersAABB', () => {
        expect(buildSelectionCentersAABB({}, [])).toBeNull();
        const snaps: Record<string, PlacementSnapWorld> = {
            [refKey(ra)]: snap(1, 2),
        };
        expect(buildSelectionCentersAABB(snaps, [ra])).toEqual([1, 2, 1, 2]);
        const snaps2: Record<string, PlacementSnapWorld> = {
            [refKey(ra)]: snap(1, 2),
            [refKey(rb)]: snap(4, 6),
        };
        expect(buildSelectionCentersAABB(snaps2, [ra, rb])).toEqual([1, 2, 4, 6]);
    });

    it('aabbCornersInsideBoundary', () => {
        const aabb = [5, 5, 15, 15] as const;
        expect(aabbCornersInsideBoundary(aabb, 0, 0, boundary, margin)).toBe(true);
        expect(aabbCornersInsideBoundary(aabb, 50, 50, boundary, margin)).toBe(false);
    });

    it('placementCentersAllowedAfterShift false when snap missing', () => {
        const snaps: Record<string, PlacementSnapWorld> = {
            [refKey(ra)]: snap(5, 5),
        };
        expect(
            placementCentersAllowedAfterShift(snaps, [ra, rb], 0, 0, boundary, margin),
        ).toBe(false);
    });
});
