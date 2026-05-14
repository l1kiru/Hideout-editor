import type { ReactNode } from 'react';
import { useMemo } from 'react';

import {
    assetKeyForTemplate,
    templatePlacementFootprintView,
} from '../../../../lib/sceneDecorations';
import type { PaintLayer } from '../../../../types/scene';
import type { LayerId } from '../../lib/editorIds';
import type { ViewBox } from '../../lib/editorViewport';
import type { SelectionState } from '../../model/editorSessionTypes';
import { PlacementGlyph } from './PlacementGlyph';

export function EditorSvgDecorLayer(props: {
    zonePolygonPoints: string;
    boundaryViewLen: number;
    backgroundSvg: ReactNode;
    showTemplateDots: boolean;
    dotsViewSvg: [number, number][];
    templateDotRadius: number;
    layers: PaintLayer[];
    layerIdx: LayerId;
    cameraDeg: number;
    selected: SelectionState;
    viewBox: ViewBox;
    lineWidthVU: number;
    // Placements with these keys are skipped; the drag-overlay renders them instead.
    hiddenKeys?: ReadonlySet<string> | null;
}) {
    const {
        zonePolygonPoints,
        boundaryViewLen,
        backgroundSvg,
        showTemplateDots,
        dotsViewSvg,
        templateDotRadius,
        layers,
        layerIdx,
        cameraDeg,
        selected,
        viewBox,
        lineWidthVU,
        hiddenKeys,
    } = props;

    const selectedKeys = useMemo(() => {
        const set = new Set<string>();
        for (const s of selected)
            set.add(`${s.layerIdx}:${s.batchIdx}:${s.placementIdx}`);
        return set;
    }, [selected]);

    return (
        <>
            {backgroundSvg}
            {boundaryViewLen >= 3 && (
                <polygon
                    points={zonePolygonPoints}
                    fill="var(--poly-zone-fill)"
                    stroke="var(--color-accent-green)"
                    strokeWidth={lineWidthVU}
                    pointerEvents="visibleStroke"
                />
            )}
            {showTemplateDots &&
                dotsViewSvg.map(([x, y], i) => (
                    <circle
                        key={`d-${i}`}
                        cx={x}
                        cy={y}
                        r={templateDotRadius}
                        fill="#8899aa"
                        opacity={0.35}
                    />
                ))}
            {layers.map((ly, li) =>
                ly.visible
                    ? ly.batches.map((b, bi) => {
                          const ak = assetKeyForTemplate(
                              b.template_hash,
                              b.facet_fv,
                          );
                          const fp = templatePlacementFootprintView(
                              b.template_hash,
                              b.facet_fv,
                          );
                          const layerOpacity = li === layerIdx ? 1 : 0.65;
                          return b.placements.map((p, pi) => {
                              const key = `${li}:${bi}:${pi}`;
                              const isSelected = selectedKeys.has(key);
                              const hidden = hiddenKeys?.has(key) ?? false;
                              return (
                                  <PlacementGlyph
                                      key={`${li}-${bi}-${pi}`}
                                      wx={p.x}
                                      wy={p.y}
                                      r={p.r}
                                      template_hash={b.template_hash}
                                      facet_fv={b.facet_fv ?? null}
                                      lineStroke={
                                          b.line_stroke === true
                                          && ak === 'maraketh_rubble1'
                                      }
                                      assetKey={ak}
                                      footprintWidthView={fp.widthView}
                                      footprintHeightView={fp.heightView}
                                      cameraDeg={cameraDeg}
                                      viewBox={viewBox}
                                      layerOpacity={layerOpacity}
                                      isSelected={isSelected}
                                      lineWidthVU={lineWidthVU}
                                      hidden={hidden}
                                  />
                              );
                          });
                      })
                    : null,
            )}
        </>
    );
}
