import type { ReactNode } from 'react';

import { mplViewPointToSvg } from '../../../lib/coords';
import {
    backgroundWidthViewBaseForFit,
    zoneViewLimitsWithPad,
} from '../../../lib/viewLimits';
import type { Background } from '../../../types/scene';
import type { ViewBox } from '../lib/editorViewport';

export type EditorBackgroundLayerProps = {
    background: Background;
    bgNaturalSize: { w: number; h: number } | null;
    viewBox: ViewBox;
    boundary: [number, number][];
    cameraDeg: number;
    backgroundClipId: string;
};

// SVG background layer of the editor (rendered below the zone and placements).
export function EditorBackgroundLayer(props: EditorBackgroundLayerProps): ReactNode {
    const {
        background,
        bgNaturalSize,
        viewBox,
        boundary,
        cameraDeg,
        backgroundClipId,
    } = props;

    const p = background.path?.trim();
    if (!p || !bgNaturalSize || bgNaturalSize.w < 1 || bgNaturalSize.h < 1)
        return null;

    const natW = bgNaturalSize.w;
    const natH = bgNaturalSize.h;
    let baseW = background.width_view_base;
    if (baseW == null || baseW <= 0) {
        const lims = zoneViewLimitsWithPad(boundary, cameraDeg);
        const zoneW = lims ? lims.xmax - lims.xmin : viewBox.width;
        const zoneH = lims ? lims.ymax - lims.ymin : viewBox.height;
        baseW = backgroundWidthViewBaseForFit(zoneW, zoneH, natW, natH);
    }
    const scaleBg = background.scale ?? 1;
    const w = baseW * scaleBg;
    const h = w * (natH / natW);
    const ox = background.offset_x ?? 0;
    const oy = background.offset_y ?? 0;
    const [sx, sy] = mplViewPointToSvg(ox, oy, viewBox);
    const rot = background.rotation_deg ?? 0;
    const op = background.opacity ?? 1;
    const cl = ((background.crop_left_pct ?? 0) / 100) * w;
    const ct = ((background.crop_top_pct ?? 0) / 100) * h;
    const cw = Math.max(
        0,
        (((background.crop_right_pct ?? 100) -
            (background.crop_left_pct ?? 0)) /
            100) *
            w,
    );
    const ch = Math.max(
        0,
        (((background.crop_bottom_pct ?? 100) -
            (background.crop_top_pct ?? 0)) /
            100) *
            h,
    );

    return (
        <g key="editor-bg" opacity={op} pointerEvents="none">
            <defs>
                <clipPath id={backgroundClipId}>
                    <rect x={cl} y={ct} width={cw} height={ch} />
                </clipPath>
            </defs>
            <g
                transform={`translate(${sx},${sy}) rotate(${-rot}) translate(${-w / 2},${-h / 2})`}
            >
                <image
                    href={p}
                    width={w}
                    height={h}
                    preserveAspectRatio="none"
                    clipPath={`url(#${backgroundClipId})`}
                />
            </g>
        </g>
    );
}
