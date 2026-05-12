import type { TFunction } from 'i18next';

import { getApiErrorMeta } from '../api/base';

export function localizeApiError(t: TFunction, e: unknown): string {
    const meta = getApiErrorMeta(e);
    if (meta.code) {
        const key = meta.code;
        const localized = t(key, {
            ns: 'errors',
            ...(meta.params ?? {}),
            defaultValue: '',
        });
        if (localized && localized !== key) return localized;
    }
    if (meta.detail && meta.detail.trim().length > 0) return meta.detail;
    return meta.message || t('common:unknownError');
}

