import type {
    Dispatch,
    MutableRefObject,
    MouseEvent as ReactMouseEvent,
    SetStateAction,
} from 'react';
import { useTranslation } from 'react-i18next';

import {
    mplViewPointToSvg,
    svgClientToMplView,
    svgClientToView,
    viewToWorld,
    worldToView,
} from '../../../lib/coords';
import type { EditorSvgSceneProps } from '../components/EditorSvgScene';
import type {
    DragOverlayData,
    DragOverlayHandle,
} from '../components/scene/DragOverlayLayer';
import {
    backgroundResizeRatio,
    backgroundSvgPointerToLocal,
    clampBackgroundScale,
    classifyBackgroundPointer,
    resolveBackgroundDisplayMetrics,
} from '../lib/editorBackgroundGeometry';
import {
    MARQUEE_MIN_DRAG_VIEW,
    MAX_GROUP_MOVE_PLACEMENTS,
} from '../lib/editorConstants';
import { findHitPlacementAtView } from '../lib/editorFindPlacement';
import {
    aabbCornersInsideBoundary,
    buildSelectionCentersAABB,
    everyRefPlacementFootprintAllowed,
    everyRefPlacementFootprintAllowedAfterShift,
    placementCentersAllowedAfterShift,
} from '../lib/editorPlacementValidate';
import { appendBrushPoint } from '../lib/editorLineBrush';
import {
    buildPlacementSnapsForRefs,
} from '../lib/editorPlacementSnaps';
import { occupiedCoordMapExcludingRefs, parseWorldCellKey } from '../lib/editorPlacementCoords';
import type { MoveValidationResult } from '../lib/editorTransformValidation';
import { validateGroupMoveCells } from '../lib/editorTransformValidation';
import {
    assetKeyForTemplate,
    templatePlacementFootprintView,
} from '../../../lib/sceneDecorations';
import {
    collectRefsInMarqueeView,
    normalizeSelectionLayer0,
    parseRefKey,
    refEqual,
    refKey,
    subtractRefs,
    uniqRefs,
} from '../lib/placementSelection';
import type { PlacementRef, SelectDragSession } from '../model/editorSessionTypes';
import type { DragOverlaySnapshot } from '../components/scene/DragOverlayLayer';
import { invertEditorCommand } from '../lib/editorCommandExecutor';
import { cloneBatches } from '../lib/editorDefaults';
import { eraseLayerBatchesAtView } from '../lib/editorErase';
import useEditorStore from '../../../stores/editorStore';

import type {
    BackgroundResizeHit,
    UseEditorCanvasGesturesArgs,
} from './types';

export type SelectToolMouseGestureCtx = {
    selectDragRef: MutableRefObject<SelectDragSession | null>;
    selectDragCleanupRef: MutableRefObject<(() => void) | null>;
    bgInteractCleanupRef: MutableRefObject<(() => void) | null>;
    eraseCleanupRef: MutableRefObject<(() => void) | null>;
    clearSelectRotate: (svgEl: SVGSVGElement | null) => void;
    clearBgRotate: (svgEl: SVGSVGElement | null) => void;
    setMarqueeView: Dispatch<
        SetStateAction<EditorSvgSceneProps['marqueeView']>
    >;
    setSelectDrag: Dispatch<SetStateAction<SelectDragSession | null>>;
    dragOverlayHandleRef: MutableRefObject<DragOverlayHandle | null>;
    setDragOverlay: Dispatch<SetStateAction<DragOverlayData | null>>;
};

