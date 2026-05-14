import type { Background, PaintLayer, PaintedBatch } from '../../../types/scene';
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

export type PlacementTransformUpdate = {
    ref: PlacementRef;
    x: number;
    y: number;
    r: number;
};

export type PlacementTransformCommand = {
    type: 'placement_transform';
    before: PlacementTransformUpdate[];
    after: PlacementTransformUpdate[];
    clearBgSelection?: boolean;
};

export type BackgroundTransformCommand = {
    type: 'background_transform';
    before: Background;
    after: Background;
    clearBgSelection?: boolean;
};

export type RemovedBatchSnapshot = {
    layerIdx: LayerId;
    batchIdx: number;
    itemIdx?: number;
    batch: PaintedBatch;
};

export type PlacementAppendCommand = {
    type: 'placement_append';
    layerIdx: LayerId;
    batches: PaintedBatch[];
    insertAt: number;
    selectInserted?: boolean;
    previousSelection: PlacementRef[];
    nextSelection: PlacementRef[];
    clearBgSelection?: boolean;
};

export type PlacementDeleteCommand = {
    type: 'placement_delete';
    refs: PlacementRef[];
    removed: RemovedBatchSnapshot[];
    previousSelection: PlacementRef[];
    nextSelection: PlacementRef[];
    clearBgSelection?: boolean;
};

export type PlacementRestoreCommand = {
    type: 'placement_restore';
    removed: RemovedBatchSnapshot[];
    previousSelection: PlacementRef[];
    nextSelection: PlacementRef[];
    clearBgSelection?: boolean;
};

export type LayerReplaceBatchesCommand = {
    type: 'layer_replace_batches';
    layerIdx: LayerId;
    before: PaintedBatch[];
    after: PaintedBatch[];
    previousSelection: PlacementRef[];
    nextSelection: PlacementRef[];
    clearBgSelection?: boolean;
};

export type LayerStructureCommand = {
    type: 'layer_structure';
    before: PaintLayer[];
    after: PaintLayer[];
    previousActiveLayerIdx: LayerId;
    nextActiveLayerIdx: LayerId;
    previousSelection: PlacementRef[];
    nextSelection: PlacementRef[];
    clearBgSelection?: boolean;
};

export type EditorCommand =
    | PlacementTransformCommand
    | BackgroundTransformCommand
    | PlacementAppendCommand
    | PlacementDeleteCommand
    | PlacementRestoreCommand
    | LayerReplaceBatchesCommand
    | LayerStructureCommand;

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
          kind: 'background';
          snapshot: Background;
          label: string;
      }
    | {
          kind: 'command';
          command: EditorCommand;
          label: string;
      };
