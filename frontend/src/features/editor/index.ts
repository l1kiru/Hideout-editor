// Public editor surface for embedding outside the route page.

export {
    EditorCanvas,
    type EditorCanvasProps,
} from './components/EditorCanvas';
export {
    EditorSvgScene,
    type EditorSvgSceneProps,
} from './components/EditorSvgScene';
export type {
    EditorApiPorts,
    UseEditorControllerOptions,
    UseEditorControllerReturn,
} from './hooks/useEditorController';
export { useEditorController } from './hooks/useEditorController';
export {
    EditorSidebar,
    type EditorSidebarBackgroundProps,
    type EditorSidebarChromeProps,
    type EditorSidebarFilesProps,
    type EditorSidebarLayersProps,
    type EditorSidebarProps,
    type EditorSidebarToolBindingsProps,
    type EditorSidebarToolProps,
} from './sidebar/EditorSidebar';
export type {
    PlacementRef,
    PlacementSnapWorld,
    SelectDragSession,
    SelectRotateSession,
    SelectionState,
    UndoEntry,
} from './model/editorSessionTypes';

export * from './lib/editorConstants';
export * from './lib/editorDefaults';
export * from './lib/editorHitTest';
export * from './lib/editorLineBrush';
export * from './lib/editorPreview';
export * from './lib/editorViewport';
export * from './lib/sceneMigration';
