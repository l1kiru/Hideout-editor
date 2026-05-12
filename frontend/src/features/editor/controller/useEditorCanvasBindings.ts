import { useMemo } from 'react';

import type { EditorSvgSceneProps } from '../components/EditorSvgScene';

type UseEditorCanvasBindingsArgs = {
    panDrag: { lastCx: number; lastCy: number } | null;
    spaceHeld: boolean;
    toolVariant: string;
    selectDrag: unknown;
    selectRmbRotate: boolean;
    marqueeView: EditorSvgSceneProps['marqueeView'];
    bgSelected: boolean;
};

export function useEditorCanvasClassName(args: UseEditorCanvasBindingsArgs) {
    const {
        panDrag,
        spaceHeld,
        toolVariant,
        selectDrag,
        selectRmbRotate,
        marqueeView,
        bgSelected,
    } = args;
    return useMemo(
        () =>
            `editorSvg ${panDrag || spaceHeld ? 'panMode' : ''} ${toolVariant === 'select' ? 'toolSelect' : ''} ${selectDrag ? 'selectDragging' : ''} ${selectRmbRotate ? 'selectRmbRotating' : ''} ${marqueeView ? 'selectMarquee' : ''} ${bgSelected ? 'bgSelected' : ''}`,
        [
            panDrag,
            spaceHeld,
            toolVariant,
            selectDrag,
            selectRmbRotate,
            marqueeView,
            bgSelected,
        ],
    );
}
