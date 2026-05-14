import { describe, expect, it } from 'vitest';

import { hideoutRToSvgRotateDeg } from '../../../lib/coords';
import { DECORATIONS } from '../../../lib/sceneDecorations';
import {
    previewRenderRotateDegForDoodad,
    previewRotateDegForDoodad,
} from './editorPreview';

function normalizeDeg(deg: number): number {
    return ((deg % 360) + 360) % 360;
}

describe('previewRotateDegForDoodad', () => {
    it('aligns maraketh rubble with the line when requested', () => {
        const maraketh = DECORATIONS.maraketh_rubble1;
        const rope = DECORATIONS.faridun_ropes4;

        const legacy = previewRotateDegForDoodad(
            0,
            0,
            maraketh.hash,
            maraketh.fv,
        );
        const lineAligned = previewRotateDegForDoodad(
            0,
            0,
            maraketh.hash,
            maraketh.fv,
            true,
        );
        const ropeAligned = previewRotateDegForDoodad(
            0,
            0,
            rope.hash,
            rope.fv,
            true,
        );

        expect(lineAligned).toBe(ropeAligned);
        expect(lineAligned).not.toBe(legacy);
    });

    it('renders maraketh line-strokes with the maraketh-specific visual offset', () => {
        const maraketh = DECORATIONS.maraketh_rubble1;
        const storedR = 0;
        const cameraDeg = 0;
        const renderRotation = previewRenderRotateDegForDoodad(
            storedR,
            cameraDeg,
            maraketh.hash,
            maraketh.fv,
            true,
        );

        expect(renderRotation).toBeCloseTo(
            -hideoutRToSvgRotateDeg(storedR, cameraDeg) - 110,
            10,
        );
    });

    it('renders maraketh line-strokes from the raw stored rotation', () => {
        const maraketh = DECORATIONS.maraketh_rubble1;
        const storedR = 7241;
        const cameraDeg = 0;

        const renderRotation = previewRenderRotateDegForDoodad(
            storedR,
            cameraDeg,
            maraketh.hash,
            maraketh.fv,
            true,
        );

        expect(normalizeDeg(renderRotation)).toBeCloseTo(289.775, 2);
    });
});
