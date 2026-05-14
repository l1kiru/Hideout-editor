import { mplViewPointToSvg, worldToView } from '../../../../lib/coords';
import { DECORATIONS } from '../../../../lib/sceneDecorations';
import type { AssetKey } from '../../../../types/scene';
import { placementsForPolyline } from '../../lib/editorLineBrush';
import { previewRenderRotateDegForDoodad } from '../../lib/editorPreview';
import type { ViewBox } from '../../lib/editorViewport';

export function EditorSvgLineDraft(props: {
    lineDraft: { points: [number, number][] };
    activeAssetKey: AssetKey;
    toolSpacing: number;
    cameraDeg: number;
    boundary: [number, number][];
    toolMargin: number;
    viewBox: ViewBox;
    lineWidthVU: number;
}) {
    const {
        lineDraft,
        activeAssetKey,
        toolSpacing,
        cameraDeg,
        boundary,
        toolMargin,
        viewBox,
        lineWidthVU,
    } = props;

    const asset = DECORATIONS[activeAssetKey];
    const ptsSvg = lineDraft.points.map(([vx, vy]) =>
        mplViewPointToSvg(vx, vy, viewBox),
    );
    const strokePath =
        ptsSvg.length >= 2
            ? ptsSvg.map(([sx, sy]) => `${sx},${sy}`).join(' ')
            : '';
    const previewPlacements = placementsForPolyline(
        lineDraft.points,
        asset,
        toolSpacing,
        cameraDeg,
        activeAssetKey,
        boundary,
        toolMargin,
    );

    return (
        <g pointerEvents="none">
            {strokePath ? (
                <polyline
                    points={strokePath}
                    fill="none"
                    stroke="var(--canvas-line-preview-stroke)"
                    strokeWidth={Math.max(lineWidthVU, 1)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ) : null}
            {previewPlacements.map((p, idx) => {
                const [vx, vy] = worldToView(p.x, p.y, cameraDeg);
                const [sx, sy] = mplViewPointToSvg(vx, vy, viewBox);
                return (
                    <g
                        key={`preview-${idx}`}
                        opacity={0.45}
                        transform={`rotate(${previewRenderRotateDegForDoodad(p.r, cameraDeg, DECORATIONS[activeAssetKey].hash, DECORATIONS[activeAssetKey].fv, activeAssetKey === 'maraketh_rubble1')} ${sx} ${sy})`}
                    >
                        <image
                            href={asset.src}
                            x={sx - asset.widthView / 2}
                            y={sy - asset.heightView / 2}
                            width={asset.widthView}
                            height={asset.heightView}
                            preserveAspectRatio="xMidYMid meet"
                            pointerEvents="none"
                        />
                    </g>
                );
            })}
        </g>
    );
}
