import { useMemo } from 'react';

import { mplViewPointToSvg } from '../../../../lib/coords';
import type { ViewBox } from '../../lib/editorViewport';

export function EditorSvgOverlays(props: {
    viewBox: ViewBox;
    lineWidthVU: number;
    backgroundSelectionSvgPoints?: string | null;
    marqueeView: [number, number, number, number] | null;
    eraserVariant: boolean;
    cursorView: [number, number] | null;
    eraserRadius: number;
}) {
    const {
        viewBox,
        lineWidthVU,
        backgroundSelectionSvgPoints,
        marqueeView,
        eraserVariant,
        cursorView,
        eraserRadius,
    } = props;

    const marqueePointsSvg = useMemo(() => {
        if (!marqueeView) return '';
        const [vx0, vy0, vx1, vy1] = marqueeView;
        const corners: [number, number][] = [
            [vx0, vy0],
            [vx1, vy0],
            [vx1, vy1],
            [vx0, vy1],
        ];
        return corners
            .map(([vx, vy]) => mplViewPointToSvg(vx, vy, viewBox))
            .map(([sx, sy]) => `${sx},${sy}`)
            .join(' ');
    }, [marqueeView, viewBox]);

    return (
        <>
            {backgroundSelectionSvgPoints ? (
                <polygon
                    points={backgroundSelectionSvgPoints}
                    fill="none"
                    stroke="var(--canvas-selection-stroke)"
                    strokeWidth={Math.max(lineWidthVU * 1.2, 1)}
                    strokeDasharray="4 3"
                    pointerEvents="none"
                />
            ) : null}
            {marqueeView ? (
                <polygon
                    points={marqueePointsSvg}
                    fill="rgba(59,130,246,0.12)"
                    stroke="var(--canvas-selection-stroke)"
                    strokeWidth={Math.max(lineWidthVU, 1)}
                    strokeDasharray="5 4"
                    pointerEvents="none"
                />
            ) : null}
            {eraserVariant && cursorView ? (
                <circle
                    cx={cursorView[0]}
                    cy={
                        viewBox.y +
                        viewBox.y +
                        viewBox.height -
                        cursorView[1]
                    }
                    r={eraserRadius}
                    fill="rgba(248,113,113,0.18)"
                    stroke="#f87171"
                    strokeWidth={Math.max(lineWidthVU, 1)}
                    strokeDasharray="5 4"
                    pointerEvents="none"
                />
            ) : null}
        </>
    );
}
