import type { Dispatch, SetStateAction } from 'react';

import type { HideoutMapSummary } from '../../../api/client';
import type { PlacementRef } from '../model/editorSessionTypes';
import type { LayerId } from '../lib/editorIds';
import type {
    Background,
    PaintLayer,
    Tool,
    UiState,
    XYZRPlacement,
} from '../../../types/scene';

export type EditorSidebarChromeProps = {
    showTopPanel: boolean;
};

export type EditorSidebarFilesProps = {
    hideoutMaps: HideoutMapSummary[];
    activeMapId: number | null;
    onHideoutMapSelect: (mapId: string) => void;
    onDeleteActiveHideoutMap: () => void;
    onExport: () => void;
    onSaveMapAsNew: () => void;
    applyHomeView: () => void;
    // Upload a .hideout: create a new map on top of the selected base map
    // (boundary from the base, placements from the file).
    onCreateMapFromHideoutFile: (
        file: File,
        baseMapId: number,
        mapDisplayName?: string,
    ) => Promise<void>;
};

export type EditorSidebarBackgroundProps = {
    sceneReadOnly?: boolean;
    bgSelectValue: string;
    bgLocked: boolean;
    setBackground: Dispatch<SetStateAction<Background>>;
    defaultBackground: () => Background;
    inputImageNames: string[];
    bgOrphanSelect: boolean;
    refreshInputImages: () => Promise<string[]>;
    setStatus: Dispatch<SetStateAction<string>>;
    background: Background;
    applyBackgroundFitToZone: () => void;
};

export type EditorSidebarToolProps = {
    sceneReadOnly?: boolean;
    ui: UiState;
    setUi: Dispatch<SetStateAction<UiState>>;
    tool: Tool;
    setTool: Dispatch<SetStateAction<Tool>>;
    rotStep: number;
    selected: PlacementRef[];
    rotateSelected: (deltaR: number) => void;
    deleteSelected: () => void;
    redo: () => void;
    canRedo: boolean;
    selectionDetail: {
        p: XYZRPlacement;
        ly: PaintLayer;
        title: string;
    } | null;
    rToDeg: (r: number) => number;
    degToR: (deg: number) => number;
};

export type EditorSidebarLayersProps = {
    sceneReadOnly?: boolean;
    boundary: [number, number][];
    saveLayerSnapshotAt: (layerIdx: LayerId, label: string) => void;
    setLayers: Dispatch<SetStateAction<PaintLayer[]>>;
    layers: PaintLayer[];
    layerIdx: LayerId;
    setLayerIdx: Dispatch<SetStateAction<LayerId>>;
    addLayer: () => void;
    removeLayer: (index: number) => void;
    placementStats: {
        placements: number;
        batches: number;
        placementsTotal: number;
    };
    selected: PlacementRef[];
    onSelectSidebarPlacement: (ref: PlacementRef) => void;
    onLayerLockedToggle: (layerIndex: number, locked: boolean) => void;
};

// Sidebar sections: stable contract for composition from the editor hook.
export type EditorSidebarProps = {
    chrome: EditorSidebarChromeProps;
    // Base map flag: no scene edits, view and pan only.
    sceneReadOnly: boolean;
    files: EditorSidebarFilesProps;
    background: EditorSidebarBackgroundProps;
    tool: EditorSidebarToolProps;
    layers: EditorSidebarLayersProps;
};

// Layer fields the tool section needs to edit the current selection.
export type EditorSidebarToolBindingsProps = Pick<
    EditorSidebarLayersProps,
    'saveLayerSnapshotAt' | 'setLayers'
>;
