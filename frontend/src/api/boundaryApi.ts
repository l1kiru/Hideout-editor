import type { Boundary } from '../types/scene'
import { expectOk, getBaseURL } from './base'

export interface HideoutPlacementRow {
  seq: number
  name: string
  hash: number
  x: number
  y: number
  r?: number
  fv?: number
}

export interface ParsedHideoutPlacements {
  hideout_hash: string | number | null | undefined
  placements: HideoutPlacementRow[]
}

export interface PublishBoundaryPayload {
  map_display_name: string
  map_id?: number | null
  points: { x: number; y: number }[]
  marker_name?: string | null
  marker_hash?: number | null
  source_hideout?: string | null
  hideout_hash?: string | number | null
  placements?: HideoutPlacementRow[] | null
  create_as_base_map?: boolean
  export_hideout_display_name?: string | null
}

export interface PublishHideoutMapResponse {
  written: boolean
  map_id: number
  display_name: string
  sqlite: string
}

export async function uploadBoundaryJsonFile(file: File): Promise<Boundary> {
  const fd = new FormData()
  fd.append('file', file)
  const baseURL = getBaseURL()
  const r = await fetch(`${baseURL}/api/boundary/upload-json-file`, {
    method: 'POST',
    body: fd,
  })
  await expectOk(r)
  return r.json() as Promise<Boundary>
}

export async function parseHideoutPlacements(
  file: File,
): Promise<ParsedHideoutPlacements> {
  const fd = new FormData()
  fd.append('file', file)
  const baseURL = getBaseURL()
  const r = await fetch(`${baseURL}/api/boundary/parse-hideout-placements`, {
    method: 'POST',
    body: fd,
  })
  await expectOk(r)
  return r.json() as Promise<ParsedHideoutPlacements>
}

export async function publishBoundaryOrderHideoutMap(
  body: PublishBoundaryPayload,
): Promise<PublishHideoutMapResponse> {
  const baseURL = getBaseURL()
  const r = await fetch(`${baseURL}/api/boundary/publish-hideout-map`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  await expectOk(r)
  return r.json() as Promise<PublishHideoutMapResponse>
}
