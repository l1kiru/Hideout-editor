import type { HideoutMapSummary } from '../../api/client';
import {
    createInitialEditorLayers,
    ensureDefaultMapLayerFirst,
    preferredDrawingLayerIndex,
} from '../../features/editor/lib/editorDefaultMapLayer';
import {
    defaultBackground,
    defaultTool,
    defaultUi,
} from '../../features/editor/lib/editorDefaults';
import { layerId, type LayerId } from '../../features/editor/lib/editorIds';
import {
    migrateLayersRopeLineRToTangent,
    migrateLegacyToolAssetKeys,
} from '../../features/editor/lib/sceneMigration';
import type { ViewBox } from '../../features/editor/lib/editorViewport';
import type {
    EditorCommand,
    PlacementTransformUpdate,
    PlacementRef,
    SelectionState,
    UndoEntry,
} from '../../features/editor/model/editorSessionTypes';
import type {
    Background,
    PaintLayer,
    PaintedBatch,
    Scene,
    Tool,
    UiState,
} from '../../types/scene';

export type PanDragState = {
    lastCx: number;
    lastCy: number;
} | null;

export type LineDraft = {
    points: [number, number][];
} | null;

export type SetterArg<T> = T | ((prev: T) => T);

export type UndoMutationResult =
    | { applied: false }
    | { applied: true; label: string };

export type DeleteSelectedCommandArgs = {
    refs: PlacementRef[];
    label: string;
};

export type RotateSelectedCommandArgs = {
    refs: PlacementRef[];
    updates: PlacementTransformUpdate[];
    label: string;
};

export type MirrorSelectedCommandArgs = RotateSelectedCommandArgs;
export type ApplyPlacementTransformsCommandArgs = RotateSelectedCommandArgs;

export type TransformBackgroundCommandArgs = {
    label: string;
    updater: (prev: Background) => Background;
    clearBgSelection?: boolean;
    recordUndo?: boolean;
};

export type ReplaceLayerBatchesCommandArgs = {
    layerIdx: LayerId;
    batches: PaintedBatch[];
    label: string;
    nextSelected?: SelectionState;
};

export type AppendBatchToLayerCommandArgs = {
    layerIdx: LayerId;
    batch: PaintedBatch;
    label: string;
    nextSelected?: SelectionState;
};

export type AppendBatchesToLayerCommandArgs = {
    layerIdx: LayerId;
    batches: PaintedBatch[];
    label: string;
    nextSelected?: SelectionState;
    clearBgSelection?: boolean;
};

export type ApplyLayerStructureChangeCommandArgs = {
    layers: PaintLayer[];
    layerIdx: LayerId;
    selected: SelectionState;
    label: string;
    clearBgSelection?: boolean;
};

export type ReplaceDocumentLayersCommandArgs = {
    layers: PaintLayer[];
};

export type ExecuteEditorCommandArgs = {
    command: EditorCommand;
    label: string;
};

export type EditorAppSessionData = {
    apiOk: boolean | null;
    showTopPanel: boolean;
    status: string;
    hideoutMaps: HideoutMapSummary[];
    activeMapId: number | null;
    activeMapDisplayName: string;
    inputImageNames: string[];
};

export type EditorDocumentData = {
    templateId: string;
    templateDots: [number, number][];
    boundary: [number, number][];
    layers: PaintLayer[];
    layer0UnlockLocksBackup: boolean[] | null;
    layerIdx: LayerId;
    cameraDeg: number;
    tool: Tool;
    ui: UiState;
    background: Background;
    bgSelected: boolean;
    viewBox: ViewBox;
    panDrag: PanDragState;
    spaceHeld: boolean;
    selected: SelectionState;
    cursorView: [number, number] | null;
    lineDraft: LineDraft;
    undoStack: UndoEntry[];
    redoStack: UndoEntry[];
};

export type EditorStoreData = EditorAppSessionData & EditorDocumentData;

