import { describe, expect, it } from 'vitest';

import { layerId, placementObjectId } from './editorIds';
import {
    layerIndicesFromRefs,
    normalizeSelectionLayer0,
    parseRefKey,
    refEqual,
    refKey,
    uniqRefs,
    viewAabbOverlap,
} from './placementSelection';
import type { PlacementRef } from '../model/editorSessionTypes';

const r = (li: number, bi: number, pi: number): PlacementRef => ({
    layerIdx: layerId(li),
    batchIdx: bi,
    placementIdx: pi,
});

describe('placementSelection', () => {
    it('refKey / parseRefKey roundtrip', () => {
        const ref = r(2, 0, 5);
        const id = refKey(ref);
        expect(parseRefKey(id)).toEqual(ref);
    });

    it('parseRefKey returns null for invalid', () => {
        expect(parseRefKey(placementObjectId('0:1'))).toBeNull();
        expect(parseRefKey(placementObjectId('a:b:c'))).toBeNull();
    });

    it('refEqual', () => {
        expect(refEqual(r(1, 2, 3), r(1, 2, 3))).toBe(true);
        expect(refEqual(r(1, 2, 3), r(1, 2, 4))).toBe(false);
    });

    it('uniqRefs preserves first occurrence order', () => {
        const a = [r(0, 0, 0), r(0, 0, 1), r(0, 0, 0), r(1, 0, 0)];
        expect(uniqRefs(a)).toEqual([r(0, 0, 0), r(0, 0, 1), r(1, 0, 0)]);
    });

    it('layerIndicesFromRefs returns sorted LayerId list', () => {
        expect(layerIndicesFromRefs([r(2, 0, 0), r(0, 0, 0), r(1, 0, 0)])).toEqual([
            layerId(0),
            layerId(1),
            layerId(2),
        ]);
    });

    it('normalizeSelectionLayer0 matches uniqRefs', () => {
        const refs = [r(0, 0, 0), r(0, 0, 0)];
        expect(normalizeSelectionLayer0(refs)).toEqual(uniqRefs(refs));
    });

    it('viewAabbOverlap', () => {
        expect(viewAabbOverlap(0, 2, 0, 2, 1, 3, 1, 3)).toBe(true);
        expect(viewAabbOverlap(0, 1, 0, 1, 2, 3, 2, 3)).toBe(false);
    });
});
