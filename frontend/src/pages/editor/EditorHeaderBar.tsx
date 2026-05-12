import type { Dispatch, SetStateAction } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '../../components/IconButton';
import {
    HIDEOUT_PLACEMENTS_HARD_LIMIT,
    HIDEOUT_PLACEMENTS_WARN_THRESHOLD,
} from '../../features/editor/lib/editorConstants';
import { AppModeTabs } from '../shared/AppModeTabs';
import { LanguageSwitcher } from '../shared/LanguageSwitcher';

export type EditorHeaderBarProps = {
    apiOk: boolean | null;
    placementCount: number;
    showTopPanel: boolean;
    setShowTopPanel: Dispatch<SetStateAction<boolean>>;
};

export function EditorHeaderBar({
    apiOk,
    placementCount,
    showTopPanel,
    setShowTopPanel,
}: EditorHeaderBarProps) {
    const { t } = useTranslation('app');
    const panelLabel = showTopPanel ? t('hidePanel') : t('showPanel');
    const countPillClass =
        placementCount > HIDEOUT_PLACEMENTS_HARD_LIMIT
            ? 'pill pill--danger'
            : placementCount > HIDEOUT_PLACEMENTS_WARN_THRESHOLD
              ? 'pill pill--warn'
              : 'pill';
    const countPillTitle =
        placementCount > HIDEOUT_PLACEMENTS_HARD_LIMIT
            ? t('objectsCountOverLimit', { limit: HIDEOUT_PLACEMENTS_HARD_LIMIT })
            : placementCount > HIDEOUT_PLACEMENTS_WARN_THRESHOLD
              ? t('objectsCountNearLimit', { limit: HIDEOUT_PLACEMENTS_HARD_LIMIT })
              : undefined;
    return (
        <header className="mainHeader">
            <AppModeTabs />
            <span className="pill">
                {t('connection')}:{' '}
                {apiOk === null
                    ? '…'
                    : apiOk
                      ? t('connectionYes')
                      : t('connectionNo')}
            </span>
            <span className={countPillClass} title={countPillTitle}>
                {t('objectsCount')} <strong>{placementCount}</strong>
            </span>
            <IconButton
                className="sidebarToggle"
                variant="muted"
                title={panelLabel}
                aria-expanded={showTopPanel}
                aria-label={panelLabel}
                onClick={() => setShowTopPanel((v) => !v)}
            >
                {showTopPanel ? (
                    <PanelLeftClose aria-hidden />
                ) : (
                    <PanelLeftOpen aria-hidden />
                )}
            </IconButton>
            <LanguageSwitcher />
        </header>
    );
}