export type EditorStoreActions = {
    resetEditorStore(): void;
    setApiOk(updater: SetterArg<boolean | null>): void;
    setShowTopPanel(updater: SetterArg<boolean>): void;
    setStatus(updater: SetterArg<string>): void;
    setHideoutMaps(updater: SetterArg<HideoutMapSummary[]>): void;
    setActiveMapId(updater: SetterArg<number | null>): void;
    setActiveMapDisplayName(updater: SetterArg<string>): void;
    setInputImageNames(updater: SetterArg<string[]>): void;
    setLayers(updater: SetterArg<PaintLayer[]>): void;
    replaceDocumentLayers(args: ReplaceDocumentLayersCommandArgs): void;
    setLayerIdx(updater: SetterArg<LayerId>): void;
    addUserLayer(): void;
    removeLayer(index: number): void;
    setLayerLocked(index: number, locked: boolean): void;
    setLayerVisible(index: number, visible: boolean): void;
    renameLayer(index: number, title: string): void;
    updateLayer(index: number, updater: (layer: PaintLayer) => PaintLayer): void;
    setSelected(updater: SetterArg<SelectionState>): void;
    setTool(updater: SetterArg<Tool>): void;
    setUi(updater: SetterArg<UiState>): void;
    setBackground(updater: SetterArg<Background>): void;
    setBoundary(updater: SetterArg<[number, number][]>): void;
    setCameraDeg(updater: SetterArg<number>): void;
    setTemplateId(updater: SetterArg<string>): void;
    setTemplateDots(updater: SetterArg<[number, number][]>): void;
    setViewBox(updater: SetterArg<ViewBox>): void;
    setBgSelected(updater: SetterArg<boolean>): void;
    setCursorView(updater: SetterArg<[number, number] | null>): void;
    setLineDraft(updater: SetterArg<LineDraft>): void;
    setPanDrag(updater: SetterArg<PanDragState>): void;
    setSpaceHeld(updater: SetterArg<boolean>): void;
    pushBackgroundUndo(snapshot: Background, label: string): void;
    pushCommandUndo(command: EditorCommand, label: string): void;
    deleteSelected(args: DeleteSelectedCommandArgs): void;
    executeEditorCommand(args: ExecuteEditorCommandArgs): void;
    applyPlacementTransforms(args: ApplyPlacementTransformsCommandArgs): void;
    rotateSelected(args: RotateSelectedCommandArgs): void;
    mirrorSelected(args: MirrorSelectedCommandArgs): void;
    transformBackground(args: TransformBackgroundCommandArgs): void;
    replaceLayerBatches(args: ReplaceLayerBatchesCommandArgs): void;
    appendBatchToLayer(args: AppendBatchToLayerCommandArgs): void;
    appendBatchesToLayer(args: AppendBatchesToLayerCommandArgs): void;
    applyLayerStructureChange(args: ApplyLayerStructureChangeCommandArgs): void;
    undo(): UndoMutationResult;
    redo(): UndoMutationResult;
    getSceneSnapshot(): Scene;
    resetEditorDocument(): void;
    hydrateFromScene(scene: Scene): void;
    clearUndoStack(): void;
};

export type EditorStoreState = EditorStoreData & EditorStoreActions;

export type EditorStoreSet = (recipe: (state: EditorStoreState) => void) => void;

export type EditorStoreGet = () => EditorStoreState;

export const INITIAL_EDITOR_VIEW_BOX: ViewBox = {
    x: -200,
    y: -200,
    width: 400,
    height: 400,
};

export function resolveUpdater<T>(prev: T, updater: SetterArg<T>): T {
    return typeof updater === 'function'
        ? (updater as (current: T) => T)(prev)
        : updater;
}

export function createHydratedTool(scene: Scene): Tool {
    const fallbackTool = defaultTool();
    const migratedTool = migrateLegacyToolAssetKeys(scene.tool ?? fallbackTool);
    return {
        ...fallbackTool,
        ...migratedTool,
        draw_style: 'object',
        eraser_targets: {
            ...fallbackTool.eraser_targets,
            ...(migratedTool.eraser_targets ?? {}),
        },
    };
}

export function createInitialAppSessionStoreData(): EditorAppSessionData {
    return {
        apiOk: null,
        showTopPanel: true,
        status: '',
        hideoutMaps: [],
        activeMapId: null,
        activeMapDisplayName: '',
        inputImageNames: [],
    };
}

export function createInitialEditorDocumentStoreData(): EditorDocumentData {
    return {
        templateId: '',
        templateDots: [],
        boundary: [],
        layers: createInitialEditorLayers(),
        layer0UnlockLocksBackup: null,
        layerIdx: layerId(1),
        cameraDeg: 45,
        tool: defaultTool(),
        ui: defaultUi(),
        background: defaultBackground(),
        bgSelected: false,
        viewBox: INITIAL_EDITOR_VIEW_BOX,
        panDrag: null,
        spaceHeld: false,
        selected: [],
        cursorView: null,
        lineDraft: null,
        undoStack: [],
        redoStack: [],
    };
}

export function createInitialEditorStoreData(): EditorStoreData {
    return {
        ...createInitialAppSessionStoreData(),
        ...createInitialEditorDocumentStoreData(),
    };
}

export function hydrateEditorDocumentState(
    state: EditorStoreData,
    scene: Scene,
): void {
    const boundary = scene.boundary.points.map(
        (point): [number, number] => [point.x, point.y],
    );
    const migratedLayers =
        scene.layers.length > 0
            ? migrateLayersRopeLineRToTangent(scene.layers, scene.scene_version ?? 1)
            : [];
    const nextLayers = ensureDefaultMapLayerFirst(migratedLayers);

    state.cameraDeg = Number.isFinite(scene.camera_deg) ? scene.camera_deg : 45;
    state.boundary = boundary;
    state.templateId = scene.template?.template_id ?? '';
    state.layers = nextLayers;
    state.layer0UnlockLocksBackup = null;
    state.layerIdx = layerId(preferredDrawingLayerIndex(nextLayers));
    state.tool = createHydratedTool(scene);
    state.ui = { ...defaultUi(), ...(scene.ui ?? {}) };
    state.templateDots =
        scene.template_dots_cache?.map(
            (point): [number, number] => [point.x, point.y],
        ) ?? [];
    state.background = {
        ...defaultBackground(),
        ...(scene.background ?? {}),
    };
    state.bgSelected = false;
    state.panDrag = null;
    state.spaceHeld = false;
    state.selected = [];
    state.cursorView = null;
    state.lineDraft = null;
    state.undoStack = [];
    state.redoStack = [];
}
