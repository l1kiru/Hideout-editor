import { useTranslation } from 'react-i18next';

import type { EditorSidebarProps } from './editorSidebarTypes';
import { SidebarBackgroundSection } from './sections/SidebarBackgroundSection';
import { SidebarFilesSection } from './sections/SidebarFilesSection';
import { SidebarLayersSection } from './sections/SidebarLayersSection';
import { SidebarToolSection } from './sections/SidebarToolSection';

export function EditorSidebar(props: EditorSidebarProps) {
    const {
        chrome,
        sceneReadOnly,
        files,
        background: bgProps,
        tool: toolProps,
        layers: lyProps,
    } = props;
    const { showTopPanel } = chrome;
    const { t } = useTranslation('editor');
    const showHotkeysHint = toolProps.tool.variant === 'select';

    return (
        <aside className={`leftSidebar ${showTopPanel ? '' : 'collapsed'}`}>
            <SidebarFilesSection {...files} />
            <SidebarBackgroundSection {...bgProps} sceneReadOnly={sceneReadOnly} />
            <SidebarToolSection
                {...toolProps}
                sceneReadOnly={sceneReadOnly}
                saveLayerSnapshotAt={lyProps.saveLayerSnapshotAt}
                setLayers={lyProps.setLayers}
            />
            <SidebarLayersSection {...lyProps} sceneReadOnly={sceneReadOnly} />
            {showHotkeysHint ? (
                <p className="sideHint subtle">
                    {t('selection.hotkeysHint')}
                </p>
            ) : null}
        </aside>
    );
}

export type {
    EditorSidebarBackgroundProps,
    EditorSidebarChromeProps,
    EditorSidebarFilesProps,
    EditorSidebarLayersProps,
    EditorSidebarProps,
    EditorSidebarToolBindingsProps,
    EditorSidebarToolProps,
} from './editorSidebarTypes';
