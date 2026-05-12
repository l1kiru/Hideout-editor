import { worldToView } from '../../../lib/coords';
import { templatePlacementFootprintView } from '../../../lib/sceneDecorations';
import type { PaintLayer } from '../../../types/scene';
import { hitRect } from './editorHitTest';
import { layerId } from './editorIds';
import type { PlacementRef } from '../model/editorSessionTypes';

// Hit-test against visible placements. Pointer coordinates are in the MPL view system.
export function findHitPlacementAtView(
    layers: PaintLayer[],
    cameraDeg: number,
    vx: number,
    vy: number,
): PlacementRef | null {
    for (let li = layers.length - 1; li >= 0; li--) {
        const ly = layers[li];
        if (!ly?.visible) continue;
        if (ly.locked) continue;
        for (let bi = ly.batches.length - 1; bi >= 0; bi--) {
            const b = ly.batches[bi];
            const fp = templatePlacementFootprintView(
                b.template_hash,
                b.facet_fv,
            );
            for (let pi = b.placements.length - 1; pi >= 0; pi--) {
                const p = b.placements[pi];
                const [ovx, ovy] = worldToView(p.x, p.y, cameraDeg);
                if (
                    hitRect(
                        ovx,
                        ovy,
                        fp.widthView,
                        fp.heightView,
                        vx,
                        vy,
                    )
                )
                    return {
                        layerIdx: layerId(li),
                        batchIdx: bi,
                        placementIdx: pi,
                    };
            }
        }
    }
    return null;
}
