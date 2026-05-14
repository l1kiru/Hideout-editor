import '../App.css';

import { EditorCanvas, useEditorControllerResult } from '../features/editor';
import { EditorHeaderBar } from './editor/EditorHeaderBar';
import { EditorSidebar } from './editor/EditorSidebar';

export default function EditorPage() {
    const { view } = useEditorControllerResult();

    return (
        <div className="appRoot">
            <EditorSidebar {...view.sidebar} />

            <div className="mainColumn">
                <EditorHeaderBar {...view.header} />

                <EditorCanvas {...view.canvas} />

                <p className="status">{view.status}</p>
            </div>
        </div>
    );
}
