import {
  viewDirectionToWorldAngleRad,
  viewToWorld,
} from '../../../lib/coords';
import { worldPointAllowed } from '../../../lib/polygon';
import { ROPE_POLYLINE_FOOTPRINT } from '../../../lib/sceneDecorations';
import type { AssetKey } from '../../../types/scene';
import type { XYZRPlacement } from '../../../types/scene';
import {
  LINE_BRUSH_VERTEX_DIST,
  ROT_FULL,
  ROT_LINE_ROPE_OFFSET,
} from './editorConstants';
import { projectedFootprint } from './editorHitTest';
import { normR } from './editorViewport';

export function dedupeConsecutiveViewPoints(
  pts: [number, number][],
  eps = 1e-6,
): [number, number][] {
  const out: [number, number][] = [];
  for (const p of pts) {
    if (
      out.length === 0
      || Math.hypot(
        p[0] - out[out.length - 1][0],
        p[1] - out[out.length - 1][1],
      ) > eps
    ) {
      out.push(p);
    }
  }
  return out;
}

// Rubber-band tail for the brush polyline.
export function appendBrushPoint(
  points: [number, number][],
  x: number,
  y: number,
  lineBrushVertexDist = LINE_BRUSH_VERTEX_DIST,
): [number, number][] {
  if (points.length === 0)
    return [[x, y]];
  const last = points[points.length - 1];
  if (points.length === 1) {
    if (Math.hypot(x - last[0], y - last[1]) < 1e-6)
      return points;
    return [...points, [x, y]];
  }
  const prev = points[points.length - 2];
  const distTail = Math.hypot(x - last[0], y - last[1]);
  const fromPrev = Math.hypot(x - prev[0], y - prev[1]);
  if (fromPrev >= lineBrushVertexDist && distTail >= 0.35)
    return [...points, [x, y]];
  return [...points.slice(0, -1), [x, y]];
}

export function placementsForPolyline(
  viewPoints: [number, number][],
  _asset: { widthView: number; heightView: number },
  spacing: number,
  cameraDeg: number,
  lineAssetKey: AssetKey,
  boundary: [number, number][],
  margin: number,
): XYZRPlacement[] {
  const cleaned = dedupeConsecutiveViewPoints(viewPoints);
  const out: XYZRPlacement[] = [];
  if (cleaned.length === 0)
    return out;

  const allowWorld = (wx: number, wy: number) =>
    boundary.length < 3 || worldPointAllowed(wx, wy, boundary, margin);

  const pushAt = (vx: number, vy: number, segDx: number, segDy: number) => {
    const [wx, wy] = viewToWorld(vx, vy, cameraDeg);
    if (!allowWorld(wx, wy))
      return;
    const wAng = viewDirectionToWorldAngleRad(segDx, segDy, cameraDeg);
    const storedAngle = lineAssetKey === 'maraketh_rubble1'
      ? -wAng
      : wAng;
    const rot = normR((storedAngle / (Math.PI * 2)) * ROT_FULL);
    const xi = Math.round(wx);
    const yi = Math.round(wy);
    const last = out[out.length - 1];
    if (last && last.x === xi && last.y === yi)
      return;
    out.push({ x: xi, y: yi, r: rot });
  };

  if (cleaned.length === 1) {
    pushAt(cleaned[0][0], cleaned[0][1], 1, 0);
    return out;
  }

  const d0x = cleaned[1][0] - cleaned[0][0];
  const d0y = cleaned[1][1] - cleaned[0][1];
  pushAt(cleaned[0][0], cleaned[0][1], d0x, d0y);

  let carry = 0;
  for (let i = 0; i < cleaned.length - 1; i++) {
    const A = cleaned[i];
    const B = cleaned[i + 1];
    const dx = B[0] - A[0];
    const dy = B[1] - A[1];
    const L = Math.hypot(dx, dy);
    if (L < 1e-9)
      continue;
    const ux = dx / L;
    const uy = dy / L;
    const angle = Math.atan2(dy, dx);
    const spriteAlongSeg
      = angle + (ROT_LINE_ROPE_OFFSET / ROT_FULL) * (Math.PI * 2);
    const footprintForStep = ROPE_POLYLINE_FOOTPRINT;
    const step = Math.max(
      0.5,
      projectedFootprint(footprintForStep, spriteAlongSeg) + spacing,
    );
    let pos = 0;
    let sweepGuard = 0;
    while (pos < L + 1e-9 && sweepGuard < 1_000_000) {
      sweepGuard += 1;
      while (carry >= step - 1e-12)
        carry -= step;
      const remSeg = L - pos;
      const need = step - carry;
      if (need <= 1e-9) {
        carry = 0;
        continue;
      }
      if (remSeg + 1e-9 >= need) {
        pos += need;
        carry = 0;
        if (pos > L + 1e-9)
          break;
        pushAt(A[0] + ux * pos, A[1] + uy * pos, dx, dy);
      }
      else {
        carry += remSeg;
        break;
      }
    }
  }

  const lastV = cleaned[cleaned.length - 1];
  const prevV = cleaned[cleaned.length - 2];
  const ldx = lastV[0] - prevV[0];
  const ldy = lastV[1] - prevV[1];
  if (Math.hypot(ldx, ldy) > 1e-9) {
    const [ewx, ewy] = viewToWorld(lastV[0], lastV[1], cameraDeg);
    const lastPl = out[out.length - 1];
    const dup =
      lastPl
      && lastPl.x === Math.round(ewx)
      && lastPl.y === Math.round(ewy);
    if (!dup)
      pushAt(lastV[0], lastV[1], ldx, ldy);
  }

  return out;
}
