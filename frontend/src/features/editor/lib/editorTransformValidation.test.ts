import { describe, expect, it } from 'vitest';

import { layerId, placementObjectId, worldCellKey } from './editorIds';
import {
    findFirstStaticCollision,
    MIRROR_TRANSFORM_OPERATION,
    proposedMoveCellsFromSnaps,
    validateGroupMoveCells,
    validateProposedPlacementCells,
} from './editorTransformValidation';
import type { PlacementSnapWorld } from '../model/editorSessionTypes';
import { refKey } from './placementSelection';
import type { PlacementRef } from '../model/editorSessionTypes';

const ROT_OP = {
    type: 'rotate',
    allowInternalOverlap: false,
    allowExternalOverlap: false,
} as const;

describe('editorTransformValidation', () => {
    const r0: PlacementRef = { layerIdx: layerId(0), batchIdx: 0, placementIdx: 0 };
    const r1: PlacementRef = { layerIdx: layerId(0), batchIdx: 0, placementIdx: 1 };

    const snap = (wx: number, wy: number): PlacementSnapWorld => ({
        wx,
        wy,
        r: 0,
        template_hash: 1,
        facet_fv: 0,
        line_stroke: false,
    });

    it('validateGroupMoveCells missing_snap', () => {
        const snaps: Record<string, PlacementSnapWorld> = {
            [refKey(r0)]: snap(0, 0),
        };
        const occ = new Map();
        const res = validateGroupMoveCells(occ, snaps, [r0, r1], 0, 0);
        expect(res).toEqual({ ok: false, reason: 'missing_snap' });
    });

    it('move allows internal overlap', () => {
        const snaps: Record<string, PlacementSnapWorld> = {
            [refKey(r0)]: snap(0, 0),
            [refKey(r1)]: snap(0, 0),
        };
        const occ = new Map();
        const res = validateGroupMoveCells(occ, snaps, [r0, r1], 0, 0);
        expect(res).toEqual({ ok: true });
    });

    it('move allows overlap with external occupied cells', () => {
        const blocker = placementObjectId('9:9:9');
        const occ = new Map([[worldCellKey('0,0'), blocker]]);
        const snaps: Record<string, PlacementSnapWorld> = {
            [refKey(r0)]: snap(0, 0),
        };

        const res = validateGroupMoveCells(occ, snaps, [r0], 0, 0);
        expect(res).toEqual({ ok: true });
    });

    it('external collision includes conflictingObject for non-move operations', () => {
        const blocker = placementObjectId('9:9:9');
        const cell = worldCellKey('5,5');
        const occ = new Map([[cell, blocker]]);
        const res = validateProposedPlacementCells(
            occ,
            [[5, 5]],
            ROT_OP,
        );
        expect(res).toEqual({
            ok: false,
            reason: 'external_collision',
            conflictingCell: cell,
            conflictingObject: blocker,
        });
    });

    it('rotate operation rejects internal overlap', () => {
        const occ = new Map();
        const res = validateProposedPlacementCells(
            occ,
            [
                [1, 1],
                [1, 1],
            ],
            ROT_OP,
        );
        expect(res.ok).toBe(false);
        if (res.ok === false) expect(res.reason).toBe('internal_collision');
    });

    it('mirror operation allows internal overlap', () => {
        const occ = new Map();
        const res = validateProposedPlacementCells(
            occ,
            [
                [1, 1],
                [1, 1],
            ],
            MIRROR_TRANSFORM_OPERATION,
        );
        expect(res).toEqual({ ok: true });
    });

    it('mirror operation still rejects external collision', () => {
        const blocker = placementObjectId('4:4:4');
        const cell = worldCellKey('1,1');
        const occ = new Map([[cell, blocker]]);
        const res = validateProposedPlacementCells(
            occ,
            [[1, 1]],
            MIRROR_TRANSFORM_OPERATION,
        );
        expect(res).toEqual({
            ok: false,
            reason: 'external_collision',
            conflictingCell: cell,
            conflictingObject: blocker,
        });
    });

    it('findFirstStaticCollision', () => {
        const obj = placementObjectId('0:0:0');
        const occ = new Map([[worldCellKey('2,2'), obj]]);
        expect(findFirstStaticCollision(occ, [[1, 1], [2, 2]])).toEqual({
            cell: worldCellKey('2,2'),
            object: obj,
        });
    });

    it('proposedMoveCellsFromSnaps rounds delta', () => {
        const snaps: Record<string, PlacementSnapWorld> = {
            [refKey(r0)]: snap(0.4, 0.4),
        };
        expect(proposedMoveCellsFromSnaps(snaps, [r0], 0.2, 0.2)).toEqual([[1, 1]]);
    });
});
