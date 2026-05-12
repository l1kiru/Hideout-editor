import { mplViewPointToSvg } from '../../../lib/coords';
import {
    backgroundWidthViewBaseForFit,
    zoneViewLimitsWithPad,
} from '../../../lib/viewLimits';
import type { Background } from '../../../types/scene';
import type { ViewBox } from './editorViewport';

// Mirrors the size and crop computation in EditorBackgroundLayer.
export type BackgroundDisplayMetrics = {
    cx: number;
    cy: number;
    w: number;
    h: number;
    rotDeg: number;
    cl: number;
    ct: number;
    cw: number;
    ch: number;
};

export function resolveBackgroundDisplayMetrics(
    background: Background,
    bgNaturalSize: { w: number; h: number },
    boundary: [number, number][],
    cameraDeg: number,
    viewBox: ViewBox,
): BackgroundDisplayMetrics | null {
    const p = background.path?.trim();
    if (!p || bgNaturalSize.w < 1 || bgNaturalSize.h < 1) return null;

    const natW = bgNaturalSize.w;
    const natH = bgNaturalSize.h;
    let baseW = background.width_view_base;
    if (baseW == null || baseW <= 0) {
        const lims = zoneViewLimitsWithPad(boundary, cameraDeg);
        const zoneW = lims ? lims.xmax - lims.xmin : viewBox.width;
        const zoneH = lims ? lims.ymax - lims.ymin : viewBox.height;
        baseW = backgroundWidthViewBaseForFit(zoneW, zoneH, natW, natH);
    }
    const scaleBg = background.scale ?? 1;
    const w = baseW * scaleBg;
    const h = w * (natH / natW);
    const ox = background.offset_x ?? 0;
    const oy = background.offset_y ?? 0;
    const rot = background.rotation_deg ?? 0;
    const cl = ((background.crop_left_pct ?? 0) / 100) * w;
    const ct = ((background.crop_top_pct ?? 0) / 100) * h;
    const cw = Math.max(
        0,
        (((background.crop_right_pct ?? 100) -
            (background.crop_left_pct ?? 0)) /
            100) *
            w,
    );
    const ch = Math.max(
        0,
        (((background.crop_bottom_pct ?? 100) -
            (background.crop_top_pct ?? 0)) /
            100) *
            h,
    );

    return {
        cx: ox,
        cy: oy,
        w,
        h,
        rotDeg: rot,
        cl,
        ct,
        cw,
        ch,
    };
}

// Inverse of `rotate(-rotDeg)` on the background layer. MPL/gesture rotate
// counter-clockwise with the same sign as `rotation_deg`.
export function backgroundSvgPointerToLocal(
    svgX: number,
    svgY: number,
    centerSx: number,
    centerSy: number,
    rotDeg: number,
): [number, number] {
    const rx = svgX - centerSx;
    const ry = svgY - centerSy;
    const θ = (rotDeg * Math.PI) / 180;
    const cos = Math.cos(θ);
    const sin = Math.sin(θ);
    const lx = rx * cos + ry * sin;
    const ly = -rx * sin + ry * cos;
    return [lx, ly];
}

export type BackgroundHitZone =
    | { kind: 'inside' }
    | { kind: 'corner'; sx: -1 | 1; sy: -1 | 1 }
    | { kind: 'edge'; axis: 'x' | 'y'; sign: -1 | 1 };

