// Preview without flipping, matching in-game x,y in a matplotlib-style (min-y at the bottom) layout.
export function polygonPointsAttr(pts: [number, number][]): string {
  return pts.map(([x, y]) => `${x},${y}`).join(' ')
}

const INTERSECT_EPS = 1e-9

function orient(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
}

function between(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number,
): boolean {
  return (
    px >= Math.min(ax, bx) - INTERSECT_EPS
    && px <= Math.max(ax, bx) + INTERSECT_EPS
    && py >= Math.min(ay, by) - INTERSECT_EPS
    && py <= Math.max(ay, by) + INTERSECT_EPS
  )
}

// Whether segments AB and CD share any point. Treats touches at endpoints
// as intersections too, and detects collinear overlap.
export function segmentsIntersectClosed(
  a: [number, number],
  b: [number, number],
  c: [number, number],
  d: [number, number],
): boolean {
  const [ax, ay] = a
  const [bx, by] = b
  const [cx, cy] = c
  const [dx, dy] = d

  const o1 = orient(ax, ay, bx, by, cx, cy)
  const o2 = orient(ax, ay, bx, by, dx, dy)
  const o3 = orient(cx, cy, dx, dy, ax, ay)
  const o4 = orient(cx, cy, dx, dy, bx, by)

  if (o1 > INTERSECT_EPS && o2 < -INTERSECT_EPS && o3 > INTERSECT_EPS && o4 < -INTERSECT_EPS)
    return true
  if (o1 < -INTERSECT_EPS && o2 > INTERSECT_EPS && o3 < -INTERSECT_EPS && o4 > INTERSECT_EPS)
    return true
  if (o1 > INTERSECT_EPS && o2 < -INTERSECT_EPS && o3 < -INTERSECT_EPS && o4 > INTERSECT_EPS)
    return true
  if (o1 < -INTERSECT_EPS && o2 > INTERSECT_EPS && o3 > INTERSECT_EPS && o4 < -INTERSECT_EPS)
    return true

  if (Math.abs(o1) <= INTERSECT_EPS && between(ax, ay, bx, by, cx, cy))
    return true
  if (Math.abs(o2) <= INTERSECT_EPS && between(ax, ay, bx, by, dx, dy))
    return true
  if (Math.abs(o3) <= INTERSECT_EPS && between(cx, cy, dx, dy, ax, ay))
    return true
  if (Math.abs(o4) <= INTERSECT_EPS && between(cx, cy, dx, dy, bx, by))
    return true

  return false
}

function polygonEdgesAdjacent(n: number, i: number, j: number): boolean {
  if (n < 2)
    return true
  if (i === j)
    return true
  const ip = (i + 1) % n
  const jp = (j + 1) % n
  return ip === j || i === jp
}

function dedupeConsecutiveVertices(ring: [number, number][]): [number, number][] {
  const EPS = 1e-9
  const out: [number, number][] = []
  for (const p of ring) {
    const last = out[out.length - 1]
    if (
      last
      && Math.abs(last[0] - p[0]) < EPS
      && Math.abs(last[1] - p[1]) < EPS
    )
      continue
    out.push([p[0], p[1]])
  }
  return out
}

// Whether a closed polyline (edge i -> i+1, last -> 0) self-intersects on non-adjacent edges.
export function polygonClosedSelfIntersects(ring: [number, number][]): boolean {
  const pts = dedupeConsecutiveVertices(ring)
  const n = pts.length
  if (n < 4)
    return false

  for (let i = 0; i < n; i++) {
    const a = pts[i]!
    const b = pts[(i + 1) % n]!
    for (let j = i + 1; j < n; j++) {
      if (polygonEdgesAdjacent(n, i, j))
        continue
      const c = pts[j]!
      const d = pts[(j + 1) % n]!
      if (segmentsIntersectClosed(a, b, c, d))
        return true
    }
  }
  return false
}
