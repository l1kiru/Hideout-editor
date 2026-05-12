import { ChevronRight, Maximize2, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { deleteInputImage, uploadInputImage } from '../../../../api/inputImages';
import { IconButton } from '../../../../components/IconButton';
import { useNativeDialogs } from '../../../../context/NativeDialogContext';
import type { EditorSidebarBackgroundProps } from '../editorSidebarTypes';
import { localizeApiError } from '../../../../i18n/localizeApiError';

const ACCEPTED_BG_EXTS = '.png,.jpg,.jpeg,.jfif,.webp,.gif,.svg';

export function SidebarBackgroundSection(props: EditorSidebarBackgroundProps) {
    const {
        bgSelectValue,
        bgLocked,
        setBackground,
        defaultBackground,
        inputImageNames,
        bgOrphanSelect,
        refreshInputImages,
        setStatus,
        background,
        applyBackgroundFitToZone,
        sceneReadOnly,
    } = props;

    const ro = Boolean(sceneReadOnly);
    const dialogs = useNativeDialogs();
    const { t } = useTranslation('editor');
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isBusy, setIsBusy] = useState(false);

    if (ro) {
        return (
            <section className="sideSection">
                <details className="sideCollapsible">
                    <summary className="sideCollapsibleSummary">
                        <ChevronRight
                            className="sideCollapsibleCaret"
                            aria-hidden
                        />
                        <span className="sideHeading sideCollapsibleHeading">
                            {t('background.section')}
                        </span>
                    </summary>
                    <div className="sideCollapsibleBody">
                        <p className="sideHint subtle">
                            {t('background.baseReadonlyHint')}
                        </p>
                    </div>
                </details>
            </section>
        );
    }

    const handleUploadClick = () => {
        if (ro || isBusy) return;
        fileInputRef.current?.click();
    };

    const handleFileSelected: React.ChangeEventHandler<HTMLInputElement> = async (
        ev,
    ) => {
        const file = ev.target.files?.[0];
        ev.target.value = '';
        if (!file) return;
        setIsBusy(true);
        try {
            const uploaded = await uploadInputImage(file);
            await refreshInputImages();
            setBackground((b) => ({
                ...b,
                path: `/input/images/${encodeURIComponent(uploaded)}`,
                width_view_base: null,
            }));
            setStatus(t('background.uploaded', { name: uploaded }));
        } catch (e) {
            await dialogs.alert(
                t('background.uploadError', {
                    error: localizeApiError(t, e),
                }),
            );
        } finally {
            setIsBusy(false);
        }
    };

    const handleDeleteClick = async () => {
        if (ro || isBusy) return;
        const target = bgSelectValue;
        if (!target) {
            await dialogs.alert(t('background.pickFileFirst'));
            return;
        }
        const ok = await dialogs.confirm(
            t('background.deleteConfirm', { name: target }),
        );
        if (!ok) return;
        setIsBusy(true);
        try {
            await deleteInputImage(target);
            await refreshInputImages();
            const usingThis =
                background.path?.includes(`/input/images/${encodeURIComponent(target)}`)
                || background.path?.includes(`/input/images/${target}`);
            if (usingThis) {
                setBackground((b) => ({
                    ...defaultBackground(),
                    locked: b.locked,
                    lock_anchor_view_x: null,
                    lock_anchor_view_y: null,
                }));
            }
            setStatus(t('background.deleted', { name: target }));
        } catch (e) {
            await dialogs.alert(
                t('background.deleteError', {
                    error: localizeApiError(t, e),
                }),
            );
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <section className="sideSection">
            <details className="sideCollapsible">
                <summary className="sideCollapsibleSummary">
                    <ChevronRight
                        className="sideCollapsibleCaret"
                        aria-hidden
                    />
                    <span className="sideHeading sideCollapsibleHeading">
                        {t('background.section')}
                    </span>
                </summary>
                <div className="sideCollapsibleBody">
                    <label className="sideLabel sideLabelStack">
                        <span>{t('background.image')}</span>
                        <div className="sideSelectWithAction">
                            <select
                                className="sideSelect"
                                value={bgSelectValue}
                                disabled={ro || bgLocked}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (!v) {
                                        setBackground((b) => ({
                                            ...defaultBackground(),
                                            locked: b.locked,
                                            lock_anchor_view_x: null,
                                            lock_anchor_view_y: null,
                                        }));
                                        return;
                                    }
                                    setBackground((b) => ({
                                        ...b,
                                        path: `/input/images/${encodeURIComponent(v)}`,
                                        width_view_base: null,
                                    }));
                                }}
                            >
                                <option value="">{t('background.noBackground')}</option>
                                {bgOrphanSelect ? (
                                    <option value={bgSelectValue}>
                                        {bgSelectValue} {t('background.missingInCatalog')}
                                    </option>
                                ) : null}
                                {inputImageNames.map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                            <IconButton
                                size="sm"
                                variant="muted"
                                title={t('background.refreshListTitle')}
                                aria-label={t('background.refreshListAria')}
                                disabled={ro}
                                onClick={() => {
                                    void refreshInputImages();
                                    setStatus(t('background.refreshed'));
                                }}
                            >
                                <RefreshCw aria-hidden />
                            </IconButton>
                        </div>
                    </label>
                    <div className="sideBtnRow">
                        <button
                            type="button"
                            className="iconBtnLabeled sideBtnWide sideBtnMuted"
                            disabled={ro || isBusy}
                            title={t('background.uploadTitle')}
                            onClick={handleUploadClick}
                        >
                            <Upload aria-hidden />
                            {t('background.uploadButton')}
                        </button>
                        <IconButton
                            size="sm"
                            variant="danger"
                            title={t('background.deleteTitle')}
                            aria-label={t('background.deleteAria')}
                            disabled={ro || isBusy || !bgSelectValue}
                            onClick={handleDeleteClick}
                        >
                            <Trash2 aria-hidden />
                        </IconButton>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_BG_EXTS}
                        hidden
                        onChange={handleFileSelected}
                    />
                    <label className="sideLabel">
                        <span>{t('background.rotation')}</span>
                        <input
                            type="number"
                            step={1}
                            disabled={ro || bgLocked || !background.path}
                            value={background.rotation_deg ?? 0}
                            onChange={(e) =>
                                setBackground((b) => ({
                                    ...b,
                                    rotation_deg: Number(e.target.value),
                                }))
                            }
                        />
                    </label>
                    <label className="sideLabel sideLabelStack">
                        <span>
                            {t('background.opacity', {
                                value: ((background.opacity ?? 1) * 100).toFixed(0),
                            })}
                        </span>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            disabled={ro || bgLocked || !background.path}
                            value={background.opacity ?? 1}
                            onChange={(e) =>
                                setBackground((b) => ({
                                    ...b,
                                    opacity: Number(e.target.value),
                                }))
                            }
                        />
                    </label>
                    <label className="sideLabel sideLabelStack">
                        <span>
                            {t('background.scale', {
                                value: (background.scale ?? 1).toFixed(2),
                            })}
                        </span>
                        <input
                            type="range"
                            min={0.05}
                            max={4}
                            step={0.01}
                            disabled={ro || bgLocked || !background.path}
                            value={background.scale ?? 1}
                            onChange={(e) =>
                                setBackground((b) => ({
                                    ...b,
                                    scale: Number(e.target.value),
                                }))
                            }
                        />
                    </label>
                    <div className="sideBtnRow">
                        <button
                            type="button"
                            className="iconBtnLabeled sideBtnWide sideBtnMuted"
                            disabled={ro || bgLocked || !background.path}
                            title={t('background.fitTitle')}
                            onClick={applyBackgroundFitToZone}
                        >
                            <Maximize2 aria-hidden />
                            {t('background.fitButton')}
                        </button>
                    </div>
                    <label className="sideCheck">
                        <input
                            type="checkbox"
                            checked={bgLocked}
                            disabled={ro}
                            onChange={(e) => {
                                const on = e.target.checked;
                                setBackground((b) => ({
                                    ...b,
                                    locked: on,
                                    lock_anchor_view_x: on
                                        ? (b.offset_x ?? 0)
                                        : null,
                                    lock_anchor_view_y: on
                                        ? (b.offset_y ?? 0)
                                        : null,
                                }));
                            }}
                        />
                        {t('background.lock')}
                    </label>
                    <p className="sideHint subtle">
                        {t('background.hint')}
                    </p>
                </div>
            </details>
        </section>
    );
}
