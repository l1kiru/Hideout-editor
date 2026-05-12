import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { viewToWorld } from '../../../../lib/coords';
import { worldPointAllowed } from '../../../../lib/polygon';
import { DECORATIONS, TOOL_FV_ASSET_KEY } from '../../../../lib/sceneDecorations';
import type { PaintedBatch, XYZRPlacement } from '../../../../types/scene';
import { DEFAULT_MAP_LAYER_INDEX } from '../../lib/editorConstants';
import type { PlacementObjectId } from '../../lib/editorIds';
import { layerId } from '../../lib/editorIds';
import {
    occupiedCoordKeysExcludingRefs,
    worldPlacementCoordKey,
} from '../../lib/editorPlacementCoords';

import type { PlacementActionsCtx } from './types';

export function usePlaceObjectAt(ctx: PlacementActionsCtx) {
    const { t } = useTranslation('editor');
    const {
        layers,
        layerIdx,
        cameraDeg,
        boundary,
        tool,
        activeAssetKey,
        saveLayerSnapshot,
        setLayers,
        setSelected,
        setStatus,
    } = ctx;

    return useCallback(
        (vx: number, vy: number) => {
            const ly = layers[layerIdx];
            if (!ly || ly.locked) return;
            if (layerIdx === layerId(DEFAULT_MAP_LAYER_INDEX)) {
                setStatus(t('status.cannotAddObjectDefaultLayer'));
                return;
            }
            const [wx, wy] = viewToWorld(vx, vy, cameraDeg);
            if (!worldPointAllowed(wx, wy, boundary, tool.margin)) {
                setStatus(t('status.pointOutOfZone'));
                return;
            }
            const asset = DECORATIONS[activeAssetKey];
            const placement: XYZRPlacement = {
                x: Math.round(wx),
                y: Math.round(wy),
                r: 0,
            };
            const coordKey = worldPlacementCoordKey(placement.x, placement.y);
            if (
                occupiedCoordKeysExcludingRefs(
                    layers,
                    new Set<PlacementObjectId>(),
                ).has(coordKey)
            ) {
                setStatus(t('status.pointOccupied'));
                return;
            }
            const batch: PaintedBatch = {
                template_name_ru: asset.nameRu,
                template_hash: asset.hash,
                placements: [placement],
                facet_fv: activeAssetKey === TOOL_FV_ASSET_KEY ? tool.fv : asset.fv,
                line_stroke: false,
            };
            saveLayerSnapshot(t('status.addLabel', { asset: asset.title }));
            const newBatchIdx = ly.batches.length;
            setLayers((ls) =>
                ls.map((l, i) =>
                    i === layerIdx ? { ...l, batches: [...l.batches, batch] } : l,
                ),
            );
            setSelected([{ layerIdx, batchIdx: newBatchIdx, placementIdx: 0 }]);
            setStatus(t('status.addedObject', { asset: asset.title }));
        },
        [
            layers,
            layerIdx,
            cameraDeg,
            boundary,
            tool.margin,
            tool.fv,
            activeAssetKey,
            saveLayerSnapshot,
            setLayers,
            setSelected,
            setStatus,
            t,
        ],
    );
}
