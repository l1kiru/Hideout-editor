import type {
    Dispatch,
    MutableRefObject,
    RefObject,
    SetStateAction,
} from 'react';

import type { Background, PaintLayer, Tool, UiState } from '../../../types/scene';
import type { LayerId } from '../lib/editorIds';
import type { ViewBox } from '../lib/editorViewport';
import type { PlacementRef, SelectionState } from '../model/editorSessionTypes';
import type { BackgroundHitZone } from '../lib/editorBackgroundGeometry';

export type BackgroundRotateSession = {
    centerView: [number, number];
    v0x: number;
    v0y: number;
    pointerId: number;
    startRotDeg: number;
};

export type BackgroundResizeHit = Exclude<BackgroundHitZone, { kind: 'inside' }>;

export type UseEditorCanvasGesturesArgs = {
    svgRef: RefObject<SVGSVGElement | null>;
    viewBoxRef: MutableRefObject<ViewBox>;
    cameraDegRef: MutableRefObject<number>;
    boundaryRef: MutableRefObject<[number, number][]>;
    toolMarginRef: MutableRefObject<number>;
    layersRef: MutableRefObject<PaintLayer[]>;
    spaceDownRef: MutableRefObject<boolean>;
    lineBrushActiveRef: MutableRefObject<boolean>;
    lineDraftRef: MutableRefObject<{ points: [number, number][] } | null>;
    placeStrokeRef: MutableRefObject<(pts: [number, number][]) => void>;

    ui: UiState;
    tool: Tool;
    viewBox: ViewBox;
    layers: PaintLayer[];
    layerIdx: LayerId;
    selected: SelectionState;
    setSelected: Dispatch<SetStateAction<SelectionState>>;
    setLayers: Dispatch<SetStateAction<PaintLayer[]>>;
    setPanDrag: Dispatch<
        SetStateAction<{ lastCx: number; lastCy: number } | null>
    >;
    setViewBox: Dispatch<SetStateAction<ViewBox>>;
    setCursorView: Dispatch<SetStateAction<[number, number] | null>>;
    setLineDraft: Dispatch<
        SetStateAction<{ points: [number, number][] } | null>
    >;
    setStatus: Dispatch<SetStateAction<string>>;
    panDrag: { lastCx: number; lastCy: number } | null;

    cameraDeg: number;

    // Read-only viewing (base map): pan and zoom allowed, scene edits disabled.
    sceneReadOnly: boolean;

    pushMultiUndoForRefs: (refs: PlacementRef[], label: string) => void;
    // Pop the last action from the undo stack (used after a failed final footprint check).
    undo: () => void;

    eraseAt: (vx: number, vy: number) => void;
    placeObjectAt: (vx: number, vy: number) => void;
    placeFillAt: (vx: number, vy: number) => void;

    backgroundRef: MutableRefObject<Background>;
    bgNaturalSizeRef: MutableRefObject<{ w: number; h: number } | null>;
    setBackground: Dispatch<SetStateAction<Background>>;
    setBgSelected: Dispatch<SetStateAction<boolean>>;
    pushBackgroundUndo: (snapshot: Background, label: string) => void;
};
