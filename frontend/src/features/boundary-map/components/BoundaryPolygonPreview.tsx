import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import {
  BOUNDARY_MAP_DEFAULT_CAMERA_DEG,
  worldPointsToEditorSvgFrame,
} from '../lib/boundaryMapView';
import type { PlacementRow } from '../lib/boundaryMapPure';
import { polygonPointsAttr } from '../lib/boundaryMapPure';
import {
  clientToSvg,
  normalizeRect,
  pointInNormRect,
} from './boundary-preview/boundaryPreviewGeometry';

const MARQUEE_CLICK_PX = 5;

type MarqueeDrag = {
  pointerId: number;
  start: [number, number];
  cur: [number, number];
};

export type BoundaryPolygonPreviewProps = {
  ordered: [number, number][];
  // All placements from the loaded .hideout (background dots).
  allPlacements: PlacementRow[];
  selectedIdx: number | undefined;
  onSelectVertex: (index: number | undefined) => void;
  // Wheel over the preview while a vertex is selected: -1 cycles to the
  // previous index (with wrap-around), +1 to the next.
  onWheelCycleOrder?: (direction: -1 | 1) => void;
  // Closed polyline (>=3 vertices) self-intersects on its edges (checked in hideout coordinates).
  ringSelfIntersects?: boolean;
  // Same convention as the scene editor (degrees); defaults to the editor's initial cameraDeg.
  cameraDeg?: number;
};

