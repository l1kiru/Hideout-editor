import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
    groupMovePreservesUniqueCoordsStatic,
    occupiedCoordKeysExcludingRefs,
} from '../../lib/editorPlacementCoords';
import { placementFootprintAllowed } from '../../lib/editorPlacementValidate';
import { rigidRotatePlacementsAroundSelectionCentroidView } from '../../lib/editorRigidRotate';
import { readPlacement, refKey } from '../../lib/placementSelection';
import { MAX_GROUP_ROTATE_PLACEMENTS } from '../../lib/editorConstants';
import useEditorStore from '../../../../stores/editorStore';

import type { PlacementActionsCtx } from './types';

export function useRotateSelected(ctx: PlacementActionsCtx) {
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
    const rotateSelectedInStore = useEditorStore((state) => state.rotateSelected);

    return useCallback(
        (delta: number) => {
            if (selected.length === 0) return;
            if (selected.length > MAX_GROUP_ROTATE_PLACEMENTS) {
                setStatus(
                    t('status.transformLimit', {
                        count: MAX_GROUP_ROTATE_PLACEMENTS,
                    }),
                );
                return;
            }
            if (selected.some((r) => layers[r.layerIdx]?.locked)) {
                setStatus(t('status.lockedLayerExists'));
                return;
            }
            const vb = viewBoxRef.current;
            const bd = boundaryRef.current;
            const cam = cameraDegRef.current;
            const margin = toolMarginRef.current;
            const keySet = new Set(selected.map(refKey));
            const staticOccupied = occupiedCoordKeysExcludingRefs(layers, keySet);

            const entries: {
                refKey: ReturnType<typeof refKey>;
                wx: number;
                wy: number;
                r: number;
            }[] = [];
            for (const r of selected) {
                const p = readPlacement(layers, r);
                const ly = layers[r.layerIdx];
                const b = ly?.batches[r.batchIdx];
                if (!p || !b) return;
                entries.push({
                    refKey: refKey(r),
                    wx: p.x,
                    wy: p.y,
                    r: p.r,
                });
            }

            const proposed = rigidRotatePlacementsAroundSelectionCentroidView(
                entries,
                cam,
                delta,
            );

            for (const r of selected) {
                const rk = refKey(r);
                const pr = proposed.get(rk);
                const ly = layers[r.layerIdx];
                const b = ly?.batches[r.batchIdx];
                if (!pr || !b) return;
                if (
                    !placementFootprintAllowed(
                        pr.wx,
                        pr.wy,
                        pr.r,
                        bd,
                        margin,
                        cam,
                        b.template_hash,
                        b.facet_fv,
                        vb,
                        b.line_stroke === true,
                    )
                ) {
                    setStatus(t('status.rotateOutOfZone'));
                    return;
                }
            }

            if (
                !groupMovePreservesUniqueCoordsStatic(staticOccupied, selected, (r) => {
                    const pr = proposed.get(refKey(r));
                    return pr ? [Math.round(pr.wx), Math.round(pr.wy)] : null;
                })
            ) {
                setStatus(t('status.rotateCoordConflict'));
                return;
            }

            rotateSelectedInStore({
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
                label: t('selection.rotateCwAria'),
            });
        },
        [
            selected,
            layers,
            viewBoxRef,
            boundaryRef,
            cameraDegRef,
            toolMarginRef,
            setStatus,
            rotateSelectedInStore,
            t,
        ],
    );
}
