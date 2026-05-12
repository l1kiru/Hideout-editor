export interface PlacementRow {
  seq: number
  name: string
  hash: number
  x: number
  y: number
  // Orientation from .hideout.
  r?: number
  // Facet variant.
  fv?: number
}

export interface ParsedPayload {
  hideout_hash?: string | number | null
  placements: PlacementRow[]
}

export type MarkerChoice = {
  label: string
  name: string | null
  hash: number | null
}

export type BoundaryBBox = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  w: number
  h: number
}
