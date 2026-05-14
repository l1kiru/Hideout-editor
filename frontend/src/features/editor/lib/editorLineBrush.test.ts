import { describe, expect, it } from 'vitest';

import { DECORATIONS } from '../../../lib/sceneDecorations';
import { ROT_FULL } from './editorConstants';
import { placementsForPolyline } from './editorLineBrush';

describe('placementsForPolyline', () => {
    it('stores maraketh line rotations with the opposite sign of rope for the same segment', () => {
        const boundary: [number, number][] = [
            [-100, -100],
            [100, -100],
            [100, 100],
            [-100, 100],
        ];
        const points: [number, number][] = [
            [0, 0],
            [20, 10],
        ];

        const rope = placementsForPolyline(
            points,
            DECORATIONS.faridun_ropes4,
            0,
            0,
            'faridun_ropes4',
            boundary,
            2,
        );
        const maraketh = placementsForPolyline(
            points,
            DECORATIONS.maraketh_rubble1,
            0,
            0,
            'maraketh_rubble1',
            boundary,
            2,
        );

        expect(rope[0]?.r).toBeDefined();
        expect(maraketh[0]?.r).toBeDefined();
        expect(maraketh[0]?.r).toBe((ROT_FULL - rope[0]!.r) % ROT_FULL);
    });
});
