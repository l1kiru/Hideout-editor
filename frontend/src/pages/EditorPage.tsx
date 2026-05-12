import '../App.css';

import { EditorCanvas, useEditorController } from '../features/editor';
import { EditorHeaderBar } from './editor/EditorHeaderBar';
import { EditorSidebar } from './editor/EditorSidebar';

export default function EditorPage() {
    const { sidebarProps, headerProps, canvasProps, status } =
        useEditorController();

    return (
        <div className="appRoot">
            <EditorSidebar {...sidebarProps} />

            <div className="mainColumn">
                <EditorHeaderBar {...headerProps} />

                <EditorCanvas {...canvasProps} />

                <p className="status">{status}</p>
            </div>
        </div>
    );
}
