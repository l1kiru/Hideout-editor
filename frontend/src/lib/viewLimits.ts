// zone_view_limits_with_pad port from rope_paint.view (numeric helpers only).

import { worldToView } from './coords'

// Default padding values from rope_paint.zone_view_limits_with_pad.
const PAD_MIN_XY: [number, number] = [35, 35]
const PAD_FRAC = 0.12

export function zoneViewLimitsWithPad(
  boundaryWorld: [number, number][],
  cameraDeg: number,
  padMin: [number, number] = PAD_MIN_XY,
  padFrac: number = PAD_FRAC,
): { xmin: number, xmax: number, ymin: number, ymax: number } | null {
  if (boundaryWorld.length < 3)
    return null
  const verts = boundaryWorld.map(([x, y]) => worldToView(x, y, cameraDeg))
  const xs = verts.map(([vx]) => vx)
  const ys = verts.map(([, vy]) => vy)
  const padX = Math.max(padMin[0], Math.abs(Math.max(...xs) - Math.min(...xs)) * padFrac)
  const padY = Math.max(padMin[1], Math.abs(Math.max(...ys) - Math.min(...ys)) * padFrac)
  return {
    xmin: Math.min(...xs) - padX,
    xmax: Math.max(...xs) + padX,
    ymin: Math.min(...ys) - padY,
    ymax: Math.max(...ys) + padY,
  }
}

export function limitsToViewBox(lims: { xmin: number, xmax: number, ymin: number, ymax: number }) {
  return {
    x: lims.xmin,
    y: lims.ymin,
    width: Math.max(lims.xmax - lims.xmin, 1e-6),
    height: Math.max(lims.ymax - lims.ymin, 1e-6),
  }
}

// Mirrors rope_paint.background_width_view_base_for_fit.
export function backgroundWidthViewBaseForFit(
  zoneW: number,
  zoneH: number,
  imgW: number,
  imgH: number,
): number {
  if (zoneW < 1e-6 || zoneH < 1e-6 || imgW < 1 || imgH < 1)
    return imgW
  const arImg = imgW / imgH
  const arZone = zoneW / zoneH
  if (arImg >= arZone)
    return zoneW
  return zoneW * (arZone / arImg)
}
