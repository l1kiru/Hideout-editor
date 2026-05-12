import type { TemplateUploadResponse } from '../types/scene'
import { expectOk, getBaseURL } from './base'

export async function uploadTemplate(file: File): Promise<TemplateUploadResponse> {
  const fd = new FormData()
  fd.append('file', file)
  const baseURL = getBaseURL()
  const r = await fetch(`${baseURL}/api/templates/upload`, {
    method: 'POST',
    body: fd,
  })
  await expectOk(r)
  return r.json() as Promise<TemplateUploadResponse>
}

export async function loadMapTemplate(
  mapId: number,
): Promise<TemplateUploadResponse> {
  const baseURL = getBaseURL()
  const r = await fetch(`${baseURL}/api/maps/${mapId}/load-template`, {
    method: 'POST',
  })
  await expectOk(r)
  return r.json() as Promise<TemplateUploadResponse>
}

export async function getLayer0DoodadNamesForMap(
  mapId: number,
): Promise<string[]> {
  const baseURL = getBaseURL()
  const r = await fetch(`${baseURL}/api/maps/${mapId}/layer0-doodad-names`)
  await expectOk(r)
  return r.json() as Promise<string[]>
}
