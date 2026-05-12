import { Redo2, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '../../../../../components/IconButton';
import type {
    EditorSidebarToolBindingsProps,
    EditorSidebarToolProps,
} from '../../editorSidebarTypes';

type SelectionPanelProps = Pick<
    EditorSidebarToolProps,
    | 'selected'
    | 'rotateSelected'
    | 'deleteSelected'
    | 'redo'
    | 'canRedo'
    | 'selectionDetail'
    | 'rToDeg'
    | 'degToR'
    | 'rotStep'
> &
    Pick<EditorSidebarToolBindingsProps, 'saveLayerSnapshotAt' | 'setLayers'> & {
        disabled: boolean;
    };

export function SelectionPanel(props: SelectionPanelProps) {
    const { t } = useTranslation('editor');
    const {
        selected,
        rotateSelected,
        deleteSelected,
        redo,
        canRedo,
        selectionDetail,
        rToDeg,
        degToR,
        rotStep,
        saveLayerSnapshotAt,
        setLayers,
        disabled,
    } = props;
    const selOne = selected.length === 1 ? selected[0] : undefined;

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
                                saveLayerSnapshotAt(h.layerIdx, t('selection.rotationSnapshotLabel'));
                                const r = degToR(deg);
                                setLayers((ls) =>
                                    ls.map((l, li) => {
                                        if (li !== Number(h.layerIdx)) return l;
                                        return {
                                            ...l,
                                            batches: l.batches.map((b, bi) => {
                                                if (bi !== h.batchIdx) return b;
                                                return {
                                                    ...b,
                                                    placements: b.placements.map((p0, pi) =>
                                                        pi === h.placementIdx
                                                            ? { ...p0, r }
                                                            : p0,
                                                    ),
                                                };
                                            }),
                                        };
                                    }),
                                );
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
