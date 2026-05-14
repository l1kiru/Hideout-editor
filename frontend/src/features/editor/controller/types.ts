import type { EditorCanvasProps } from '../components/EditorCanvas';
import type { EditorHeaderBarProps } from '../../../pages/editor/EditorHeaderBar';
import type { EditorSidebarProps } from '../sidebar/editorSidebarTypes';

export type EditorControllerResult = {
    view: {
        sidebar: EditorSidebarProps;
        header: EditorHeaderBarProps;
        canvas: EditorCanvasProps;
        status: string;
    };
};

export type LegacyEditorControllerResult = {
    sidebarProps: EditorSidebarProps;
    headerProps: EditorHeaderBarProps;
    canvasProps: EditorCanvasProps;
    status: string;
};

export function adaptEditorControllerResult(
    result: EditorControllerResult,
): LegacyEditorControllerResult {
    return {
        sidebarProps: result.view.sidebar,
        headerProps: result.view.header,
        canvasProps: result.view.canvas,
        status: result.view.status,
    };
}
