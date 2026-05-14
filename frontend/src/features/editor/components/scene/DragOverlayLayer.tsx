import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
} from 'react';

import { mplViewPointToSvg } from '../../../../lib/coords';
import type { ViewBox } from '../../lib/editorViewport';

import { PlacementGlyph, type PlacementGlyphProps } from './PlacementGlyph';

export type DragOverlaySnapshot = Omit<
    PlacementGlyphProps,
    'hidden' | 'isSelected' | 'lineWidthVU' | 'cameraDeg' | 'viewBox'
>;

export type DragOverlayData = {
    // Placement snapshots in their original world coordinates (layer opacity preserved).
    snapshots: DragOverlaySnapshot[];
    // Placement keys "layerIdx:batchIdx:placementIdx" so the main scene
    // renderer (EditorSvgDecorLayer) can hide them during drag.
    hiddenKeys: ReadonlySet<string>;
};

export type DragOverlayHandle = {
    // Translate the whole group by (dwx, dwy) in world units. `valid` toggles
    // between normal and "cannot drop here" highlighting.
    setShift: (dwx: number, dwy: number, valid: boolean) => void;
    // Rotate the whole group around `centerView` (MPL view coordinates, Y up)
    // by `deltaRad` radians (view, CCW positive). Applied as a single
    // rotate() on the root <g>; both centers and per-sprite angles rotate by
    // the same amount, which is equivalent to a physical rigid rotation.
    setRotate: (
        centerView: readonly [number, number],
        deltaRad: number,
        valid: boolean,
    ) => void;
    // Reset shift/validity to zero, e.g. before closing the overlay.
    reset: () => void;
};

export type DragOverlayLayerProps = {
    data: DragOverlayData | null;
    cameraDeg: number;
    viewBox: ViewBox;
    lineWidthVU: number;
};

// Copy layer of the selected group used during drag. Placement geometry is
// fixed (original world coordinates) and group movement happens via the
// `transform` attribute on the root <g>, updated imperatively through a ref
// without React re-renders. This is what keeps a 1000-placement drag at 60 fps.
function DragOverlayLayerInner(
    props: DragOverlayLayerProps,
    ref: React.ForwardedRef<DragOverlayHandle>,
) {
    const { data, cameraDeg, viewBox, lineWidthVU } = props;
    const groupRef = useRef<SVGGElement | null>(null);

    // Affine difference (Y-flip between view and SVG) used to convert world deltas to SVG deltas.
    const camTrig = useMemo(() => {
        const t = (cameraDeg * Math.PI) / 180;
        return { cos: Math.cos(t), sin: Math.sin(t) };
    }, [cameraDeg]);

    useImperativeHandle(
        ref,
        () => ({
            setShift(dwx: number, dwy: number, valid: boolean) {
                const g = groupRef.current;
                if (!g) return;
                const dvx = dwx * camTrig.cos - dwy * camTrig.sin;
                const dvy = dwx * camTrig.sin + dwy * camTrig.cos;
                const [s0x, s0y] = mplViewPointToSvg(0, 0, viewBox);
                const [s1x, s1y] = mplViewPointToSvg(dvx, dvy, viewBox);
                const dsx = s1x - s0x;
                const dsy = s1y - s0y;
                g.setAttribute('transform', `translate(${dsx} ${dsy})`);
                if (valid) g.classList.remove('dragOverlayInvalid');
                else g.classList.add('dragOverlayInvalid');
            },
            setRotate(centerView, deltaRad, valid) {
                const g = groupRef.current;
                if (!g) return;
                const [cx, cy] = centerView;
                const [scx, scy] = mplViewPointToSvg(cx, cy, viewBox);
                // SVG Y points down, view Y points up; CCW in view = CW in SVG, hence the minus sign.
                const svgDeg = (-deltaRad * 180) / Math.PI;
                g.setAttribute(
                    'transform',
                    `rotate(${svgDeg} ${scx} ${scy})`,
                );
                if (valid) g.classList.remove('dragOverlayInvalid');
                else g.classList.add('dragOverlayInvalid');
            },
            reset() {
                const g = groupRef.current;
                if (!g) return;
                g.setAttribute('transform', 'translate(0 0)');
                g.classList.remove('dragOverlayInvalid');
            },
        }),
        [camTrig, viewBox],
    );

    // Reset transform whenever data changes; that signals a new drag gesture.
    useEffect(() => {
        const g = groupRef.current;
        if (!g) return;
        g.setAttribute('transform', 'translate(0 0)');
        g.classList.remove('dragOverlayInvalid');
    }, [data]);

    if (!data || data.snapshots.length === 0) return null;

    return (
        <g
            ref={groupRef}
            className="dragOverlayGroup"
            pointerEvents="none"
            transform="translate(0 0)"
        >
            {data.snapshots.map((s, i) => (
                <PlacementGlyph
                    key={i}
                    wx={s.wx}
                    wy={s.wy}
                    r={s.r}
                    template_hash={s.template_hash}
                    facet_fv={s.facet_fv ?? null}
                    lineStroke={s.lineStroke}
                    assetKey={s.assetKey}
                    footprintWidthView={s.footprintWidthView}
                    footprintHeightView={s.footprintHeightView}
                    cameraDeg={cameraDeg}
                    viewBox={viewBox}
                    layerOpacity={s.layerOpacity}
                    isSelected
                    lineWidthVU={lineWidthVU}
                />
            ))}
        </g>
    );
}

export const DragOverlayLayer = forwardRef<
    DragOverlayHandle,
    DragOverlayLayerProps
>(DragOverlayLayerInner);
