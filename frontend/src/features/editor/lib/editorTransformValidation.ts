import type { PlacementSnapWorld, PlacementRef } from '../model/editorSessionTypes';
import type {
    OccupiedWorldCells,
    PlacementObjectId,
    WorldCellKey,
} from './editorIds';
import { worldPlacementCoordKey } from './editorPlacementCoords';
import { refKey } from './placementSelection';

export type TransformOperation =
    | {
          readonly type: 'move';
          readonly allowInternalOverlap: true;
          readonly allowExternalOverlap: true;
      }
    | {
          readonly type: 'mirror';
          readonly allowInternalOverlap: true;
          readonly allowExternalOverlap: false;
      }
    | {
          readonly type: 'rotate';
          readonly allowInternalOverlap: false;
          readonly allowExternalOverlap: false;
      }
    | {
          readonly type: 'paste';
          readonly allowInternalOverlap: false;
          readonly allowExternalOverlap: false;
      };

export const MOVE_TRANSFORM_OPERATION: TransformOperation = {
    type: 'move',
    allowInternalOverlap: true,
    allowExternalOverlap: true,
};

export const MIRROR_TRANSFORM_OPERATION: TransformOperation = {
    type: 'mirror',
    allowInternalOverlap: true,
    allowExternalOverlap: false,
};

export type MoveValidationResult =
    | { readonly ok: true }
    | {
          readonly ok: false;
          readonly reason:
              | 'missing_snap'
              | 'external_collision'
              | 'internal_collision';
          readonly conflictingCell?: WorldCellKey;
          readonly conflictingObject?: PlacementObjectId;
      };

type ProposedCell = readonly [number, number];

export function proposedMoveCellsFromSnaps(
    snaps: Readonly<Record<string, PlacementSnapWorld>>,
    refs: ReadonlyArray<PlacementRef>,
    deltaWorldX: number,
    deltaWorldY: number,
): ProposedCell[] | null {
    const proposed: ProposedCell[] = [];
    for (const r of refs) {
        const sp = snaps[refKey(r)];
        if (!sp) return null;
        proposed.push([
            Math.round(sp.wx + deltaWorldX),
            Math.round(sp.wy + deltaWorldY),
        ]);
    }
    return proposed;
}

export function validateProposedPlacementCells(
    staticOccupied: OccupiedWorldCells,
    proposedRounded: ReadonlyArray<ProposedCell>,
    operation: TransformOperation,
): MoveValidationResult {
    const used = new Set<WorldCellKey>();
    for (const [x, y] of proposedRounded) {
        const cell = worldPlacementCoordKey(x, y);
        const blocker = staticOccupied.get(cell);
        if (!operation.allowExternalOverlap && blocker !== undefined) {
            return {
                ok: false,
                reason: 'external_collision',
                conflictingCell: cell,
                conflictingObject: blocker,
            };
        }
        if (!operation.allowInternalOverlap && used.has(cell)) {
            return {
                ok: false,
                reason: 'internal_collision',
                conflictingCell: cell,
            };
        }
        used.add(cell);
    }
    return { ok: true };
}

// First proposed cell that hits a static occupant. Ignores internal duplicates within `proposedRounded`.
export function findFirstStaticCollision(
    occCells: OccupiedWorldCells,
    proposedRounded: ReadonlyArray<readonly [number, number]>,
): { readonly cell: WorldCellKey; readonly object: PlacementObjectId } | null {
    for (const [x, y] of proposedRounded) {
        const cell = worldPlacementCoordKey(x, y);
        const object = occCells.get(cell);
        if (object !== undefined) return { cell, object };
    }
    return null;
}

export function validateGroupMoveCells(
    staticOccupied: OccupiedWorldCells,
    snaps: Readonly<Record<string, PlacementSnapWorld>>,
    refs: ReadonlyArray<PlacementRef>,
    deltaWorldX: number,
    deltaWorldY: number,
): MoveValidationResult {
    const proposed = proposedMoveCellsFromSnaps(
        snaps,
        refs,
        deltaWorldX,
        deltaWorldY,
    );
    if (!proposed) return { ok: false, reason: 'missing_snap' };
    return validateProposedPlacementCells(
        staticOccupied,
        proposed,
        MOVE_TRANSFORM_OPERATION,
    );
}
