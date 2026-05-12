import type { Background, PaintedBatch } from '../../../types/scene';
import type { LayerId, OccupiedWorldCells } from '../lib/editorIds';

// Reference to a single placement in the scene.
export type PlacementRef = {
    layerIdx: LayerId;
    batchIdx: number;
    placementIdx: number;
};

// Empty array means no selection.
export type SelectionState = PlacementRef[];

export type PlacementSnapWorld = {
    wx: number;
    wy: number;
    r: number;
    template_hash: number;
    facet_fv?: number | null;
    line_stroke: boolean | undefined;
};

export type SelectDragSession = {
    refs: PlacementRef[];
    snaps: Record<string, PlacementSnapWorld>;
    grabOffsetView: [number, number];
    anchorRef: PlacementRef;
    // Occupied cells excluding the moving group. Computed once per gesture for large selections.
    staticOccupiedCells: OccupiedWorldCells;
    // Large group mode: only centers are checked during drag, full footprint at mouseup.
    fastBoundaryValidate: boolean;
    // Whether every selected placement had a valid footprint at gesture start.
    // If false (e.g. an oversized doodad already sticking out of boundary),
    // the post-move footprint revert is skipped; otherwise such objects could
    // never be moved at all.
    preMoveAllValid: boolean;
    // World-space AABB of the selection centers at drag start. Used as an
    // O(1) fast-path to reject group boundary excursions during mousemove.
    // null when the AABB could not be built (empty selection).
    selAABB: readonly [number, number, number, number] | null;
};

export type SelectRotateSession = {
    refs: PlacementRef[];
    snaps: Record<string, PlacementSnapWorld>;
    centerView: [number, number];
    v0x: number;
    v0y: number;
    pointerId: number;
    staticOccupiedCells: OccupiedWorldCells;
    fastBoundaryValidate: boolean;
};

export type UndoEntry =
    | {
          kind: 'snapshot';
          layerIdx: LayerId;
          batches: PaintedBatch[];
          label: string;
      }
    | {
          kind: 'multi';
          snapshots: { layerIdx: LayerId; batches: PaintedBatch[] }[];
          label: string;
      }
    | {
          kind: 'background';
          snapshot: Background;
          label: string;
      };
