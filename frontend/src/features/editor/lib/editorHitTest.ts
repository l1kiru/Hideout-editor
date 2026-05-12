export function hitRect(
  cx: number,
  cy: number,
  w: number,
  h: number,
  px: number,
  py: number,
): boolean {
  return Math.abs(px - cx) <= w / 2 && Math.abs(py - cy) <= h / 2;
}

export function circleTouchesRect(
  cx: number,
  cy: number,
  radius: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean {
  const closestX = Math.max(rx - rw / 2, Math.min(cx, rx + rw / 2));
  const closestY = Math.max(ry - rh / 2, Math.min(cy, ry + rh / 2));
  return Math.hypot(cx - closestX, cy - closestY) <= radius;
}

export function projectedFootprint(
  asset: { widthView: number; heightView: number },
  angleRad: number,
): number {
  const c = Math.abs(Math.cos(angleRad));
  const s = Math.abs(Math.sin(angleRad));
  return asset.widthView * c + asset.heightView * s;
}
