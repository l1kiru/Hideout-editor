/* eslint-disable react-refresh/only-export-components -- Stable barrel re-export for the editor hook. */

export type { EditorApiPorts, UseEditorControllerOptions } from './editorApiPorts';
export {
    useEditorController,
    useEditorControllerResult,
    type UseEditorControllerReturn,
    type UseEditorControllerResultReturn,
} from '../controller/useEditorController';
