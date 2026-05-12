import { viewToWorld, worldToView } from '../../../lib/coords';
import { ROT_FULL } from './editorConstants';
import { normR } from './editorViewport';
import type {
    PlacementRef,
    PlacementSnapWorld,
} from '../model/editorSessionTypes';
import { refKey } from './placementSelection';

export type RigidRotatedPlacement = {
    wx: number;
    wy: number;
    r: number;
};

// Rigid rotation of the group around centerView (MPL view coordinates, Y up).
// Position centers rotate as a whole; the same delta (in hideout r units) is
// added to every per-placement r.
export function rigidRotateSnapsAroundViewPivot(
    snaps: Record<string, PlacementSnapWorld>,
    refs: PlacementRef[],
    cameraDeg: number,
    centerView: [number, number],
    deltaRad: number,
): Map<string, RigidRotatedPlacement> {
    const deltaHideout = (deltaRad / (Math.PI * 2)) * ROT_FULL;
    const cos = Math.cos(deltaRad);
    const sin = Math.sin(deltaRad);
    const [cx, cy] = centerView;
    const out = new Map<string, RigidRotatedPlacement>();
    for (const r of refs) {
        const sp = snaps[refKey(r)];
        const [vx0, vy0] = worldToView(sp.wx, sp.wy, cameraDeg);
        const dx = vx0 - cx;
        const dy = vy0 - cy;
        const vx1 = cx + dx * cos - dy * sin;
        const vy1 = cy + dx * sin + dy * cos;
        const [wx1, wy1] = viewToWorld(vx1, vy1, cameraDeg);
        out.set(refKey(r), {
            wx: Math.round(wx1),
            wy: Math.round(wy1),
            r: normR(sp.r + deltaHideout),
        });
    }
    return out;
}

// Keyboard rotation step. Pivot is the centroid of the selected centers in view space.
export function rigidRotatePlacementsAroundSelectionCentroidView(
    entries: { refKey: string; wx: number; wy: number; r: number }[],
    cameraDeg: number,
    deltaHideout: number,
): Map<string, RigidRotatedPlacement> {
    const deltaRad = (deltaHideout / ROT_FULL) * (Math.PI * 2);
    const out = new Map<string, RigidRotatedPlacement>();
    if (entries.length === 0) return out;

    const cos = Math.cos(deltaRad);
    const sin = Math.sin(deltaRad);
    const views = entries.map((e) =>
        worldToView(e.wx, e.wy, cameraDeg),
    ) as [number, number][];
    let svx = 0;
    let svy = 0;
    for (const [vx, vy] of views) {
        svx += vx;
        svy += vy;
    }
    svx /= entries.length;
    svy /= entries.length;

    entries.forEach((e, i) => {
        const [vx0, vy0] = views[i];
        const dx = vx0 - svx;
        const dy = vy0 - svy;
        const vx1 = svx + dx * cos - dy * sin;
        const vy1 = svy + dx * sin + dy * cos;
        const [wx1, wy1] = viewToWorld(vx1, vy1, cameraDeg);
        out.set(e.refKey, {
            wx: Math.round(wx1),
            wy: Math.round(wy1),
            r: normR(e.r + deltaHideout),
        });
    });
    return out;
}
