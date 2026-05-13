// Shared numeric constants for the hideout web editor.

import type { HideoutMapSummary } from '../../../api/client';

export const ROT_FULL = 65536;

// +90 deg in r units: rope preview aligned to the line.
export const ROT_LINE_ROPE_OFFSET = ROT_FULL / 4;

export const ROT_STEP = 2048;

export const MAX_UNDO = 96;

// Centralised editor operation limits.
export const EDITOR_LIMITS = {
    // Max placements per group move (LMB drag). Higher than the rotate cap
    // because a linear shift is cheap and bulk reorganisation is common.
    maxGroupMovePlacements: 5000,
    // Max placements per group rotate (RMB / keyboard). Lower than move:
    // rotation is heavier (pivot transform plus footprint check on every RAF
    // frame) and rarely applied to very large groups.
    maxGroupRotatePlacements: 750,
} as const;

export const MAX_GROUP_MOVE_PLACEMENTS = EDITOR_LIMITS.maxGroupMovePlacements;
export const MAX_GROUP_ROTATE_PLACEMENTS =
    EDITOR_LIMITS.maxGroupRotatePlacements;

// Back-compat alias for older imports. New call sites must pick the MOVE- or ROTATE-specific limit.
export const MAX_GROUP_TRANSFORM_PLACEMENTS = MAX_GROUP_ROTATE_PLACEMENTS;

// In-game hard ceiling for hideout placement count. Exceeding it is allowed
// locally, but export prompts a confirmation because the game accepts such
// .hideout files poorly.
export const HIDEOUT_PLACEMENTS_HARD_LIMIT = 750;

// Threshold where the placement counter switches to a warning colour.
export const HIDEOUT_PLACEMENTS_WARN_THRESHOLD = 600;

// Below this threshold every gesture frame checks the full footprint of each
// placement; above it only the centers are checked (rigid body) and the full
// footprint check runs on pointer release.
export const GROUP_TRANSFORM_DETAIL_FOOTPRINT_INTERACTIVE_MAX = 48;

// Pointer travel (view units) below which a click on empty space is treated
// as a deselect rather than a marquee start.
export const MARQUEE_MIN_DRAG_VIEW = 4;

// Minimum distance (view units) between consecutive polyline vertices for the brush tool.
export const LINE_BRUSH_VERTEX_DIST = 2.5;

// Legacy single-scene storage key (one scene shared across maps). Newer scenes use per-map keys.
export const SCENE_STORAGE_KEY = 'hideout-editor-scene-v2-web-only';

export function sceneStorageKeyForMap(mapId: number): string {
    return `hideout-editor-scene-v2-map-${mapId}`;
}
export const ACTIVE_MAP_ID_LS = 'hideout-editor-active-map-id';

// localStorage keys from earlier app versions that must be renamed to the
// current names on first launch after the rename.
export const LEGACY_LOCALSTORAGE_KEY_RENAMES: ReadonlyArray<
    readonly [string, string]
> = [
    ['hideout-creator-scene-v2-web-only', SCENE_STORAGE_KEY],
    ['hideout-creator-active-map-id', ACTIVE_MAP_ID_LS],
];

// Key prefixes whose every occurrence (with arbitrary suffix, e.g. map id) must be migrated.
export const LEGACY_LOCALSTORAGE_PREFIX_RENAMES: ReadonlyArray<
    readonly [string, string]
> = [['hideout-creator-scene-v2-map-', 'hideout-editor-scene-v2-map-']];

// Default UI map pick: the base map with the lowest base_priority (API-provided).
export function firstBaseHideoutMap(
    maps: readonly HideoutMapSummary[],
): HideoutMapSummary | undefined {
    const bases = maps.filter((m) => m.is_base === true);
    bases.sort((a, b) => {
        const ap = a.base_priority ?? 999_999;
        const bp = b.base_priority ?? 999_999;
        if (ap !== bp)
            return ap - bp;
        return a.display_name.localeCompare(b.display_name, 'ru', {
            sensitivity: 'base',
        });
    });
    return bases[0];
}

export function isBaseHideoutMap(m: { is_base?: boolean }): boolean {
    return m.is_base === true;
}

// Map id and all descendants via forked_from_map_id (BFS), root included.
export function hideoutForkSubtreeIds(
    maps: readonly HideoutMapSummary[],
    rootId: number,
): number[] {
    const byParent = new Map<number, number[]>();
    for (const m of maps) {
        const p = m.forked_from_map_id;
        if (p == null) continue;
        const arr = byParent.get(p) ?? [];
        arr.push(m.id);
        byParent.set(p, arr);
    }
    const out: number[] = [];
    const stack = [rootId];
    while (stack.length > 0) {
        const id = stack.pop()!;
        out.push(id);
        const ch = byParent.get(id);
        if (ch) for (const c of ch) stack.push(c);
    }
    return out;
}

// Default-map layer (doodads from .hideout) is always at index 0.
export const DEFAULT_MAP_LAYER_INDEX = 0;
