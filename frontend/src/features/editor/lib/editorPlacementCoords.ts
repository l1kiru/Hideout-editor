import type { PaintLayer, XYZRPlacement } from '../../../types/scene';

import type { PlacementRef } from '../model/editorSessionTypes';

import { layerId, type PlacementObjectId, type WorldCellKey, worldCellKey } from './editorIds';
import { refKey } from './placementSelection';

// Rounded world coordinates for a placement cell. Uniqueness keyed on (x, y).
export function roundedWorldXY(x: number, y: number): [number, number] {
    return [Math.round(x), Math.round(y)];
}

export function worldPlacementCoordKey(x: number, y: number): WorldCellKey {
    const [rx, ry] = roundedWorldXY(x, y);
    return worldCellKey(`${rx},${ry}`);
}

// Inverse of worldPlacementCoordKey. Returns null on malformed input.
export function parseWorldCellKey(k: WorldCellKey): [number, number] | null {
    const parts = String(k).split(',');
    if (parts.length !== 2) return null;
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return [x, y];
}

// Map of all occupied cells, excluding placements whose ref is in `excludeRefKeys`.
export function occupiedCoordMapExcludingRefs(
    layers: ReadonlyArray<PaintLayer>,
    excludeRefKeys: ReadonlySet<PlacementObjectId>,
): Map<WorldCellKey, PlacementObjectId> {
    const out = new Map<WorldCellKey, PlacementObjectId>();
    for (let li = 0; li < layers.length; li++) {
        const ly = layers[li];
        if (!ly) continue;
        for (let bi = 0; bi < ly.batches.length; bi++) {
            const b = ly.batches[bi];
            if (!b) continue;
            for (let pi = 0; pi < b.placements.length; pi++) {
                const rk = refKey({
                    layerIdx: layerId(li),
                    batchIdx: bi,
                    placementIdx: pi,
                });
                if (excludeRefKeys.has(rk)) continue;
                const p = b.placements[pi];
                if (!p) continue;
                out.set(worldPlacementCoordKey(p.x, p.y), rk);
            }
        }
    }
    return out;
}

// Set view over occupiedCoordMapExcludingRefs; convenient when blocker identity is not needed.
export function occupiedCoordKeysExcludingRefs(
    layers: ReadonlyArray<PaintLayer>,
    excludeRefKeys: ReadonlySet<PlacementObjectId>,
): Set<WorldCellKey> {
    return new Set(occupiedCoordMapExcludingRefs(layers, excludeRefKeys).keys());
}

// Collision against external occupied cells, also detecting internal duplicates within `proposedRounded`.
export function proposedCoordsCollideWithStaticOccupied(
    staticOccupied: ReadonlySet<WorldCellKey>,
    proposedRounded: ReadonlyArray<readonly [number, number]>,
): boolean {
    const used = new Set<WorldCellKey>();
    for (const [x, y] of proposedRounded) {
        const k = worldPlacementCoordKey(x, y);
        if (staticOccupied.has(k) || used.has(k))
            return true;
        used.add(k);
    }
    return false;
}

// Collision only against external occupied cells; internal duplicates in
// `proposedRounded` are ignored. Uniform group drag preserves the relative
// layout of the selection, so pre-existing internal duplicates (common in
// imported scenes) must not block the move.
export function proposedCoordsCollideWithStaticOccupiedOnly(
    staticOccupied: ReadonlySet<WorldCellKey>,
    proposedRounded: ReadonlyArray<readonly [number, number]>,
): boolean {
    for (const [x, y] of proposedRounded) {
        if (staticOccupied.has(worldPlacementCoordKey(x, y))) return true;
    }
    return false;
}

// Same predicate as movesPreserveUniqueCoords, with the occupied set passed in to skip a scene rescan.
export function groupMovePreservesUniqueCoordsStatic(
    staticOccupied: ReadonlySet<WorldCellKey>,
    movingRefs: ReadonlyArray<PlacementRef>,
    nextRoundedXY: (r: PlacementRef) => [number, number] | null | undefined,
): boolean {
    const proposed: [number, number][] = [];
    for (const r of movingRefs) {
        const xy = nextRoundedXY(r);
        if (!xy)
            return false;
        proposed.push([Math.round(xy[0]), Math.round(xy[1])]);
    }
    return !proposedCoordsCollideWithStaticOccupied(staticOccupied, proposed);
}

// Detects collisions of proposed cells against `occupiedBase` and within the proposed set itself.
export function hasDuplicateWorldCoords(
    occupiedBase: ReadonlySet<WorldCellKey>,
    proposedRounded: Iterable<readonly [number, number]>,
): boolean {
    const used = new Set<WorldCellKey>();
    for (const [x, y] of proposedRounded) {
        const k = worldPlacementCoordKey(x, y);
        if (occupiedBase.has(k) || used.has(k))
            return true;
        used.add(k);
    }
    return false;
}

export function placementsHaveInternalCoordDuplicates(
    placements: ReadonlyArray<XYZRPlacement>,
): boolean {
    const seen = new Set<WorldCellKey>();
    for (const p of placements) {
        const k = worldPlacementCoordKey(p.x, p.y);
        if (seen.has(k)) return true;
        seen.add(k);
    }
    return false;
}

// Validates the proposed positions of a moving group. Rounds coordinates the same way the scene write path does.
export function movesPreserveUniqueCoords(
    layers: ReadonlyArray<PaintLayer>,
    movingRefs: ReadonlyArray<PlacementRef>,
    nextRoundedXY: (r: PlacementRef) => [number, number] | null | undefined,
): boolean {
    const ex = new Set(movingRefs.map(refKey));
    const occ = occupiedCoordKeysExcludingRefs(layers, ex);
    const proposed: [number, number][] = [];
    for (const r of movingRefs) {
        const xy = nextRoundedXY(r);
        if (!xy) return false;
        proposed.push([Math.round(xy[0]), Math.round(xy[1])]);
    }
    return !hasDuplicateWorldCoords(occ, proposed);
}
