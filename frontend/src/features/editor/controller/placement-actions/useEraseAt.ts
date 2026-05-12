import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { worldToView } from '../../../../lib/coords';
import {
    DECORATIONS,
    DRAWING_ASSET_KEYS,
    assetKeyForTemplate,
} from '../../../../lib/sceneDecorations';
import type { PaintedBatch } from '../../../../types/scene';
import { circleTouchesRect } from '../../lib/editorHitTest';
import { eraserAffectsAsset } from '../../lib/editorDefaults';

import type { PlacementActionsCtx } from './types';

export function useEraseAt(ctx: PlacementActionsCtx) {
    const { t } = useTranslation('editor');
    const {
        layers,
        layerIdx,
        tool,
        cameraDeg,
        eraserRadius,
        saveLayerSnapshot,
        discardLastUndo,
        setLayers,
        setSelected,
        setStatus,
    } = ctx;

    return useCallback(
        (vx: number, vy: number) => {
            const ly = layers[layerIdx];
            if (!ly || ly.locked) return;
            const et = tool.eraser_targets;
            if (
                et &&
                DRAWING_ASSET_KEYS.every((k) => et[k] === false)
            ) {
                setStatus(t('status.eraserNeedTarget'));
                return;
            }
            saveLayerSnapshot(t('status.eraserLabel'));
            let removed = 0;
            const nextBatches: PaintedBatch[] = [];
            for (const b of ly.batches) {
                const key = assetKeyForTemplate(b.template_hash, b.facet_fv);
                if (!key) {
                    nextBatches.push(b);
                    continue;
                }
                if (!eraserAffectsAsset(tool, key)) {
                    nextBatches.push(b);
                    continue;
                }
                const asset = DECORATIONS[key];
                const kept = b.placements.filter((p) => {
                    const [pvx, pvy] = worldToView(p.x, p.y, cameraDeg);
                    const touched = circleTouchesRect(
                        vx,
                        vy,
                        eraserRadius,
                        pvx,
                        pvy,
                        asset.widthView,
                        asset.heightView,
                    );
                    if (touched) removed += 1;
                    return !touched;
                });
                if (kept.length > 0) nextBatches.push({ ...b, placements: kept });
            }
            if (removed === 0) {
                discardLastUndo();
                setStatus(t('status.eraserNoHit'));
                return;
            }
            setLayers((ls) =>
                ls.map((l, i) =>
                    i === Number(layerIdx) ? { ...l, batches: nextBatches } : l,
                ),
            );
            setSelected([]);
            setStatus(t('status.erasedCount', { count: removed }));
        },
        [
            layers,
            layerIdx,
            tool,
            cameraDeg,
            eraserRadius,
            saveLayerSnapshot,
            discardLastUndo,
            setLayers,
            setSelected,
            setStatus,
            t,
        ],
    );
}
