import { describe, expect, it } from 'vitest';

import { ROT_FULL } from './editorConstants';
import {
    mirrorPlacementsAroundSelectionBoundsCenterView,
    type MirrorAxis,
} from './editorRigidMirror';

function mirrorTwice(
    axis: MirrorAxis,
    entries: { refKey: string; wx: number; wy: number; r: number }[],
    cameraDeg = 0,
) {
    const once = mirrorPlacementsAroundSelectionBoundsCenterView(
        entries,
        axis,
        cameraDeg,
    );
    const twice = mirrorPlacementsAroundSelectionBoundsCenterView(
        entries.map((entry) => ({
            refKey: entry.refKey,
            ...(once.get(entry.refKey) ?? entry),
        })),
        axis,
        cameraDeg,
    );
    return twice;
}

function mirrorHorizontalAngle(r: number): number {
    return ((ROT_FULL / 2 - r) % ROT_FULL + ROT_FULL) % ROT_FULL;
}

describe('editorRigidMirror', () => {
    it('mirrors positions horizontally around selection bounds center when camera is zero', () => {
        const mirrored = mirrorPlacementsAroundSelectionBoundsCenterView(
            [
                { refKey: 'a', wx: 10, wy: 0, r: 0 },
                { refKey: 'b', wx: 30, wy: 0, r: ROT_FULL / 4 },
            ],
            'horizontal',
            0,
        );

        expect(mirrored.get('a')).toMatchObject({ wx: 30, wy: 0 });
        expect(mirrored.get('b')).toMatchObject({ wx: 10, wy: 0 });
    });

    it('mirrors in view space when camera is rotated', () => {
        const entries = [
            { refKey: 'a', wx: 0, wy: 0, r: 0 },
            { refKey: 'b', wx: 0, wy: 10, r: ROT_FULL / 4 },
        ];

        expect(
            mirrorPlacementsAroundSelectionBoundsCenterView(
                entries,
                'horizontal',
                90,
            ),
        ).toEqual(
            new Map([
                ['a', { wx: 0, wy: 10, r: 0 }],
                ['b', { wx: 0, wy: 0, r: ROT_FULL * 3 / 4 }],
            ]),
        );
    });

    it('uses explicit horizontal angle reflection formulas when camera is zero', () => {
        const entries = [
            { refKey: 'r0', wx: 0, wy: 0, r: 0 },
            { refKey: 'r90', wx: 10, wy: 0, r: ROT_FULL / 4 },
            { refKey: 'r180', wx: 20, wy: 0, r: ROT_FULL / 2 },
            { refKey: 'r270', wx: 30, wy: 0, r: (ROT_FULL * 3) / 4 },
        ];

        const mirrored = mirrorPlacementsAroundSelectionBoundsCenterView(
            entries,
            'horizontal',
            0,
        );

        expect(mirrored.get('r0')?.r).toBe(ROT_FULL / 2);
        expect(mirrored.get('r90')?.r).toBe(ROT_FULL / 4);
        expect(mirrored.get('r180')?.r).toBe(0);
        expect(mirrored.get('r270')?.r).toBe((ROT_FULL * 3) / 4);
    });

    it('uses explicit vertical angle reflection formulas when camera is zero', () => {
        const entries = [
            { refKey: 'r0', wx: 0, wy: 0, r: 0 },
            { refKey: 'r90', wx: 0, wy: 10, r: ROT_FULL / 4 },
            { refKey: 'r180', wx: 0, wy: 20, r: ROT_FULL / 2 },
            { refKey: 'r270', wx: 0, wy: 30, r: (ROT_FULL * 3) / 4 },
        ];

        const mirrored = mirrorPlacementsAroundSelectionBoundsCenterView(
            entries,
            'vertical',
            0,
        );

        expect(mirrored.get('r0')?.r).toBe(0);
        expect(mirrored.get('r90')?.r).toBe((ROT_FULL * 3) / 4);
        expect(mirrored.get('r180')?.r).toBe(ROT_FULL / 2);
        expect(mirrored.get('r270')?.r).toBe(ROT_FULL / 4);
    });

    it('double horizontal mirror restores original geometry', () => {
        const entries = [
            { refKey: 'a', wx: 5, wy: 7, r: ROT_FULL / 8 },
            { refKey: 'b', wx: 17, wy: -9, r: Math.round(ROT_FULL / 3) },
        ];

        const twice = mirrorTwice('horizontal', entries, 90);

        expect(twice.get('a')).toEqual({
            wx: entries[0].wx,
            wy: entries[0].wy,
            r: entries[0].r,
        });
        expect(twice.get('b')).toEqual({
            wx: entries[1].wx,
            wy: entries[1].wy,
            r: entries[1].r,
        });
    });

    it('double vertical mirror restores original geometry', () => {
        const entries = [
            { refKey: 'a', wx: -4, wy: 12, r: Math.round(ROT_FULL / 5) },
            { refKey: 'b', wx: 8, wy: 24, r: Math.round(ROT_FULL / 7) },
        ];

        const twice = mirrorTwice('vertical', entries, 90);

        expect(twice.get('a')).toEqual({
            wx: entries[0].wx,
            wy: entries[0].wy,
            r: entries[0].r,
        });
        expect(twice.get('b')).toEqual({
            wx: entries[1].wx,
            wy: entries[1].wy,
            r: entries[1].r,
        });
    });

    it('mirrors vertically by world Y coordinate', () => {
        const entries = [
            { refKey: 'a', wx: 0, wy: 0, r: 0 },
            { refKey: 'b', wx: 10, wy: 20, r: ROT_FULL / 4 },
        ];

        const mirrored = mirrorPlacementsAroundSelectionBoundsCenterView(
            entries,
            'vertical',
            0,
        );

        expect(mirrored.get('a')).toEqual({ wx: 0, wy: 20, r: 0 });
        expect(mirrored.get('b')).toEqual({
            wx: 10,
            wy: 0,
            r: (ROT_FULL * 3) / 4,
        });
    });

    it('uses bounding-box center instead of selection centroid for pivot', () => {
        const entries = [
            { refKey: 'a', wx: 0, wy: 0, r: 0 },
            { refKey: 'b', wx: 10, wy: 0, r: ROT_FULL / 8 },
            { refKey: 'c', wx: 100, wy: 0, r: ROT_FULL / 4 },
        ];

        const mirrored = mirrorPlacementsAroundSelectionBoundsCenterView(
            entries,
            'horizontal',
            0,
        );

        expect(mirrored.get('a')).toEqual({ wx: 100, wy: 0, r: ROT_FULL / 2 });
        expect(mirrored.get('b')).toEqual({
            wx: 90,
            wy: 0,
            r: mirrorHorizontalAngle(ROT_FULL / 8),
        });
        expect(mirrored.get('c')).toEqual({
            wx: 0,
            wy: 0,
            r: ROT_FULL / 4,
        });
    });
});
