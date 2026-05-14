import type {
    Dispatch,
    MutableRefObject,
    PointerEvent as ReactPointerEvent,
    SetStateAction,
} from 'react';
import { useTranslation } from 'react-i18next';

import type { PlacementObjectId, WorldCellKey } from '../lib/editorIds';

import {
    svgClientToMplView,
    svgClientToView,
    worldToView,
} from '../../../lib/coords';
import type {
    DragOverlayData,
    DragOverlayHandle,
} from '../components/scene/DragOverlayLayer';
import {
    classifyBackgroundPointer,
    resolveBackgroundDisplayMetrics,
} from '../lib/editorBackgroundGeometry';
import { findHitPlacementAtView } from '../lib/editorFindPlacement';
import {
    GROUP_TRANSFORM_DETAIL_FOOTPRINT_INTERACTIVE_MAX,
    MAX_GROUP_ROTATE_PLACEMENTS,
    ROT_FULL,
} from '../lib/editorConstants';
import {
    placementCentersAllowedFromProposedWorld,
    placementFootprintAllowed,
} from '../lib/editorPlacementValidate';
import {
    occupiedCoordMapExcludingRefs,
    parseWorldCellKey,
} from '../lib/editorPlacementCoords';
import { findFirstStaticCollision } from '../lib/editorTransformValidation';
import { rigidRotateSnapsAroundViewPivot } from '../lib/editorRigidRotate';
import { buildPlacementSnapsForRefs } from '../lib/editorPlacementSnaps';
import { signedAngleBetweenVectors } from '../lib/editorViewport';
import type { PlacementRef, SelectDragSession, SelectRotateSession } from '../model/editorSessionTypes';
import {
    normalizeSelectionLayer0,
    parseRefKey,
    refEqual,
    refKey,
    uniqRefs,
} from '../lib/placementSelection';
import {
    assetKeyForTemplate,
    templatePlacementFootprintView,
} from '../../../lib/sceneDecorations';
import type { DragOverlaySnapshot } from '../components/scene/DragOverlayLayer';
import useEditorStore from '../../../stores/editorStore';

import type { BackgroundRotateSession, UseEditorCanvasGesturesArgs } from './types';

export type PlacementPointerGestureCtx = {
    selectRotateRef: MutableRefObject<SelectRotateSession | null>;
    selectRotateSnapshotPushedRef: MutableRefObject<boolean>;
    // Last applied rotation angle (radians, view CCW).
    selectRotateLastDeltaRadRef: MutableRefObject<number>;
    // Whether the last frame was boundary-valid (centers/footprints).
    selectRotateLastBoundaryValidRef: MutableRefObject<boolean>;
    // Whether the last frame was free of static-cell collisions.
    selectRotateLastCollisionValidRef: MutableRefObject<boolean>;
    // Details of the first static collision in the last RAF frame (if any).
    selectRotateLastStaticCollisionRef: MutableRefObject<{
        cell: WorldCellKey;
        object: PlacementObjectId;
    } | null>;
    // Whether a RAF frame is already scheduled (pointermove throttling).
    selectRotateRafScheduledRef: MutableRefObject<boolean>;
    // Latest pointermove event that the RAF frame has not consumed yet.
    selectRotateLastEvRef: MutableRefObject<PointerEvent | null>;
    bgRotateRef: MutableRefObject<BackgroundRotateSession | null>;
    bgRotateSnapshotPushedRef: MutableRefObject<boolean>;
    selectDragCleanupRef: MutableRefObject<(() => void) | null>;
    bgInteractCleanupRef: MutableRefObject<(() => void) | null>;
    selectDragRef: MutableRefObject<SelectDragSession | null>;
    setSelectDrag: Dispatch<SetStateAction<SelectDragSession | null>>;
    eraseCleanupRef: MutableRefObject<(() => void) | null>;
    setSelectRmbRotate: Dispatch<SetStateAction<boolean>>;
    clearSelectRotate: (svgEl: SVGSVGElement | null) => void;
    clearBgRotate: (svgEl: SVGSVGElement | null) => void;
    dragOverlayHandleRef: MutableRefObject<DragOverlayHandle | null>;
    setDragOverlay: Dispatch<SetStateAction<DragOverlayData | null>>;
};

