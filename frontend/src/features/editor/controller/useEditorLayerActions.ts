import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import type { PaintLayer } from '../../../types/scene';
import { DEFAULT_MAP_LAYER_INDEX } from '../lib/editorConstants';
import type { LayerId } from '../lib/editorIds';
import { layerId } from '../lib/editorIds';
import type { SelectionState } from '../model/editorSessionTypes';

export function useEditorLayerActions(opts: {
    layers: PaintLayer[];
    setLayers: Dispatch<SetStateAction<PaintLayer[]>>;
    setLayerIdx: Dispatch<SetStateAction<LayerId>>;
    setSelected: Dispatch<SetStateAction<SelectionState>>;
    setStatus: Dispatch<SetStateAction<string>>;
}) {
    const { t } = useTranslation('editor');
    const {
        layers,
        setLayers,
        setLayerIdx,
        setSelected,
        setStatus,
    } = opts;

    useEffect(() => {
        setSelected((prev) => {
            const next = prev.filter((r) => {
                const ly = layers[r.layerIdx];
                if (!ly) return false;
                return !ly.locked;
            });
            return next.length === prev.length ? prev : next;
        });
    }, [layers, setSelected]);

    const addLayer = useCallback(() => {
        const nl = layers.length + 1;
        setLayers([
            ...layers,
            {
                title: `Layer ${nl}`,
                visible: true,
                locked: false,
                batches: [],
            },
        ]);
        setLayerIdx(layerId(nl - 1));
    }, [layers, setLayers, setLayerIdx]);

    const removeLayer = useCallback(
        (i: number) => {
            if (i === DEFAULT_MAP_LAYER_INDEX) {
                setStatus(t('status.cannotDeleteDefaultLayer'));
                return;
            }
            if (layers.length <= 2) {
                setStatus(t('status.needAtLeastOneUserLayer'));
                return;
            }
            setLayers((ls) => ls.filter((_, j) => j !== i));
            setLayerIdx((prev) =>
                layerId(Math.max(0, Math.min(Number(prev), layers.length - 2))),
            );
            setSelected([]);
        },
        [layers.length, setLayers, setLayerIdx, setSelected, setStatus, t],
    );

    return { addLayer, removeLayer };
}
