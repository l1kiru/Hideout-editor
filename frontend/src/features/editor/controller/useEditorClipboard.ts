import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type {
    PaintLayer,
    Tool,
    UiState,
    XYZRPlacement,
} from '../../../types/scene';
import {
    DECORATIONS,
    TOOL_FV_ASSET_KEY,
} from '../../../lib/sceneDecorations';
import { placementFootprintAllowed } from '../lib/editorPlacementValidate';
import { DEFAULT_MAP_LAYER_INDEX } from '../lib/editorConstants';
import type { LayerId } from '../lib/editorIds';
import { layerId } from '../lib/editorIds';
import {
    getPlacementEligibility,
    partitionClipboardBatchesForClipboard,
    partitionSelectionForClipboard,
} from '../lib/editorPlacementEligibility';
import {
    normalizeSelectionLayer0,
    readPlacement,
    uniqRefs,
} from '../lib/placementSelection';
import type { PlacementRef, SelectionState } from '../model/editorSessionTypes';
import type { ViewBox } from '../lib/editorViewport';
import { viewToWorld } from '../../../lib/coords';
import useEditorStore from '../../../stores/editorStore';

const PASTE_OFFSET_WORLD = 24;

// World-space centroid of every clipboard point, used as the cross-map paste anchor.
function clipboardAnchorWorld(clip: EditorClipboardBatch[]): [number, number] {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const e of clip) {
        for (const p of e.placements) {
            sx += p.x;
            sy += p.y;
            n++;
        }
    }
    if (n === 0) return [0, 0];
    return [sx / n, sy / n];
}

function boundaryCentroidWorld(
    bd: [number, number][],
): [number, number] | null {
    if (bd.length < 3) return null;
    let sx = 0;
    let sy = 0;
    for (const [x, y] of bd) {
        sx += x;
        sy += y;
    }
    const n = bd.length;
    return [sx / n, sy / n];
}

function pushTargetDistinct(
    list: [number, number][],
    pt: [number, number],
    eps: number,
): void {
    if (list.some(([x, y]) => Math.hypot(x - pt[0], y - pt[1]) < eps)) return;
    list.push(pt);
}

function footprintOkForShiftedClip(
    clip: EditorClipboardBatch[],
    dx: number,
    dy: number,
    bd: [number, number][],
    margin: number,
    cam: number,
    vb: ViewBox,
): boolean {
    for (const entry of clip) {
        for (const p of entry.placements) {
            const x = Math.round(p.x + dx);
            const y = Math.round(p.y + dy);
            const r = Math.round(p.r);
            if (
                !placementFootprintAllowed(
                    x,
                    y,
                    r,
                    bd,
                    margin,
                    cam,
                    entry.template_hash,
                    entry.facet_fv,
                    vb,
                    entry.line_stroke === true,
                )
            )
                return false;
        }
    }
    return true;
}

// Picks a paste shift: first under the cursor (mpl-view -> world), then the
// boundary centroid, then a small offset as before.
function resolvePasteDeltaWorld(
    clip: EditorClipboardBatch[],
    bd: [number, number][],
    cam: number,
    margin: number,
    vb: ViewBox,
    cursorViewRef: MutableRefObject<[number, number] | null>,
): { dx: number; dy: number } | null {
    const anchor = clipboardAnchorWorld(clip);
    const targets: [number, number][] = [];
    const cv = cursorViewRef.current;
    if (cv && cv.length >= 2)
        pushTargetDistinct(targets, viewToWorld(cv[0], cv[1], cam), 8);
    const cen = boundaryCentroidWorld(bd);
    if (cen) pushTargetDistinct(targets, cen, 8);
    pushTargetDistinct(
        targets,
        [anchor[0] + PASTE_OFFSET_WORLD, anchor[1] + PASTE_OFFSET_WORLD],
        8,
    );

    for (const tw of targets) {
        const dx = tw[0] - anchor[0];
        const dy = tw[1] - anchor[1];
        if (footprintOkForShiftedClip(clip, dx, dy, bd, margin, cam, vb))
            return { dx, dy };
    }
    return null;
}

export type EditorClipboardBatch = {
    template_name_ru: string;
    template_hash: number;
    placements: XYZRPlacement[];
    facet_fv?: number | null;
    line_stroke?: boolean | undefined;
};

export const SS_CLIP_KEY = 'hideout-editor-placement-clipboard-v1';

type ClipboardEnvelope = { v: 1; batches: EditorClipboardBatch[] };

export function clearClipboardSs(): void {
    try {
        sessionStorage.removeItem(SS_CLIP_KEY);
    } catch {
        /* ignore */
    }
}

