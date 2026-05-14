import { describe, expect, it } from 'vitest';

import {
    adaptEditorControllerResult,
    type EditorControllerResult,
} from './types';

describe('useEditorController result shape', () => {
    it('keeps grouped view props adaptable to the legacy controller shape', () => {
        const result = {
            view: {
                sidebar: { marker: 'sidebar' },
                header: { marker: 'header' },
                canvas: { marker: 'canvas' },
                status: 'ready',
            },
        } as unknown as EditorControllerResult;

        const adapted = adaptEditorControllerResult(result);

        expect(Object.keys(result.view).sort()).toEqual([
            'canvas',
            'header',
            'sidebar',
            'status',
        ]);
        expect(Object.keys(adapted).sort()).toEqual([
            'canvasProps',
            'headerProps',
            'sidebarProps',
            'status',
        ]);
        expect(adapted.sidebarProps).toBe(result.view.sidebar);
        expect(adapted.headerProps).toBe(result.view.header);
        expect(adapted.canvasProps).toBe(result.view.canvas);
        expect(adapted.status).toBe(result.view.status);
    });
});