export function useSelectToolMouseGestures(
    args: UseEditorCanvasGesturesArgs,
    ctx: SelectToolMouseGestureCtx,
) {
    const { t } = useTranslation('editor');
    const {
        svgRef,
        viewBoxRef,
        cameraDegRef,
        boundaryRef,
        toolMarginRef,
        layersRef,
        ui,
        tool,
        viewBox,
        layers,
        layerIdx: activeLayerIdx,
        cameraDeg,
        selected,
        setSelected,
        setPanDrag,
        setViewBox,
        setCursorView,
        setLineDraft,
        setStatus,
        panDrag,
        placeStrokeRef,
        lineBrushActiveRef,
        lineDraftRef,
        placeObjectAt,
        placeFillAt,
        backgroundRef,
        bgNaturalSizeRef,
        setBackground,
        setBgSelected,
        pushBackgroundUndo,
    } = args;
    const executeEditorCommand = useEditorStore(
        (state) => state.executeEditorCommand,
    );
    const pushCommandUndo = useEditorStore((state) => state.pushCommandUndo);
    const updateLayer = useEditorStore((state) => state.updateLayer);

    const {
        selectDragRef,
        selectDragCleanupRef,
        bgInteractCleanupRef,
        eraseCleanupRef,
        clearSelectRotate,
        clearBgRotate,
        setMarqueeView,
        setSelectDrag,
        dragOverlayHandleRef,
        setDragOverlay,
    } = ctx;

    const cloneSelection = (refs: PlacementRef[]): PlacementRef[] =>
        refs.map((ref) => ({
            layerIdx: ref.layerIdx,
            batchIdx: ref.batchIdx,
            placementIdx: ref.placementIdx,
        }));

    const onMouseDownSvg = (e: ReactMouseEvent) => {
        const svg = svgRef.current;
        if (!svg) return;
        eraseCleanupRef.current?.();
        eraseCleanupRef.current = null;
        const panMode =
            e.button === 1 || (e.button === 0 && args.spaceDownRef.current);
        if (panMode) {
            e.preventDefault();
            setPanDrag({ lastCx: e.clientX, lastCy: e.clientY });
            return;
        }
        if (args.sceneReadOnly) return;
        const { x, y } = svgClientToMplView(svg, e.clientX, e.clientY, viewBox);
        setCursorView([x, y]);

        if (!ui.drawing_enabled && tool.variant !== 'select') return;

        if (e.button !== 0) return;
        if (tool.variant === 'select') {
            clearSelectRotate(svg);
            clearBgRotate(svg);
            bgInteractCleanupRef.current?.();
            bgInteractCleanupRef.current = null;
            selectDragCleanupRef.current?.();
            selectDragCleanupRef.current = null;
            const hit = findHitPlacementAtView(layers, cameraDeg, x, y);
            const additive = e.ctrlKey || e.metaKey;
            if (hit) {
                setBgSelected(false);

                const alreadyHit = selected.some((s) => refEqual(s, hit));
                let refs: PlacementRef[];
                if (additive) {
                    if (alreadyHit) {
                        // Ctrl-click on an already selected placement clears
                        // the selection and does not start a drag.
                        const remaining = selected.filter(
                            (s) => !refEqual(s, hit),
                        );
                        setSelected(
                            normalizeSelectionLayer0(uniqRefs(remaining)),
                        );
                        setSelectDrag(null);
                        selectDragRef.current = null;
                        return;
                    }
                    refs = normalizeSelectionLayer0(
                        uniqRefs([...selected, hit]),
                    );
                    setSelected(refs);
                } else if (alreadyHit) {
                    refs = normalizeSelectionLayer0(uniqRefs(selected));
                    setSelected(refs);
                } else {
                    setSelected([hit]);
                    refs = [hit];
                }

                for (const r of refs) {
                    const lyR = layers[r.layerIdx];
                    if (!lyR?.visible) {
                        setSelected([]);
                        setSelectDrag(null);
                        selectDragRef.current = null;
                        return;
                    }
                }

                const lyHit = layers[hit.layerIdx];
                const bHit = lyHit?.batches[hit.batchIdx];
                const pHit = bHit?.placements[hit.placementIdx];
                if (!pHit || !bHit) {
                    setSelected([]);
                    return;
                }

                for (const r of refs) {
                    const lyr = layers[r.layerIdx];
                    if (lyr?.locked) {
                        setSelected([]);
                        setSelectDrag(null);
                        selectDragRef.current = null;
                        setStatus(t('status.lockedCantMove'));
                        return;
                    }
                }

                if (refs.length > MAX_GROUP_MOVE_PLACEMENTS) {
                    setStatus(
                        t('status.transformLimit', {
                            count: MAX_GROUP_MOVE_PLACEMENTS,
                        }),
                    );
                    setSelectDrag(null);
                    selectDragRef.current = null;
                    return;
                }

                const snaps = buildPlacementSnapsForRefs(layers, refs);
                if (!snaps) {
                    setSelectDrag(null);
                    selectDragRef.current = null;
                    return;
                }

                const anchorRef = hit;
                const anchorSnap = snaps[refKey(anchorRef)];
                const [pvx, pvy] = worldToView(
                    anchorSnap.wx,
                    anchorSnap.wy,
                    cameraDeg,
                );
                const grabOffsetView: [number, number] = [pvx - x, pvy - y];
                // During drag only centers are validated. The full footprint
                // check is too strict and would block moves of large objects
                // whose corners already extend past the boundary. Boundary
                // safety is still enforced: the center must stay inside, and
                // the post-check below reverts the drag if every footprint
                // was valid before the move.
                const preMoveAllValid = everyRefPlacementFootprintAllowed(
                    layersRef.current,
                    refs,
                    boundaryRef.current,
                    toolMarginRef.current,
                    cameraDegRef.current,
                    viewBoxRef.current,
                );
                const selAABB = buildSelectionCentersAABB(snaps, refs);
                const session: SelectDragSession = {
                    refs,
                    snaps,
                    grabOffsetView,
                    anchorRef,
                    staticOccupiedCells: occupiedCoordMapExcludingRefs(
                        layersRef.current,
                        new Set(refs.map(refKey)),
                    ),
                    fastBoundaryValidate: true,
                    preMoveAllValid,
                    selAABB,
                };
                selectDragRef.current = session;
                setSelectDrag(session);

                // Hide the originals from the visual output (DOM stays) and
                // draw a copy in the drag-overlay. Snapshots are built once
                // and stay stable for the duration of the gesture.
                const hiddenKeys = new Set(refs.map(refKey));
                const overlaySnapshots: DragOverlaySnapshot[] = [];
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
                        overlaySnapshots.push({
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
                            layerOpacity: r.layerIdx === activeLayerIdx ? 1 : 0.65,
                        });
                    }
                }
                setDragOverlay({
                    snapshots: overlaySnapshots,
                    hiddenKeys,
                });
                dragOverlayHandleRef.current?.setShift(0, 0, true);

                // RAF throttling: mousemove only stores the latest event and
                // schedules a RAF frame so validation does not run above 60 Hz.
                let rafScheduled = false;
                let lastEv: MouseEvent | null = null;
                let lastDwx = 0;
                let lastDwy = 0;
                let lastBoundaryValid = true;
                let lastCollisionValid = true;
                let lastMoveValidation: MoveValidationResult = { ok: true };
                let everMoved = false;

                const processFrame = () => {
                    rafScheduled = false;
                    const ev = lastEv;
                    lastEv = null;
                    const svgEl = svgRef.current;
                    const sess = selectDragRef.current;
                    if (!ev || !svgEl || !sess) return;
                    const vb = viewBoxRef.current;
                    const { x: mx, y: my } = svgClientToMplView(
                        svgEl,
                        ev.clientX,
                        ev.clientY,
                        vb,
                    );
                    const nvx = mx + sess.grabOffsetView[0];
                    const nvy = my + sess.grabOffsetView[1];
                    const [nwxA, nwyA] = viewToWorld(
                        nvx,
                        nvy,
                        cameraDegRef.current,
                    );
                    const startA = sess.snaps[refKey(sess.anchorRef)];
                    if (!startA) return;
                    const dwx = Math.round(nwxA) - startA.wx;
                    const dwy = Math.round(nwyA) - startA.wy;

                    if (dwx === lastDwx && dwy === lastDwy && everMoved)
                        return;

                    const bd = boundaryRef.current;
                    const margin = toolMarginRef.current;

                    // O(M) fast-path via AABB corners with a per-ref fallback.
                    // A uniform group shift cannot introduce internal
                    // duplicates but may collide with static (non-selected)
                    // objects, so that case is still checked.
                    let boundaryValid: boolean;
                    if (sess.selAABB) {
                        if (
                            aabbCornersInsideBoundary(
                                sess.selAABB,
                                dwx,
                                dwy,
                                bd,
                                margin,
                            )
                        ) {
                            boundaryValid = true;
                        } else {
                            boundaryValid = placementCentersAllowedAfterShift(
                                sess.snaps,
                                sess.refs,
                                dwx,
                                dwy,
                                bd,
                                margin,
                            );
                        }
                    } else {
                        boundaryValid = placementCentersAllowedAfterShift(
                            sess.snaps,
                            sess.refs,
                            dwx,
                            dwy,
                            bd,
                            margin,
                        );
                    }

                    // Typed move validation. For drag/move we allow overlaps
                    // with both the moving group and external objects; only
                    // boundary validity is enforced here.
                    const moveValidation = validateGroupMoveCells(
                        sess.staticOccupiedCells,
                        sess.snaps,
                        sess.refs,
                        dwx,
                        dwy,
                    );
                    const collisionValid = moveValidation.ok;
                    lastMoveValidation = moveValidation;

                    const valid = boundaryValid && collisionValid;

                    lastDwx = dwx;
                    lastDwy = dwy;
                    lastBoundaryValid = boundaryValid;
                    lastCollisionValid = collisionValid;
                    everMoved = everMoved || dwx !== 0 || dwy !== 0;

                    dragOverlayHandleRef.current?.setShift(dwx, dwy, valid);
                };

                const onWinMoveDrag = (ev: MouseEvent) => {
                    lastEv = ev;
                    if (rafScheduled) return;
                    rafScheduled = true;
                    requestAnimationFrame(processFrame);
                };

                const cleanupDrag = () => {
                    window.removeEventListener('mousemove', onWinMoveDrag);
                    window.removeEventListener('mouseup', onWinUpDrag);
                    selectDragRef.current = null;
                    setSelectDrag(null);
                    setDragOverlay(null);
                    dragOverlayHandleRef.current?.reset();
                    selectDragCleanupRef.current = null;
                };
                const onWinUpDrag = (ev: MouseEvent) => {
                    if (ev.button !== 0) return;
                    const sessUp = selectDragRef.current;
                    // Drain any pending RAF frame now so
                    // lastDwx/lastDwy/lastValid reflect the actual final
                    // mouse position.
                    if (lastEv) {
                        rafScheduled = false;
                        processFrame();
                    }
                    cleanupDrag();
                    if (!sessUp) return;

                    const moved =
                        everMoved && (lastDwx !== 0 || lastDwy !== 0);

                    if (!moved) {
                        return;
                    }

                    if (!lastBoundaryValid) {
                        setStatus(t('status.moveCancelledOutOfBoundary'));
                        setSelected(sessUp.refs);
                        return;
                    }
                    if (!lastCollisionValid) {
                        if (lastMoveValidation.ok === false) {
                            const mv = lastMoveValidation;
                            if (
                                mv.reason === 'external_collision'
                                && mv.conflictingCell != null
                                && mv.conflictingObject != null
                            ) {
                                const xy = parseWorldCellKey(mv.conflictingCell);
                                const blocker = parseRefKey(mv.conflictingObject);
                                if (xy && blocker) {
                                    setStatus(
                                        t('status.moveCancelledCollisionAt', {
                                            x: xy[0],
                                            y: xy[1],
                                            layer: blocker.layerIdx,
                                        }),
                                    );
                                    setSelected(sessUp.refs);
                                    return;
                                }
                            }
                        }
                        setStatus(t('status.moveCancelledCollision'));
                        setSelected(sessUp.refs);
                        return;
                    }

                    // Final footprint check using snaps + shift (layersRef is
                    // updated via an effect and is not yet in sync). If every
                    // footprint was valid before the drag but is invalid
                    // after, abort the commit; otherwise allow moving large
                    // objects that already stick out of the boundary.
                    if (
                        sessUp.preMoveAllValid &&
                        !everyRefPlacementFootprintAllowedAfterShift(
                            sessUp.snaps,
                            sessUp.refs,
                            lastDwx,
                            lastDwy,
                            boundaryRef.current,
                            toolMarginRef.current,
                            cameraDegRef.current,
                            viewBoxRef.current,
                        )
                    ) {
                        setStatus(t('status.moveCancelledOutOfBoundary'));
                        setSelected(sessUp.refs);
                        return;
                    }

                    const dwxFinal = lastDwx;
                    const dwyFinal = lastDwy;
                    const after = sessUp.refs
                        .map((ref) => {
                            const sp = sessUp.snaps[refKey(ref)];
                            if (!sp) return null;
                            return {
                                ref,
                                x: Math.round(sp.wx + dwxFinal),
                                y: Math.round(sp.wy + dwyFinal),
                                r: sp.r,
                            };
                        })
                        .filter((update) => update !== null);
                    const before = sessUp.refs
                        .map((ref) => {
                            const sp = sessUp.snaps[refKey(ref)];
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
                        label: t('status.moveLabel'),
                    });

                    setStatus(
                        sessUp.refs.length > 1
                            ? t('status.movedMany', {
                                count: sessUp.refs.length,
                            })
                            : t('status.movedOne'),
                    );
                };
                selectDragCleanupRef.current = cleanupDrag;
                window.addEventListener('mousemove', onWinMoveDrag);
                window.addEventListener('mouseup', onWinUpDrag);
                return;
            }

            const bg = backgroundRef.current;
            const nat = bgNaturalSizeRef.current;
            if (
                !bg.locked &&
                bg.path?.trim() &&
                nat &&
                nat.w >= 1 &&
                nat.h >= 1
            ) {
                const rawDown = svgClientToView(svg, e.clientX, e.clientY);
                const vb0 = viewBoxRef.current;
                const metrics0 = resolveBackgroundDisplayMetrics(
                    bg,
                    nat,
                    boundaryRef.current,
                    cameraDegRef.current,
                    vb0,
                );
                if (metrics0) {
                    const zh = classifyBackgroundPointer(
                        metrics0,
                        rawDown.x,
                        rawDown.y,
                        vb0,
                    );
                    if (zh) {
                        setBgSelected(true);
                        setSelected([]);

                        const [sx0, sy0] = mplViewPointToSvg(
                            metrics0.cx,
                            metrics0.cy,
                            vb0,
                        );
                        const [refLx, refLy] = backgroundSvgPointerToLocal(
                            rawDown.x,
                            rawDown.y,
                            sx0,
                            sy0,
                            metrics0.rotDeg,
                        );

                        const MOVE_EPS_SQ = 0.5 * 0.5;
                        let snapshotPushedBg = false;

                        const scaleAtStart = bg.scale ?? 1;
                        const grabVx = (bg.offset_x ?? 0) - x;
                        const grabVy = (bg.offset_y ?? 0) - y;

                        const onWinMoveBg =
                            zh.kind === 'inside'
                                ? (ev: MouseEvent) => {
                                      const svgEl = svgRef.current;
                                      if (!svgEl) return;
                                      const vb = viewBoxRef.current;
                                      const { x: mx, y: my } =
                                          svgClientToMplView(
                                              svgEl,
                                              ev.clientX,
                                              ev.clientY,
                                              vb,
                                          );
                                      const dx = mx - x;
                                      const dy = my - y;
                                      if (
                                          !snapshotPushedBg &&
                                          dx * dx + dy * dy > MOVE_EPS_SQ
                                      ) {
                                          pushBackgroundUndo(
                                              { ...backgroundRef.current },
                                              t('status.bgMoveLabel'),
                                          );
                                          snapshotPushedBg = true;
                                      }
                                      const nx = mx + grabVx;
                                      const ny = my + grabVy;
                                      setBackground((b) => ({
                                          ...b,
                                          offset_x: nx,
                                          offset_y: ny,
                                      }));
                                  }
                                : (ev: MouseEvent) => {
                                      const svgEl = svgRef.current;
                                      if (!svgEl) return;
                                      const raw = svgClientToView(
                                          svgEl,
                                          ev.clientX,
                                          ev.clientY,
                                      );
                                      const vb = viewBoxRef.current;
                                      const curBg = backgroundRef.current;
                                      const curNat = bgNaturalSizeRef.current;
                                      if (
                                          !curNat ||
                                          curNat.w < 1 ||
                                          curNat.h < 1
                                      )
                                          return;
                                      const mNow =
                                          resolveBackgroundDisplayMetrics(
                                              curBg,
                                              curNat,
                                              boundaryRef.current,
                                              cameraDegRef.current,
                                              vb,
                                          );
                                      if (!mNow) return;
                                      const [cxs, cys] = mplViewPointToSvg(
                                          mNow.cx,
                                          mNow.cy,
                                          vb,
                                      );
                                      const [lx, ly] =
                                          backgroundSvgPointerToLocal(
                                              raw.x,
                                              raw.y,
                                              cxs,
                                              cys,
                                              mNow.rotDeg,
                                          );
                                      const resizeHit =
                                          zh as BackgroundResizeHit;
                                      const ratio = backgroundResizeRatio(
                                          resizeHit,
                                          lx,
                                          ly,
                                          refLx,
                                          refLy,
                                      );
                                      const newScale = clampBackgroundScale(
                                          scaleAtStart * ratio,
                                      );
                                      if (
                                          !snapshotPushedBg &&
                                          Math.abs(newScale - scaleAtStart) >
                                              1e-6
                                      ) {
                                          pushBackgroundUndo(
                                              { ...backgroundRef.current },
                                              t('status.bgScaleLabel'),
                                          );
                                          snapshotPushedBg = true;
                                      }
                                      setBackground((b) => ({
                                          ...b,
                                          scale: newScale,
                                      }));
                                  };

                        const cleanupBgInteract = () => {
                            window.removeEventListener(
                                'mousemove',
                                onWinMoveBg,
                            );
                            window.removeEventListener('mouseup', onWinUpBg);
                            bgInteractCleanupRef.current = null;
                        };
                        const onWinUpBg = (ev: MouseEvent) => {
                            if (ev.button !== 0) return;
                            const moved = snapshotPushedBg;
                            cleanupBgInteract();
                            if (moved) {
                                setStatus(
                                    zh.kind === 'inside'
                                        ? t('status.bgMoved')
                                        : t('status.bgScaled'),
                                );
                            }
                        };
                        bgInteractCleanupRef.current = cleanupBgInteract;
                        window.addEventListener('mousemove', onWinMoveBg);
                        window.addEventListener('mouseup', onWinUpBg);
                        setSelectDrag(null);
                        selectDragRef.current = null;
                        return;
                    }
                }
            }

            setBgSelected(false);
            const sx = x;
            const sy = y;
            const marqueeSubtractive = additive && selected.length > 0;
            const marqueeBaseSelection: PlacementRef[] = marqueeSubtractive
                ? [...selected]
                : [];
            let marqueePastThreshold = false;
            const thresh = MARQUEE_MIN_DRAG_VIEW;
            const onWinMove = (ev: MouseEvent) => {
                const svgEl = svgRef.current;
                if (!svgEl) return;
                const { x: mx, y: my } = svgClientToMplView(
                    svgEl,
                    ev.clientX,
                    ev.clientY,
                    viewBoxRef.current,
                );
                const dx = mx - sx;
                const dy = my - sy;
                if (
                    !marqueePastThreshold &&
                    dx * dx + dy * dy >= thresh * thresh
                )
                    marqueePastThreshold = true;
                if (marqueePastThreshold)
                    setMarqueeView([sx, sy, mx, my]);
            };
            const cleanup = () => {
                window.removeEventListener('mousemove', onWinMove);
                window.removeEventListener('mouseup', onWinUp);
                selectDragCleanupRef.current = null;
                setMarqueeView(null);
            };
            const onWinUp = (ev: MouseEvent) => {
                if (ev.button !== 0) return;
                const svgEl = svgRef.current;
                let mx = sx;
                let my = sy;
                if (svgEl) {
                    const v = svgClientToMplView(
                        svgEl,
                        ev.clientX,
                        ev.clientY,
                        viewBoxRef.current,
                    );
                    mx = v.x;
                    my = v.y;
                }
                const dx = mx - sx;
                const dy = my - sy;
                const wasMarquee =
                    marqueePastThreshold ||
                    dx * dx + dy * dy >= thresh * thresh;
                if (wasMarquee) {
                    const ls = layersRef.current;
                    const hits = collectRefsInMarqueeView(
                        ls,
                        cameraDegRef.current,
                        sx,
                        mx,
                        sy,
                        my,
                    );
                    const combined = marqueeSubtractive
                        ? subtractRefs(marqueeBaseSelection, hits)
                        : hits;
                    setSelected(
                        normalizeSelectionLayer0(uniqRefs(combined)),
                    );
                } else if (!marqueeSubtractive) {
                    setSelected([]);
                }
                cleanup();
            };
            selectDragCleanupRef.current = cleanup;
            window.addEventListener('mousemove', onWinMove);
            window.addEventListener('mouseup', onWinUp);
            setSelectDrag(null);
            selectDragRef.current = null;
            return;
        }
        if (tool.variant === 'eraser') {
            setBgSelected(false);
            const layerIdx = activeLayerIdx;
            const layerAtStart = useEditorStore.getState().layers[layerIdx];
            if (!layerAtStart || layerAtStart.locked)
                return;

            const beforeBatches = cloneBatches(layerAtStart.batches);
            const previousSelection = cloneSelection(selected);
            let changed = false;
            let totalRemoved = 0;

            const applyErase = (vx: number, vy: number) => {
                const currentLayer = useEditorStore.getState().layers[layerIdx];
                if (!currentLayer || currentLayer.locked)
                    return;
                const result = eraseLayerBatchesAtView({
                    batches: currentLayer.batches,
                    tool,
                    cameraDeg: cameraDegRef.current,
                    eraserRadius: Math.max(tool.brush_width_view * 0.5, 2),
                    vx,
                    vy,
                });
                if (result.needsTargetSelection) {
                    setStatus(t('status.eraserNeedTarget'));
                    return;
                }
                if (result.removed === 0)
                    return;
                totalRemoved += result.removed;
                changed = true;
                setSelected([]);
                updateLayer(layerIdx, (layer) => ({
                    ...layer,
                    batches: result.nextBatches,
                }));
                setStatus(t('status.erasedCount', { count: totalRemoved }));
            };

            const finalizeErase = () => {
                window.removeEventListener('mousemove', onWinMoveErase);
                window.removeEventListener('mouseup', onWinUpErase);
                eraseCleanupRef.current = null;
                if (!changed) {
                    setStatus(t('status.eraserNoHit'));
                    return;
                }
                const finalLayer = useEditorStore.getState().layers[layerIdx];
                if (!finalLayer)
                    return;
                const command = {
                    type: 'layer_replace_batches' as const,
                    layerIdx,
                    before: cloneBatches(beforeBatches),
                    after: cloneBatches(finalLayer.batches),
                    previousSelection,
                    nextSelection: [],
                    clearBgSelection: false,
                };
                pushCommandUndo(
                    invertEditorCommand(command),
                    t('status.eraserLabel'),
                );
                setStatus(t('status.erasedCount', { count: totalRemoved }));
            };

            const onWinMoveErase = (ev: MouseEvent) => {
                if ((ev.buttons & 1) === 0)
                    return;
                const svgEl = svgRef.current;
                if (!svgEl)
                    return;
                const point = svgClientToMplView(
                    svgEl,
                    ev.clientX,
                    ev.clientY,
                    viewBoxRef.current,
                );
                setCursorView([point.x, point.y]);
                applyErase(point.x, point.y);
            };

            const onWinUpErase = (ev: MouseEvent) => {
                if (ev.button !== 0)
                    return;
                finalizeErase();
            };

            applyErase(x, y);
            eraseCleanupRef.current = finalizeErase;
            window.addEventListener('mousemove', onWinMoveErase);
            window.addEventListener('mouseup', onWinUpErase);
            return;
        }
        if (tool.variant === 'line') {
            setSelected([]);
            setBgSelected(false);
            const seed: [number, number][] = [[x, y]];
            lineBrushActiveRef.current = true;
            lineDraftRef.current = { points: seed };
            setLineDraft({ points: seed });
            const finish = (ev: MouseEvent) => {
                if (ev.button !== 0) return;
                window.removeEventListener('mouseup', finish);
                lineBrushActiveRef.current = false;
                const d = lineDraftRef.current;
                lineDraftRef.current = null;
                setLineDraft(null);
                if (d?.points?.length) placeStrokeRef.current(d.points);
            };
            window.addEventListener('mouseup', finish);
            return;
        }
        if (tool.variant === 'fill') {
            setSelected([]);
            setBgSelected(false);
            placeFillAt(x, y);
            return;
        }
        setBgSelected(false);
        placeObjectAt(x, y);
    };

    const onMouseMoveSvg = (e: ReactMouseEvent) => {
        const svg = svgRef.current;
        if (!svg) return;
        if (panDrag) {
            const prev = svgClientToMplView(
                svg,
                panDrag.lastCx,
                panDrag.lastCy,
                viewBox,
            );
            const cur = svgClientToMplView(svg, e.clientX, e.clientY, viewBox);
            setPanDrag({ lastCx: e.clientX, lastCy: e.clientY });
            setViewBox((vb) => ({
                ...vb,
                x: vb.x - (cur.x - prev.x),
                y: vb.y - (cur.y - prev.y),
            }));
            return;
        }
        const { x, y } = svgClientToMplView(svg, e.clientX, e.clientY, viewBox);
        setCursorView([x, y]);
        if (
            lineBrushActiveRef.current &&
            tool.variant === 'line' &&
            e.buttons & 1 &&
            ui.drawing_enabled &&
            !panDrag
        ) {
            setLineDraft((d) => {
                if (!d) return d;
                const nextPts = appendBrushPoint(d.points, x, y);
                const next = { points: nextPts };
                lineDraftRef.current = next;
                return next;
            });
        }
    };

    return {
        onMouseDownSvg,
        onMouseMoveSvg,
    };
}
