import type { Scene } from '../../../types/scene';

// Scene shape that is actually sent to the backend export endpoint.
// Drops the local-only `template_dots_cache` field and pins `tool.draw_style`
// to its only valid runtime value.
export type ExportScenePayload = Omit<Scene, 'template_dots_cache'>;

// Pure transform: scene held by the editor -> JSON payload for
// POST /api/export/hideout. Tested in buildExportPayload.test.ts.
export function buildExportPayload(scene: Scene): ExportScenePayload {
    const { template_dots_cache: _cache, ...rest } = scene;
    void _cache;
    return {
        ...rest,
        tool: { ...rest.tool, draw_style: 'object' },
    };
}

// Count of all individual placements in the scene, used to gate the
// hard-limit confirmation dialog before export.
export function countScenePlacements(scene: Pick<Scene, 'layers'>): number {
    let n = 0;
    for (const ly of scene.layers) {
        for (const b of ly.batches) {
            n += b.placements.length;
        }
    }
    return n;
}
