import type { MarkerChoice, PlacementRow } from './boundaryMapTypes'

export function matchesBoundaryMarker(
  name: string,
  hash: number,
  markerName: string | null,
  markerHash: number | null,
): boolean {
  const rowName = name.trim()
  const mn = markerName?.trim() ?? null
  if (markerHash == null && mn == null)
    return false
  if (markerHash != null && hash !== markerHash)
    return false
  if (mn != null && rowName !== mn)
    return false
  return true
}

export function chainFromSelections(
  rows: PlacementRow[],
  markerName: string | null,
  markerHash: number | null,
): [number, number][] {
  return rows
    .filter((r) =>
      matchesBoundaryMarker(r.name, r.hash, markerName, markerHash),
    )
    .map((r) => [r.x, r.y] as [number, number])
}

// Placements to save as base map objects, excluding boundary-marker doodads.
export function placementsWithoutBoundaryMarkers(
  rows: PlacementRow[],
  markerName: string | null,
  markerHash: number | null,
): PlacementRow[] {
  return rows.filter(
    (r) => !matchesBoundaryMarker(r.name, r.hash, markerName, markerHash),
  )
}

export function distinctMarkerChoices(rows: PlacementRow[]): MarkerChoice[] {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const n = r.name.trim()
    if (!n)
      continue
    counts.set(n, (counts.get(n) ?? 0) + 1)
  }
  const names = [...counts.keys()].sort((a, b) =>
    a.localeCompare(b, 'ru', { sensitivity: 'base' }),
  )
  const out: MarkerChoice[] = [
    { label: '(вручную: только имя ниже)', name: null, hash: null },
  ]
  for (const name of names) {
    const n = counts.get(name) ?? 1
    out.push({
      label: n > 1 ? `${name}  (${n} шт.)` : name,
      name,
      hash: null,
    })
  }
  return out
}

// Most frequent doodad type (name, hash) in the file, used as the default boundary marker.
export function mostFrequentPlacementType(
  rows: PlacementRow[],
): { name: string; hash: number } | null {
  if (rows.length === 0)
    return null
  const counts = new Map<string, { name: string; hash: number; n: number }>()
  for (const r of rows) {
    const key = `${r.name.trim()}\n${r.hash}`
    const prev = counts.get(key)
    if (prev)
      prev.n += 1
    else counts.set(key, { name: r.name, hash: r.hash, n: 1 })
  }
  let best: { name: string; hash: number; n: number } | null = null
  for (const v of counts.values()) {
    if (!best || v.n > best.n) {
      best = v
      continue
    }
    if (v.n < best.n)
      continue
    const nameCmp = v.name.trim().localeCompare(best.name.trim(), 'ru', {
      sensitivity: 'base',
    })
    if (nameCmp < 0 || (nameCmp === 0 && v.hash < best.hash))
      best = v
  }
  return best ? { name: best.name, hash: best.hash } : null
}

// Unique non-empty doodad names from the file, used as hints for manual marker entry.
export function distinctPlacementNames(rows: PlacementRow[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const r of rows) {
    const n = r.name.trim()
    if (!n || seen.has(n))
      continue
    seen.add(n)
    out.push(n)
  }
  out.sort((a, b) => a.localeCompare(b, 'ru'))
  return out
}

// Boundary marker by doodad name; hash is not sent to the API (name-only filter).
export function markerFromNameField(markerNameStr: string): {
  name: string | null
  hash: number | null
} {
  const n = markerNameStr.trim()
  return { name: n.length ? n : null, hash: null }
}
