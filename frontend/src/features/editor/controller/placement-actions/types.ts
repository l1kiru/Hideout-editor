import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { AssetKey, PaintLayer, Tool } from '../../../../types/scene';
import type { LayerId } from '../../lib/editorIds';
import type { SelectionState } from '../../model/editorSessionTypes';
import type { ViewBox } from '../../lib/editorViewport';

export type PlacementActionsCtx = {
    layers: PaintLayer[];
    layerIdx: LayerId;
    setLayerIdx: Dispatch<SetStateAction<LayerId>>;
    cameraDeg: number;
    tool: Tool;
    activeAssetKey: AssetKey;
    eraserRadius: number;
    boundary: [number, number][];
    selected: SelectionState;
    setSelected: Dispatch<SetStateAction<SelectionState>>;
    setStatus: Dispatch<SetStateAction<string>>;
    viewBoxRef: MutableRefObject<ViewBox>;
    boundaryRef: MutableRefObject<[number, number][]>;
    cameraDegRef: MutableRefObject<number>;
    toolMarginRef: MutableRefObject<number>;
};
