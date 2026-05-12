import { useCallback, useEffect, useRef, useState } from 'react';

import type { EditorSvgSceneProps } from '../components/EditorSvgScene';
import type {
    DragOverlayData,
    DragOverlayHandle,
} from '../components/scene/DragOverlayLayer';
import type {
    SelectDragSession,
    SelectRotateSession,
} from '../model/editorSessionTypes';
import type { PlacementObjectId, WorldCellKey } from '../lib/editorIds';

import type { BackgroundRotateSession, UseEditorCanvasGesturesArgs } from './types';
import { usePlacementAndBgPointerGestures } from './usePlacementAndBgPointerGestures';
import { useSelectToolMouseGestures } from './useSelectToolMouseGestures';

export type { UseEditorCanvasGesturesArgs } from './types';

export function useEditorCanvasGestures(args: UseEditorCanvasGesturesArgs) {
    const { svgRef } = args;

    const [selectDrag, setSelectDrag] = useState<SelectDragSession | null>(
        null,
    );
    const [selectRmbRotate, setSelectRmbRotate] = useState(false);
    const [marqueeView, setMarqueeView] = useState<
        EditorSvgSceneProps['marqueeView']
    >(null);

    const [dragOverlay, setDragOverlay] = useState<DragOverlayData | null>(
        null,
    );
    const dragOverlayHandleRef = useRef<DragOverlayHandle | null>(null);

    const selectDragRef = useRef<SelectDragSession | null>(null);
    const selectDragCleanupRef = useRef<(() => void) | null>(null);
    const selectRotateRef = useRef<SelectRotateSession | null>(null);
    const selectRotateSnapshotPushedRef = useRef(false);

    // RAF loop state for select-rotate (see usePlacementAndBgPointerGestures).
    const selectRotateLastDeltaRadRef = useRef(0);
    const selectRotateLastBoundaryValidRef = useRef(true);
    const selectRotateLastCollisionValidRef = useRef(true);
    const selectRotateLastStaticCollisionRef = useRef<{
        cell: WorldCellKey;
        object: PlacementObjectId;
    } | null>(null);
    const selectRotateRafScheduledRef = useRef(false);
    const selectRotateLastEvRef = useRef<PointerEvent | null>(null);

    const bgInteractCleanupRef = useRef<(() => void) | null>(null);
    const bgRotateRef = useRef<BackgroundRotateSession | null>(null);
    const bgRotateSnapshotPushedRef = useRef(false);

    const clearSelectRotate = useCallback((svgEl: SVGSVGElement | null) => {
        const sess = selectRotateRef.current;
        if (sess && svgEl) {
            try {
                svgEl.releasePointerCapture(sess.pointerId);
            } catch {
                // pointer already released
            }
        }
        const hadRotate = selectRotateRef.current !== null;
        selectRotateRef.current = null;
        setSelectRmbRotate(false);
        selectRotateSnapshotPushedRef.current = false;
        selectRotateLastDeltaRadRef.current = 0;
        selectRotateLastBoundaryValidRef.current = true;
        selectRotateLastCollisionValidRef.current = true;
        selectRotateLastStaticCollisionRef.current = null;
        selectRotateRafScheduledRef.current = false;
        selectRotateLastEvRef.current = null;
        // Hide the overlay if a rotate was active. Drag overlay is cleared by
        // its own cleanupDrag in useSelectToolMouseGestures.
        if (hadRotate) {
            setDragOverlay(null);
            dragOverlayHandleRef.current?.reset();
        }
    }, []);

    const clearBgRotate = useCallback((svgEl: SVGSVGElement | null) => {
        const sess = bgRotateRef.current;
        if (sess && svgEl) {
            try {
                svgEl.releasePointerCapture(sess.pointerId);
            } catch {
                // pointer already released
            }
        }
        bgRotateRef.current = null;
        bgRotateSnapshotPushedRef.current = false;
    }, []);

    const abortCanvasInteractions = useCallback(
        (svgEl: SVGSVGElement | null) => {
            bgInteractCleanupRef.current?.();
            bgInteractCleanupRef.current = null;
            selectDragCleanupRef.current?.();
            selectDragCleanupRef.current = null;
            selectDragRef.current = null;
            setSelectDrag(null);
            setMarqueeView(null);
            setDragOverlay(null);
            dragOverlayHandleRef.current?.reset();
            clearSelectRotate(svgEl);
            clearBgRotate(svgEl);
        },
        [clearBgRotate, clearSelectRotate],
    );

    useEffect(
        () => () => {
            bgInteractCleanupRef.current?.();
            selectDragCleanupRef.current?.();
            clearSelectRotate(svgRef.current);
            clearBgRotate(svgRef.current);
        },
        [clearBgRotate, clearSelectRotate, svgRef],
    );

    const placementGestures = usePlacementAndBgPointerGestures(args, {
        selectRotateRef,
        selectRotateSnapshotPushedRef,
        selectRotateLastDeltaRadRef,
        selectRotateLastBoundaryValidRef,
        selectRotateLastCollisionValidRef,
        selectRotateLastStaticCollisionRef,
        selectRotateRafScheduledRef,
        selectRotateLastEvRef,
        bgRotateRef,
        bgRotateSnapshotPushedRef,
        selectDragCleanupRef,
        bgInteractCleanupRef,
        selectDragRef,
        setSelectDrag,
        setSelectRmbRotate,
        clearSelectRotate,
        clearBgRotate,
        dragOverlayHandleRef,
        setDragOverlay,
    });

    const mouseGestures = useSelectToolMouseGestures(args, {
        selectDragRef,
        selectDragCleanupRef,
        bgInteractCleanupRef,
        clearSelectRotate,
        clearBgRotate,
        setMarqueeView,
        setSelectDrag,
        dragOverlayHandleRef,
        setDragOverlay,
    });

    return {
        selectDrag,
        selectRmbRotate,
        marqueeView,
        dragOverlay,
        dragOverlayHandleRef,
        abortCanvasInteractions,
        ...placementGestures,
        ...mouseGestures,
    };
}
