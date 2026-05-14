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
    UseEditorControllerResultReturn,
} from './hooks/useEditorController';
export {
    useEditorController,
    useEditorControllerResult,
} from './hooks/useEditorController';
export type {
    EditorControllerResult,
    LegacyEditorControllerResult,
} from './controller/types';
export {
    EditorSidebar,
    type EditorSidebarBackgroundProps,
    type EditorSidebarChromeProps,
    type EditorSidebarFilesProps,
    type EditorSidebarLayersProps,
    type EditorSidebarProps,
    type EditorSidebarToolProps,
} from './sidebar/EditorSidebar';
export type {
    EditorCommand,
    PlacementRef,
    PlacementSnapWorld,
    PlacementTransformUpdate,
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