// Hit-test against the visible (crop) area of the background. SVG point is in user SVG coordinates.
export function classifyBackgroundPointer(
    metrics: BackgroundDisplayMetrics,
    svgX: number,
    svgY: number,
    viewBox: ViewBox,
): BackgroundHitZone | null {
    const [sx0, sy0] = mplViewPointToSvg(metrics.cx, metrics.cy, viewBox);
    const [lx, ly] = backgroundSvgPointerToLocal(
        svgX,
        svgY,
        sx0,
        sy0,
        metrics.rotDeg,
    );

    const { w, h, cl, ct, cw, ch } = metrics;
    const hw = w / 2;
    const hh = h / 2;
    const lxMin = cl - hw;
    const lxMax = lxMin + cw;
    const lyMin = ct - hh;
    const lyMax = lyMin + ch;

    const handle = Math.max(viewBox.width * 0.018, 10);

    if (
        lx < lxMin - handle ||
        lx > lxMax + handle ||
        ly < lyMin - handle ||
        ly > lyMax + handle
    )
        return null;

    const innerX0 = lxMin + handle;
    const innerX1 = lxMax - handle;
    const innerY0 = lyMin + handle;
    const innerY1 = lyMax - handle;

    if (
        lx >= innerX0 &&
        lx <= innerX1 &&
        ly >= innerY0 &&
        ly <= innerY1
    )
        return { kind: 'inside' };

    const nearL = lx < innerX0;
    const nearR = lx > innerX1;
    const nearT = ly < innerY0;
    const nearB = ly > innerY1;

    if ((nearL || nearR) && (nearT || nearB)) {
        const sx = nearL ? (-1 as const) : (1 as const);
        const sy = nearT ? (-1 as const) : (1 as const);
        return { kind: 'corner', sx, sy };
    }
    if (nearL) return { kind: 'edge', axis: 'x', sign: -1 };
    if (nearR) return { kind: 'edge', axis: 'x', sign: 1 };
    if (nearT) return { kind: 'edge', axis: 'y', sign: -1 };
    return { kind: 'edge', axis: 'y', sign: 1 };
}

// Corners of the visible background area in MPL view coordinates (counter-clockwise in view).
export function backgroundCropCornersMpl(
    metrics: BackgroundDisplayMetrics,
): [number, number][] {
    const hw = metrics.w / 2;
    const hh = metrics.h / 2;
    const lx0 = metrics.cl - hw;
    const lx1 = metrics.cl + metrics.cw - hw;
    const ly0 = metrics.ct - hh;
    const ly1 = metrics.ct + metrics.ch - hh;
    const locals: [number, number][] = [
        [lx0, ly0],
        [lx1, ly0],
        [lx1, ly1],
        [lx0, ly1],
    ];
    const θ = (metrics.rotDeg * Math.PI) / 180;
    const cos = Math.cos(θ);
    const sin = Math.sin(θ);
    const out: [number, number][] = [];
    for (const [lx, ly] of locals) {
        const dvx = lx * cos + ly * sin;
        const dvy = lx * sin - ly * cos;
        out.push([metrics.cx + dvx, metrics.cy + dvy]);
    }
    return out;
}

export function backgroundCornersPolygonSvgPoints(
    metrics: BackgroundDisplayMetrics,
    viewBox: ViewBox,
): string {
    return backgroundCropCornersMpl(metrics)
        .map(([vx, vy]) => mplViewPointToSvg(vx, vy, viewBox))
        .map(([sx, sy]) => `${sx},${sy}`)
        .join(' ');
}

export const BACKGROUND_SCALE_MIN = 0.05;
export const BACKGROUND_SCALE_MAX = 8;

export function clampBackgroundScale(s: number): number {
    return Math.min(BACKGROUND_SCALE_MAX, Math.max(BACKGROUND_SCALE_MIN, s));
}

export function backgroundResizeRatio(
    hit: Exclude<BackgroundHitZone, { kind: 'inside' }>,
    lx: number,
    ly: number,
    refLx: number,
    refLy: number,
): number {
    if (hit.kind === 'corner') {
        const d0 = Math.hypot(refLx, refLy);
        const d1 = Math.hypot(lx, ly);
        if (d0 < 1e-6) return 1;
        return d1 / d0;
    }
    if (hit.axis === 'x') {
        const a0 = Math.abs(refLx);
        const a1 = Math.abs(lx);
        if (a0 < 1e-6) return 1;
        return a1 / a0;
    }
    const a0 = Math.abs(refLy);
    const a1 = Math.abs(ly);
    if (a0 < 1e-6) return 1;
    return a1 / a0;
}
