import { describe, expect, it } from 'vitest';

import { sampleEditorScene } from '../../../test-utils/fixtures/sampleEditorScene';
import { validateEditorSceneJson } from './editorSceneJsonValidate';

describe('validateEditorSceneJson', () => {
    it('accepts the canonical sample scene', () => {
        const result = validateEditorSceneJson(sampleEditorScene());
        expect(result.ok).toBe(true);
    });

    it('survives a JSON round-trip', () => {
        const json = JSON.parse(JSON.stringify(sampleEditorScene()));
        const result = validateEditorSceneJson(json);
        expect(result.ok).toBe(true);
    });

    it('rejects arrays and primitives at the root', () => {
        expect(validateEditorSceneJson([]).ok).toBe(false);
        expect(validateEditorSceneJson(null).ok).toBe(false);
        expect(validateEditorSceneJson('scene').ok).toBe(false);
        expect(validateEditorSceneJson(42).ok).toBe(false);
    });

    it('rejects .hideout-shaped files (top-level doodads array)', () => {
        const result = validateEditorSceneJson({ doodads: [] });
        expect(result.ok).toBe(false);
        if ('message' in result) {
            expect(result.message).toMatch(/не файл сцены редактора/);
        }
    });

    it('requires scene_version to be a finite number >= 1', () => {
        const base = sampleEditorScene() as unknown as Record<string, unknown>;
        expect(validateEditorSceneJson({ ...base, scene_version: 0 }).ok).toBe(false);
        expect(
            validateEditorSceneJson({ ...base, scene_version: '2' }).ok,
        ).toBe(false);
        expect(
            validateEditorSceneJson({ ...base, scene_version: Number.NaN }).ok,
        ).toBe(false);
    });

    it('requires camera_deg to be a finite number', () => {
        const scene = sampleEditorScene() as unknown as Record<string, unknown>;
        expect(
            validateEditorSceneJson({ ...scene, camera_deg: 'tilted' }).ok,
        ).toBe(false);
        expect(
            validateEditorSceneJson({ ...scene, camera_deg: Number.POSITIVE_INFINITY }).ok,
        ).toBe(false);
    });

    it('requires boundary.points to have at least three finite points', () => {
        const scene = sampleEditorScene() as unknown as Record<string, unknown>;
        expect(
            validateEditorSceneJson({
                ...scene,
                boundary: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
            }).ok,
        ).toBe(false);
        expect(
            validateEditorSceneJson({
                ...scene,
                boundary: {
                    points: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                        { x: 2, y: 'oops' },
                    ],
                },
            }).ok,
        ).toBe(false);
    });

    it('rejects layers that are not an array', () => {
        const scene = sampleEditorScene() as unknown as Record<string, unknown>;
        expect(validateEditorSceneJson({ ...scene, layers: {} }).ok).toBe(false);
    });

    it('rejects a batch with a non-finite placement coordinate', () => {
        const scene = sampleEditorScene();
        const broken = JSON.parse(JSON.stringify(scene));
        broken.layers[1].batches[0].placements[0].x = 'NaN-as-string';
        expect(validateEditorSceneJson(broken).ok).toBe(false);
    });

    it('falls back to "select" when tool.variant is unknown (forward-compat)', () => {
        const scene = JSON.parse(JSON.stringify(sampleEditorScene()));
        scene.tool.variant = 'totally-new-future-tool';
        const result = validateEditorSceneJson(scene);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.scene.tool.variant).toBe('select');
        }
    });
});
