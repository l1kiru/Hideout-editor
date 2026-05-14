import { useEffect, useRef } from 'react';

import type { Background, PaintLayer } from '../../../types/scene';
import type { ViewBox } from '../lib/editorViewport';

type BgNaturalSize = { w: number; h: number } | null;

export function useEditorStoreRefs(args: {
    viewBox: ViewBox;
    cameraDeg: number;
    boundary: [number, number][];
    toolMargin: number;
    layers: PaintLayer[];
    background: Background;
    bgNaturalSize: BgNaturalSize;
    bgSelected: boolean;
    cursorView: [number, number] | null;
}) {
    const {
        viewBox,
        cameraDeg,
        boundary,
        toolMargin,
        layers,
        background,
        bgNaturalSize,
        bgSelected,
        cursorView,
    } = args;

    const viewBoxRef = useRef<ViewBox>(viewBox);
    const cameraDegRef = useRef(cameraDeg);
    const boundaryRef = useRef(boundary);
    const toolMarginRef = useRef(toolMargin);
    const layersRef = useRef<PaintLayer[]>(layers);
    const backgroundRef = useRef<Background>(background);
    const bgNaturalSizeRef = useRef<BgNaturalSize>(bgNaturalSize);
    const bgSelectedRef = useRef(bgSelected);
    const cursorViewRef = useRef<[number, number] | null>(cursorView);

    useEffect(() => {
        viewBoxRef.current = viewBox;
    }, [viewBox]);

    useEffect(() => {
        cameraDegRef.current = cameraDeg;
    }, [cameraDeg]);

    useEffect(() => {
        boundaryRef.current = boundary;
    }, [boundary]);

    useEffect(() => {
        toolMarginRef.current = toolMargin;
    }, [toolMargin]);

    useEffect(() => {
        layersRef.current = layers;
    }, [layers]);

    useEffect(() => {
        backgroundRef.current = background;
    }, [background]);

    useEffect(() => {
        bgNaturalSizeRef.current = bgNaturalSize;
    }, [bgNaturalSize]);

    useEffect(() => {
        bgSelectedRef.current = bgSelected;
    }, [bgSelected]);

    useEffect(() => {
        cursorViewRef.current = cursorView;
    }, [cursorView]);

    return {
        viewBoxRef,
        cameraDegRef,
        boundaryRef,
        toolMarginRef,
        layersRef,
        backgroundRef,
        bgNaturalSizeRef,
        bgSelectedRef,
        cursorViewRef,
    };
}