export function writeClipboardSs(batches: EditorClipboardBatch[]): void {
    try {
        const { eligibleBatches } = partitionClipboardBatchesForClipboard(batches);
        if (eligibleBatches.length === 0) {
            sessionStorage.removeItem(SS_CLIP_KEY);
            return;
        }
        const env: ClipboardEnvelope = { v: 1, batches: eligibleBatches };
        sessionStorage.setItem(SS_CLIP_KEY, JSON.stringify(env));
    } catch {
        /* ignore */
    }
}

export function readClipboardSs(): EditorClipboardBatch[] | null {
    try {
        const raw = sessionStorage.getItem(SS_CLIP_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw) as ClipboardEnvelope;
        if (!p || p.v !== 1 || !Array.isArray(p.batches)) return null;
        const { eligibleBatches } = partitionClipboardBatchesForClipboard(
            p.batches,
        );
        if (eligibleBatches.length !== p.batches.length) {
            writeClipboardSs(eligibleBatches);
        }
        return eligibleBatches.length > 0 ? eligibleBatches : null;
    } catch {
        return null;
    }
}

function buildClipboardBatches(
    layers: PaintLayer[],
    refs: ReadonlyArray<PlacementRef>,
): EditorClipboardBatch[] {
    const selected = uniqRefs(refs);
    if (selected.length === 0) return [];

    selected.sort(
        (a, b) =>
            a.layerIdx - b.layerIdx ||
            a.batchIdx - b.batchIdx ||
            a.placementIdx - b.placementIdx,
    );

    const byBatch = new Map<string, PlacementRef[]>();
    for (const r of selected) {
        const k = `${r.layerIdx}:${r.batchIdx}`;
        if (!byBatch.has(k)) byBatch.set(k, []);
        byBatch.get(k)!.push(r);
    }

    const keys = [...byBatch.keys()].sort((a, b) => {
        const [la, ba] = a.split(':').map(Number);
        const [lb, bb] = b.split(':').map(Number);
        return la - lb || ba - bb;
    });

    const out: EditorClipboardBatch[] = [];
    for (const k of keys) {
        const batchRefs = byBatch.get(k)!;
        batchRefs.sort((a, b) => a.placementIdx - b.placementIdx);
        const r0 = batchRefs[0];
        const ly = layers[r0.layerIdx];
        const b = ly?.batches[r0.batchIdx];
        if (!ly || !b) continue;

        const placements: XYZRPlacement[] = [];
        for (const ref of batchRefs) {
            const p = readPlacement(layers, ref);
            if (p) placements.push({ ...p });
        }
        if (placements.length === 0) continue;

        out.push({
            template_name_ru: b.template_name_ru,
            template_hash: b.template_hash,
            facet_fv: b.facet_fv,
            line_stroke: b.line_stroke,
            placements,
        });
    }
    return out;
}

