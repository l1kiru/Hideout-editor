import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import useEditorStore from '../../../stores/editorStore';
import { DEFAULT_MAP_LAYER_INDEX } from '../lib/editorConstants';
import {
    isImportedDecorationsLayer,
} from '../lib/editorLayers';

export function useEditorLayerActions(opts: {
    setStatus: Dispatch<SetStateAction<string>>;
}) {
    const { t } = useTranslation('editor');
    const { setStatus } = opts;
    const layers = useEditorStore((state) => state.layers);
    const setSelected = useEditorStore((state) => state.setSelected);
    const addUserLayer = useEditorStore((state) => state.addUserLayer);
    const removeLayerFromStore = useEditorStore((state) => state.removeLayer);
    const setLayerLocked = useEditorStore((state) => state.setLayerLocked);
    const setLayerVisible = useEditorStore((state) => state.setLayerVisible);

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
        addUserLayer();
    }, [addUserLayer]);

    const removeLayer = useCallback(
        (i: number) => {
            const layer = layers[i];
            if (i === DEFAULT_MAP_LAYER_INDEX) {
                setStatus(t('status.cannotDeleteDefaultLayer'));
                return;
            }
            if (isImportedDecorationsLayer(layer)) {
                setStatus(t('status.cannotDeleteImportedDecorationsLayer'));
                return;
            }
            if (layers.length <= 2) {
                setStatus(t('status.needAtLeastOneUserLayer'));
                return;
            }
            removeLayerFromStore(i);
        },
        [layers, removeLayerFromStore, setStatus, t],
    );

    const onLayerLockedToggle = useCallback(
        (layerIndex: number, locked: boolean) => {
            setLayerLocked(layerIndex, locked);
        },
        [setLayerLocked],
    );

    const onLayerVisibilityToggle = useCallback(
        (layerIndex: number, visible: boolean) => {
            setLayerVisible(layerIndex, visible);
        },
        [setLayerVisible],
    );

    return { addLayer, removeLayer, onLayerLockedToggle, onLayerVisibilityToggle };
}
