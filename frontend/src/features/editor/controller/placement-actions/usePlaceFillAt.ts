import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { DECORATIONS, TOOL_FV_ASSET_KEY } from '../../../../lib/sceneDecorations';
import type { PaintedBatch } from '../../../../types/scene';
import { DEFAULT_MAP_LAYER_INDEX } from '../../lib/editorConstants';
import { layerId } from '../../lib/editorIds';
import { computeFillPlacements } from '../../lib/editorFill';
import { placementsHaveInternalCoordDuplicates } from '../../lib/editorPlacementCoords';

import {
    normalizedFillMaxPlacements,
    normalizedFillModeParams,
    normalizedFillStep,
    resolvedFillMode,
} from './fillConfig';
import type { PlacementActionsCtx } from './types';

export function usePlaceFillAt(ctx: PlacementActionsCtx) {
    const { t } = useTranslation('editor');
    const {
        layers,
        layerIdx,
        setStatus,
        boundary,
        tool,
        cameraDeg,
        activeAssetKey,
        viewBoxRef,
        saveLayerSnapshot,
        setLayers,
        setSelected,
    } = ctx;

    return useCallback(
        (vx: number, vy: number) => {
            const ly = layers[layerIdx];
            if (!ly || ly.locked) return;
            if (layerIdx === layerId(DEFAULT_MAP_LAYER_INDEX)) {
                setStatus(t('status.fillNoDefaultLayer'));
                return;
            }
            if (boundary.length < 3) {
                setStatus(t('status.fillNeedBoundary'));
                return;
            }

            const fillRes = computeFillPlacements({
                layers,
                layerIdx,
                boundary,
                cameraDeg,
                toolMargin: tool.margin,
                fillStepWorld: normalizedFillStep(tool.fill_step_world),
                fillMaxPlacements: normalizedFillMaxPlacements(
                    tool.fill_max_placements,
                ),
                fillMarginWorld: tool.fill_margin_world,
                fillMode: resolvedFillMode(tool),
                fillModeParams: normalizedFillModeParams(tool.fill_mode_params),
                fillConnectivity: tool.fill_connectivity ?? 4,
                fillWallsScope: tool.fill_walls_scope ?? 'all_layers',
                activeAssetKey,
                seedView: [vx, vy],
                viewBox: viewBoxRef.current,
            });
            if (fillRes.status === 'invalid_seed') {
                setStatus(t('status.fillInvalidSeed'));
                return;
            }
            if (fillRes.status === 'occupied_seed') {
                setStatus(t('status.fillOccupiedSeed'));
                return;
            }
            if (fillRes.status === 'too_large') {
                setStatus(t('status.fillTooLarge'));
                return;
            }
            if (fillRes.maxPlacementsHit) {
                setStatus(t('status.fillLimitHit', {
                    count: normalizedFillMaxPlacements(tool.fill_max_placements),
                }));
                return;
            }
            if (fillRes.openArea || fillRes.status === 'open_area') {
                setStatus(t('status.fillOpenArea'));
                return;
            }
            const placements = fillRes.placements;
            if (placements.length === 0) {
                setStatus(t('status.fillNoArea'));
                return;
            }
            if (placementsHaveInternalCoordDuplicates(placements)) {
                setStatus(t('status.fillDuplicates'));
                return;
            }

            const asset = DECORATIONS[activeAssetKey];
            saveLayerSnapshot(
                t('status.fillLabel', {
                    count: placements.length,
                    asset: asset.title,
                }),
            );
            const batch: PaintedBatch = {
                template_name_ru: asset.nameRu,
                template_hash: asset.hash,
                placements,
                facet_fv: activeAssetKey === TOOL_FV_ASSET_KEY ? tool.fv : asset.fv,
                line_stroke: false,
            };
            setLayers((ls) =>
                ls.map((l, i) =>
                    i === Number(layerIdx) ? { ...l, batches: [...l.batches, batch] } : l,
                ),
            );
            setSelected([]);
            setStatus(t('status.fillDone', { count: placements.length }));
        },
        [
            layers,
            layerIdx,
            setStatus,
            boundary,
            tool,
            cameraDeg,
            activeAssetKey,
            viewBoxRef,
            saveLayerSnapshot,
            setLayers,
            setSelected,
            t,
        ],
    );
}