export function useEditorClipboard(opts: {
    layersRef: MutableRefObject<PaintLayer[]>;
    layerIdx: LayerId;
    selected: SelectionState;
    ui: UiState;
    tool: Tool;
    boundaryRef: MutableRefObject<[number, number][]>;
    cameraDegRef: MutableRefObject<number>;
    toolMarginRef: MutableRefObject<number>;
    viewBoxRef: MutableRefObject<ViewBox>;
    cursorViewRef: MutableRefObject<[number, number] | null>;
    setSelected: Dispatch<SetStateAction<SelectionState>>;
    setStatus: Dispatch<SetStateAction<string>>;
}) {
    const { t } = useTranslation('editor');
    const {
        layersRef,
        layerIdx,
        selected,
        ui,
        tool,
        boundaryRef,
        cameraDegRef,
        toolMarginRef,
        viewBoxRef,
        cursorViewRef,
        setSelected,
        setStatus,
    } = opts;
    const appendBatchesToLayer = useEditorStore(
        (state) => state.appendBatchesToLayer,
    );

    const clipboardRef = useRef<EditorClipboardBatch[] | null>(null);

    useEffect(() => {
        const fromSs = readClipboardSs();
        if (fromSs) clipboardRef.current = fromSs;
    }, []);

    const copySelected = useCallback(() => {
        const ls = layersRef.current;
        const {
            lockedRefs,
            defaultLayerRefs,
            eligibleRefs,
            skippedRefs,
        } = partitionSelectionForClipboard(ls, selected);
        if (lockedRefs.length > 0) {
            setStatus(t('status.copyLockedLayer'));
            return;
        }
        setSelected(normalizeSelectionLayer0(eligibleRefs));
        if (eligibleRefs.length === 0) {
            clipboardRef.current = null;
            clearClipboardSs();
            setStatus(
                defaultLayerRefs.length > 0
                    ? t('status.copyDefaultLocked')
                    : t('status.copyNoEligible'),
            );
            return;
        }
        const batches = buildClipboardBatches(ls, eligibleRefs);
        if (batches.length === 0) {
            clipboardRef.current = null;
            clearClipboardSs();
            setStatus(t('status.copyNothing'));
            return;
        }
        clipboardRef.current = batches;
        writeClipboardSs(batches);
        const n = batches.reduce((acc, b) => acc + b.placements.length, 0);
        const skippedCount = skippedRefs.length + defaultLayerRefs.length;
        setStatus(
            skippedCount > 0
                ? t('status.copiedPartial', {
                      count: n,
                      skipped: skippedCount,
                  })
                : n > 1
                  ? t('status.copiedMany', { count: n })
                  : t('status.copiedOne'),
        );
    }, [layersRef, selected, setSelected, setStatus, t]);

    const pasteClipboard = useCallback(() => {
        let clip = clipboardRef.current;
        if (!clip?.length) {
            const fromSs = readClipboardSs();
            if (fromSs?.length) {
                clip = fromSs;
                clipboardRef.current = fromSs;
            }
        }
        if (!clip?.length) {
            setStatus(t('status.clipboardEmpty'));
            return;
        }
        const clipPartition = partitionClipboardBatchesForClipboard(clip);
        if (clipPartition.eligibleBatches.length !== clip.length) {
            clip = clipPartition.eligibleBatches;
            clipboardRef.current = clip.length > 0 ? clip : null;
            writeClipboardSs(clip);
        }
        if (!clip?.length) {
            setStatus(t('status.pasteClipboardNoEligible'));
            return;
        }
        if (!ui.drawing_enabled) {
            setStatus(t('status.drawingDisabled'));
            return;
        }

        const ls = layersRef.current;

        let targetIdx = Number(layerIdx);
        if (targetIdx === DEFAULT_MAP_LAYER_INDEX) {
            const ji = ls.findIndex((l, i) => i > 0 && !l.locked);
            if (ji === -1) {
                setStatus(t('status.pasteOnTemplateLocked'));
                return;
            }
            targetIdx = ji;
        }

        const lyTarget = ls[targetIdx];
        if (!lyTarget || lyTarget.locked) {
            setStatus(t('status.pasteLayerLocked'));
            return;
        }

        const bd = boundaryRef.current;
        const cam = cameraDegRef.current;
        const margin = toolMarginRef.current;
        const vb = viewBoxRef.current;

        const delta = resolvePasteDeltaWorld(
            clip,
            bd,
            cam,
            margin,
            vb,
            cursorViewRef,
        );
        if (!delta) {
            setStatus(t('status.pasteOutOfZone'));
            return;
        }
        const { dx, dy } = delta;

        const newBatches: PaintLayer['batches'] = [];

        for (const entry of clip) {
            const eligibility = getPlacementEligibility(entry);
            const asset = eligibility.assetKey
                ? DECORATIONS[eligibility.assetKey]
                : undefined;

            const shifted: XYZRPlacement[] = entry.placements.map((p) => ({
                x: Math.round(p.x + dx),
                y: Math.round(p.y + dy),
                r: Math.round(p.r),
            }));

            const facetFv =
                entry.facet_fv !== undefined && entry.facet_fv !== null
                    ? entry.facet_fv
                    : eligibility.assetKey === TOOL_FV_ASSET_KEY
                      ? tool.fv
                      : (asset?.fv ?? 0);

            newBatches.push({
                template_name_ru: entry.template_name_ru,
                template_hash: entry.template_hash,
                placements: shifted,
                facet_fv: facetFv,
                line_stroke: entry.line_stroke,
            });
        }

        if (newBatches.length === 0) {
            setStatus(t('status.pasteFailed'));
            return;
        }

        const startBatchIdx = ls[targetIdx]!.batches.length;
        const newSelected: PlacementRef[] = [];
        let bi = startBatchIdx;
        for (const batch of newBatches) {
            for (let pi = 0; pi < batch.placements.length; pi++) {
                newSelected.push({
                    layerIdx: layerId(targetIdx),
                    batchIdx: bi,
                    placementIdx: pi,
                });
            }
            bi += 1;
        }

        appendBatchesToLayer({
            layerIdx: layerId(targetIdx),
            batches: newBatches,
            label: t('status.pasteLabel'),
            nextSelected: normalizeSelectionLayer0(uniqRefs(newSelected)),
            clearBgSelection: true,
        });
        setStatus(
            clipPartition.skippedPlacementCount > 0
                ? t('status.pastedPartial', {
                      count: newSelected.length,
                      skipped: clipPartition.skippedPlacementCount,
                  })
                : newSelected.length > 1
                  ? t('status.pastedMany', { count: newSelected.length })
                  : t('status.pastedOne'),
        );
    }, [
        boundaryRef,
        cameraDegRef,
        cursorViewRef,
        layerIdx,
        layersRef,
        setStatus,
        tool.fv,
        toolMarginRef,
        ui.drawing_enabled,
        viewBoxRef,
        appendBatchesToLayer,
        t,
    ]);

    return { clipboardRef, copySelected, pasteClipboard };
}
