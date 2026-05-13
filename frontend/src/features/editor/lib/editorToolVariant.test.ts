import { describe, expect, it } from 'vitest';

import type { Tool } from '../../../types/scene';
import { defaultTool } from './editorDefaults';
import { syncToolVariantSelection } from './editorToolVariant';

describe('syncToolVariantSelection', () => {
    it('re-syncs fv with the stored line asset when entering line mode', () => {
        const tool: Tool = {
            ...defaultTool(),
            variant: 'select',
            line_asset_key: 'faridun_ropes4',
            fv: 0,
        };

        expect(syncToolVariantSelection(tool, 'line')).toMatchObject({
            variant: 'line',
            line_asset_key: 'faridun_ropes4',
            fv: 3,
        });
    });

    it('preserves the selected line asset and its fv', () => {
        const tool: Tool = {
            ...defaultTool(),
            variant: 'select',
            line_asset_key: 'faridun_ropes1',
            fv: 3,
        };

        expect(syncToolVariantSelection(tool, 'line')).toMatchObject({
            variant: 'line',
            line_asset_key: 'faridun_ropes1',
            fv: 0,
        });
    });

    it('syncs fill mode with the stored fill asset fv', () => {
        const tool: Tool = {
            ...defaultTool(),
            variant: 'select',
            fill_asset_key: 'moss',
            fv: 3,
        };

        expect(syncToolVariantSelection(tool, 'fill')).toMatchObject({
            variant: 'fill',
            fill_asset_key: 'moss',
            fv: 2,
        });
    });
});
