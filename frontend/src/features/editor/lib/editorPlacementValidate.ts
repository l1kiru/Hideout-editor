import {
    mplViewPointToSvg,
    svgUserYToMplView,
    viewToWorld,
    worldToView,
} from '../../../lib/coords';
import { worldPointAllowed } from '../../../lib/polygon';
import { templatePlacementFootprintView } from '../../../lib/sceneDecorations';
import type { PaintLayer } from '../../../types/scene';
import type {
    PlacementRef,
    PlacementSnapWorld,
} from '../model/editorSessionTypes';
import type { ViewBox } from './editorViewport';
import { previewRotateDegForDoodad } from './editorPreview';
import { readPlacement, refKey } from './placementSelection';

// Sprite footprint corners (world space, camera and rotation applied) tested against the boundary.
export function placementFootprintAllowed(
    wx: number,
    wy: number,
    r: number,
    boundary: [number, number][],
    margin: number,
    cameraDeg: number,
    templateHash: number,
    templateFv: number | null | undefined,
    viewBox: ViewBox,
): boolean {
    const fp = templatePlacementFootprintView(templateHash, templateFv);
    const hw = fp.widthView / 2;
    const hh = fp.heightView / 2;
    const svgDeg = previewRotateDegForDoodad(
        r,
        cameraDeg,
        templateHash,
        templateFv,
    );
    const θ = (svgDeg * Math.PI) / 180;
    const cos = Math.cos(θ);
    const sin = Math.sin(θ);
    const [vx0, vy0] = worldToView(wx, wy, cameraDeg);
    const [sx0, sy0] = mplViewPointToSvg(vx0, vy0, viewBox);
    const cornersSvgLocal: [number, number][] = [
        [-hw, -hh],
        [hw, -hh],
        [hw, hh],
        [-hw, hh],
    ];
    for (const [lx, ly] of cornersSvgLocal) {
        const rx = lx * cos + ly * sin;
        const ry = -lx * sin + ly * cos;
        const vx = sx0 + rx;
        const vy = svgUserYToMplView(sy0 + ry, viewBox);
        const [wwx, wwy] = viewToWorld(vx, vy, cameraDeg);
        if (
            !worldPointAllowed(
                Math.round(wwx),
                Math.round(wwy),
                boundary,
                margin,
            )
        )
            return false;
    }
    return true;
}

// Fast rigid-shift check: every center after the shift must stay inside the boundary.
export function placementCentersAllowedAfterShift(
    snaps: Record<string, PlacementSnapWorld>,
    refs: PlacementRef[],
    dwx: number,
    dwy: number,
    boundary: [number, number][],
    margin: number,
): boolean {
    for (const r of refs) {
        const sp = snaps[refKey(r)];
        if (!sp) return false;
        const wx = Math.round(sp.wx + dwx);
        const wy = Math.round(sp.wy + dwy);
        if (!worldPointAllowed(wx, wy, boundary, margin)) return false;
    }
    return true;
}

// World-space rectangle: [minWx, minWy, maxWx, maxWy].
export type SelectionAABB = readonly [number, number, number, number];

// Bounds of the selection centers. Returns null for an empty refs list.
// Used by the O(1) fast-path in drag/rotate (see aabbCornersInsideBoundary).
export function buildSelectionCentersAABB(
    snaps: Record<string, PlacementSnapWorld>,
    refs: PlacementRef[],
): SelectionAABB | null {
    if (refs.length === 0) return null;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const r of refs) {
        const sp = snaps[refKey(r)];
        if (!sp) return null;
        if (sp.wx < minX) minX = sp.wx;
        if (sp.wx > maxX) maxX = sp.wx;
        if (sp.wy < minY) minY = sp.wy;
        if (sp.wy > maxY) maxY = sp.wy;
    }
    return [minX, minY, maxX, maxY];
}

// Fast check: "AABB-of-centers-after-shift fits inside boundary with margin".
// Tests the four corners via worldPointAllowed. For convex boundaries this is
// sufficient: every center lies inside the AABB and thus inside the polygon.
// For non-convex polygons it is a heuristic - if it passes, drag is allowed;
// if it fails, the caller must run the per-ref check (placementCentersAllowedAfterShift).
// Cost: 4 x worldPointAllowed (~O(M) edges) instead of O(N) selection size.
export function aabbCornersInsideBoundary(
    aabb: SelectionAABB,
    dwx: number,
    dwy: number,
    boundary: [number, number][],
    margin: number,
): boolean {
    const [minX, minY, maxX, maxY] = aabb;
    const corners: ReadonlyArray<readonly [number, number]> = [
        [Math.round(minX + dwx), Math.round(minY + dwy)],
        [Math.round(maxX + dwx), Math.round(minY + dwy)],
        [Math.round(maxX + dwx), Math.round(maxY + dwy)],
        [Math.round(minX + dwx), Math.round(maxY + dwy)],
    ];
    for (const [cx, cy] of corners) {
        if (!worldPointAllowed(cx, cy, boundary, margin)) return false;
    }
    return true;
}

export function placementCentersAllowedFromProposedWorld(
    refs: PlacementRef[],
    proposed: Map<string, { wx: number; wy: number }>,
    boundary: [number, number][],
    margin: number,
): boolean {
    for (const r of refs) {
        const pr = proposed.get(refKey(r));
        if (!pr) return false;
        if (
            !worldPointAllowed(
                Math.round(pr.wx),
                Math.round(pr.wy),
                boundary,
                margin,
            )
        )
            return false;
    }
    return true;
}

export function everyRefPlacementFootprintAllowed(
    ls: PaintLayer[],
    refs: PlacementRef[],
    boundary: [number, number][],
    margin: number,
    cameraDeg: number,
    viewBox: ViewBox,
): boolean {
    for (const r of refs) {
        const p = readPlacement(ls, r);
        const ly = ls[r.layerIdx];
        const b = ly?.batches[r.batchIdx];
        if (!p || !b) return false;
        if (
            !placementFootprintAllowed(
                p.x,
                p.y,
                p.r,
                boundary,
                margin,
                cameraDeg,
                b.template_hash,
                b.facet_fv,
                viewBox,
            )
        )
            return false;
    }
    return true;
}

// Same as everyRefPlacementFootprintAllowed but positions are taken from
// `snaps` with a shift (dwx, dwy). Needed when the final state has not been
// committed to layersRef/layers yet (e.g. right after drag-up, before
// setLayers syncs layersRef via an effect).
export function everyRefPlacementFootprintAllowedAfterShift(
    snaps: Record<string, PlacementSnapWorld>,
    refs: PlacementRef[],
    dwx: number,
    dwy: number,
    boundary: [number, number][],
    margin: number,
    cameraDeg: number,
    viewBox: ViewBox,
): boolean {
    for (const r of refs) {
        const sp = snaps[refKey(r)];
        if (!sp) return false;
        const wx = Math.round(sp.wx + dwx);
        const wy = Math.round(sp.wy + dwy);
        if (
            !placementFootprintAllowed(
                wx,
                wy,
                sp.r,
                boundary,
                margin,
                cameraDeg,
                sp.template_hash,
                sp.facet_fv,
                viewBox,
            )
        )
            return false;
    }
    return true;
}
