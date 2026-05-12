import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import {
    DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGES,
    type SupportedLanguage,
} from './config';

const NAMESPACES = ['common', 'app', 'editor', 'boundary', 'errors'] as const;
type Namespace = (typeof NAMESPACES)[number];

type Bundle = { default: Record<string, unknown> };
type NamespaceLoader = () => Promise<Bundle>;

// Per-language, per-namespace dynamic JSON loaders. Vite emits a separate
// chunk per import() call, so each (language, namespace) pair becomes its
// own asynchronous chunk; only the active language is fetched at startup.
const LOCALE_LOADERS: Record<
    SupportedLanguage,
    Record<Namespace, NamespaceLoader>
> = {
    ru: {
        common: () => import('./locales/ru/common.json'),
        app: () => import('./locales/ru/app.json'),
        editor: () => import('./locales/ru/editor.json'),
        boundary: () => import('./locales/ru/boundary.json'),
        errors: () => import('./locales/ru/errors.json'),
    },
    en: {
        common: () => import('./locales/en/common.json'),
        app: () => import('./locales/en/app.json'),
        editor: () => import('./locales/en/editor.json'),
        boundary: () => import('./locales/en/boundary.json'),
        errors: () => import('./locales/en/errors.json'),
    },
};

const loadedLanguages = new Set<SupportedLanguage>();
const inflightLoads = new Map<SupportedLanguage, Promise<void>>();

function isSupportedLanguage(lng: unknown): lng is SupportedLanguage {
    return (
        typeof lng === 'string'
        && (SUPPORTED_LANGUAGES as readonly string[]).includes(lng)
    );
}

export async function loadLanguage(lng: SupportedLanguage): Promise<void> {
    if (loadedLanguages.has(lng)) return;
    const existing = inflightLoads.get(lng);
    if (existing) return existing;
    const task = (async () => {
        const loaders = LOCALE_LOADERS[lng];
        const namespaces = [...NAMESPACES];
        const bundles = await Promise.all(
            namespaces.map((ns) => loaders[ns]()),
        );
        namespaces.forEach((ns, i) => {
            i18n.addResourceBundle(lng, ns, bundles[i].default, true, true);
        });
        loadedLanguages.add(lng);
    })();
    inflightLoads.set(lng, task);
    try {
        await task;
    } finally {
        inflightLoads.delete(lng);
    }
}

// Load the target language before switching so the first render after the
// switch already has the new strings (no flash of translation keys).
export async function switchLanguage(lng: SupportedLanguage): Promise<void> {
    await loadLanguage(lng);
    await i18n.changeLanguage(lng);
}

export const i18nReady: Promise<void> = i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {},
        supportedLngs: [...SUPPORTED_LANGUAGES],
        fallbackLng: DEFAULT_LANGUAGE,
        defaultNS: 'common',
        ns: [...NAMESPACES],
        partialBundledLanguages: true,
        interpolation: { escapeValue: false },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
        returnNull: false,
        react: { useSuspense: false },
    })
    .then(async () => {
        const resolved = i18n.resolvedLanguage;
        const initial: SupportedLanguage = isSupportedLanguage(resolved)
            ? resolved
            : DEFAULT_LANGUAGE;
        const tasks: Array<Promise<void>> = [loadLanguage(initial)];
        if (initial !== DEFAULT_LANGUAGE) {
            tasks.push(loadLanguage(DEFAULT_LANGUAGE));
        }
        await Promise.all(tasks);
    });

i18n.on('languageChanged', (lng: string) => {
    if (isSupportedLanguage(lng)) {
        void loadLanguage(lng);
    }
});

export { i18n };
