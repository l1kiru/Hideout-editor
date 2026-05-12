import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { DECORATIONS, TOOL_FV_ASSET_KEY } from '../../../../lib/sceneDecorations';
import type { PaintedBatch } from '../../../../types/scene';
import { DEFAULT_MAP_LAYER_INDEX } from '../../lib/editorConstants';
import type { PlacementObjectId } from '../../lib/editorIds';
import { layerId } from '../../lib/editorIds';
import {
    dedupeConsecutiveViewPoints,
    placementsForPolyline,
} from '../../lib/editorLineBrush';
import {
    occupiedCoordKeysExcludingRefs,
    placementsHaveInternalCoordDuplicates,
    worldPlacementCoordKey,
} from '../../lib/editorPlacementCoords';

import type { PlacementActionsCtx } from './types';

export function usePlaceStrokeAt(ctx: PlacementActionsCtx) {
    const { t } = useTranslation('editor');
    const {
        layers,
        layerIdx,
        activeAssetKey,
        tool,
        boundary,
        cameraDeg,
        saveLayerSnapshot,
        setLayers,
        setSelected,
        setStatus,
    } = ctx;

    return useCallback(
        (viewPoints: [number, number][]) => {
            const ly = layers[layerIdx];
            if (!ly || ly.locked) return;
            if (layerIdx === layerId(DEFAULT_MAP_LAYER_INDEX)) {
                setStatus(t('status.cannotDrawLineDefaultLayer'));
                return;
            }
            const asset = DECORATIONS[activeAssetKey];
            const cleaned = dedupeConsecutiveViewPoints(viewPoints);
            if (cleaned.length === 0) return;
            const placements = placementsForPolyline(
                cleaned,
                asset,
                tool.spacing,
                cameraDeg,
                activeAssetKey,
                boundary,
                tool.margin,
            );
            if (placements.length === 0) {
                setStatus(t('status.strokeOutOfZone'));
                return;
            }
            if (placementsHaveInternalCoordDuplicates(placements)) {
                setStatus(t('status.strokeDuplicates'));
                return;
            }
            const occupied = occupiedCoordKeysExcludingRefs(
                layers,
                new Set<PlacementObjectId>(),
            );
            for (const p of placements) {
                if (occupied.has(worldPlacementCoordKey(p.x, p.y))) {
                    setStatus(t('status.strokeOccupied'));
                    return;
                }
            }
            saveLayerSnapshot(t('status.strokeLabel', { asset: asset.title }));
            const batch: PaintedBatch = {
                template_name_ru: asset.nameRu,
                template_hash: asset.hash,
                placements,
                facet_fv: activeAssetKey === TOOL_FV_ASSET_KEY ? tool.fv : asset.fv,
                line_stroke: true,
            };
            setLayers((ls) =>
                ls.map((l, i) =>
                    i === Number(layerIdx) ? { ...l, batches: [...l.batches, batch] } : l,
                ),
            );
            setSelected([]);
            setStatus(t('status.strokeDone', { count: placements.length }));
        },
        [
            layers,
            layerIdx,
            activeAssetKey,
            tool.spacing,
            tool.margin,
            tool.fv,
            boundary,
            cameraDeg,
            saveLayerSnapshot,
            setLayers,
            setSelected,
            setStatus,
            t,
        ],
    );
}
