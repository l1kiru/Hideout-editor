import { describe, expect, it } from 'vitest';

import type { Tool } from '../../../types/scene';
import { defaultTool } from './editorDefaults';
import {
    syncToolDigitShortcut,
    syncToolVariantSelection,
} from './editorToolVariant';

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

    it('maps digit shortcuts to the same tool modes as the picker', () => {
        const tool: Tool = {
            ...defaultTool(),
            variant: 'select',
            asset_key: 'leaf_pile3',
            line_asset_key: 'faridun_ropes1',
            fill_asset_key: 'moss',
            fv: 3,
        };

        expect(syncToolDigitShortcut(tool, 'Digit1')).toMatchObject({
            variant: 'select',
        });
        expect(syncToolDigitShortcut(tool, 'Digit2')).toMatchObject({
            variant: 'leaf_pile3',
            asset_key: 'leaf_pile3',
        });
        expect(syncToolDigitShortcut(tool, 'Digit3')).toMatchObject({
            variant: 'eraser',
        });
        expect(syncToolDigitShortcut(tool, 'Digit4')).toMatchObject({
            variant: 'line',
            line_asset_key: 'faridun_ropes1',
            fv: 0,
        });
        expect(syncToolDigitShortcut(tool, 'Digit5')).toMatchObject({
            variant: 'fill',
            fill_asset_key: 'moss',
            fv: 2,
        });
        expect(syncToolDigitShortcut(tool, 'Digit9')).toBeNull();
    });
});
