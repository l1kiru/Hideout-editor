/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Scene } from '../../types/scene';

let cachedScene: Scene | null = null;

export function sharedMinimalEditorScene(): Scene {
    if (cachedScene !== null) {
        return structuredClone(cachedScene);
    }

    const here = dirname(fileURLToPath(import.meta.url));
    const fixturePath = resolve(
        here,
        '../../../../tests/fixtures/editor_scene_v2_minimal.json',
    );
    cachedScene = JSON.parse(readFileSync(fixturePath, 'utf8')) as Scene;
    return structuredClone(cachedScene);
}
