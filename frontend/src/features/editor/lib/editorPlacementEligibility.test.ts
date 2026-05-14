import { describe, expect, it } from 'vitest';

import { DECORATIONS } from '../../../lib/sceneDecorations';
import { layerId } from './editorIds';
import {
    getPlacementEligibility,
    isBatchEligibleForClipboard,
    layerContainsIneligibleCountChangeObjects,
    partitionClipboardBatchesForClipboard,
    partitionClipboardBatchesForCountChange,
    partitionSelectionForClipboard,
    partitionRefsForCountChange,
    partitionSelectionForCountChange,
} from './editorPlacementEligibility';
import { createUserPaintLayer } from './editorLayers';

const KNOWN_MOSS = DECORATIONS.moss;
const KNOWN_RUBBLE = DECORATIONS.maraketh_rubble1;

describe('editorPlacementEligibility', () => {
    it('marks known preview object batches as eligible', () => {
        expect(
            getPlacementEligibility({
                template_hash: KNOWN_MOSS.hash,
                facet_fv: KNOWN_MOSS.fv,
                line_stroke: false,
            }),
        ).toMatchObject({
            assetKey: 'moss',
            hasKnownPreview: true,
            isLineStroke: false,
            eligibleForCountChange: true,
        });
    });

    it('rejects unknown batches and keeps known line-stroke batches eligible for count changes', () => {
        expect(
            getPlacementEligibility({
                template_hash: 999999,
                facet_fv: 0,
                line_stroke: false,
            }).eligibleForCountChange,
        ).toBe(false);
        expect(
            getPlacementEligibility({
                template_hash: KNOWN_MOSS.hash,
                facet_fv: KNOWN_MOSS.fv,
                line_stroke: true,
            }).eligibleForCountChange,
        ).toBe(true);
    });

    it('allows line-stroke batches in clipboard eligibility when preview is known', () => {
        expect(
            isBatchEligibleForClipboard({
                template_hash: KNOWN_MOSS.hash,
                facet_fv: KNOWN_MOSS.fv,
                line_stroke: true,
            }),
        ).toBe(true);
        expect(
            isBatchEligibleForClipboard({
                template_hash: 999999,
                facet_fv: 0,
                line_stroke: true,
            }),
        ).toBe(false);
    });

    it('partitions refs by preview eligibility only', () => {
        const layers = [
            createUserPaintLayer([
                {
                    template_name_ru: 'known',
                    template_hash: KNOWN_MOSS.hash,
                    facet_fv: KNOWN_MOSS.fv,
                    line_stroke: false,
                    placements: [{ x: 1, y: 2, r: 0 }],
                },
                {
                    template_name_ru: 'unknown',
                    template_hash: 999999,
                    facet_fv: 0,
                    line_stroke: false,
                    placements: [{ x: 3, y: 4, r: 0 }],
                },
            ]),
            {
                ...createUserPaintLayer([
                    {
                        template_name_ru: 'known-too',
                        template_hash: KNOWN_RUBBLE.hash,
                        facet_fv: KNOWN_RUBBLE.fv,
                        line_stroke: false,
                        placements: [{ x: 5, y: 6, r: 0 }],
                    },
                ]),
                locked: true,
            },
        ];

        expect(
            partitionRefsForCountChange(layers, [
                { layerIdx: layerId(0), batchIdx: 0, placementIdx: 0 },
                { layerIdx: layerId(0), batchIdx: 1, placementIdx: 0 },
                { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
            ]),
        ).toEqual({
            eligibleRefs: [
                { layerIdx: layerId(0), batchIdx: 0, placementIdx: 0 },
                { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
            ],
            skippedRefs: [
                { layerIdx: layerId(0), batchIdx: 1, placementIdx: 0 },
            ],
        });
    });

    it('partitions selection by lock, default-layer guard and eligibility', () => {
        const layers = [
            {
                ...createUserPaintLayer([
                    {
                        template_name_ru: 'default-known',
                        template_hash: KNOWN_MOSS.hash,
                        facet_fv: KNOWN_MOSS.fv,
                        line_stroke: false,
                        placements: [{ x: 1, y: 2, r: 0 }],
                    },
                ]),
                kind: 'default' as const,
            },
            createUserPaintLayer([
                {
                    template_name_ru: 'eligible',
                    template_hash: KNOWN_MOSS.hash,
                    facet_fv: KNOWN_MOSS.fv,
                    line_stroke: false,
                    placements: [{ x: 3, y: 4, r: 0 }],
                },
                {
                    template_name_ru: 'unknown',
                    template_hash: 999999,
                    facet_fv: 0,
                    line_stroke: false,
                    placements: [{ x: 5, y: 6, r: 0 }],
                },
                {
                    template_name_ru: 'line',
                    template_hash: KNOWN_RUBBLE.hash,
                    facet_fv: KNOWN_RUBBLE.fv,
                    line_stroke: true,
                    placements: [{ x: 6, y: 7, r: 0 }],
                },
            ]),
            {
                ...createUserPaintLayer([
                    {
                        template_name_ru: 'locked',
                        template_hash: KNOWN_RUBBLE.hash,
                        facet_fv: KNOWN_RUBBLE.fv,
                        line_stroke: false,
                        placements: [{ x: 7, y: 8, r: 0 }],
                    },
                ]),
                locked: true,
            },
        ];

        expect(
            partitionSelectionForCountChange(layers, [
                { layerIdx: layerId(0), batchIdx: 0, placementIdx: 0 },
                { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                { layerIdx: layerId(1), batchIdx: 1, placementIdx: 0 },
                { layerIdx: layerId(1), batchIdx: 2, placementIdx: 0 },
                { layerIdx: layerId(2), batchIdx: 0, placementIdx: 0 },
            ]),
        ).toEqual({
            lockedRefs: [{ layerIdx: layerId(2), batchIdx: 0, placementIdx: 0 }],
            defaultLayerRefs: [
                { layerIdx: layerId(0), batchIdx: 0, placementIdx: 0 },
            ],
            eligibleRefs: [
                { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                { layerIdx: layerId(1), batchIdx: 2, placementIdx: 0 },
            ],
            skippedRefs: [{ layerIdx: layerId(1), batchIdx: 1, placementIdx: 0 }],
        });
    });

    it('keeps known line-stroke refs eligible for clipboard copy', () => {
        const layers = [
            {
                ...createUserPaintLayer([
                    {
                        template_name_ru: 'default-known',
                        template_hash: KNOWN_MOSS.hash,
                        facet_fv: KNOWN_MOSS.fv,
                        line_stroke: false,
                        placements: [{ x: 1, y: 2, r: 0 }],
                    },
                ]),
                kind: 'default' as const,
            },
            createUserPaintLayer([
                {
                    template_name_ru: 'line',
                    template_hash: KNOWN_MOSS.hash,
                    facet_fv: KNOWN_MOSS.fv,
                    line_stroke: true,
                    placements: [{ x: 3, y: 4, r: 0 }],
                },
                {
                    template_name_ru: 'unknown',
                    template_hash: 999999,
                    facet_fv: 0,
                    line_stroke: false,
                    placements: [{ x: 5, y: 6, r: 0 }],
                },
            ]),
        ];

        expect(
            partitionSelectionForClipboard(layers, [
                { layerIdx: layerId(0), batchIdx: 0, placementIdx: 0 },
                { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                { layerIdx: layerId(1), batchIdx: 1, placementIdx: 0 },
            ]),
        ).toEqual({
            lockedRefs: [],
            defaultLayerRefs: [
                { layerIdx: layerId(0), batchIdx: 0, placementIdx: 0 },
            ],
            eligibleRefs: [{ layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 }],
            skippedRefs: [{ layerIdx: layerId(1), batchIdx: 1, placementIdx: 0 }],
        });
    });

    it('detects layers containing ineligible objects', () => {
        expect(
            layerContainsIneligibleCountChangeObjects(
                createUserPaintLayer([
                    {
                        template_name_ru: 'known',
                        template_hash: KNOWN_MOSS.hash,
                        facet_fv: KNOWN_MOSS.fv,
                        line_stroke: false,
                        placements: [{ x: 1, y: 2, r: 0 }],
                    },
                ]),
            ),
        ).toBe(false);
        expect(
            layerContainsIneligibleCountChangeObjects(
                createUserPaintLayer([
                    {
                        template_name_ru: 'line',
                        template_hash: KNOWN_MOSS.hash,
                        facet_fv: KNOWN_MOSS.fv,
                        line_stroke: true,
                        placements: [{ x: 1, y: 2, r: 0 }],
                    },
                ]),
            ),
        ).toBe(false);
    });

    it('sanitizes clipboard batches by count-change eligibility', () => {
        expect(
            partitionClipboardBatchesForCountChange([
                {
                    template_name_ru: 'known',
                    template_hash: KNOWN_MOSS.hash,
                    facet_fv: KNOWN_MOSS.fv,
                    line_stroke: false,
                    placements: [{ x: 1, y: 2, r: 0 }],
                },
                {
                    template_name_ru: 'unknown',
                    template_hash: 999999,
                    facet_fv: 0,
                    line_stroke: false,
                    placements: [{ x: 3, y: 4, r: 0 }, { x: 5, y: 6, r: 0 }],
                },
            ]),
        ).toMatchObject({
            eligiblePlacementCount: 1,
            skippedPlacementCount: 2,
        });
    });

    it('keeps known line-stroke batches in clipboard sanitization', () => {
        expect(
            partitionClipboardBatchesForClipboard([
                {
                    template_name_ru: 'known-line',
                    template_hash: KNOWN_MOSS.hash,
                    facet_fv: KNOWN_MOSS.fv,
                    line_stroke: true,
                    placements: [{ x: 1, y: 2, r: 0 }],
                },
                {
                    template_name_ru: 'unknown',
                    template_hash: 999999,
                    facet_fv: 0,
                    line_stroke: false,
                    placements: [{ x: 3, y: 4, r: 0 }, { x: 5, y: 6, r: 0 }],
                },
            ]),
        ).toMatchObject({
            eligiblePlacementCount: 1,
            skippedPlacementCount: 2,
        });
    });
});
