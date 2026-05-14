import { viewToWorld, worldToView } from '../../../lib/coords';
import { ROT_FULL } from './editorConstants';
import { normR } from './editorViewport';

export type MirrorAxis = 'horizontal' | 'vertical';

export type RigidMirroredPlacement = {
    wx: number;
    wy: number;
    r: number;
};

function angleToR(rad: number): number {
    return normR((rad / (Math.PI * 2)) * ROT_FULL);
}

function roundWorldCoord(value: number): number {
    const rounded = Math.round(value);
    return Object.is(rounded, -0) ? 0 : rounded;
}

function mirrorPlacementAngleInView(
    r: number,
    axis: MirrorAxis,
    cameraDeg: number,
): number {
    const worldAngle = (r / ROT_FULL) * Math.PI * 2;
    const dwx = Math.cos(worldAngle);
    const dwy = Math.sin(worldAngle);

    const t = (cameraDeg * Math.PI) / 180;
    const c = Math.cos(t);
    const s = Math.sin(t);

    // World direction -> view direction.
    const dvx = dwx * c - dwy * s;
    const dvy = dwx * s + dwy * c;

    const mvx = axis === 'horizontal' ? -dvx : dvx;
    const mvy = axis === 'vertical' ? -dvy : dvy;

    // View direction -> world direction.
    const mwx = mvx * c + mvy * s;
    const mwy = -mvx * s + mvy * c;

    return angleToR(Math.atan2(mwy, mwx));
}

// Mirror selected placements in view space around the center of the
// selection bounding box on screen. "horizontal" means a left-right mirror
// in the current camera view, and "vertical" means a top-bottom mirror.
export function mirrorPlacementsAroundSelectionBoundsCenterView(
    entries: { refKey: string; wx: number; wy: number; r: number }[],
    axis: MirrorAxis,
    cameraDeg: number,
): Map<string, RigidMirroredPlacement> {
    const out = new Map<string, RigidMirroredPlacement>();
    if (entries.length === 0) return out;

    const views = entries.map((entry) => {
        const [vx, vy] = worldToView(entry.wx, entry.wy, cameraDeg);
        return {
            ...entry,
            vx,
            vy,
        };
    });
    const xs = views.map((entry) => entry.vx);
    const ys = views.map((entry) => entry.vy);
    const centerViewX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerViewY = (Math.min(...ys) + Math.max(...ys)) / 2;

    views.forEach((entry) => {
        const vx1 =
            axis === 'horizontal'
                ? 2 * centerViewX - entry.vx
                : entry.vx;
        const vy1 =
            axis === 'vertical'
                ? 2 * centerViewY - entry.vy
                : entry.vy;
        const [wx1, wy1] = viewToWorld(vx1, vy1, cameraDeg);
        out.set(entry.refKey, {
            wx: roundWorldCoord(wx1),
            wy: roundWorldCoord(wy1),
            r: mirrorPlacementAngleInView(entry.r, axis, cameraDeg),
        });
    });

    return out;
}
