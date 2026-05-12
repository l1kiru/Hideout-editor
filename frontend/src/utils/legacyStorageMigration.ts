import {
    LEGACY_LOCALSTORAGE_KEY_RENAMES,
    LEGACY_LOCALSTORAGE_PREFIX_RENAMES,
} from '../features/editor/lib/editorConstants';

const MIGRATION_DONE_FLAG = 'hideout-editor-legacy-migration-v1-done';

// Renames stored localStorage keys from the previous-version prefix
// `hideout-creator-...` to the current `hideout-editor-...`. Runs once
// guarded by a flag in localStorage; subsequent calls are a no-op.
export function migrateLegacyLocalStorageKeys(): void {
    if (typeof window === 'undefined') return;
    let storage: Storage;
    try {
        storage = window.localStorage;
    } catch {
        return;
    }

    try {
        if (storage.getItem(MIGRATION_DONE_FLAG) === '1') return;
    } catch {
        return;
    }

    try {
        for (const [oldKey, newKey] of LEGACY_LOCALSTORAGE_KEY_RENAMES) {
            const value = storage.getItem(oldKey);
            if (value === null) continue;
            if (storage.getItem(newKey) === null) {
                storage.setItem(newKey, value);
            }
            storage.removeItem(oldKey);
        }

        const allKeys: string[] = [];
        for (let i = 0; i < storage.length; i += 1) {
            const k = storage.key(i);
            if (k !== null) allKeys.push(k);
        }
        for (const [oldPrefix, newPrefix] of LEGACY_LOCALSTORAGE_PREFIX_RENAMES) {
            for (const key of allKeys) {
                if (!key.startsWith(oldPrefix)) continue;
                const suffix = key.slice(oldPrefix.length);
                const newKey = `${newPrefix}${suffix}`;
                const value = storage.getItem(key);
                if (value === null) continue;
                if (storage.getItem(newKey) === null) {
                    storage.setItem(newKey, value);
                }
                storage.removeItem(key);
            }
        }

        storage.setItem(MIGRATION_DONE_FLAG, '1');
    } catch {
        // Swallow errors silently rather than break the first launch.
    }
}
