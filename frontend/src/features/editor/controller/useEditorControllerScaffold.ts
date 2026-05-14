import { useRef } from 'react';

import { useEditorBackgroundViewState } from './useEditorBackgroundViewState';
import { useEditorControllerStore } from './useEditorControllerStore';
import { useEditorSelectionNormalization } from './useEditorSelectionNormalization';
import { useEditorStoreRefs } from './useEditorStoreRefs';
import { useEditorTelemetryEffects } from './useEditorTelemetryEffects';

export function useEditorControllerScaffold() {
    const store = useEditorControllerStore();
    const {
        documentState,
        interactionState,
        interactionActions,
        viewportState,
    } = store;
    const { background, boundary, cameraDeg, layers, tool } = documentState;
    const { bgSelected, cursorView, selected } = interactionState;
    const { setSelected } = interactionActions;
    const { viewBox } = viewportState;

    const backgroundViewState = useEditorBackgroundViewState({
        background,
        viewBox,
        boundary,
        cameraDeg,
        inputImageNames: store.appSession.inputImageNames,
    });

    const svgRef = useRef<SVGSVGElement | null>(null);
    const svgWrapRef = useRef<HTMLDivElement | null>(null);
    const spaceDownRef = useRef(false);

    const storeRefs = useEditorStoreRefs({
        viewBox,
        cameraDeg,
        boundary,
        toolMargin: tool.margin,
        layers,
        background,
        bgNaturalSize: backgroundViewState.bgNaturalSize,
        bgSelected,
        cursorView,
    });

    useEditorTelemetryEffects({ tool });
    useEditorSelectionNormalization({ selected, setSelected });

    return {
        ...store,
        ...backgroundViewState,
        svgRef,
        svgWrapRef,
        spaceDownRef,
        ...storeRefs,
    };
}
