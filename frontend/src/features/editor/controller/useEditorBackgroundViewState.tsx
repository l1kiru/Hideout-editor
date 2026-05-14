import { useMemo, useRef, useState } from 'react';

import { EditorBackgroundLayer } from '../components/EditorBackgroundLayer';
import { currentInputImageName } from '../lib/editorDefaults';
import type { Background } from '../../../types/scene';
import type { ViewBox } from '../lib/editorViewport';

type BgNaturalSize = {
    w: number;
    h: number;
} | null;

type UseEditorBackgroundViewStateArgs = {
    background: Background;
    viewBox: ViewBox;
    boundary: [number, number][];
    cameraDeg: number;
    inputImageNames: string[];
};

export function useEditorBackgroundViewState(
    args: UseEditorBackgroundViewStateArgs,
) {
    const { background, viewBox, boundary, cameraDeg, inputImageNames } = args;
    // Runtime-only derived image metadata.
    // Not part of Scene, not persisted, and intentionally kept outside Zustand.
    // Recomputed from the loaded background image.
    const [bgNaturalSize, setBgNaturalSize] = useState<BgNaturalSize>(null);
    const backgroundClipId = useRef(
        `editor-bg-clip-${Math.random().toString(36).slice(2, 11)}`,
    ).current;

    const bgLocked = Boolean(background.locked);
    const bgSelectValue = currentInputImageName(background.path ?? '');
    const bgOrphanSelect = Boolean(
        bgSelectValue && !inputImageNames.includes(bgSelectValue),
    );

    const backgroundSvg = useMemo(
        () => (
            <EditorBackgroundLayer
                background={background}
                bgNaturalSize={bgNaturalSize}
                viewBox={viewBox}
                boundary={boundary}
                cameraDeg={cameraDeg}
                backgroundClipId={backgroundClipId}
            />
        ),
        [
            background,
            bgNaturalSize,
            viewBox,
            boundary,
            cameraDeg,
            backgroundClipId,
        ],
    );

    return {
        bgNaturalSize,
        setBgNaturalSize,
        bgLocked,
        bgSelectValue,
        bgOrphanSelect,
        backgroundSvg,
    };
}
