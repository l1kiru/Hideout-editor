import type { EditorSidebarToolProps } from '../editorSidebarTypes';
import { useTranslation } from 'react-i18next';
import { SelectionPanel } from './tool/SelectionPanel';
import { ToolPicker } from './tool/ToolPicker';
import { ToolSettings } from './tool/ToolSettings';

export type SidebarToolSectionProps = EditorSidebarToolProps;

export function SidebarToolSection(props: SidebarToolSectionProps) {
    const { t } = useTranslation('editor');
    const {
        tool,
        setTool,
        rotStep,
        selected,
        rotateSelected,
        mirrorSelectedHorizontal,
        mirrorSelectedVertical,
        moveSelectedToNewLayer,
        deleteSelected,
        redo,
        canRedo,
        selectionDetail,
        rToDeg,
        degToR,
        sceneReadOnly,
    } = props;

    const ro = Boolean(sceneReadOnly);

    if (ro) {
        return (
            <section className="sideSection">
                <h2 className="sideHeading">{t('tools.modeSection')}</h2>
                <p className="sideHint subtle">
                    {t('tools.modeReadonly')}
                </p>
            </section>
        );
    }

    return (
        <section className="sideSection">
            <h2 className="sideHeading">{t('tools.modeSection')}</h2>
            <ToolPicker tool={tool} setTool={setTool} disabled={ro} />
            <ToolSettings tool={tool} setTool={setTool} disabled={ro} />
            <SelectionPanel
                selected={selected}
                rotateSelected={rotateSelected}
                mirrorSelectedHorizontal={mirrorSelectedHorizontal}
                mirrorSelectedVertical={mirrorSelectedVertical}
                moveSelectedToNewLayer={moveSelectedToNewLayer}
                deleteSelected={deleteSelected}
                redo={redo}
                canRedo={canRedo}
                selectionDetail={selectionDetail}
                rToDeg={rToDeg}
                degToR={degToR}
                rotStep={rotStep}
                disabled={ro}
            />
        </section>
    );
}
