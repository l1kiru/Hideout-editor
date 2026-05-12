import { describe, expect, it } from 'vitest';

import { layerId, worldCellKey } from './editorIds';
import {
    groupMovePreservesUniqueCoordsStatic,
    hasDuplicateWorldCoords,
    occupiedCoordMapExcludingRefs,
    parseWorldCellKey,
    proposedCoordsCollideWithStaticOccupied,
    proposedCoordsCollideWithStaticOccupiedOnly,
    roundedWorldXY,
    worldPlacementCoordKey,
} from './editorPlacementCoords';
import { refKey } from './placementSelection';
import type { PaintLayer } from '../../../types/scene';
import type { PlacementRef } from '../model/editorSessionTypes';

function layerWithPlacements(
    placements: { x: number; y: number; r: number }[],
): PaintLayer {
    return {
        title: 't',
        visible: true,
        locked: false,
        batches: [
            {
                template_name_ru: 'x',
                template_hash: 1,
                facet_fv: 0,
                line_stroke: false,
                placements,
            },
        ],
    };
}

describe('editorPlacementCoords', () => {
    it('roundedWorldXY halves away from zero', () => {
        expect(roundedWorldXY(1.4, 1.4)).toEqual([1, 1]);
        expect(roundedWorldXY(-1.4, -1.4)).toEqual([-1, -1]);
    });

    it('worldPlacementCoordKey and parseWorldCellKey', () => {
        const k = worldPlacementCoordKey(3, 4);
        expect(parseWorldCellKey(k)).toEqual([3, 4]);
    });

    it('occupiedCoordMapExcludingRefs skips excluded refs', () => {
        const layers: PaintLayer[] = [
            layerWithPlacements([{ x: 1, y: 2, r: 0 }]),
        ];
        const exclude = new Set([refKey({ layerIdx: layerId(0), batchIdx: 0, placementIdx: 0 })]);
        const m = occupiedCoordMapExcludingRefs(layers, exclude);
        expect(m.size).toBe(0);
    });

    it('proposedCoordsCollideWithStaticOccupiedOnly ignores internal duplicates', () => {
        const staticSet = new Set([worldCellKey('99,99')]);
        const proposed: [number, number][] = [
            [1, 1],
            [1, 1],
        ];
        expect(proposedCoordsCollideWithStaticOccupiedOnly(staticSet, proposed)).toBe(
            false,
        );
        expect(proposedCoordsCollideWithStaticOccupied(staticSet, proposed)).toBe(true);
    });

    it('hasDuplicateWorldCoords', () => {
        const base = new Set([worldCellKey('0,0')]);
        expect(hasDuplicateWorldCoords(base, [[1, 1], [1, 1]])).toBe(true);
        expect(hasDuplicateWorldCoords(base, [[1, 1], [2, 2]])).toBe(false);
    });

    it('groupMovePreservesUniqueCoordsStatic', () => {
        const occ = new Set([worldCellKey('5,5')]);
        const refs: PlacementRef[] = [{ layerIdx: layerId(0), batchIdx: 0, placementIdx: 0 }];
        expect(
            groupMovePreservesUniqueCoordsStatic(occ, refs, () => [10, 10]),
        ).toBe(true);
        expect(
            groupMovePreservesUniqueCoordsStatic(occ, refs, () => [5, 5]),
        ).toBe(false);
    });
});
