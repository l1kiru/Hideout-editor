import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { partitionSelectionForCountChange } from '../../lib/editorPlacementEligibility';
import useEditorStore from '../../../../stores/editorStore';

import type { PlacementActionsCtx } from './types';

export function useDeleteSelected(ctx: PlacementActionsCtx) {
    const { t } = useTranslation('editor');
    const {
        selected,
        layers,
        setSelected,
        setStatus,
    } = ctx;
    const deleteSelectedInStore = useEditorStore((state) => state.deleteSelected);

    return useCallback(() => {
        if (selected.length === 0) return;
        const {
            lockedRefs,
            defaultLayerRefs,
            eligibleRefs,
            skippedRefs,
        } = partitionSelectionForCountChange(
            layers,
            selected,
        );
        if (lockedRefs.length > 0) {
            setStatus(t('status.lockedLayerExists'));
            return;
        }
        setSelected([]);
        if (eligibleRefs.length === 0) {
            setStatus(
                defaultLayerRefs.length > 0
                    ? t('status.cannotDeleteDefaultObjects')
                    : t('status.deleteNoEligible'),
            );
            return;
        }
        const nSel = eligibleRefs.length;
        deleteSelectedInStore({
            refs: eligibleRefs,
            label: t('selection.deleteTitle'),
        });
        const skippedCount = skippedRefs.length + defaultLayerRefs.length;
        setStatus(
            skippedCount > 0
                ? t('status.deletedPartial', {
                      count: nSel,
                      skipped: skippedCount,
                  })
                : nSel > 1
                  ? t('status.deletedMany', { count: nSel })
                  : t('status.deletedOne'),
        );
    }, [
        selected,
        layers,
        setSelected,
        setStatus,
        deleteSelectedInStore,
        t,
    ]);
}
