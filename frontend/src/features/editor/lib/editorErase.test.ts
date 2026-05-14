import { describe, expect, it } from 'vitest';

import { worldToView } from '../../../lib/coords';
import { DECORATIONS } from '../../../lib/sceneDecorations';
import { defaultTool } from './editorDefaults';
import { eraseLayerBatchesAtView } from './editorErase';

describe('editorErase', () => {
    it('erases known line-stroke batches', () => {
        const rope = DECORATIONS.faridun_ropes4;
        const placement = { x: 120, y: 80, r: 0 };
        const [vx, vy] = worldToView(placement.x, placement.y, 0);

        const result = eraseLayerBatchesAtView({
            batches: [
                {
                    template_name_ru: rope.nameRu,
                    template_hash: rope.hash,
                    facet_fv: rope.fv,
                    line_stroke: true,
                    placements: [placement],
                },
            ],
            tool: defaultTool(),
            cameraDeg: 0,
            eraserRadius: 2,
            vx,
            vy,
        });

        expect(result.needsTargetSelection).toBe(false);
        expect(result.removed).toBe(1);
        expect(result.nextBatches).toEqual([]);
    });
});
