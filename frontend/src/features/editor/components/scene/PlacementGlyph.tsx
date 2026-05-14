import { memo } from 'react';

import { mplViewPointToSvg, worldToView } from '../../../../lib/coords';
import { DECORATIONS } from '../../../../lib/sceneDecorations';
import type { AssetKey } from '../../../../types/scene';
import { previewRenderRotateDegForDoodad } from '../../lib/editorPreview';
import type { ViewBox } from '../../lib/editorViewport';

export type PlacementGlyphProps = {
    // World coordinates.
    wx: number;
    wy: number;
    // .hideout r field (integer).
    r: number;
    template_hash: number;
    facet_fv?: number | null;
    lineStroke?: boolean;
    assetKey: AssetKey | null;
    footprintWidthView: number;
    footprintHeightView: number;
    cameraDeg: number;
    viewBox: ViewBox;
    // Opacity for an inactive (non-current) layer.
    layerOpacity: number;
    isSelected: boolean;
    lineWidthVU: number;
    // When true, the placement stays in the DOM but is hidden visually. Used
    // during drag while a copy is rendered in the drag-overlay.
    hidden?: boolean;
};

// Single placement. Wrapped in `memo` so React reconciliation can skip
// placements whose input props are unchanged during immutable scene updates;
// on large scenes this saves tens of ms per frame.
function PlacementGlyphInner(props: PlacementGlyphProps) {
    const {
        wx,
        wy,
        r,
        template_hash,
        facet_fv,
        lineStroke,
        assetKey,
        footprintWidthView,
        footprintHeightView,
        cameraDeg,
        viewBox,
        layerOpacity,
        isSelected,
        lineWidthVU,
        hidden,
    } = props;

    const [vx, vy] = worldToView(wx, wy, cameraDeg);
    const [sx, sy] = mplViewPointToSvg(vx, vy, viewBox);
    const asset = assetKey ? DECORATIONS[assetKey] : null;
    const hx = sx - footprintWidthView / 2;
    const hy = sy - footprintHeightView / 2;
    const rotDeg = previewRenderRotateDegForDoodad(
        r,
        cameraDeg,
        template_hash,
        facet_fv ?? null,
        lineStroke === true,
    );

    return (
        <g
            opacity={layerOpacity}
            transform={`rotate(${rotDeg} ${sx} ${sy})`}
            visibility={hidden ? 'hidden' : undefined}
        >
            {asset ? (
                <image
                    href={asset.src}
                    x={hx}
                    y={hy}
                    width={footprintWidthView}
                    height={footprintHeightView}
                    preserveAspectRatio="xMidYMid meet"
                    pointerEvents="none"
                />
            ) : (
                <circle
                    cx={sx}
                    cy={sy}
                    r={Math.max(
                        3,
                        Math.min(footprintWidthView, footprintHeightView)
                            * 0.42,
                    )}
                    fill="var(--color-muted, #8899aa)"
                    opacity={0.85}
                    pointerEvents="none"
                />
            )}
            {isSelected ? (
                <rect
                    x={hx}
                    y={hy}
                    width={footprintWidthView}
                    height={footprintHeightView}
                    fill="none"
                    stroke="var(--canvas-selection-stroke)"
                    strokeWidth={Math.max(lineWidthVU * 1.2, 1)}
                    strokeDasharray="4 3"
                    pointerEvents="none"
                />
            ) : null}
        </g>
    );
}

export const PlacementGlyph = memo(PlacementGlyphInner);
