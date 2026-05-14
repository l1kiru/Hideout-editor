import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import useEditorStore from '../../../../stores/editorStore';
import { eraseLayerBatchesAtView } from '../../lib/editorErase';

import type { PlacementActionsCtx } from './types';

export function useEraseAt(ctx: PlacementActionsCtx) {
    const { t } = useTranslation('editor');
    const {
        layers,
        layerIdx,
        tool,
        cameraDeg,
        eraserRadius,
        setStatus,
    } = ctx;
    const replaceLayerBatches = useEditorStore((state) => state.replaceLayerBatches);

    return useCallback(
        (vx: number, vy: number) => {
            const ly = layers[layerIdx];
            if (!ly || ly.locked) return;
            const result = eraseLayerBatchesAtView({
                batches: ly.batches,
                tool,
                cameraDeg,
                eraserRadius,
                vx,
                vy,
            });
            if (result.needsTargetSelection) {
                setStatus(t('status.eraserNeedTarget'));
                return;
            }
            if (result.removed === 0) {
                setStatus(t('status.eraserNoHit'));
                return;
            }
            replaceLayerBatches({
                layerIdx,
                batches: result.nextBatches,
                label: t('status.eraserLabel'),
                nextSelected: [],
            });
            setStatus(t('status.erasedCount', { count: result.removed }));
        },
        [
            layers,
            layerIdx,
            tool,
            cameraDeg,
            eraserRadius,
            setStatus,
            replaceLayerBatches,
            t,
        ],
    );
}
