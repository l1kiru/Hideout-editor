import { Layers3, Redo2, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '../../../../../components/IconButton';
import useEditorStore from '../../../../../stores/editorStore';
import type { EditorSidebarToolProps } from '../../editorSidebarTypes';

type SelectionPanelProps = Pick<
    EditorSidebarToolProps,
    | 'selected'
    | 'rotateSelected'
    | 'mirrorSelectedHorizontal'
    | 'mirrorSelectedVertical'
    | 'moveSelectedToNewLayer'
    | 'deleteSelected'
    | 'redo'
    | 'canRedo'
    | 'selectionDetail'
    | 'rToDeg'
    | 'degToR'
    | 'rotStep'
> & {
    disabled: boolean;
};

export function SelectionPanel(props: SelectionPanelProps) {
    const { t } = useTranslation('editor');
    const {
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
        rotStep,
        disabled,
    } = props;
    const selOne = selected.length === 1 ? selected[0] : undefined;
    const executeEditorCommand = useEditorStore(
        (state) => state.executeEditorCommand,
    );

    return (
        <>
            <div className="sideBtnRow">
                <IconButton
                    size="sm"
                    variant="muted"
                    title={t('selection.rotateCcwTitle')}
                    aria-label={t('selection.rotateCcwAria')}
                    disabled={disabled || selected.length === 0}
                    onClick={() => rotateSelected(rotStep)}
                >
                    <RotateCcw aria-hidden />
                </IconButton>
                <IconButton
                    size="sm"
                    variant="muted"
                    title={t('selection.rotateCwTitle')}
                    aria-label={t('selection.rotateCwAria')}
                    disabled={disabled || selected.length === 0}
                    onClick={() => rotateSelected(-rotStep)}
                >
                    <RotateCw aria-hidden />
                </IconButton>
                <IconButton
                    size="sm"
                    variant="muted"
                    title={t('selection.mirrorHorizontalTitle')}
                    aria-label={t('selection.mirrorHorizontalAria')}
                    disabled={disabled || selected.length === 0}
                    onClick={mirrorSelectedHorizontal}
                >
                    <span aria-hidden>X</span>
                </IconButton>
                <IconButton
                    size="sm"
                    variant="muted"
                    title={t('selection.mirrorVerticalTitle')}
                    aria-label={t('selection.mirrorVerticalAria')}
                    disabled={disabled || selected.length === 0}
                    onClick={mirrorSelectedVertical}
                >
                    <span aria-hidden>Y</span>
                </IconButton>
                <IconButton
                    size="sm"
                    variant="muted"
                    title={t('selection.redoTitle')}
                    aria-label={t('selection.redoAria')}
                    disabled={disabled || !canRedo}
                    onClick={redo}
                >
                    <Redo2 aria-hidden />
                </IconButton>
                <IconButton
                    size="sm"
                    variant="danger"
                    title={t('selection.deleteTitle')}
                    aria-label={t('selection.deleteAria')}
                    disabled={disabled || selected.length === 0}
                    onClick={deleteSelected}
                >
                    <Trash2 aria-hidden />
                </IconButton>
            </div>
            <button
                type="button"
                className="iconBtnLabeled sideBtnWide sideBtnMuted"
                title={t('selection.moveToNewLayerTitle')}
                aria-label={t('selection.moveToNewLayerAria')}
                disabled={disabled || selected.length === 0}
                onClick={moveSelectedToNewLayer}
            >
                <Layers3 aria-hidden />
                {t('selection.moveToNewLayerButton')}
            </button>
            {selected.length > 1 ? (
                <p className="sideHint subtle">
                    {t('selection.selectedManyHint', { count: selected.length })}
                </p>
            ) : null}
            {selectionDetail ? (
                <>
                    <p className="sideFieldGroupLabel">{t('selection.selectedObjectTitle')}</p>
                    <p className="sideHint subtle">
                        <strong>{selectionDetail.title}</strong>
                        {selectionDetail.ly.locked ? t('selection.lockedLayerSuffix') : ''}
                    </p>
                    <label className="sideLabel">
                        <span>{t('selection.rotation')}</span>
                        <input
                            type="number"
                            step={1}
                            disabled={disabled || selectionDetail.ly.locked}
                            value={Math.round(rToDeg(selectionDetail.p.r))}
                            onChange={(e) => {
                                const h = selOne;
                                if (!h) return;
                                const deg = Number(e.target.value);
                                const r = degToR(deg);
                                if (!selectionDetail) return;
                                executeEditorCommand({
                                    command: {
                                        type: 'placement_transform',
                                        before: [
                                            {
                                                ref: h,
                                                x: selectionDetail.p.x,
                                                y: selectionDetail.p.y,
                                                r: selectionDetail.p.r,
                                            },
                                        ],
                                        after: [
                                            {
                                                ref: h,
                                                x: selectionDetail.p.x,
                                                y: selectionDetail.p.y,
                                                r,
                                            },
                                        ],
                                        clearBgSelection: true,
                                    },
                                    label: t('selection.rotationSnapshotLabel'),
                                });
                            }}
                        />
                    </label>
                    {!selectionDetail.ly.locked ? (
                        <p className="sideHint subtle">
                            {t('selection.singleHint')}
                        </p>
                    ) : null}
                </>
            ) : null}
        </>
    );
}
