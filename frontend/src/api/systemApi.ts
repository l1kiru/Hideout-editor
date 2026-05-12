import type { Scene } from '../types/scene'
import { expectOk, getBaseURL } from './base'

export async function health(): Promise<boolean> {
  try {
    const baseURL = getBaseURL()
    const r = await fetch(`${baseURL}/api/health`)
    return r.ok
  } catch {
    return false
  }
}

export async function exportHideout(scene: Scene): Promise<Blob> {
  const baseURL = getBaseURL()
  const r = await fetch(`${baseURL}/api/export/hideout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scene),
  })
  await expectOk(r)
  return r.blob()
}
