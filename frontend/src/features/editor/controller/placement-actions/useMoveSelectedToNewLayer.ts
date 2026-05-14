import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { partitionSelectionForCountChange } from '../../lib/editorPlacementEligibility';
import { moveSelectionToNewLayer } from '../../lib/moveSelectionToNewLayer';
import useEditorStore from '../../../../stores/editorStore';

import type { PlacementActionsCtx } from './types';

export function useMoveSelectedToNewLayer(ctx: PlacementActionsCtx) {
    const { t } = useTranslation('editor');
    const {
        layers,
        selected,
        setSelected,
        setStatus,
    } = ctx;
    const applyLayerStructureChange = useEditorStore(
        (state) => state.applyLayerStructureChange,
    );

    return useCallback(() => {
        const {
            lockedRefs,
            defaultLayerRefs,
            eligibleRefs,
        } = partitionSelectionForCountChange(layers, selected);
        if (lockedRefs.length > 0) {
            setStatus(t('status.lockedLayerExists'));
            return;
        }

        const result = moveSelectionToNewLayer(layers, eligibleRefs);
        if (result.ok) {
            applyLayerStructureChange({
                layers: result.nextLayers,
                layerIdx: result.targetLayerIdx,
                selected: result.nextSelected,
                label: t('status.moveToNewLayerLabel'),
            });
            const skippedCount = result.skippedCount + defaultLayerRefs.length;
            setStatus(
                skippedCount > 0
                    ? t('status.movedToNewLayerPartial', {
                          count: result.movedCount,
                          skipped: skippedCount,
                      })
                    : result.movedCount > 1
                      ? t('status.movedToNewLayerMany', {
                            count: result.movedCount,
                        })
                      : t('status.movedToNewLayerOne'),
            );
            return;
        }

        if (!('reason' in result)) {
            setSelected([]);
            setStatus(t('status.moveToNewLayerFailed'));
            return;
        }

        setSelected([]);
        switch (result.reason) {
            case 'empty_selection':
                return;
            case 'no_eligible_refs':
                setStatus(
                    defaultLayerRefs.length > 0
                        ? t('status.moveToNewLayerDefaultObjects')
                        : t('status.moveToNewLayerNoEligible'),
                );
                return;
            default:
                setStatus(t('status.moveToNewLayerFailed'));
                return;
        }
    }, [
        layers,
        selected,
        setSelected,
        setStatus,
        applyLayerStructureChange,
        t,
    ]);
}
