import { describe, expect, it } from 'vitest';

import type { TemplateUploadResponse } from '../../../types/scene';
import { buildDocumentLayersFromTemplate } from './useEditorDocumentCommands';

function makeTemplateResponse(
    partial: Partial<TemplateUploadResponse>,
): TemplateUploadResponse {
    return {
        template_id: 'map_tpl_1',
        hideout_name: 'Test',
        hideout_hash: 1,
        doodads_kept_count: 0,
        dots: [],
        default_layer_batches: [],
        decorations_layer_batches: [],
        decorations_palette_layer_batches: [],
        ...partial,
    };
}

describe('buildDocumentLayersFromTemplate', () => {
    it('creates a user layer when imported decorations are absent', () => {
        const layers = buildDocumentLayersFromTemplate(
            makeTemplateResponse({}),
        );

        expect(layers).toHaveLength(2);
        expect(layers[0]?.kind).toBe('default');
        expect(layers[1]?.kind).toBe('user');
    });

    it('keeps imported decorations layer when template has imported decoration batches', () => {
        const layers = buildDocumentLayersFromTemplate(
            makeTemplateResponse({
                decorations_layer_batches: [
                    {
                        template_name_ru: 'Tree',
                        template_hash: 1,
                        placements: [{ x: 1, y: 2, r: 0 }],
                    },
                ],
            }),
        );

        expect(layers).toHaveLength(2);
        expect(layers[1]?.kind).toBe('decorations');
    });
});
