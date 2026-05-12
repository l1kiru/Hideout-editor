import type { PaintLayer } from '../../../types/scene';
import type {
    PlacementRef,
    PlacementSnapWorld,
} from '../model/editorSessionTypes';
import { refKey } from './placementSelection';

// World snapshots for a group of selected placements, used during drag/rotate.
export function buildPlacementSnapsForRefs(
    ls: PaintLayer[],
    refs: PlacementRef[],
): Record<string, PlacementSnapWorld> | null {
    const snaps: Record<string, PlacementSnapWorld> = {};
    for (const r of refs) {
        const ly = ls[r.layerIdx];
        const b = ly?.batches[r.batchIdx];
        const p = b?.placements[r.placementIdx];
        if (!ly?.visible || !b || !p) return null;
        snaps[refKey(r)] = {
            wx: p.x,
            wy: p.y,
            r: p.r,
            template_hash: b.template_hash,
            facet_fv: b.facet_fv,
            line_stroke: b.line_stroke,
        };
    }
    return snaps;
}
