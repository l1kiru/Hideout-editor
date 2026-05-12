import type { Scene } from '../types/scene'
import { expectOk, getBaseURL } from './base'

export interface HideoutMapSummary {
  id: number
  display_name: string
  created_at: string
  has_boundary: boolean
  is_base?: boolean
  base_priority?: number | null
  forked_from_map_id?: number | null
  lineage_base_display_name?: string | null
  export_hideout_display_name?: string | null
  export_hideout_hash?: number | null
}

export async function listHideoutMaps(): Promise<HideoutMapSummary[]> {
  const baseURL = getBaseURL()
  const r = await fetch(`${baseURL}/api/maps`)
  await expectOk(r)
  return r.json() as Promise<HideoutMapSummary[]>
}

export async function deleteHideoutMap(mapId: number): Promise<void> {
  const baseURL = getBaseURL()
  const r = await fetch(`${baseURL}/api/maps/${mapId}`, { method: 'DELETE' })
  await expectOk(r)
}

export async function createHideoutMap(displayName: string): Promise<HideoutMapSummary> {
  const baseURL = getBaseURL()
  const r = await fetch(`${baseURL}/api/maps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  })
  await expectOk(r)
  return r.json() as Promise<HideoutMapSummary>
}

export async function duplicateHideoutMap(
  sourceMapId: number,
  displayName: string,
): Promise<HideoutMapSummary> {
  const baseURL = getBaseURL()
  const r = await fetch(`${baseURL}/api/maps/${sourceMapId}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  })
  await expectOk(r)
  return r.json() as Promise<HideoutMapSummary>
}

export async function createMapFromHideoutOnBase(
  file: File,
  baseMapId: number,
  displayName?: string,
): Promise<HideoutMapSummary> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('base_map_id', String(baseMapId))
  const trimmed = displayName?.trim()
  if (trimmed)
    fd.append('display_name', trimmed)
  const baseURL = getBaseURL()
  const r = await fetch(`${baseURL}/api/maps/from-hideout-on-base`, {
    method: 'POST',
    body: fd,
  })
  await expectOk(r)
  return r.json() as Promise<HideoutMapSummary>
}

export async function getEditorSceneForMap(
  mapId: number,
): Promise<unknown | null> {
  const baseURL = getBaseURL()
  const r = await fetch(`${baseURL}/api/maps/${mapId}/editor-scene`)
  if (r.status === 404)
    return null
  await expectOk(r)
  return r.json()
}

export async function putEditorSceneForMap(
  mapId: number,
  scene: Scene,
): Promise<void> {
  const baseURL = getBaseURL()
  const r = await fetch(`${baseURL}/api/maps/${mapId}/editor-scene`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scene),
  })
  await expectOk(r)
}

export async function getBoundaryOrderForMap(
  mapId: number,
): Promise<Record<string, unknown> | null> {
  const baseURL = getBaseURL()
  const r = await fetch(`${baseURL}/api/maps/${mapId}/boundary-order`)
  if (r.status === 404)
    return null
  await expectOk(r)
  return r.json() as Promise<Record<string, unknown>>
}
