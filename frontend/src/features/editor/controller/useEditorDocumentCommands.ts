import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
    limitsToViewBox,
    zoneViewLimitsWithPad,
} from '../../../lib/viewLimits';
import type { PaintLayer, TemplateUploadResponse } from '../../../types/scene';
import { DEFAULT_MAP_LAYER_INDEX } from '../lib/editorConstants';
import {
    cloneDefaultLayerBatches,
    ensureDefaultMapLayerFirst,
} from '../lib/editorDefaultMapLayer';
import {
    createDefaultPaintLayer,
    createImportedDecorationsLayer,
    createPalettePaintLayer,
    createUserPaintLayer,
} from '../lib/editorLayers';
import { normalizeSelectionLayer0 } from '../lib/placementSelection';
import type { PlacementRef, SelectionState } from '../model/editorSessionTypes';
import type { ViewBox } from '../lib/editorViewport';
import useEditorStore from '../../../stores/editorStore';

type UseEditorDocumentCommandsArgs = {
    svgRef: RefObject<SVGSVGElement | null>;
    abortCanvasInteractions: (svgEl: SVGSVGElement | null) => void;
    layers: PaintLayer[];
    boundary: [number, number][];
    cameraDeg: number;
    setSelected: Dispatch<SetStateAction<SelectionState>>;
    setBgSelected: Dispatch<SetStateAction<boolean>>;
    setStatus: Dispatch<SetStateAction<string>>;
    setViewBox: Dispatch<SetStateAction<ViewBox>>;
    resetEditorDocument: () => void;
};

export function buildDocumentLayersFromTemplate(
    tpl: TemplateUploadResponse,
): PaintLayer[] {
    const defaultLayerBatches = cloneDefaultLayerBatches(
        tpl.default_layer_batches,
    );
    const decorationLayerBatches = cloneDefaultLayerBatches(
        tpl.decorations_layer_batches,
    );
    const paletteDecorationLayerBatches = cloneDefaultLayerBatches(
        tpl.decorations_palette_layer_batches,
    );
    const hasDecorationLayer = decorationLayerBatches.length > 0;
    const hasPaletteDecorationLayer = paletteDecorationLayerBatches.length > 0;

    return [
        createDefaultPaintLayer(defaultLayerBatches),
        ...(hasDecorationLayer
            ? [createImportedDecorationsLayer(decorationLayerBatches)]
            : []),
        ...(hasPaletteDecorationLayer
            ? [createPalettePaintLayer(paletteDecorationLayerBatches)]
            : []),
        ...(!hasDecorationLayer && !hasPaletteDecorationLayer
            ? [createUserPaintLayer()]
            : []),
    ];
}

export function useEditorDocumentCommands(
    args: UseEditorDocumentCommandsArgs,
) {
    const { t } = useTranslation('editor');
    const {
        svgRef,
        abortCanvasInteractions,
        layers,
        boundary,
        cameraDeg,
        setSelected,
        setBgSelected,
        setStatus,
        setViewBox,
        resetEditorDocument,
    } = args;
    const replaceDocumentLayers = useEditorStore(
        (state) => state.replaceDocumentLayers,
    );

    const applyBundledDefaultLayerBatches = useCallback(
        (tpl: TemplateUploadResponse | null) => {
            if (!tpl) {
                replaceDocumentLayers({
                    layers: (() => {
                        const baseLayers = ensureDefaultMapLayerFirst(layers);
                        return baseLayers.map((layer, index) =>
                            index === DEFAULT_MAP_LAYER_INDEX
                                ? { ...layer, batches: [] }
                                : layer,
                        );
                    })(),
                });
                return;
            }

            replaceDocumentLayers({
                layers: buildDocumentLayersFromTemplate(tpl),
            });
        },
        [layers, replaceDocumentLayers],
    );

    const onSelectSidebarPlacement = useCallback(
        (ref: PlacementRef) => {
            const layer = layers[ref.layerIdx];
            if (layer?.locked) {
                setStatus(t('status.layerLockedSelect'));
                return;
            }

            setBgSelected(false);
            setSelected(normalizeSelectionLayer0([ref]));
        },
        [layers, setBgSelected, setSelected, setStatus, t],
    );

    const resetEditorForMapSwitch = useCallback(() => {
        abortCanvasInteractions(svgRef.current);
        resetEditorDocument();
    }, [abortCanvasInteractions, resetEditorDocument, svgRef]);

    const applyHomeView = useCallback(() => {
        const limits = zoneViewLimitsWithPad(boundary, cameraDeg);
        if (limits) {
            setViewBox(limitsToViewBox(limits));
        }
    }, [boundary, cameraDeg, setViewBox]);

    return {
        applyBundledDefaultLayerBatches,
        onSelectSidebarPlacement,
        resetEditorForMapSwitch,
        applyHomeView,
    };
}
