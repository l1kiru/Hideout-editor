import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
    occupiedCoordMapExcludingRefs,
} from '../../lib/editorPlacementCoords';
import { MAX_GROUP_ROTATE_PLACEMENTS } from '../../lib/editorConstants';
import {
    mirrorPlacementsAroundSelectionBoundsCenterView,
    type MirrorAxis,
} from '../../lib/editorRigidMirror';
import { placementFootprintAllowed } from '../../lib/editorPlacementValidate';
import {
    MIRROR_TRANSFORM_OPERATION,
    validateProposedPlacementCells,
} from '../../lib/editorTransformValidation';
import { readPlacement, refKey } from '../../lib/placementSelection';
import useEditorStore from '../../../../stores/editorStore';

import type { PlacementActionsCtx } from './types';

export function useMirrorSelected(ctx: PlacementActionsCtx) {
    const { t } = useTranslation('editor');
    const {
        selected,
        layers,
        viewBoxRef,
        boundaryRef,
        cameraDegRef,
        toolMarginRef,
        setStatus,
    } = ctx;
    const mirrorSelectedInStore = useEditorStore((state) => state.mirrorSelected);

    return useCallback(
        (axis: MirrorAxis) => {
            if (selected.length === 0) return;
            if (selected.length > MAX_GROUP_ROTATE_PLACEMENTS) {
                setStatus(
                    t('status.transformLimit', {
                        count: MAX_GROUP_ROTATE_PLACEMENTS,
                    }),
                );
                return;
            }
            if (selected.some((ref) => layers[ref.layerIdx]?.locked)) {
                setStatus(t('status.lockedLayerExists'));
                return;
            }

            const viewBox = viewBoxRef.current;
            const boundary = boundaryRef.current;
            const cameraDeg = cameraDegRef.current;
            const margin = toolMarginRef.current;
            const selectionKeySet = new Set(selected.map(refKey));
            const staticOccupied = occupiedCoordMapExcludingRefs(
                layers,
                selectionKeySet,
            );

            const entries: {
                refKey: ReturnType<typeof refKey>;
                wx: number;
                wy: number;
                r: number;
            }[] = [];
            for (const ref of selected) {
                const placement = readPlacement(layers, ref);
                if (!placement) return;
                entries.push({
                    refKey: refKey(ref),
                    wx: placement.x,
                    wy: placement.y,
                    r: placement.r,
                });
            }

            const proposed = mirrorPlacementsAroundSelectionBoundsCenterView(
                entries,
                axis,
                cameraDeg,
            );

            for (const ref of selected) {
                const nextPlacement = proposed.get(refKey(ref));
                const layer = layers[ref.layerIdx];
                const batch = layer?.batches[ref.batchIdx];
                if (!nextPlacement || !batch) return;
                if (
                    !placementFootprintAllowed(
                        nextPlacement.wx,
                        nextPlacement.wy,
                        nextPlacement.r,
                        boundary,
                        margin,
                        cameraDeg,
                        batch.template_hash,
                        batch.facet_fv,
                        viewBox,
                        batch.line_stroke === true,
                    )
                ) {
                    setStatus(t('status.mirrorOutOfZone'));
                    return;
                }
            }

            const proposedRounded: [number, number][] = [];
            for (const ref of selected) {
                const nextPlacement = proposed.get(refKey(ref));
                if (!nextPlacement) return;
                proposedRounded.push([nextPlacement.wx, nextPlacement.wy]);
            }

            const validation = validateProposedPlacementCells(
                staticOccupied,
                proposedRounded,
                MIRROR_TRANSFORM_OPERATION,
            );
            if (!validation.ok) {
                setStatus(t('status.mirrorCoordConflict'));
                return;
            }

            mirrorSelectedInStore({
                refs: selected,
                updates: selected
                    .map((ref) => {
                        const next = proposed.get(refKey(ref));
                        if (!next) return null;
                        return {
                            ref,
                            x: next.wx,
                            y: next.wy,
                            r: next.r,
                        };
                    })
                    .filter((update) => update !== null),
                label:
                    axis === 'horizontal'
                        ? t('status.mirrorHorizontalLabel')
                        : t('status.mirrorVerticalLabel'),
            });
            setStatus(
                selected.length > 1
                    ? t('status.mirroredMany', { count: selected.length })
                    : t('status.mirroredOne'),
            );
        },
        [
            selected,
            layers,
            viewBoxRef,
            boundaryRef,
            cameraDegRef,
            toolMarginRef,
            setStatus,
            mirrorSelectedInStore,
            t,
        ],
    );
}
