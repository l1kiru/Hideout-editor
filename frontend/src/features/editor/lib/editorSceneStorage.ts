import type { Scene } from '../../../types/scene';
import {
    SCENE_STORAGE_KEY,
    sceneStorageKeyForMap,
} from './editorConstants';
import { sanitizeEditorSceneLayer0 } from './editorSceneDedupe';
import { validateEditorSceneJson } from './editorSceneJsonValidate';

// One-shot copy from the legacy shared cache to the chosen map's slot when the display name matches.
export function migrateLegacySharedSceneToMap(
    mapId: number,
    mapDisplayName: string,
): void {
    try {
        const legacy = localStorage.getItem(SCENE_STORAGE_KEY);
        if (!legacy) return;
        const targetKey = sceneStorageKeyForMap(mapId);
        if (localStorage.getItem(targetKey)) return;
        const parsed: unknown = JSON.parse(legacy);
        if (!parsed || typeof parsed !== 'object') return;
        const row = parsed as Record<string, unknown>;
        const name = String(row.hideout_map_display_name ?? '');
        if (name.trim().toLowerCase() !== mapDisplayName.trim().toLowerCase())
            return;
        localStorage.setItem(targetKey, legacy);
    } catch {
        /* ignore */
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
        let scene: Scene = {
            ...checked.scene,
            hideout_map_display_name: newDisplayName,
        };
        const sanitized = sanitizeEditorSceneLayer0(scene);
        scene = sanitized.scene;
        localStorage.setItem(
            sceneStorageKeyForMap(toMapId),
            JSON.stringify(scene),
        );
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
