import { describe, expect, it } from 'vitest';

import { DECORATIONS } from '../../../lib/sceneDecorations';
import { layerId } from './editorIds';
import { createImportedDecorationsLayer, createUserPaintLayer } from './editorLayers';
import { moveSelectionToNewLayer } from './moveSelectionToNewLayer';
import type { PaintLayer } from '../../../types/scene';

const KNOWN_MOSS = DECORATIONS.moss;
const KNOWN_RUBBLE = DECORATIONS.maraketh_rubble1;
const KNOWN_LEAF = DECORATIONS.leaf_pile3;

function makeBatch(
    templateHash: number,
    placements: Array<{ x: number; y: number; r: number }>,
    extra: Partial<PaintLayer['batches'][number]> = {},
) {
    return {
        template_name_ru: `batch-${templateHash}`,
        template_hash: templateHash,
        placements,
        ...extra,
    };
}

describe('moveSelectionToNewLayer', () => {
    it('moves only eligible refs and keeps skipped refs deselected', () => {
        const layers = [
            createImportedDecorationsLayer([
                makeBatch(KNOWN_MOSS.hash, [{ x: 0, y: 0, r: 0 }], {
                    facet_fv: KNOWN_MOSS.fv,
                }),
            ]),
            createUserPaintLayer(
                [
                    makeBatch(
                        KNOWN_RUBBLE.hash,
                        [{ x: 1, y: 2, r: 0 }, { x: 3, y: 4, r: 90 }],
                        {
                            facet_fv: KNOWN_RUBBLE.fv,
                        },
                    ),
                    makeBatch(KNOWN_LEAF.hash, [{ x: 7, y: 8, r: 180 }], {
                        facet_fv: KNOWN_LEAF.fv,
                        line_stroke: true,
                    }),
                ],
                'Source A',
            ),
            createUserPaintLayer([makeBatch(999999, [{ x: 11, y: 12, r: 270 }])], 'Source B'),
        ];

        const result = moveSelectionToNewLayer(layers, [
            { layerIdx: layerId(0), batchIdx: 0, placementIdx: 0 },
            { layerIdx: layerId(1), batchIdx: 0, placementIdx: 1 },
            { layerIdx: layerId(1), batchIdx: 1, placementIdx: 0 },
            { layerIdx: layerId(2), batchIdx: 0, placementIdx: 0 },
        ]);

        expect(result).toMatchObject({
            ok: true,
            targetLayerIdx: layerId(3),
            movedCount: 3,
            skippedCount: 1,
        });
        if (!result.ok) {
            throw new Error('Expected successful move result');
        }

        expect(result.nextLayers).toHaveLength(4);
        expect(result.nextLayers[0]?.batches).toEqual([]);
        expect(result.nextLayers[1]?.batches).toEqual([
            {
                template_name_ru: `batch-${KNOWN_RUBBLE.hash}`,
                template_hash: KNOWN_RUBBLE.hash,
                facet_fv: KNOWN_RUBBLE.fv,
                placements: [{ x: 1, y: 2, r: 0 }],
            },
        ]);
        expect(result.nextLayers[2]?.batches).toEqual([
            {
                template_name_ru: 'batch-999999',
                template_hash: 999999,
                placements: [{ x: 11, y: 12, r: 270 }],
            },
        ]);
        expect(result.nextLayers[3]).toMatchObject({
            kind: 'user',
            locked: false,
            visible: true,
            batches: [
                {
                    template_hash: KNOWN_MOSS.hash,
                    template_name_ru: `batch-${KNOWN_MOSS.hash}`,
                    facet_fv: KNOWN_MOSS.fv,
                    placements: [{ x: 0, y: 0, r: 0 }],
                },
                {
                    template_hash: KNOWN_RUBBLE.hash,
                    template_name_ru: `batch-${KNOWN_RUBBLE.hash}`,
                    facet_fv: KNOWN_RUBBLE.fv,
                    placements: [{ x: 3, y: 4, r: 90 }],
                },
                {
                    template_hash: KNOWN_LEAF.hash,
                    template_name_ru: `batch-${KNOWN_LEAF.hash}`,
                    facet_fv: KNOWN_LEAF.fv,
                    line_stroke: true,
                    placements: [{ x: 7, y: 8, r: 180 }],
                },
            ],
        });
        expect(result.nextSelected).toEqual([
            { layerIdx: layerId(3), batchIdx: 0, placementIdx: 0 },
            { layerIdx: layerId(3), batchIdx: 1, placementIdx: 0 },
            { layerIdx: layerId(3), batchIdx: 2, placementIdx: 0 },
        ]);
    });

    it('returns no_eligible_refs when everything selected is unknown or otherwise unsupported', () => {
        const layers = [
            createImportedDecorationsLayer([makeBatch(999999, [{ x: 0, y: 0, r: 0 }])]),
            createUserPaintLayer([
                makeBatch(999998, [{ x: 1, y: 2, r: 0 }]),
            ]),
        ];

        expect(
            moveSelectionToNewLayer(layers, [
                { layerIdx: layerId(0), batchIdx: 0, placementIdx: 0 },
                { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
            ]),
        ).toEqual({
            ok: false,
            reason: 'no_eligible_refs',
        });
    });

    it('does not treat lock state as part of pure move eligibility', () => {
        const layers = [
            createImportedDecorationsLayer(),
            {
                ...createUserPaintLayer([
                    makeBatch(KNOWN_MOSS.hash, [{ x: 1, y: 2, r: 0 }], {
                        facet_fv: KNOWN_MOSS.fv,
                    }),
                ]),
                locked: true,
            },
        ];

        expect(
            moveSelectionToNewLayer(layers, [
                { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
            ]),
        ).toMatchObject({
            ok: true,
            movedCount: 1,
            skippedCount: 0,
        });
    });
});
