import { describe, expect, it } from 'vitest';

import { layerId, placementObjectId, worldCellKey } from './editorIds';

describe('editorIds', () => {
    it('constructors preserve runtime values', () => {
        expect(layerId(3)).toBe(3);
        expect(placementObjectId('0:1:2')).toBe('0:1:2');
        expect(worldCellKey('10,20')).toBe('10,20');
    });
});
