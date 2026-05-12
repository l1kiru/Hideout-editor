import type {
    Dispatch,
    MutableRefObject,
    PointerEvent,
    RefObject,
    SetStateAction,
    MouseEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import type { Tool } from '../../../types/scene';

import { EditorSvgScene, type EditorSvgSceneProps } from './EditorSvgScene';

export type EditorCanvasProps = {
    svgWrapRef: RefObject<HTMLDivElement | null>;
    svgRef: RefObject<SVGSVGElement | null>;
    svgClassName: string;
    viewBoxStr: string;
    toolVariant: Tool['variant'];
    lineBrushActiveRef: MutableRefObject<boolean>;
    onPointerDownSvg: (e: PointerEvent<SVGSVGElement>) => void;
    onPointerMoveSvg: (e: PointerEvent<SVGSVGElement>) => void;
    finishSelectRotatePointer: (e: PointerEvent<SVGSVGElement>) => void;
    onMouseDownSvg: (e: MouseEvent) => void;
    onMouseMoveSvg: (e: MouseEvent) => void;
    setPanDrag: Dispatch<
        SetStateAction<{ lastCx: number; lastCy: number } | null>
    >;
    setCursorView: Dispatch<SetStateAction<[number, number] | null>>;
    setLineDraft: Dispatch<
        SetStateAction<{ points: [number, number][] } | null>
    >;
    sceneProps: EditorSvgSceneProps;
};

export function EditorCanvas(props: EditorCanvasProps) {
    const { t } = useTranslation('editor');
    const {
        svgWrapRef,
        svgRef,
        svgClassName,
        viewBoxStr,
        toolVariant,
        lineBrushActiveRef,
        onPointerDownSvg,
        onPointerMoveSvg,
        finishSelectRotatePointer,
        onMouseDownSvg,
        onMouseMoveSvg,
        setPanDrag,
        setCursorView,
        setLineDraft,
        sceneProps,
    } = props;

    return (
        <div className="canvasStack">
            <div
                ref={svgWrapRef}
                className="svgWrap editorSurface"
                tabIndex={0}
                role="application"
                aria-label={t('tools.groupAria')}
            >
                <svg
                    ref={svgRef}
                    className={svgClassName}
                    viewBox={viewBoxStr}
                    onContextMenu={(e) => {
                        if (toolVariant === 'select') e.preventDefault();
                    }}
                    onAuxClick={(e) => {
                        if (e.button === 1) e.preventDefault();
                    }}
                    onPointerDown={onPointerDownSvg}
                    onPointerMove={onPointerMoveSvg}
                    onPointerUp={finishSelectRotatePointer}
                    onPointerCancel={finishSelectRotatePointer}
                    onLostPointerCapture={finishSelectRotatePointer}
                    onMouseDown={onMouseDownSvg}
                    onMouseMove={onMouseMoveSvg}
                    onMouseUp={() => {
                        setPanDrag(null);
                    }}
                    onMouseLeave={() => {
                        setPanDrag(null);
                        setCursorView(null);
                        if (!lineBrushActiveRef.current) setLineDraft(null);
                    }}
                >
                    <EditorSvgScene {...sceneProps} />
                </svg>
            </div>
        </div>
    );
}
