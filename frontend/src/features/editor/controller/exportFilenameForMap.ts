export function exportFilenameForMap(displayName: string | null | undefined): string {
  const raw = String(displayName ?? '').trim()
  if (!raw)
    return 'export.hideout'
  let safe = raw
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(safe))
    safe = `_${safe}`
  if (!safe)
    return 'export.hideout'
  if (safe.length > 80)
    safe = safe.slice(0, 80).trimEnd()
  return `${safe}.hideout`
}
