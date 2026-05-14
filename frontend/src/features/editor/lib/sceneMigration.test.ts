import { describe, expect, it } from 'vitest';

import type { PaintLayer, Tool } from '../../../types/scene';
import { defaultTool } from './editorDefaults';
import { ROT_LINE_ROPE_OFFSET } from './editorConstants';
import {
    migrateLayersRopeLineRToTangent,
    migrateLegacyToolAssetKeys,
} from './sceneMigration';
import { normR } from './editorViewport';

function makeLayer(partial: Partial<PaintLayer>): PaintLayer {
    return {
        kind: 'user',
        visible: true,
        locked: false,
        batches: [],
        ...partial,
    };
}

describe('sceneMigration', () => {
    it('normalizes v1 rope line rotations to the tangent angle during import', () => {
        const sourceRotation = 4096;
        const layers = [
            makeLayer({
                batches: [
                    {
                        template_name_ru: 'Faridun Ropes 4',
                        template_hash: 1675705915,
                        line_stroke: true,
                        placements: [{ x: 1, y: 2, r: sourceRotation }],
                    },
                    {
                        template_name_ru: 'Leaf pile',
                        template_hash: 4294658310,
                        placements: [{ x: 3, y: 4, r: 123 }],
                    },
                ],
            }),
        ];

        const migrated = migrateLayersRopeLineRToTangent(layers, 1);

        expect(migrated[0]?.batches[0]?.placements[0]?.r).toBe(
            normR(sourceRotation - ROT_LINE_ROPE_OFFSET),
        );
        expect(migrated[0]?.batches[1]?.placements[0]?.r).toBe(123);
    });

    it('keeps current-scene rope rotations unchanged', () => {
        const layers = [
            makeLayer({
                batches: [
                    {
                        template_name_ru: 'Faridun Ropes 4',
                        template_hash: 1675705915,
                        line_stroke: true,
                        placements: [{ x: 1, y: 2, r: 4096 }],
                    },
                ],
            }),
        ];

        expect(migrateLayersRopeLineRToTangent(layers, 2)).toEqual(layers);
    });

    it('maps legacy rope tool fields to manifest-backed asset keys', () => {
        const tool = {
            ...defaultTool(),
            variant: 'rope',
            asset_key: 'rope',
            line_asset_key: 'rope',
            fill_asset_key: 'rope',
            eraser_targets: {
                rope: false,
                moss: true,
            } as Tool['eraser_targets'] & { rope?: boolean },
        } as unknown as Tool;

        const migrated = migrateLegacyToolAssetKeys(tool);

        expect(migrated.variant).toBe('faridun_ropes4');
        expect(migrated.asset_key).toBe('faridun_ropes4');
        expect(migrated.line_asset_key).toBe('faridun_ropes4');
        expect(migrated.fill_asset_key).toBe('faridun_ropes4');
        expect(migrated.eraser_targets?.faridun_ropes4).toBe(false);
        expect('rope' in (migrated.eraser_targets ?? {})).toBe(false);
        expect(migrated.eraser_targets?.moss).toBe(true);
    });
});
