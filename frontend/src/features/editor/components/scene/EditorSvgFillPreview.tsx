import { useMemo } from 'react';

import { mplViewPointToSvg, worldToView } from '../../../../lib/coords';
import { DECORATIONS } from '../../../../lib/sceneDecorations';
import type { AssetKey, XYZRPlacement } from '../../../../types/scene';
import type { ViewBox } from '../../lib/editorViewport';

export function EditorSvgFillPreview(props: {
    placements: XYZRPlacement[];
    activeAssetKey: AssetKey;
    cameraDeg: number;
    viewBox: ViewBox;
    lineWidthVU: number;
    spacingWorld: number;
}) {
    const {
        placements,
        activeAssetKey,
        cameraDeg,
        viewBox,
        lineWidthVU,
        spacingWorld,
    } = props;
    const asset = DECORATIONS[activeAssetKey];
    const radius = Math.max(1.5, Math.min(asset.widthView, asset.heightView) * 0.28);
    const boundaryKeys = useMemo(() => {
        const step = Math.max(1, Math.round(spacingWorld || 1));
        const set = new Set<string>(placements.map((p) => `${p.x}:${p.y}`));
        const boundary = new Set<string>();
        for (const p of placements) {
            if (
                !set.has(`${p.x + step}:${p.y}`)
                || !set.has(`${p.x - step}:${p.y}`)
                || !set.has(`${p.x}:${p.y + step}`)
                || !set.has(`${p.x}:${p.y - step}`)
            ) {
                boundary.add(`${p.x}:${p.y}`);
            }
        }
        return boundary;
    }, [placements, spacingWorld]);

    return (
        <g pointerEvents="none">
            {placements.map((p, idx) => {
                const [vx, vy] = worldToView(p.x, p.y, cameraDeg);
                const [sx, sy] = mplViewPointToSvg(vx, vy, viewBox);
                return (
                    <circle
                        key={`fill-heat-${idx}`}
                        cx={sx}
                        cy={sy}
                        r={radius}
                        fill="rgba(56, 189, 248, 0.20)"
                        stroke="none"
                    />
                );
            })}
            {placements.map((p, idx) => {
                const k = `${p.x}:${p.y}`;
                if (!boundaryKeys.has(k)) return null;
                const [vx, vy] = worldToView(p.x, p.y, cameraDeg);
                const [sx, sy] = mplViewPointToSvg(vx, vy, viewBox);
                return (
                    <circle
                        key={`fill-contour-${idx}`}
                        cx={sx}
                        cy={sy}
                        r={radius + Math.max(lineWidthVU * 0.4, 0.5)}
                        fill="none"
                        stroke="rgba(14, 165, 233, 0.88)"
                        strokeWidth={Math.max(lineWidthVU, 1)}
                    />
                );
            })}
        </g>
    );
}
