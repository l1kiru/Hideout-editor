import { beforeEach, describe, expect, it } from 'vitest';

import type { Scene } from '../../../types/scene';
import { sceneStorageKeyForMap } from './editorConstants';
import {
    readSceneForMapFromLocalStorage,
    writeSceneForMapToLocalStorage,
} from './editorSceneStorage';

class MemoryStorage implements Storage {
    private store = new Map<string, string>();

    get length(): number {
        return this.store.size;
    }

    clear(): void {
        this.store.clear();
    }

    getItem(key: string): string | null {
        return this.store.get(key) ?? null;
    }

    key(index: number): string | null {
        return Array.from(this.store.keys())[index] ?? null;
    }

    removeItem(key: string): void {
        this.store.delete(key);
    }

    setItem(key: string, value: string): void {
        this.store.set(key, value);
    }
}

function makeScene(displayName: string): Scene {
    return {
        scene_version: 2,
        camera_deg: 45,
        boundary: {
            points: [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
            ],
        },
        template: { template_id: 'map_tpl_1' },
        layers: [
            {
                kind: 'default',
                visible: true,
                locked: true,
                batches: [],
            },
            {
                kind: 'user',
                visible: true,
                locked: false,
                batches: [
                    {
                        template_name_ru: 'batch',
                        template_hash: 1,
                        placements: [{ x: 1, y: 2, r: 0 }],
                    },
                ],
            },
        ],
        tool: {
            variant: 'select',
            draw_style: 'object',
            spacing: 0,
            margin: 2,
            fv: 0,
            brush_width_view: 18,
        },
        background: {},
        ui: {
            placement_preview_scale: 1,
        },
        template_dots_cache: [],
        hideout_map_display_name: displayName,
        lineage_base_display_name: null,
    };
}

describe('editorSceneStorage', () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: new MemoryStorage(),
        });
    });

    it('writes the provided scene for the requested map id', () => {
        localStorage.setItem(
            sceneStorageKeyForMap(1),
            JSON.stringify(makeScene('stale-source')),
        );
        const childScene = makeScene('new-child-map');

        writeSceneForMapToLocalStorage(2, childScene);

        expect(readSceneForMapFromLocalStorage(2)).toEqual(childScene);
        expect(readSceneForMapFromLocalStorage(1)?.hideout_map_display_name).toBe(
            'stale-source',
        );
    });
});
