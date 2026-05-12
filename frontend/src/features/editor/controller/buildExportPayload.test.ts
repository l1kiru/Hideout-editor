import { describe, expect, it } from 'vitest';

import { sampleEditorScene } from '../../../test-utils/fixtures/sampleEditorScene';
import type { Scene } from '../../../types/scene';
import { validateEditorSceneJson } from '../lib/editorSceneJsonValidate';
import {
    buildExportPayload,
    countScenePlacements,
} from './buildExportPayload';

describe('buildExportPayload', () => {
    it('strips template_dots_cache', () => {
        const scene = sampleEditorScene();
        const payload = buildExportPayload(scene);
        expect(payload).not.toHaveProperty('template_dots_cache');
    });

    it('forces tool.draw_style to "object"', () => {
        const scene: Scene = {
            ...sampleEditorScene(),
            tool: {
                ...sampleEditorScene().tool,
                draw_style: 'object',
            },
        };
        const payload = buildExportPayload(scene);
        expect(payload.tool.draw_style).toBe('object');
    });

    it('does not mutate the input scene', () => {
        const scene = sampleEditorScene();
        const snapshot = JSON.parse(JSON.stringify(scene)) as Scene;
        buildExportPayload(scene);
        expect(scene).toEqual(snapshot);
    });

    it('preserves boundary points and layer batches verbatim', () => {
        const scene = sampleEditorScene();
        const payload = buildExportPayload(scene);
        expect(payload.boundary.points).toEqual(scene.boundary.points);
        expect(payload.layers).toEqual(scene.layers);
    });

    it('produces JSON that the scene validator accepts', () => {
        const payload = buildExportPayload(sampleEditorScene());
        const serialized = JSON.stringify(payload);
        const parsed = JSON.parse(serialized) as unknown;
        const result = validateEditorSceneJson(parsed);
        expect(result.ok).toBe(true);
    });

    it('round-trips through JSON without losing public fields', () => {
        const payload = buildExportPayload(sampleEditorScene());
        const roundTripped = JSON.parse(JSON.stringify(payload)) as typeof payload;
        expect(roundTripped).toEqual(payload);
    });

    it('does not include editor-only UI fields used during a drag', () => {
        const scene = sampleEditorScene();
        const serialized = JSON.stringify(buildExportPayload(scene));
        for (const forbidden of [
            'template_dots_cache',
            'isDragging',
            'selectedRefs',
            'cursorView',
            'marqueeView',
            'dragOverlay',
            'hiddenKeys',
        ]) {
            expect(serialized).not.toContain(forbidden);
        }
    });

    it('keeps optional batch fields (facet_fv, line_stroke) when present', () => {
        const payload = buildExportPayload(sampleEditorScene());
        const ropeBatch = payload.layers[1]!.batches[0]!;
        expect(ropeBatch.facet_fv).toBe(3);
        expect(ropeBatch.line_stroke).toBe(true);
    });

    it('preserves lineage_base_display_name even when null', () => {
        const payload = buildExportPayload(sampleEditorScene());
        expect(payload.lineage_base_display_name).toBeNull();
        expect('lineage_base_display_name' in payload).toBe(true);
    });
});

describe('countScenePlacements', () => {
    it('counts placements across every batch and layer', () => {
        expect(countScenePlacements(sampleEditorScene())).toBe(1 + 3);
    });

    it('returns 0 for an empty scene', () => {
        const empty: Pick<Scene, 'layers'> = { layers: [] };
        expect(countScenePlacements(empty)).toBe(0);
    });

    it('handles layers without batches', () => {
        const scene: Pick<Scene, 'layers'> = {
            layers: [
                { title: 'a', visible: true, locked: false, batches: [] },
            ],
        };
        expect(countScenePlacements(scene)).toBe(0);
    });
});
