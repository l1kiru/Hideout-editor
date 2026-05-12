import type {
    Dispatch,
    MutableRefObject,
    RefObject,
    SetStateAction,
} from 'react';
import { useCallback, useEffect } from 'react';

import { svgClientToMplView } from '../../../lib/coords';
import type { ViewBox } from '../lib/editorViewport';
import { zoomViewBoxAt } from '../lib/editorViewport';

export function useEditorViewportInteractions(opts: {
    svgWrapRef: RefObject<HTMLDivElement | null>;
    svgRef: RefObject<SVGSVGElement | null>;
    viewBoxRef: MutableRefObject<ViewBox>;
    setViewBox: Dispatch<SetStateAction<ViewBox>>;
    // Wheel handler invoked while Ctrl is held. Return true to mark the
    // event as handled and skip the default viewport zoom.
    onCtrlWheel?: (e: WheelEvent) => boolean;
}) {
    const { svgWrapRef, svgRef, viewBoxRef, setViewBox, onCtrlWheel } = opts;

    const handleEditorWheelNative = useCallback((e: WheelEvent) => {
        e.preventDefault();
        if (e.ctrlKey && onCtrlWheel && onCtrlWheel(e)) return;
        const svg = svgRef.current;
        if (!svg) return;
        const f = e.deltaY > 0 ? 1.08 : 0.93;
        const { x, y } = svgClientToMplView(
            svg,
            e.clientX,
            e.clientY,
            viewBoxRef.current,
        );
        setViewBox((vb) => zoomViewBoxAt(vb, x, y, f));
    }, [svgRef, viewBoxRef, setViewBox, onCtrlWheel]);

    useEffect(() => {
        const el = svgWrapRef.current;
        if (!el) return;
        el.addEventListener('wheel', handleEditorWheelNative, {
            passive: false,
        });
        return () => el.removeEventListener('wheel', handleEditorWheelNative);
    }, [svgWrapRef, handleEditorWheelNative]);
}
