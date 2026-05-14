import { worldToView } from '../../../lib/coords';
import {
    DECORATIONS,
    DRAWING_ASSET_KEYS,
} from '../../../lib/sceneDecorations';
import type { PaintedBatch, Tool } from '../../../types/scene';
import { circleTouchesRect } from './editorHitTest';
import { eraserAffectsAsset } from './editorDefaults';
import { getPlacementEligibility } from './editorPlacementEligibility';

export type EraseLayerBatchesAtViewArgs = {
    batches: PaintedBatch[];
    tool: Tool;
    cameraDeg: number;
    eraserRadius: number;
    vx: number;
    vy: number;
};

export type EraseLayerBatchesAtViewResult = {
    nextBatches: PaintedBatch[];
    removed: number;
    needsTargetSelection: boolean;
};

export function eraseLayerBatchesAtView(
    args: EraseLayerBatchesAtViewArgs,
): EraseLayerBatchesAtViewResult {
    const {
        batches,
        tool,
        cameraDeg,
        eraserRadius,
        vx,
        vy,
    } = args;
    const et = tool.eraser_targets;
    if (
        et &&
        DRAWING_ASSET_KEYS.every((key) => et[key] === false)
    ) {
        return {
            nextBatches: batches,
            removed: 0,
            needsTargetSelection: true,
        };
    }

    let removed = 0;
    const nextBatches: PaintedBatch[] = [];
    for (const batch of batches) {
        const eligibility = getPlacementEligibility(batch);
        if (!eligibility.hasKnownPreview || !eligibility.assetKey) {
            nextBatches.push(batch);
            continue;
        }
        if (!eraserAffectsAsset(tool, eligibility.assetKey)) {
            nextBatches.push(batch);
            continue;
        }
        const asset = DECORATIONS[eligibility.assetKey];
        const kept = batch.placements.filter((placement) => {
            const [pvx, pvy] = worldToView(placement.x, placement.y, cameraDeg);
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
        if (kept.length > 0) {
            nextBatches.push({ ...batch, placements: kept });
        }
    }

    return {
        nextBatches,
        removed,
        needsTargetSelection: false,
    };
}
