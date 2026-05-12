import { Upload, X } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { HideoutMapSummary } from '../../../../../api/client';
import { IconButton } from '../../../../../components/IconButton';

type HideoutImportModalProps = {
    open: boolean;
    importBusy: boolean;
    importBaseMapId: number | '';
    importMapName: string;
    importFile: File | null;
    baseCandidates: HideoutMapSummary[];
    setImportBaseMapId: (v: number) => void;
    setImportMapName: (v: string) => void;
    setImportFile: (f: File | null) => void;
    closeImportModal: () => void;
    submitHideoutImport: () => Promise<void>;
};

export function HideoutImportModal(props: HideoutImportModalProps) {
    const { t } = useTranslation('editor');
    const {
        open,
        importBusy,
        importBaseMapId,
        importMapName,
        importFile,
        baseCandidates,
        setImportBaseMapId,
        setImportMapName,
        setImportFile,
        closeImportModal,
        submitHideoutImport,
    } = props;

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    if (!open) return null;

    const handlePickFileClick = () => {
        if (importBusy) return;
        fileInputRef.current?.click();
    };

    const handleClearFile = () => {
        if (importBusy) return;
        setImportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div
            className="nativeModalBackdrop"
            role="presentation"
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) closeImportModal();
            }}
        >
            <div
                className="nativeModalPanel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="hideout-import-modal-title"
                onPointerDown={(e) => e.stopPropagation()}
            >
                <h2
                    id="hideout-import-modal-title"
                    className="nativeModalMessage"
                    style={{ fontWeight: 600 }}
                >
                    {t('importModal.title')}
                </h2>
                <p className="sideHint subtle" style={{ margin: 0 }}>
                    {t('importModal.hint')}
                </p>
                <label className="sideLabel sideLabelStack">
                    <span>{t('importModal.baseMap')}</span>
                    <select
                        className="sideSelect"
                        value={importBaseMapId === '' ? '' : String(importBaseMapId)}
                        disabled={importBusy}
                        onChange={(e) =>
                            setImportBaseMapId(Number.parseInt(e.target.value, 10))
                        }
                    >
                        {baseCandidates.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.display_name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="sideLabel sideLabelStack">
                    <span>{t('importModal.newMapName')}</span>
                    <input
                        type="text"
                        className="sideInput nativeModalInput"
                        placeholder={t('importModal.newMapNamePlaceholder')}
                        value={importMapName}
                        disabled={importBusy}
                        onChange={(e) => setImportMapName(e.target.value)}
                        autoComplete="off"
                    />
                </label>
                <div className="sideLabel sideLabelStack">
                    <span>{t('importModal.fileLabel')}</span>
                    <div className="sideBtnRow">
                        <button
                            type="button"
                            className="iconBtnLabeled sideBtnWide sideBtnMuted"
                            disabled={importBusy}
                            title={t('importModal.pickFileTitle')}
                            onClick={handlePickFileClick}
                        >
                            <Upload aria-hidden />
                            {importFile
                                ? t('importModal.changeFileButton')
                                : t('importModal.pickFileButton')}
                        </button>
                        {importFile ? (
                            <IconButton
                                size="sm"
                                variant="muted"
                                title={t('importModal.clearFileTitle')}
                                aria-label={t('importModal.clearFileAria')}
                                disabled={importBusy}
                                onClick={handleClearFile}
                            >
                                <X aria-hidden />
                            </IconButton>
                        ) : null}
                    </div>
                    <span className="sideHint subtle">
                        {importFile
                            ? importFile.name
                            : t('importModal.noFileChosen')}
                    </span>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".hideout"
                        hidden
                        disabled={importBusy}
                        onChange={(e) => {
                            setImportFile(e.target.files?.[0] ?? null);
                            e.target.value = '';
                        }}
                    />
                </div>
                <div className="nativeModalActions">
                    <button
                        type="button"
                        className="iconBtnLabeled sideBtnWide sideBtnMuted"
                        disabled={importBusy}
                        onClick={closeImportModal}
                    >
                        {t('common:cancel')}
                    </button>
                    <button
                        type="button"
                        className="iconBtnLabeled primary sideBtnWide"
                        disabled={importBusy || importBaseMapId === ''}
                        onClick={() => void submitHideoutImport()}
                    >
                        {t('importModal.createButton')}
                    </button>
                </div>
            </div>
        </div>
    );
}
