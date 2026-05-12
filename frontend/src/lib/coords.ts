// Matches rope_paint.view.CameraViewTransform (world-to-view rotation).
// View axis convention: matplotlib / Tk style; Y grows upward (small y = bottom of screen).

export interface ViewBandRect {
  x: number
  y: number
  width: number
  height: number
}

// Matplotlib-style vy -> coordinate in the SVG user system (Y down).
export function mplViewYToSvg(viewY: number, vb: ViewBandRect): number {
  const ymin = vb.y
  const ymax = vb.y + vb.height
  return ymin + ymax - viewY
}

export function svgUserYToMplView(svgUserY: number, vb: ViewBandRect): number {
  const ymin = vb.y
  const ymax = vb.y + vb.height
  return ymin + ymax - svgUserY
}

export function mplViewPointToSvg(
  vx: number,
  vy: number,
  vb: ViewBandRect,
): [number, number] {
  return [vx, mplViewYToSvg(vy, vb)]
}

// Click coordinates in the SVG viewBox system: X unchanged, Y flipped to the matplotlib convention.
export function svgClientToMplView(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  vb: ViewBandRect,
): { x: number; y: number } {
  const raw = svgClientToView(svg, clientX, clientY)
  return { x: raw.x, y: svgUserYToMplView(raw.y, vb) }
}

export function worldToView(wx: number, wy: number, cameraDeg: number): [number, number] {
  const t = (cameraDeg * Math.PI) / 180
  const c = Math.cos(t)
  const s = Math.sin(t)
  return [wx * c - wy * s, wx * s + wy * c]
}

export function viewToWorld(vx: number, vy: number, cameraDeg: number): [number, number] {
  const t = (cameraDeg * Math.PI) / 180
  const c = Math.cos(t)
  const s = Math.sin(t)
  return [vx * c + vy * s, -vx * s + vy * c]
}

// View-space direction (segment delta, Y up) -> angle of the same vector in
// world space (radians). Used to compute a doodad's r in game axes when the
// camera is non-zero.
export function viewDirectionToWorldAngleRad(dx: number, dy: number, cameraDeg: number): number {
  const L = Math.hypot(dx, dy)
  if (L < 1e-12)
    return 0
  const t = (cameraDeg * Math.PI) / 180
  const c = Math.cos(t)
  const s = Math.sin(t)
  const nx = dx / L
  const ny = dy / L
  const dwx = nx * c + ny * s
  const dwy = -nx * s + ny * c
  return Math.atan2(dwy, dwx)
}

// .hideout r field (fraction of full turn) -> rotate() attribute in degrees
// for SVG (Y down). Accounts for the camera and the "Y up" (view) vs SVG
// mismatch; without this the sprite would not align visually with the line
// direction in view space.
export function hideoutRToSvgRotateDeg(r: number, cameraDeg: number, rotFull: number = 65536): number {
  const tWorld = (r / rotFull) * (Math.PI * 2)
  const dwx = Math.cos(tWorld)
  const dwy = Math.sin(tWorld)
  const t = (cameraDeg * Math.PI) / 180
  const c = Math.cos(t)
  const s = Math.sin(t)
  const dvx = dwx * c - dwy * s
  const dvy = dwx * s + dwy * c
  const viewAng = Math.atan2(dvy, dvx)
  return (-viewAng * 180) / Math.PI
}

export function boundsOfViewPoints(pts: [number, number][], pad = 48) {
  if (pts.length === 0)
    return { minX: 0, minY: 0, width: 400, height: 400 }
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const minX = Math.min(...xs) - pad
  const maxX = Math.max(...xs) + pad
  const minY = Math.min(...ys) - pad
  const maxY = Math.max(...ys) + pad
  return { minX, minY, width: maxX - minX, height: maxY - minY }
}

export function svgClientToView(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm)
    return { x: 0, y: 0 }
  const p = pt.matrixTransform(ctm.inverse())
  return { x: p.x, y: p.y }
}
