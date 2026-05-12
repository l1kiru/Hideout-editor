import { polygonClosedSelfIntersects } from './boundaryMapGeometry'

function distSq(a: [number, number], b: [number, number]): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

function ringKey(r: [number, number][]): string {
  return r.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(';')
}

function pushUniqueRing(
  seen: Set<string>,
  list: Array<{ order: [number, number][]; how: string }>,
  order: [number, number][],
  how: string,
): void {
  const k = ringKey(order)
  if (seen.has(k))
    return
  seen.add(k)
  list.push({ order, how })
}

// Greedy order from the first point: each next vertex is the nearest remaining one.
export function orderChainNearestNeighbor(
  pts: [number, number][],
): [number, number][] {
  if (pts.length <= 2)
    return pts.map(([x, y]) => [x, y])
  const remaining = pts.map(([x, y]) => [x, y] as [number, number])
  const out: [number, number][] = []
  let cur = remaining.shift()!
  out.push(cur)
  while (remaining.length > 0) {
    let bi = 0
    let bd = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = distSq(cur, remaining[i]!)
      if (d < bd) {
        bd = d
        bi = i
      }
    }
    cur = remaining.splice(bi, 1)[0]!
    out.push(cur)
  }
  return out
}

// Polar sort around the centroid (works for simple polygons with no concavities).
export function orderChainPolarAroundCentroid(
  pts: [number, number][],
): [number, number][] {
  if (pts.length <= 2)
    return pts.map(([x, y]) => [x, y])
  let sx = 0
  let sy = 0
  for (const [x, y] of pts) {
    sx += x
    sy += y
  }
  const cx = sx / pts.length
  const cy = sy / pts.length
  return [...pts].sort(
    (a, b) =>
      Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx),
  )
}

function nextPermutationLexical(a: number[]): boolean {
  let i = a.length - 2
  while (i >= 0 && a[i]! >= a[i + 1]!)
    i--
  if (i < 0)
    return false
  let j = a.length - 1
  while (a[j]! <= a[i]!)
    j--
  ;[a[i], a[j]] = [a[j]!, a[i]!]
  let lo = i + 1
  let hi = a.length - 1
  while (lo < hi) {
    ;[a[lo], a[hi]] = [a[hi]!, a[lo]!]
    lo++
    hi--
  }
  return true
}

function shuffleInPlace(a: number[], rand: () => number): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
}

// Exhaustive permutation over all vertex orders (only when n <= 10).
function exhaustiveSimplePolygonPermutation(
  pts: [number, number][],
): [number, number][] | null {
  const n = pts.length
  if (n < 3 || n > 10)
    return null
  const idx = Array.from({ length: n }, (_, i) => i)
  while (true) {
    const ring = idx.map((i) => pts[i]!)
    if (!polygonClosedSelfIntersects(ring))
      return ring
    if (!nextPermutationLexical(idx))
      break
  }
  return null
}

function randomShufflePolygonPermutation(
  pts: [number, number][],
  trials: number,
): [number, number][] | null {
  const n = pts.length
  const idx = Array.from({ length: n }, (_, i) => i)
  for (let t = 0; t < trials; t++) {
    shuffleInPlace(idx, Math.random)
    const ring = idx.map((i) => pts[i]!)
    if (!polygonClosedSelfIntersects(ring))
      return ring
  }
  return null
}

// Picks a vertex order that produces a closed polygon without self-intersections.
// Tries preferredFn (and its reverse) first, then file order, polar sort, NN
// and rotated NN starts.
export function pickFirstSimplePolygonOrder(
  pts: [number, number][],
  options?: {
    preferredFn?: (p: [number, number][]) => [number, number][]
    preferredLabel?: string
  },
): { order: [number, number][]; how: string } | null {
  if (pts.length < 3)
    return null

  const seen = new Set<string>()
  const candidates: Array<{ order: [number, number][]; how: string }> = []

  const pf = options?.preferredFn
  const pl = options?.preferredLabel?.trim()
  if (pf) {
    const pref = pf(pts)
    pushUniqueRing(seen, candidates, pref, pl ?? 'эвристика')
    pushUniqueRing(
      seen,
      candidates,
      [...pref].reverse(),
      `${pl ?? 'эвристика'} · разворот`,
    )
  }

  pushUniqueRing(seen, candidates, [...pts], 'как в файле')
  pushUniqueRing(seen, candidates, [...pts].reverse(), 'как в файле · разворот')

  const pol = orderChainPolarAroundCentroid(pts)
  pushUniqueRing(seen, candidates, pol, 'угол от центра')
  pushUniqueRing(
    seen,
    candidates,
    [...pol].reverse(),
    'угол от центра · разворот',
  )

  const nn = orderChainNearestNeighbor(pts)
  pushUniqueRing(seen, candidates, nn, 'ближайший сосед')
  pushUniqueRing(
    seen,
    candidates,
    [...nn].reverse(),
    'ближайший сосед · разворот',
  )

  const n = pts.length
  const maxRot = Math.min(n, 32)
  for (let k = 1; k < maxRot; k++) {
    const rot = [...pts.slice(k), ...pts.slice(0, k)] as [number, number][]
    const nnr = orderChainNearestNeighbor(rot)
    pushUniqueRing(seen, candidates, nnr, `ближайший сосед (старт ${k})`)
    pushUniqueRing(
      seen,
      candidates,
      [...nnr].reverse(),
      `ближайший сосед (старт ${k}) · разворот`,
    )
  }

  for (const { order, how } of candidates) {
    if (order.length >= 3 && !polygonClosedSelfIntersects(order))
      return { order, how }
  }

  const brute = exhaustiveSimplePolygonPermutation(pts)
  if (brute)
    return { order: brute, how: `полный перебор (${pts.length} вершин)` }

  if (pts.length > 10) {
    const trials = Math.min(2_500_000, 320_000 + pts.length * 95_000)
    const rnd = randomShufflePolygonPermutation(pts, trials)
    if (rnd) {
      return {
        order: rnd,
        how: `случайный перебор (до ${trials.toLocaleString('ru-RU')} порядков)`,
      }
    }
  }

  return null
}
