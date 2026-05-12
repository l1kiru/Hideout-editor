import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '../../components/IconButton';
import { switchLanguage } from '../../i18n';
import type { SupportedLanguage } from '../../i18n/config';

function FlagRU({ size = 14 }: { size?: number }) {
    const w = Math.round(size * 1.5);
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 9 6"
            width={w}
            height={size}
            aria-hidden
        >
            <rect width="9" height="2" y="0" fill="#fff" />
            <rect width="9" height="2" y="2" fill="#0039a6" />
            <rect width="9" height="2" y="4" fill="#d52b1e" />
        </svg>
    );
}

function FlagGB({ size = 14 }: { size?: number }) {
    const w = Math.round(size * 1.5);
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 60 30"
            width={w}
            height={size}
            aria-hidden
        >
            <rect width="60" height="30" fill="#012169" />
            <path
                d="M0,0 L60,30 M60,0 L0,30"
                stroke="#fff"
                strokeWidth="6"
            />
            <path
                d="M0,0 L60,30 M60,0 L0,30"
                stroke="#C8102E"
                strokeWidth="4"
            />
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
            <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
        </svg>
    );
}

const FLAGS: Record<string, (props: { size?: number }) => ReactElement> = {
    ru: FlagRU,
    en: FlagGB,
};

export function LanguageSwitcher({ className = '' }: { className?: string }) {
    const { i18n, t } = useTranslation('app');
    const cur: SupportedLanguage = i18n.resolvedLanguage
        ?.toLowerCase()
        .startsWith('ru')
        ? 'ru'
        : 'en';
    const next: SupportedLanguage = cur === 'ru' ? 'en' : 'ru';
    const Flag = FLAGS[cur];

    return (
        <IconButton
            className={`languageToggle ${className}`.trim()}
            variant="muted"
            size="md"
            title={t('languageSwitchTitle')}
            aria-label={t('languageSwitchAria', { lang: cur.toUpperCase() })}
            aria-pressed={cur === 'en'}
            onClick={() => {
                void switchLanguage(next);
            }}
        >
            <span className="languageToggleInner" aria-hidden>
                <span className="languageToggleFlag">
                    <Flag size={14} />
                </span>
                <span className="languageToggleCode">{cur.toUpperCase()}</span>
            </span>
        </IconButton>
    );
}
