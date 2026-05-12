import { worldToView } from '../../../lib/coords';
import { templatePlacementFootprintView } from '../../../lib/sceneDecorations';
import type { PaintLayer, XYZRPlacement } from '../../../types/scene';

import type { PlacementRef } from '../model/editorSessionTypes';

import {
    layerId,
    placementObjectId,
    type LayerId,
    type PlacementObjectId,
} from './editorIds';

export function refKey(r: PlacementRef): PlacementObjectId {
    return placementObjectId(
        `${r.layerIdx}:${r.batchIdx}:${r.placementIdx}`,
    );
}

// Inverse of refKey. Returns null if the string is not three non-negative integers.
export function parseRefKey(id: PlacementObjectId): PlacementRef | null {
    const parts = String(id).split(':');
    if (parts.length !== 3) return null;
    const li = Number(parts[0]);
    const bi = Number(parts[1]);
    const pi = Number(parts[2]);
    if (
        !Number.isInteger(li)
        || !Number.isInteger(bi)
        || !Number.isInteger(pi)
        || li < 0
        || bi < 0
        || pi < 0
    ) {
        return null;
    }
    return {
        layerIdx: layerId(li),
        batchIdx: bi,
        placementIdx: pi,
    };
}

export function refEqual(a: PlacementRef, b: PlacementRef): boolean {
    return (
        a.layerIdx === b.layerIdx &&
        a.batchIdx === b.batchIdx &&
        a.placementIdx === b.placementIdx
    );
}

// Layer 0 historically forced single-object selection so a marquee/Ctrl-click
// could not build a large group of default placements. Group move on layer 0
// now works like on user layers; delete/copy restrictions for default objects
// stay in the corresponding placement-actions.
export function normalizeSelectionLayer0(
    refs: ReadonlyArray<PlacementRef>,
): PlacementRef[] {
    return uniqRefs(refs);
}

export function uniqRefs(refs: ReadonlyArray<PlacementRef>): PlacementRef[] {
    const seen = new Set<PlacementObjectId>();
    const out: PlacementRef[] = [];
    for (const r of refs) {
        const k = refKey(r);
        if (!seen.has(k)) {
            seen.add(k);
            out.push(r);
        }
    }
    return out;
}

export function layerIndicesFromRefs(
    refs: ReadonlyArray<PlacementRef>,
): LayerId[] {
    return [...new Set(refs.map((r) => r.layerIdx))].sort((a, b) => a - b);
}

export function readPlacement(
    layers: ReadonlyArray<PaintLayer>,
    r: PlacementRef,
): XYZRPlacement | null {
    const ly = layers[r.layerIdx];
    const b = ly?.batches[r.batchIdx];
    return b?.placements[r.placementIdx] ?? null;
}

// Axis-aligned bounding box overlap test in view coordinates (worldToView units).
export function viewAabbOverlap(
    al: number,
    ar: number,
    ab: number,
    at: number,
    bl: number,
    br: number,
    bb: number,
    bt: number,
): boolean {
    return al <= br && ar >= bl && ab <= bt && at >= bb;
}

// All placements whose view AABB intersects the marquee rectangle [v0,v1]x[v2,v3].
export function collectRefsInMarqueeView(
    layers: ReadonlyArray<PaintLayer>,
    cameraDeg: number,
    vx0: number,
    vx1: number,
    vy0: number,
    vy1: number,
): PlacementRef[] {
    const mLeft = Math.min(vx0, vx1);
    const mRight = Math.max(vx0, vx1);
    const mBottom = Math.min(vy0, vy1);
    const mTop = Math.max(vy0, vy1);
    const out: PlacementRef[] = [];
    for (let li = 0; li < layers.length; li++) {
        const ly = layers[li];
        if (!ly?.visible) continue;
        if (ly.locked) continue;
        for (let bi = 0; bi < ly.batches.length; bi++) {
            const b = ly.batches[bi];
            const fp = templatePlacementFootprintView(
                b.template_hash,
                b.facet_fv,
            );
            for (let pi = 0; pi < b.placements.length; pi++) {
                const p = b.placements[pi];
                const [vx, vy] = worldToView(p.x, p.y, cameraDeg);
                const hw = fp.widthView / 2;
                const hh = fp.heightView / 2;
                const L = vx - hw;
                const R = vx + hw;
                const B = vy - hh;
                const T = vy + hh;
                if (
                    viewAabbOverlap(L, R, B, T, mLeft, mRight, mBottom, mTop)
                )
                    out.push({
                        layerIdx: layerId(li),
                        batchIdx: bi,
                        placementIdx: pi,
                    });
            }
        }
    }
    return out;
}
