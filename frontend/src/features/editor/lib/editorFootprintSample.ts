import type { PlacementRef } from '../model/editorSessionTypes';
import { refEqual } from './placementSelection';

// How many placements get a full-footprint check during group drag / RMB rotate.
export const MAX_COARSE_FOOTPRINT_CHECKS = 220;

// Sparse sample of refs for the expensive footprint check (used on large selections).
export function refsForCoarseFootprintChecks(
    refs: PlacementRef[],
    opts?: { anchor?: PlacementRef; limit?: number },
): PlacementRef[] {
    const limit = opts?.limit ?? MAX_COARSE_FOOTPRINT_CHECKS;
    const anchor = opts?.anchor;
    if (refs.length <= limit)
        return refs;

    const indices = new Set<number>();
    if (anchor) {
        const ai = refs.findIndex((r) => refEqual(r, anchor));
        if (ai >= 0)
            indices.add(ai);
    }
    indices.add(0);
    indices.add(refs.length - 1);
    const need = limit - indices.size;
    for (let k = 1; k <= need; k++) {
        indices.add(Math.floor((k * (refs.length - 1)) / (need + 1)));
    }
    return [...indices].sort((a, b) => a - b).map((i) => refs[i]!);
}
