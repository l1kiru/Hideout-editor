import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CopyPlus, Download, Maximize2, Trash2, Upload } from 'lucide-react';

import { useNativeDialogs } from '../../../../context/NativeDialogContext';
import {
    isBaseHideoutMap,
} from '../../lib/editorConstants';
import type { EditorSidebarFilesProps } from '../editorSidebarTypes';
import { HideoutImportModal } from './files/HideoutImportModal';

export function SidebarFilesSection(props: EditorSidebarFilesProps) {
    const {
        hideoutMaps,
        activeMapId,
        onHideoutMapSelect,
        onDeleteActiveHideoutMap,
        onExport,
        onSaveMapAsNew,
        applyHomeView,
        onCreateMapFromHideoutFile,
    } = props;

    const dialogs = useNativeDialogs();
    const { t } = useTranslation('editor');

    const activeMeta = hideoutMaps.find((m) => m.id === activeMapId);

    const baseCandidates = useMemo(
        () => hideoutMaps.filter((m) => isBaseHideoutMap(m) && m.has_boundary),
        [hideoutMaps],
    );

    const [importBaseMapId, setImportBaseMapId] = useState<number | ''>('');
    const [importMapName, setImportMapName] = useState('');
    const [importBusy, setImportBusy] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);

    useEffect(() => {
        if (baseCandidates.length === 0) return;
        setImportBaseMapId((prev) =>
            prev === '' || !baseCandidates.some((m) => m.id === prev)
                ? baseCandidates[0]!.id
                : prev,
        );
    }, [baseCandidates]);

    useEffect(() => {
        if (!importModalOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || importBusy) return;
            e.preventDefault();
            setImportModalOpen(false);
            setImportFile(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [importModalOpen, importBusy]);

    const openImportModal = () => {
        setImportFile(null);
        setImportModalOpen(true);
    };

    const closeImportModal = () => {
        if (importBusy) return;
        setImportModalOpen(false);
        setImportFile(null);
    };

    const submitHideoutImport = async () => {
        if (importBaseMapId === '') return;
        if (!importFile) {
            await dialogs.alert(t('dialog.selectHideoutFile'));
            return;
        }
        setImportBusy(true);
        try {
            await onCreateMapFromHideoutFile(
                importFile,
                importBaseMapId as number,
                importMapName.trim() || undefined,
            );
            setImportMapName('');
            setImportModalOpen(false);
            setImportFile(null);
        } finally {
            setImportBusy(false);
        }
    };

    return (
        <section className="sideSection">
            <h2 className="sideHeading">{t('files.section')}</h2>
            <label className="sideLabel sideLabelStack">
                <div className="sideSelectWithAction">
                    <select
                        className="sideSelect"
                        value={activeMapId ?? ''}
                        disabled={hideoutMaps.length === 0}
                        onChange={(e) => onHideoutMapSelect(e.target.value)}
                    >
                        {hideoutMaps.length === 0 ? (
                            <option value="">{t('files.noMaps')}</option>
                        ) : null}
                        {hideoutMaps.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.display_name}
                                {isBaseHideoutMap(m)
                                    ? ` · ${t('files.baseMapLabel')}`
                                    : ''}
                                {m.lineage_base_display_name
                                    ? ` · ${t('files.childOf', { name: m.lineage_base_display_name })}`
                                    : ''}
                                {m.has_boundary ? '' : ` ${t('files.noBoundary')}`}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className="sideLayerDel"
                        title={t('files.deleteMapTitle')}
                        aria-label={t('files.deleteMapAria')}
                        disabled={
                            hideoutMaps.length === 0
                            || activeMapId === null
                        }
                        onClick={onDeleteActiveHideoutMap}
                    >
                        <Trash2 size={16} aria-hidden />
                    </button>
                </div>
            </label>
            {activeMeta != null && isBaseHideoutMap(activeMeta) ? (
                <p className="sideHint subtle">
                    {t('files.baseReadonlyHint')}
                </p>
            ) : null}

            <label className="sideLabel sideLabelStack">
                {baseCandidates.length === 0 ? (
                    <p className="sideHint">
                        {t('files.noBaseCandidates')}
                    </p>
                ) : (
                    <button
                        type="button"
                        className="iconBtnLabeled sideBtnWide sideBtnMuted"
                        disabled={importBusy || baseCandidates.length === 0}
                        onClick={openImportModal}
                    >
                        <Upload size={16} aria-hidden />
                        {t('files.createFromHideout')}
                    </button>
                )}
            </label>

            <HideoutImportModal
                open={importModalOpen}
                importBusy={importBusy}
                importBaseMapId={importBaseMapId}
                importMapName={importMapName}
                importFile={importFile}
                baseCandidates={baseCandidates}
                setImportBaseMapId={(v) => setImportBaseMapId(v)}
                setImportMapName={setImportMapName}
                setImportFile={setImportFile}
                closeImportModal={closeImportModal}
                submitHideoutImport={submitHideoutImport}
            />

            <div className="sideBtnRow">
                <button
                    type="button"
                    className="iconBtnLabeled primary sideBtnWide"
                    title={t('files.exportTitle')}
                    onClick={onExport}
                >
                    <Download aria-hidden />
                    {t('files.exportButton')}
                </button>
            </div>
            <div className="sideBtnRow">
                <button
                    type="button"
                    className="iconBtnLabeled sideBtnWide sideBtnMuted"
                    title={
                        activeMeta != null && isBaseHideoutMap(activeMeta)
                            ? t('files.saveAsChildTitle')
                            : t('files.saveAsNewTitle')
                    }
                    disabled={
                        hideoutMaps.length === 0 || activeMapId === null
                    }
                    onClick={onSaveMapAsNew}
                >
                    <CopyPlus aria-hidden />
                    {activeMeta != null && isBaseHideoutMap(activeMeta)
                        ? t('files.saveAsChildButton')
                        : t('files.saveAsNewButton')}
                </button>
            </div>
            <button
                type="button"
                className="iconBtnLabeled sideBtnWide sideBtnMuted"
                title={t('files.homeTitle')}
                onClick={applyHomeView}
            >
                <Maximize2 aria-hidden />
                {t('files.homeButton')}
            </button>
        </section>
    );
}