export function usePlacementAndBgPointerGestures(
    args: UseEditorCanvasGesturesArgs,
    ctx: PlacementPointerGestureCtx,
) {
    const { t } = useTranslation('editor');
    const {
        svgRef,
        viewBoxRef,
        cameraDegRef,
        boundaryRef,
        toolMarginRef,
        layersRef,
        layers,
        layerIdx: activeLayerIdx,
        cameraDeg,
        selected,
        setSelected,
        setCursorView,
        setStatus,
        ui,
        tool,
        viewBox,
        backgroundRef,
        bgNaturalSizeRef,
        setBackground,
        setBgSelected,
        pushBackgroundUndo,
    } = args;
    const executeEditorCommand = useEditorStore(
        (state) => state.executeEditorCommand,
    );

    const {
        selectRotateRef,
        selectRotateSnapshotPushedRef,
        selectRotateLastDeltaRadRef,
        selectRotateLastBoundaryValidRef,
        selectRotateLastCollisionValidRef,
        selectRotateLastStaticCollisionRef,
        selectRotateRafScheduledRef,
        selectRotateLastEvRef,
        bgRotateRef,
        bgRotateSnapshotPushedRef,
        selectDragCleanupRef,
        bgInteractCleanupRef,
        selectDragRef,
        setSelectDrag,
        eraseCleanupRef,
        setSelectRmbRotate,
        clearSelectRotate,
        clearBgRotate,
        dragOverlayHandleRef,
        setDragOverlay,
    } = ctx;

    const onPointerDownSvg = (e: ReactPointerEvent<SVGSVGElement>) => {
        const svg = svgRef.current;
        if (!svg) return;
        if (args.sceneReadOnly) return;
        if (!ui.drawing_enabled) return;
        if (e.button !== 2 || e.pointerType !== 'mouse') return;
        e.preventDefault();
        const { x, y } = svgClientToMplView(svg, e.clientX, e.clientY, viewBox);
        setCursorView([x, y]);

        selectDragCleanupRef.current?.();
        selectDragCleanupRef.current = null;
        eraseCleanupRef.current?.();
        eraseCleanupRef.current = null;
        selectDragRef.current = null;
        setSelectDrag(null);
        bgInteractCleanupRef.current?.();
        bgInteractCleanupRef.current = null;
        clearSelectRotate(svg);
        clearBgRotate(svg);

        const hRaw = findHitPlacementAtView(layers, cameraDeg, x, y);
        if (hRaw) {
            let refs: PlacementRef[];
            if (selected.some((s) => refEqual(s, hRaw))) {
                refs = normalizeSelectionLayer0(uniqRefs(selected));
                setSelected(refs);
            } else {
                setSelected([hRaw]);
                refs = [hRaw];
            }

            for (const r of refs) {
                const ly = layers[r.layerIdx];
                if (ly?.locked) {
                    setStatus(t('status.lockedCantRotate'));
                    return;
                }
            }

            if (refs.length > MAX_GROUP_ROTATE_PLACEMENTS) {
                setStatus(
                    t('status.transformLimit', {
                        count: MAX_GROUP_ROTATE_PLACEMENTS,
                    }),
                );
                return;
            }

            const snaps = buildPlacementSnapsForRefs(layers, refs);
            if (!snaps) return;

            let sumVx = 0;
            let sumVy = 0;
            const n = refs.length;
            for (const r of refs) {
                const sp = snaps[refKey(r)];
                const [vx, vy] = worldToView(sp.wx, sp.wy, cameraDeg);
                sumVx += vx;
                sumVy += vy;
            }
            const centerView: [number, number] = [sumVx / n, sumVy / n];
            let v0x = x - centerView[0];
            let v0y = y - centerView[1];
            if (Math.hypot(v0x, v0y) < 1e-4) {
                v0x = 1;
                v0y = 0;
            }
            const session: SelectRotateSession = {
                refs,
                snaps,
                centerView,
                v0x,
                v0y,
                pointerId: e.pointerId,
                staticOccupiedCells: occupiedCoordMapExcludingRefs(
                    layersRef.current,
                    new Set(refs.map(refKey)),
                ),
                fastBoundaryValidate:
                    refs.length >
                    GROUP_TRANSFORM_DETAIL_FOOTPRINT_INTERACTIVE_MAX,
            };
            selectRotateRef.current = session;
            selectRotateSnapshotPushedRef.current = false;
            selectRotateLastDeltaRadRef.current = 0;
            selectRotateLastBoundaryValidRef.current = true;
            selectRotateLastCollisionValidRef.current = true;
            selectRotateLastStaticCollisionRef.current = null;
            selectRotateRafScheduledRef.current = false;
            selectRotateLastEvRef.current = null;
            setSelectRmbRotate(true);

            // Raise the drag-overlay the same way as for drag (see useSelectToolMouseGestures).
            const hiddenKeysR = new Set(refs.map(refKey));
            const overlaySnapshotsR: DragOverlaySnapshot[] = [];
            {
                const ls0 = layersRef.current;
                for (const r of refs) {
                    const ly = ls0[r.layerIdx];
                    const b = ly?.batches[r.batchIdx];
                    const p = b?.placements[r.placementIdx];
                    if (!ly || !b || !p) continue;
                    const ak = assetKeyForTemplate(
                        b.template_hash,
                        b.facet_fv,
                    );
                    const fp = templatePlacementFootprintView(
                        b.template_hash,
                        b.facet_fv,
                    );
                    overlaySnapshotsR.push({
                        wx: p.x,
                        wy: p.y,
                        r: p.r,
                        template_hash: b.template_hash,
                        facet_fv: b.facet_fv ?? null,
                        lineStroke:
                            b.line_stroke === true && ak === 'maraketh_rubble1',
                        assetKey: ak,
                        footprintWidthView: fp.widthView,
                        footprintHeightView: fp.heightView,
                        layerOpacity:
                            r.layerIdx === activeLayerIdx ? 1 : 0.65,
                    });
                }
            }
            setDragOverlay({
                snapshots: overlaySnapshotsR,
                hiddenKeys: hiddenKeysR,
            });
            dragOverlayHandleRef.current?.setRotate(centerView, 0, true);

            try {
                svg.setPointerCapture(e.pointerId);
            } catch {
                clearSelectRotate(svg);
            }
            return;
        }

        if (tool.variant !== 'select') return;

        const bg = backgroundRef.current;
        const nat = bgNaturalSizeRef.current;
        if (bg.locked || !bg.path?.trim() || !nat || nat.w < 1 || nat.h < 1)
            return;

        const raw = svgClientToView(svg, e.clientX, e.clientY);
        const vb = viewBoxRef.current;
        const metrics = resolveBackgroundDisplayMetrics(
            bg,
            nat,
            boundaryRef.current,
            cameraDegRef.current,
            vb,
        );
        if (!metrics) return;
        const zh = classifyBackgroundPointer(metrics, raw.x, raw.y, vb);
        if (!zh) return;

        setBgSelected(true);
        setSelected([]);

        let v0xb = x - metrics.cx;
        let v0yb = y - metrics.cy;
        if (Math.hypot(v0xb, v0yb) < 1e-4) {
            v0xb = 1;
            v0yb = 0;
        }
        bgRotateRef.current = {
            centerView: [metrics.cx, metrics.cy],
            v0x: v0xb,
            v0y: v0yb,
            pointerId: e.pointerId,
            startRotDeg: bg.rotation_deg ?? 0,
        };
        bgRotateSnapshotPushedRef.current = false;
        try {
            svg.setPointerCapture(e.pointerId);
        } catch {
            clearBgRotate(svg);
        }
    };

    const onPointerMoveSvg = (e: ReactPointerEvent<SVGSVGElement>) => {
        const bgRs = bgRotateRef.current;
        if (bgRs && e.pointerId === bgRs.pointerId) {
            e.preventDefault();
            const svg = svgRef.current;
            if (!svg) return;
            const { x: mx, y: my } = svgClientToMplView(
                svg,
                e.clientX,
                e.clientY,
                viewBoxRef.current,
            );
            const v1xb = mx - bgRs.centerView[0];
            const v1yb = my - bgRs.centerView[1];
            if (Math.hypot(v1xb, v1yb) < 1e-4) return;
            const deltaRad = signedAngleBetweenVectors(
                bgRs.v0x,
                bgRs.v0y,
                v1xb,
                v1yb,
            );
            const nextDeg = Math.round(
                bgRs.startRotDeg + (deltaRad * 180) / Math.PI,
            );

            if (
                !bgRotateSnapshotPushedRef.current &&
                Math.abs(deltaRad) > 1e-4
            ) {
                pushBackgroundUndo(
                    { ...backgroundRef.current },
                    t('status.bgRotateRmbLabel'),
                );
                bgRotateSnapshotPushedRef.current = true;
            }

            setBackground((b) => ({
                ...b,
                rotation_deg: nextDeg,
            }));
            return;
        }

        const sess = selectRotateRef.current;
        if (!sess || e.pointerId !== sess.pointerId) return;
        e.preventDefault();
        // RAF throttling: keep the latest event and schedule one frame so
        // validation does not run on every pointermove (HiDPI fires 120+ Hz).
        selectRotateLastEvRef.current = e.nativeEvent;
        if (selectRotateRafScheduledRef.current) return;
        selectRotateRafScheduledRef.current = true;
        requestAnimationFrame(processSelectRotateFrame);
    };

    // Dedicated RAF frame handler for select-rotate.
    const processSelectRotateFrame = () => {
        selectRotateRafScheduledRef.current = false;
        const ev = selectRotateLastEvRef.current;
        selectRotateLastEvRef.current = null;
        const sess = selectRotateRef.current;
        const svg = svgRef.current;
        if (!ev || !sess || !svg) return;
        const { x: mx, y: my } = svgClientToMplView(
            svg,
            ev.clientX,
            ev.clientY,
            viewBoxRef.current,
        );
        const v1x = mx - sess.centerView[0];
        const v1y = my - sess.centerView[1];
        if (Math.hypot(v1x, v1y) < 1e-4) return;
        const deltaRad = signedAngleBetweenVectors(
            sess.v0x,
            sess.v0y,
            v1x,
            v1y,
        );
        const bd = boundaryRef.current;
        const margin = toolMarginRef.current;
        const cam = cameraDegRef.current;
        const vb = viewBoxRef.current;

        const deltaHideout = (deltaRad / (Math.PI * 2)) * ROT_FULL;
        const deltaRadSnapped =
            (Math.round(deltaHideout) / ROT_FULL) * (Math.PI * 2);

        const proposed = rigidRotateSnapsAroundViewPivot(
            sess.snaps,
            sess.refs,
            cam,
            sess.centerView,
            deltaRadSnapped,
        );

        let boundaryValid = true;
        if (sess.fastBoundaryValidate) {
            if (
                !placementCentersAllowedFromProposedWorld(
                    sess.refs,
                    proposed,
                    bd,
                    margin,
                )
            )
                boundaryValid = false;
        } else {
            for (const r of sess.refs) {
                const sp = sess.snaps[refKey(r)];
                const pr = proposed.get(refKey(r));
                if (!sp || !pr) {
                    boundaryValid = false;
                    break;
                }
                const rInt = Math.round(pr.r);
                if (
                    !placementFootprintAllowed(
                        pr.wx,
                        pr.wy,
                        rInt,
                        bd,
                        margin,
                        cam,
                        sp.template_hash,
                        sp.facet_fv,
                        vb,
                        sp.line_stroke === true,
                    )
                ) {
                    boundaryValid = false;
                    break;
                }
            }
        }

        // Highlight collisions against static (non-selected) objects so the
        // overlay shows immediately that release here is forbidden. Internal
        // duplicates within the group are ignored: rigid rotation preserves
        // relative layout, and imported duplicates would otherwise block any
        // rotate.
        let staticCollision: {
            cell: WorldCellKey;
            object: PlacementObjectId;
        } | null = null;
        if (boundaryValid) {
            const proposedXY: [number, number][] = [];
            for (const r of sess.refs) {
                const pr = proposed.get(refKey(r));
                if (!pr) continue;
                proposedXY.push([Math.round(pr.wx), Math.round(pr.wy)]);
            }
            staticCollision = findFirstStaticCollision(
                sess.staticOccupiedCells,
                proposedXY,
            );
        }
        const collisionValid = staticCollision === null;
        const valid = boundaryValid && collisionValid;

        selectRotateLastDeltaRadRef.current = deltaRadSnapped;
        selectRotateLastBoundaryValidRef.current = boundaryValid;
        selectRotateLastCollisionValidRef.current = collisionValid;
        selectRotateLastStaticCollisionRef.current = staticCollision;
        dragOverlayHandleRef.current?.setRotate(
            sess.centerView,
            deltaRadSnapped,
            valid,
        );
    };

    const finishSelectRotatePointer = (
        e: ReactPointerEvent<SVGSVGElement>,
    ) => {
        const bgRs = bgRotateRef.current;
        if (bgRs && e.pointerId === bgRs.pointerId) {
            const changed = bgRotateSnapshotPushedRef.current;
            clearBgRotate(svgRef.current);
            if (changed) setStatus(t('status.bgRotateChanged'));
            return;
        }

        const sess = selectRotateRef.current;
        if (!sess || e.pointerId !== sess.pointerId) return;

        // Drain any pending RAF frame now so lastDeltaRad/lastValid reflect
        // the actual final pointer position.
        if (selectRotateLastEvRef.current) {
            selectRotateRafScheduledRef.current = false;
            processSelectRotateFrame();
        }

        const deltaRadFinal = selectRotateLastDeltaRadRef.current;
        const lastBoundaryValid = selectRotateLastBoundaryValidRef.current;
        const lastCollisionValid = selectRotateLastCollisionValidRef.current;
        const lastStaticHit = selectRotateLastStaticCollisionRef.current;
        const moved = Math.abs(deltaRadFinal) > 1e-9;

        // Reset the overlay and session before committing so the UI does not flicker.
        clearSelectRotate(svgRef.current);
        setDragOverlay(null);
        dragOverlayHandleRef.current?.reset();
        selectRotateLastDeltaRadRef.current = 0;
        selectRotateLastBoundaryValidRef.current = true;
        selectRotateLastCollisionValidRef.current = true;
        selectRotateLastStaticCollisionRef.current = null;
        selectRotateRafScheduledRef.current = false;
        selectRotateLastEvRef.current = null;

        if (!moved) return;

        if (!lastBoundaryValid) {
            setStatus(t('status.rotateCancelledOutOfBoundary'));
            setSelected(sess.refs);
            return;
        }
        if (!lastCollisionValid) {
            if (lastStaticHit) {
                const xy = parseWorldCellKey(lastStaticHit.cell);
                const blocker = parseRefKey(lastStaticHit.object);
                if (xy && blocker) {
                    setStatus(
                        t('status.rotateCancelledCollisionAt', {
                            x: xy[0],
                            y: xy[1],
                            layer: blocker.layerIdx,
                        }),
                    );
                    setSelected(sess.refs);
                    return;
                }
            }
            setStatus(t('status.rotateCancelledCollision'));
            setSelected(sess.refs);
            return;
        }

        const cam = cameraDegRef.current;
        const proposedFinal = rigidRotateSnapsAroundViewPivot(
            sess.snaps,
            sess.refs,
            cam,
            sess.centerView,
            deltaRadFinal,
        );

        // Final footprint and collision check. An invalid state is never
        // committed (instead of commit + undo).
        if (sess.fastBoundaryValidate) {
            const vb = viewBoxRef.current;
            for (const r of sess.refs) {
                const sp = sess.snaps[refKey(r)];
                const pr = proposedFinal.get(refKey(r));
                if (!sp || !pr) {
                    setStatus(t('status.rotateCancelledOutOfBoundary'));
                    setSelected(sess.refs);
                    return;
                }
                if (
                    !placementFootprintAllowed(
                        pr.wx,
                        pr.wy,
                        Math.round(pr.r),
                        boundaryRef.current,
                        toolMarginRef.current,
                        cam,
                        sp.template_hash,
                        sp.facet_fv,
                        vb,
                        sp.line_stroke === true,
                    )
                ) {
                    setStatus(t('status.rotateCancelledOutOfBoundary'));
                    setSelected(sess.refs);
                    return;
                }
            }
        }
        // Final collision check only against static (non-group) cells.
        // Rigid rotation preserves internal duplicates inside the selection,
        // so they must not block the final commit.
        {
            const proposedXY: [number, number][] = [];
            for (const r of sess.refs) {
                const pr = proposedFinal.get(refKey(r));
                if (!pr) continue;
                proposedXY.push([Math.round(pr.wx), Math.round(pr.wy)]);
            }
            const hit = findFirstStaticCollision(
                sess.staticOccupiedCells,
                proposedXY,
            );
            if (hit) {
                const xy = parseWorldCellKey(hit.cell);
                const blocker = parseRefKey(hit.object);
                if (xy && blocker) {
                    setStatus(
                        t('status.rotateCancelledCollisionAt', {
                            x: xy[0],
                            y: xy[1],
                            layer: blocker.layerIdx,
                        }),
                    );
                } else {
                    setStatus(t('status.rotateCancelledCollision'));
                }
                setSelected(sess.refs);
                return;
            }
        }

        const after = sess.refs
            .map((ref) => {
                const pr = proposedFinal.get(refKey(ref));
                if (!pr) return null;
                return {
                    ref,
                    x: pr.wx,
                    y: pr.wy,
                    r: Math.round(pr.r),
                };
            })
            .filter((update) => update !== null);
        const before = sess.refs
            .map((ref) => {
                const sp = sess.snaps[refKey(ref)];
                if (!sp) return null;
                return {
                    ref,
                    x: sp.wx,
                    y: sp.wy,
                    r: sp.r,
                };
            })
            .filter((update) => update !== null);

        executeEditorCommand({
            command: {
                type: 'placement_transform',
                before,
                after,
                clearBgSelection: true,
            },
            label: t('status.rotateRmbLabel'),
        });
        setStatus(
            sess.refs.length > 1
                ? t('status.rotatedMany', { count: sess.refs.length })
                : t('status.rotatedOne'),
        );
    };

    return {
        onPointerDownSvg,
        onPointerMoveSvg,
        finishSelectRotatePointer,
    };
}
