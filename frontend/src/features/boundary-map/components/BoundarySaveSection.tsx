import type { FormEvent } from 'react';
import { Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type BoundarySaveSectionProps = {
    mapDisplayName: string;
    onMapDisplayNameChange: (v: string) => void;
    createAsBaseMap: boolean;
    onCreateAsBaseMapChange: (v: boolean) => void;
    orderedLength: number;
    onPublish: (ev: FormEvent) => void | Promise<void>;
};

export function BoundarySaveSection({
    mapDisplayName,
    onMapDisplayNameChange,
    createAsBaseMap,
    onCreateAsBaseMapChange,
    orderedLength,
    onPublish,
}: BoundarySaveSectionProps) {
    const { t } = useTranslation('boundary');
    const disabled = orderedLength < 3;
    return (
        <section className="sideSection">
            <h2 className="sideHeading">{t('save.section')}</h2>
            <label className="sideLabel sideLabelStack">
                <span>{t('save.mapName')}</span>
                <input
                    className="sideInput"
                    value={mapDisplayName}
                    placeholder={t('save.mapNamePlaceholder')}
                    onChange={(e) => onMapDisplayNameChange(e.target.value)}
                />
            </label>
            <label className="sideCheck">
                <input
                    type="checkbox"
                    checked={createAsBaseMap}
                    onChange={(e) =>
                        onCreateAsBaseMapChange(e.target.checked)}
                />
                {t('save.createBase')}
            </label>
            {createAsBaseMap ? (
                <p className="sideHint subtle">
                    {t('save.createBaseHint')}
                </p>
            ) : null}
            <form onSubmit={(e) => void onPublish(e)}>
                <button
                    type="submit"
                    className="iconBtnLabeled sideBtnWide sideBtnMuted"
                    disabled={disabled}
                    title={t('save.saveTitle')}
                >
                    <Database aria-hidden />
                    {t('save.saveButton')}
                </button>
            </form>
            {disabled ? (
                <p className="sideHint subtle">
                    {t('save.disabledHint')}
                </p>
            ) : null}
        </section>
    );
}
