import type { Scene } from '../../../types/scene';
import { sceneStorageKeyForMap } from './editorConstants';
import { sanitizeEditorSceneLayer0 } from './editorSceneDedupe';
import { validateEditorSceneJson } from './editorSceneJsonValidate';

export function writeSceneForMapToLocalStorage(mapId: number, scene: Scene): void {
    try {
        const sanitized = sanitizeEditorSceneLayer0(scene);
        localStorage.setItem(
            sceneStorageKeyForMap(mapId),
            JSON.stringify(sanitized.scene),
        );
    } catch {
        /* ignore quota / unavailable storage */
    }
}

export function readSceneForMapFromLocalStorage(mapId: number): Scene | null {
    try {
        const raw = localStorage.getItem(sceneStorageKeyForMap(mapId));
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        const checked = validateEditorSceneJson(parsed);
        if (!checked.ok) return null;
        const sanitized = sanitizeEditorSceneLayer0(checked.scene);
        if (sanitized.changed) {
            try {
                localStorage.setItem(
                    sceneStorageKeyForMap(mapId),
                    JSON.stringify(sanitized.scene),
                );
            } catch {
                /* ignore quota */
            }
        }
        return sanitized.scene;
    } catch {
        return null;
    }
}

export function copyStoredSceneBetweenMaps(
    fromMapId: number,
    toMapId: number,
    newDisplayName: string,
): void {
    try {
        const raw = localStorage.getItem(sceneStorageKeyForMap(fromMapId));
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        const checked = validateEditorSceneJson(parsed);
        if (!checked.ok) return;
        const scene: Scene = {
            ...checked.scene,
            hideout_map_display_name: newDisplayName,
        };
        writeSceneForMapToLocalStorage(toMapId, scene);
    } catch {
        /* ignore */
    }
}

export function removeSceneForMapFromLocalStorage(mapId: number): void {
    try {
        localStorage.removeItem(sceneStorageKeyForMap(mapId));
    } catch {
        /* ignore */
    }
}
