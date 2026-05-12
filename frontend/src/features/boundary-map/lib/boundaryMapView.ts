import type { ViewBandRect } from '../../../lib/coords';
import { boundsOfViewPoints, mplViewPointToSvg, worldToView } from '../../../lib/coords';

// Matches the initial cameraDeg used by the scene editor.
export const BOUNDARY_MAP_DEFAULT_CAMERA_DEG = 45;

// Same transforms as the editor boundary: world -> view (Y up) -> SVG (Y down inside viewBox).
export function worldPointsToEditorSvgFrame(
  worldPts: [number, number][],
  cameraDeg: number = BOUNDARY_MAP_DEFAULT_CAMERA_DEG,
  pad = 48,
): {
  viewBand: ViewBandRect;
  viewBoxStr: string;
  toSvg: (w: [number, number]) => [number, number];
} {
  if (worldPts.length === 0) {
    const viewBand: ViewBandRect = { x: 0, y: 0, width: 400, height: 400 };
    const toSvg = (w: [number, number]) => {
      const [vx, vy] = worldToView(w[0], w[1], cameraDeg);
      return mplViewPointToSvg(vx, vy, viewBand) as [number, number];
    };
    return { viewBand, viewBoxStr: '0 0 400 400', toSvg };
  }

  const viewPts = worldPts.map(
    ([wx, wy]) => worldToView(wx, wy, cameraDeg) as [number, number],
  );
  const b = boundsOfViewPoints(viewPts, pad);
  const viewBand: ViewBandRect = {
    x: b.minX,
    y: b.minY,
    width: b.width,
    height: b.height,
  };
  const toSvg = (w: [number, number]) => {
    const [vx, vy] = worldToView(w[0], w[1], cameraDeg);
    return mplViewPointToSvg(vx, vy, viewBand) as [number, number];
  };
  const viewBoxStr = `${viewBand.x} ${viewBand.y} ${viewBand.width} ${viewBand.height}`;
  return { viewBand, viewBoxStr, toSvg };
}
