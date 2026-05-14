import { describe, expect, it } from 'vitest';

import {
    DRAWING_ASSET_KEYS,
    UNKNOWN_DOODAD_VIEW_BOX,
    assetKeyForTemplate,
    templatePlacementFootprintView,
} from './sceneDecorations';

describe('sceneDecorations', () => {
    it('keeps the drawing asset order from the shared asset manifest', () => {
        expect(DRAWING_ASSET_KEYS).toEqual([
            'faridun_ropes4',
            'faridun_ropes1',
            'moss',
            'sand',
            'maraketh_rubble1',
            'faridun_tools5',
            'leaf_pile3',
        ]);
    });

    it('uses hash+fv to distinguish rope variants with the same template hash', () => {
        expect(assetKeyForTemplate(1675705915, 3)).toBe('faridun_ropes4');
        expect(assetKeyForTemplate(1675705915, 0)).toBe('faridun_ropes1');
    });

    it('falls back to the legacy rope asset when only the hash is known', () => {
        expect(assetKeyForTemplate(1675705915, null)).toBe('faridun_ropes4');
    });

    it('uses the shared unknown-doodad footprint when no local asset is known', () => {
        expect(templatePlacementFootprintView(999999999, null)).toEqual(
            UNKNOWN_DOODAD_VIEW_BOX,
        );
    });
});
