import { ROT_FULL } from './editorConstants';

export type ViewBox = { x: number; y: number; width: number; height: number };

export function zoomViewBoxAt(
  vb: ViewBox,
  vx: number,
  vy: number,
  factor: number,
): ViewBox {
  const relx = (vx - vb.x) / vb.width;
  const rely = (vy - vb.y) / vb.height;
  const nw = vb.width * factor;
  const nh = vb.height * factor;
  return { x: vx - relx * nw, y: vy - rely * nh, width: nw, height: nh };
}

export function normR(r: number): number {
  return ((Math.round(r) % ROT_FULL) + ROT_FULL) % ROT_FULL;
}

export function rToDeg(r: number): number {
  return (r / ROT_FULL) * 360;
}

export function degToR(deg: number): number {
  return normR(Math.round((deg / 360) * ROT_FULL));
}

// Rotation angle from vector (ax,ay) to (bx,by), sign by the right-hand rule (top-down view).
export function signedAngleBetweenVectors(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
}
