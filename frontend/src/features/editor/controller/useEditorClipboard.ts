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
    assetKeyForTemplate,
} from '../../../lib/sceneDecorations';
import { placementFootprintAllowed } from '../lib/editorPlacementValidate';
import { DEFAULT_MAP_LAYER_INDEX } from '../lib/editorConstants';
import type { LayerId } from '../lib/editorIds';
import { layerId } from '../lib/editorIds';
import {
    normalizeSelectionLayer0,
    readPlacement,
    uniqRefs,
} from '../lib/placementSelection';
import type {
    PlacementRef,
    SelectionState,
} from '../model/editorSessionTypes';
import type { ViewBox } from '../lib/editorViewport';
import { viewToWorld } from '../../../lib/coords';

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

const SS_CLIP_KEY = 'hideout-editor-placement-clipboard-v1';

type ClipboardEnvelope = { v: 1; batches: EditorClipboardBatch[] };

function writeClipboardSs(batches: EditorClipboardBatch[]): void {
    try {
        const env: ClipboardEnvelope = { v: 1, batches };
        sessionStorage.setItem(SS_CLIP_KEY, JSON.stringify(env));
    } catch {
        /* ignore */
    }
}

function readClipboardSs(): EditorClipboardBatch[] | null {
    try {
        const raw = sessionStorage.getItem(SS_CLIP_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw) as ClipboardEnvelope;
        if (!p || p.v !== 1 || !Array.isArray(p.batches)) return null;
        return p.batches.length > 0 ? p.batches : null;
    } catch {
        return null;
    }
}

function buildClipboardBatches(
    layers: PaintLayer[],
    selected: SelectionState,
): EditorClipboardBatch[] {
    const refs = uniqRefs(selected);
    if (refs.length === 0) return [];

    refs.sort(
        (a, b) =>
            a.layerIdx - b.layerIdx ||
            a.batchIdx - b.batchIdx ||
            a.placementIdx - b.placementIdx,
    );

    const byBatch = new Map<string, PlacementRef[]>();
    for (const r of refs) {
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
    saveLayerSnapshot: (label: string) => void;
    setLayers: Dispatch<SetStateAction<PaintLayer[]>>;
    setSelected: Dispatch<SetStateAction<SelectionState>>;
    setStatus: Dispatch<SetStateAction<string>>;
    setBgSelected: Dispatch<SetStateAction<boolean>>;
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
        saveLayerSnapshot,
        setLayers,
        setSelected,
        setStatus,
        setBgSelected,
    } = opts;

    const clipboardRef = useRef<EditorClipboardBatch[] | null>(null);

    useEffect(() => {
        const fromSs = readClipboardSs();
        if (fromSs) clipboardRef.current = fromSs;
    }, []);

    const copySelected = useCallback(() => {
        const ls = layersRef.current;
        if (selected.some((r) => r.layerIdx === layerId(DEFAULT_MAP_LAYER_INDEX))) {
            setStatus(t('status.copyDefaultLocked'));
            return;
        }
        if (selected.some((r) => ls[r.layerIdx]?.locked)) {
            setStatus(t('status.copyLockedLayer'));
            return;
        }
        const batches = buildClipboardBatches(ls, selected);
        if (batches.length === 0) {
            setStatus(t('status.copyNothing'));
            return;
        }
        clipboardRef.current = batches;
        writeClipboardSs(batches);
        const n = batches.reduce((acc, b) => acc + b.placements.length, 0);
        setStatus(
            n > 1
                ? t('status.copiedMany', { count: n })
                : t('status.copiedOne'),
        );
    }, [layersRef, selected, setStatus, t]);

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
        if (!ui.drawing_enabled) {
            setStatus(t('status.drawingDisabled'));
            return;
        }

        const ls = layersRef.current;

        let targetIdx = Number(layerIdx);
        if (targetIdx === DEFAULT_MAP_LAYER_INDEX) {
            const ji = ls.findIndex((l, i) => i > 0 && !l.locked);
            if (ji === -1) {
                setStatus(
                    t('status.pasteOnTemplateLocked'),
                );
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
            setStatus(
                t('status.pasteOutOfZone'),
            );
            return;
        }
        const { dx, dy } = delta;

        const newBatches: PaintLayer['batches'] = [];

        for (const entry of clip) {
            const ak = assetKeyForTemplate(entry.template_hash, entry.facet_fv);
            const asset = ak ? DECORATIONS[ak] : undefined;

            const shifted: XYZRPlacement[] = entry.placements.map((p) => ({
                x: Math.round(p.x + dx),
                y: Math.round(p.y + dy),
                r: Math.round(p.r),
            }));

            const facetFv =
                entry.facet_fv !== undefined && entry.facet_fv !== null
                    ? entry.facet_fv
                    : ak === TOOL_FV_ASSET_KEY
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

        saveLayerSnapshot(t('status.pasteLabel'));

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

        setLayers((prev) =>
            prev.map((l, li) =>
                li !== targetIdx
                    ? l
                    : { ...l, batches: [...l.batches, ...newBatches] },
            ),
        );

        setSelected(normalizeSelectionLayer0(uniqRefs(newSelected)));
        setBgSelected(false);
        setStatus(
            newSelected.length > 1
                ? t('status.pastedMany', { count: newSelected.length })
                : t('status.pastedOne'),
        );
    }, [
        boundaryRef,
        cameraDegRef,
        cursorViewRef,
        layerIdx,
        layersRef,
        saveLayerSnapshot,
        setBgSelected,
        setLayers,
        setSelected,
        setStatus,
        tool.fv,
        toolMarginRef,
        ui.drawing_enabled,
        viewBoxRef,
        t,
    ]);

    return { clipboardRef, copySelected, pasteClipboard };
}
