import { useEffect, useRef } from 'react';

type LineDraftRefState = { points: [number, number][] } | null;

type UseEditorLineBrushBridgeArgs = {
    placeStrokeAt: (pts: [number, number][]) => void;
};

export function useEditorLineBrushBridge(
    args: UseEditorLineBrushBridgeArgs,
) {
    const { placeStrokeAt } = args;
    const lineBrushActiveRef = useRef(false);
    const lineDraftRef = useRef<LineDraftRefState>(null);
    const placeStrokeRef = useRef<(pts: [number, number][]) => void>(() => {});

    useEffect(() => {
        placeStrokeRef.current = placeStrokeAt;
    }, [placeStrokeAt]);

    return {
        lineBrushActiveRef,
        lineDraftRef,
        placeStrokeRef,
    };
}
