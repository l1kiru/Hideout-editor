import { describe, expect, it } from 'vitest';

import type { PaintLayer, PaintedBatch } from '../../../types/scene';
import { defaultBackground, cloneLayers } from './editorDefaults';
import {
    applyEditorCommand,
    collectRemovedBatchSnapshots,
    invertEditorCommand,
} from './editorCommandExecutor';
import { createInitialEditorLayers } from './editorDefaultMapLayer';
import { layerId, type LayerId } from './editorIds';
import { createUserPaintLayer } from './editorLayers';
import type {
    EditorCommand,
    PlacementRef,
} from '../model/editorSessionTypes';

type TestCommandState = {
    layers: PaintLayer[];
    background: ReturnType<typeof defaultBackground>;
    bgSelected: boolean;
    selected: PlacementRef[];
    layerIdx: LayerId;
};

function makeBatch(
    templateHash: number,
    placements: Array<{ x: number; y: number; r: number }>,
): PaintedBatch {
    return {
        template_name_ru: `batch-${templateHash}`,
        template_hash: templateHash,
        placements,
        facet_fv: 0,
        line_stroke: false,
    };
}

function makeCommandState(): TestCommandState {
    return {
        layers: [
            createInitialEditorLayers()[0]!,
            {
                ...createUserPaintLayer([], 'Layer A'),
                batches: [
                    makeBatch(1, [
                        { x: 10, y: 20, r: 30 },
                        { x: 11, y: 21, r: 31 },
                    ]),
                    makeBatch(2, [{ x: 30, y: 40, r: 50 }]),
                ],
            },
        ],
        background: defaultBackground(),
        bgSelected: false,
        selected: [],
        layerIdx: layerId(1),
    };
}

function cloneState(state: TestCommandState): TestCommandState {
    return {
        layers: cloneLayers(state.layers),
        background: { ...state.background },
        bgSelected: state.bgSelected,
        selected: state.selected.map((ref) => ({ ...ref })),
        layerIdx: state.layerIdx,
    };
}

function expectCommandRoundTrip(command: EditorCommand, before: TestCommandState) {
    const beforeApply = cloneState(before);
    const afterApply = cloneState(beforeApply);
    applyEditorCommand(afterApply, command);

    const afterUndo = cloneState(afterApply);
    applyEditorCommand(afterUndo, invertEditorCommand(command));
    expect(afterUndo).toEqual(beforeApply);

    const afterRedo = cloneState(afterUndo);
    applyEditorCommand(afterRedo, command);
    expect(afterRedo).toEqual(afterApply);
}

describe('editorCommandExecutor', () => {
    it('applies placement transform commands to layers', () => {
        const state = makeCommandState();

        applyEditorCommand(state, {
            type: 'placement_transform',
            before: [
                {
                    ref: { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                    x: 10,
                    y: 20,
                    r: 30,
                },
            ],
            after: [
                {
                    ref: { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                    x: 15,
                    y: 25,
                    r: 35,
                },
            ],
            clearBgSelection: true,
        });

        expect(state.layers[1]?.batches[0]?.placements[0]).toEqual({
            x: 15,
            y: 25,
            r: 35,
        });
    });

    it('applies background transform commands', () => {
        const state = makeCommandState();

        applyEditorCommand(state, {
            type: 'background_transform',
            before: defaultBackground(),
            after: {
                ...defaultBackground(),
                path: '/input/images/updated.png',
                rotation_deg: 90,
            },
            clearBgSelection: true,
        });

        expect(state.background.path).toBe('/input/images/updated.png');
        expect(state.background.rotation_deg).toBe(90);
    });

    it('inverts placement transform commands by swapping before and after', () => {
        const command = {
            type: 'placement_transform' as const,
            before: [
                {
                    ref: { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                    x: 1,
                    y: 2,
                    r: 3,
                },
            ],
            after: [
                {
                    ref: { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                    x: 4,
                    y: 5,
                    r: 6,
                },
            ],
            clearBgSelection: true,
        };

        expect(invertEditorCommand(command)).toEqual({
            type: 'placement_transform',
            before: command.after,
            after: command.before,
            clearBgSelection: true,
        });
    });

    it('round-trips placement transform commands', () => {
        expectCommandRoundTrip(
            {
                type: 'placement_transform',
                before: [
                    {
                        ref: { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                        x: 10,
                        y: 20,
                        r: 30,
                    },
                ],
                after: [
                    {
                        ref: { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                        x: 15,
                        y: 25,
                        r: 35,
                    },
                ],
            },
            makeCommandState(),
        );
    });

    it('round-trips background transform commands', () => {
        expectCommandRoundTrip(
            {
                type: 'background_transform',
                before: defaultBackground(),
                after: {
                    ...defaultBackground(),
                    path: '/input/images/bg.png',
                    scale: 1.5,
                },
            },
            makeCommandState(),
        );
    });

    it('round-trips placement append commands', () => {
        expectCommandRoundTrip(
            {
                type: 'placement_append',
                layerIdx: layerId(1),
                insertAt: 2,
                batches: [makeBatch(3, [{ x: 50, y: 60, r: 70 }])],
                previousSelection: [],
                nextSelection: [
                    { layerIdx: layerId(1), batchIdx: 2, placementIdx: 0 },
                ],
                selectInserted: true,
            },
            makeCommandState(),
        );
    });

    it('round-trips placement delete commands', () => {
        const before = makeCommandState();
        before.selected = [
            { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
            { layerIdx: layerId(1), batchIdx: 1, placementIdx: 0 },
        ];
        const refs = before.selected;

        expectCommandRoundTrip(
            {
                type: 'placement_delete',
                refs,
                removed: collectRemovedBatchSnapshots(before.layers, refs),
                previousSelection: refs,
                nextSelection: [],
            },
            before,
        );
    });

    it('round-trips placement restore commands', () => {
        const original = makeCommandState();
        const refs = [
            { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
            { layerIdx: layerId(1), batchIdx: 1, placementIdx: 0 },
        ];
        const removed = collectRemovedBatchSnapshots(original.layers, refs);
        const before = cloneState(original);
        applyEditorCommand(before, {
            type: 'placement_delete',
            refs,
            removed,
            previousSelection: refs,
            nextSelection: [],
        });

        expectCommandRoundTrip(
            {
                type: 'placement_restore',
                removed,
                previousSelection: [],
                nextSelection: refs,
            },
            before,
        );
    });

    it('round-trips layer replace batches commands', () => {
        const before = makeCommandState();

        expectCommandRoundTrip(
            {
                type: 'layer_replace_batches',
                layerIdx: layerId(1),
                before: before.layers[1]!.batches,
                after: [makeBatch(4, [{ x: 80, y: 90, r: 100 }])],
                previousSelection: [],
                nextSelection: [
                    { layerIdx: layerId(1), batchIdx: 0, placementIdx: 0 },
                ],
            },
            before,
        );
    });

    it('round-trips layer structure commands', () => {
        const before = makeCommandState();
        const afterLayers = [
            before.layers[0]!,
            {
                ...createUserPaintLayer([], 'Moved'),
                batches: [makeBatch(5, [{ x: 100, y: 110, r: 120 }])],
            },
            {
                ...createUserPaintLayer([], 'New Layer'),
                batches: [],
            },
        ];

        expectCommandRoundTrip(
            {
                type: 'layer_structure',
                before: before.layers,
                after: afterLayers,
                previousActiveLayerIdx: layerId(1),
                nextActiveLayerIdx: layerId(2),
                previousSelection: [],
                nextSelection: [],
            },
            before,
        );
    });
});
