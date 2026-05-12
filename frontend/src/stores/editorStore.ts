import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface ToolState {
  type: 'select' | 'brush' | 'erase' | 'rotate';
  brushSize?: number;
  selectedAsset?: string;
}

interface Layer {
  id: string;
  title: string;
  visible: boolean;
  locked: boolean;
  batches: unknown[];
}

interface EditorState {
  activeTool: ToolState;
  selectedObjects: string[];
  layers: Layer[];
  activeLayerId: string;

  viewBox: { x: number; y: number; width: number; height: number };
  scale: number;
  isPanning: boolean;

  scene: unknown | null;
  undoStack: unknown[];
  redoStack: unknown[];

  setActiveTool: (tool: ToolState) => void;
  setSelectedObjects: (ids: string[]) => void;
  addLayer: (layer: Omit<Layer, 'id'>) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  setViewBox: (viewBox: { x: number; y: number; width: number; height: number }) => void;
  addToUndoStack: (state: unknown) => void;
  undo: () => void;
  redo: () => void;
}

const useEditorStore = create<EditorState>()(
  devtools(
    immer((set) => ({
      activeTool: { type: 'select' },
      selectedObjects: [],
      layers: [],
      activeLayerId: '',

      viewBox: { x: 0, y: 0, width: 800, height: 600 },
      scale: 1,
      isPanning: false,

      scene: null,
      undoStack: [],
      redoStack: [],

      setActiveTool: (tool) => set({ activeTool: tool }),
      
      setSelectedObjects: (ids) => set({ selectedObjects: ids }),
      
      addLayer: (layer) => set((state) => {
        const newLayer = { ...layer, id: crypto.randomUUID() };
        state.layers.push(newLayer);
        if (!state.activeLayerId) {
          state.activeLayerId = newLayer.id;
        }
      }),
      
      updateLayer: (id, updates) => set((state) => {
        const layerIndex = state.layers.findIndex(layer => layer.id === id);
        if (layerIndex !== -1) {
          Object.assign(state.layers[layerIndex], updates);
        }
      }),
      
      setViewBox: (viewBox) => set({ viewBox }),
      
      addToUndoStack: (state) => set((draft) => {
        draft.undoStack.push(state);
        // Cap matches MAX_UNDO from editorConstants.
        if (draft.undoStack.length > 96) {
          draft.undoStack.shift();
        }
      }),

      undo: () => set((draft) => {
        if (draft.undoStack.length > 0) {
          const prevState = draft.undoStack.pop();
          if (prevState) {
            draft.redoStack.push({ ...draft });
            Object.assign(draft, prevState);
          }
        }
      }),

      redo: () => set((draft) => {
        if (draft.redoStack.length > 0) {
          const nextState = draft.redoStack.pop();
          if (nextState) {
            draft.undoStack.push({ ...draft });
            Object.assign(draft, nextState);
          }
        }
      }),
    }))
  )
);

export default useEditorStore;