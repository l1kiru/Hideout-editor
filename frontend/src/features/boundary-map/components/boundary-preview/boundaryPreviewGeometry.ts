export function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): [number, number] | null {
  try {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const m = svg.getScreenCTM();
    if (!m)
      return null;
    const p = pt.matrixTransform(m.inverse());
    return [p.x, p.y];
  }
  catch {
    return null;
  }
}

export function normalizeRect(ax: number, ay: number, bx: number, by: number) {
  const x = Math.min(ax, bx);
  const y = Math.min(ay, by);
  const w = Math.abs(bx - ax);
  const h = Math.abs(by - ay);
  return { x, y, w, h };
}

export function pointInNormRect(
  px: number,
  py: number,
  r: { x: number; y: number; w: number; h: number },
) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
