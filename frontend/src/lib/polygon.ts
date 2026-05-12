// Port of polygon_zone: point-in-polygon and distance-to-boundary checks (used by point_allowed).

export function pointInPolygon(
  px: number,
  py: number,
  poly: [number, number][],
): boolean {
  const n = poly.length
  if (n < 3)
    return false
  let inside = false
  let j = n - 1
  for (let i = 0; i < n; i++) {
    const [xi, yi] = poly[i]!
    const [xj, yj] = poly[j]!
    const yiGt = yi > py
    const yjGt = yj > py
    if (yiGt !== yjGt) {
      const denom = (yj - yi) || 1e-30
      const xInt = ((xj - xi) * (py - yi)) / denom + xi
      if (px < xInt)
        inside = !inside
    }
    j = i
  }
  return inside
}

function distPointSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const abLen2 = abx * abx + aby * aby
  if (abLen2 < 1e-18)
    return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLen2))
  const qx = ax + abx * t
  const qy = ay + aby * t
  return Math.hypot(px - qx, py - qy)
}

export function distanceToPolygonBoundary(
  px: number,
  py: number,
  poly: [number, number][],
): number {
  const n = poly.length
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < n; i++) {
    const [x1, y1] = poly[i]!
    const [x2, y2] = poly[(i + 1) % n]!
    best = Math.min(best, distPointSegment(px, py, x1, y1, x2, y2))
  }
  return best
}

export function worldPointAllowed(
  wx: number,
  wy: number,
  boundary: [number, number][],
  margin: number,
): boolean {
  if (boundary.length < 3)
    return false
  const poly = boundary.map(([x, y]) => [x, y] as [number, number])
  if (!pointInPolygon(wx, wy, poly))
    return false
  if (margin <= 0)
    return true
  return distanceToPolygonBoundary(wx, wy, poly) >= margin - 1e-9
}