export function BoundaryPolygonPreview({
  ordered,
  allPlacements,
  selectedIdx,
  onSelectVertex,
  onWheelCycleOrder,
  ringSelfIntersects = false,
  cameraDeg = BOUNDARY_MAP_DEFAULT_CAMERA_DEG,
}: BoundaryPolygonPreviewProps) {
  const { t } = useTranslation('boundary');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const marqueeRef = useRef<MarqueeDrag | null>(null);
  const [marquee, setMarquee] = useState<MarqueeDrag | null>(null);

  const setMarqueeDrag = useCallback((v: MarqueeDrag | null) => {
    marqueeRef.current = v;
    setMarquee(v);
  }, []);

  const worldPtsAll = useMemo(() => {
    const ghost = allPlacements.map((r) => [r.x, r.y] as [number, number]);
    return [...ordered, ...ghost];
  }, [ordered, allPlacements]);

  const { viewBand, viewBoxStr, toSvg } = useMemo(
    () => worldPointsToEditorSvgFrame(worldPtsAll, cameraDeg),
    [worldPtsAll, cameraDeg],
  );

  const svgOrdered = useMemo(
    () => ordered.map((w) => toSvg(w)),
    [ordered, toSvg],
  );

  const svgPlacements = useMemo(
    () => allPlacements.map((r) => toSvg([r.x, r.y])),
    [allPlacements, toSvg],
  );

  const svgOrderedRef = useRef(svgOrdered);
  svgOrderedRef.current = svgOrdered;

  const resolveMarqueeSelection = useCallback(() => {
    const m = marqueeRef.current;
    if (!m)
      return;
    const pts = svgOrderedRef.current;
    const box = normalizeRect(m.start[0], m.start[1], m.cur[0], m.cur[1]);
    if (box.w < MARQUEE_CLICK_PX && box.h < MARQUEE_CLICK_PX) {
      onSelectVertex(undefined);
      return;
    }
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    let best: { i: number; d2: number } | null = null;
    for (let i = 0; i < pts.length; i++) {
      const [vx, vy] = pts[i]!;
      if (!pointInNormRect(vx, vy, box))
        continue;
      const dx = vx - cx;
      const dy = vy - cy;
      const d2 = dx * dx + dy * dy;
      if (!best || d2 < best.d2)
        best = { i, d2 };
    }
    if (best)
      onSelectVertex(best.i);
  }, [onSelectVertex]);

  const bw = viewBand.width;
  const bh = viewBand.height;
  const ghostR = Math.max(bw * 0.0045, 2.5);
  const vertexR = Math.max(bw * 0.012, 6);
  const hitR = vertexR * 2.1;
  const lblDx = bw * 0.022;
  const lblDy = bh * 0.018;

  const releaseCaptureSafe = useCallback((pointerId: number) => {
    const svg = svgRef.current;
    if (svg?.hasPointerCapture(pointerId))
      svg.releasePointerCapture(pointerId);
  }, []);

  const onBgPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0)
      return;
    const svg = svgRef.current;
    if (!svg)
      return;
    const p = clientToSvg(svg, e.clientX, e.clientY);
    if (!p)
      return;
    setMarqueeDrag({
      pointerId: e.pointerId,
      start: p,
      cur: p,
    });
    svg.setPointerCapture(e.pointerId);
  };

  const onSvgPointerMove = (e: React.PointerEvent) => {
    const m = marqueeRef.current;
    if (!m || e.pointerId !== m.pointerId)
      return;
    const svg = svgRef.current;
    if (!svg)
      return;
    const p = clientToSvg(svg, e.clientX, e.clientY);
    if (!p)
      return;
    const next = { ...m, cur: p };
    marqueeRef.current = next;
    setMarquee(next);
  };

  const onSvgPointerUpOrCancel = (e: React.PointerEvent) => {
    const m = marqueeRef.current;
    if (!m || e.pointerId !== m.pointerId)
      return;
    releaseCaptureSafe(e.pointerId);
    resolveMarqueeSelection();
    setMarqueeDrag(null);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (selectedIdx === undefined || !onWheelCycleOrder)
      return;
    if (e.deltaY === 0)
      return;
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;
    onWheelCycleOrder(dir as -1 | 1);
  };

  const marqueeBox = marquee
    ? normalizeRect(marquee.start[0], marquee.start[1], marquee.cur[0], marquee.cur[1])
    : null;

  return (
    <>
      <div className="svgWrap editorSurface boundaryMapPreviewWrap">
        <svg
          ref={svgRef}
          className="editorSvg"
          viewBox={viewBoxStr}
          role="img"
          aria-label={t('preview.aria')}
          style={{ touchAction: 'none' }}
          onPointerMove={onSvgPointerMove}
          onPointerUp={onSvgPointerUpOrCancel}
          onPointerCancel={onSvgPointerUpOrCancel}
          onWheel={onWheel}
        >
          <rect
            x={viewBand.x}
            y={viewBand.y}
            width={viewBand.width}
            height={viewBand.height}
            fill="var(--color-bg-root)"
            onPointerDown={onBgPointerDown}
          />
          {svgPlacements.map(([gx, gy], gi) => {
            const r = allPlacements[gi]!;
            return (
              <circle
                key={`ghost-${r.seq}-${r.name}-${r.hash}-${r.x}-${r.y}`}
                className="boundaryMapGhostDot"
                cx={gx}
                cy={gy}
                r={ghostR}
              />
            );
          })}
          {svgOrdered.length >= 3 && (
            <polygon
              points={polygonPointsAttr(svgOrdered)}
              fill={
                ringSelfIntersects
                  ? 'rgba(254 202 202 / 0.12)'
                  : 'var(--poly-zone-fill)'
              }
              stroke={
                ringSelfIntersects
                  ? 'var(--color-danger-text)'
                  : 'var(--color-accent-green)'
              }
              strokeWidth={Math.max(bw * 0.0025, 2)}
              strokeDasharray={ringSelfIntersects ? '8 6' : undefined}
              pointerEvents="none"
            />
          )}
          {svgOrdered.length === 2 && (
            <line
              x1={svgOrdered[0][0]}
              y1={svgOrdered[0][1]}
              x2={svgOrdered[1][0]}
              y2={svgOrdered[1][1]}
              stroke={
                ringSelfIntersects
                  ? 'var(--color-danger-text)'
                  : 'var(--color-accent-green)'
              }
              strokeWidth={Math.max(bw * 0.002, 2)}
              pointerEvents="none"
            />
          )}
          {svgOrdered.map(([x, y], i) => (
            <g
              key={`pt-${ordered[i]![0]}-${ordered[i]![1]}-${i}`}
              style={{ cursor: 'pointer' }}
              onPointerDown={(ev) => {
                ev.stopPropagation();
                if (ev.button !== 0)
                  return;
                onSelectVertex(i);
              }}
            >
              <circle
                cx={x}
                cy={y}
                r={hitR}
                fill="transparent"
              />
              <circle
                cx={x}
                cy={y}
                r={vertexR}
                fill={
                  selectedIdx === i
                    ? 'var(--poly-vertex-selected)'
                    : 'var(--color-accent-green)'
                }
                stroke={
                  selectedIdx === i
                    ? 'var(--map-vertex-selected-stroke)'
                    : 'rgb(255 255 255 / 0.55)'
                }
                strokeWidth={1}
                pointerEvents="none"
              />
              <text
                x={x + lblDx}
                y={y - lblDy}
                fill="#fef3c7"
                fontSize={Math.max(bw * 0.02, 10)}
                pointerEvents="none"
              >
                {i}
              </text>
            </g>
          ))}
          {marqueeBox && marqueeBox.w > 0 && marqueeBox.h > 0 ? (
            <rect
              className="boundaryMapMarqueeRect"
              x={marqueeBox.x}
              y={marqueeBox.y}
              width={marqueeBox.w}
              height={marqueeBox.h}
              pointerEvents="none"
            />
          ) : null}
        </svg>
      </div>
      <p className="hint">
        {t('preview.hint')}
      </p>
    </>
  );
}
