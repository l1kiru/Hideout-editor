import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { DEFAULT_MAP_LAYER_INDEX } from '../../lib/editorConstants';
import { layerId } from '../../lib/editorIds';
import { refKey } from '../../lib/placementSelection';

import type { PlacementActionsCtx } from './types';

export function useDeleteSelected(ctx: PlacementActionsCtx) {
    const { t } = useTranslation('editor');
    const {
        selected,
        layers,
        pushMultiUndoForRefs,
        setLayers,
        setSelected,
        setStatus,
    } = ctx;

    return useCallback(() => {
        if (selected.length === 0) return;
        const deletable = selected.filter(
            (r) => r.layerIdx !== layerId(DEFAULT_MAP_LAYER_INDEX),
        );
        if (deletable.length === 0) {
            setStatus(t('status.cannotDeleteDefaultObjects'));
            return;
        }
        if (deletable.some((r) => layers[r.layerIdx]?.locked)) {
            setStatus(t('status.lockedLayerExists'));
            return;
        }
        const nSel = deletable.length;
        pushMultiUndoForRefs(deletable, t('selection.deleteTitle'));
        const delSet = new Set(deletable.map(refKey));
        setLayers((ls) =>
            ls.map((l, li) => ({
                ...l,
                batches: l.batches
                    .map((b, bi) => ({
                        ...b,
                        placements: b.placements.filter(
                            (_, pi) =>
                                !delSet.has(
                                    refKey({
                                        layerIdx: layerId(li),
                                        batchIdx: bi,
                                        placementIdx: pi,
                                    }),
                                ),
                        ),
                    }))
                    .filter((b) => b.placements.length > 0),
            })),
        );
        setSelected((prev) =>
            prev.filter((r) => r.layerIdx === layerId(DEFAULT_MAP_LAYER_INDEX)),
        );
        setStatus(
            nSel > 1
                ? t('status.deletedMany', { count: nSel })
                : t('status.deletedOne'),
        );
    }, [
        selected,
        layers,
        pushMultiUndoForRefs,
        setLayers,
        setSelected,
        setStatus,
        t,
    ]);
}
