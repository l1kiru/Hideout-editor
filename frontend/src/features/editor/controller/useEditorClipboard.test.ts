import { beforeEach, describe, expect, it } from 'vitest';

import { DECORATIONS } from '../../../lib/sceneDecorations';
import {
    clearClipboardSs,
    readClipboardSs,
    SS_CLIP_KEY,
    writeClipboardSs,
    type EditorClipboardBatch,
} from './useEditorClipboard';

class MemoryStorage implements Storage {
    private store = new Map<string, string>();

    get length(): number {
        return this.store.size;
    }

    clear(): void {
        this.store.clear();
    }

    getItem(key: string): string | null {
        return this.store.get(key) ?? null;
    }

    key(index: number): string | null {
        return Array.from(this.store.keys())[index] ?? null;
    }

    removeItem(key: string): void {
        this.store.delete(key);
    }

    setItem(key: string, value: string): void {
        this.store.set(key, value);
    }
}

const KNOWN_MOSS = DECORATIONS.moss;

function makeBatch(
    partial: Partial<EditorClipboardBatch>,
): EditorClipboardBatch {
    return {
        template_name_ru: 'batch',
        template_hash: KNOWN_MOSS.hash,
        facet_fv: KNOWN_MOSS.fv,
        placements: [{ x: 1, y: 2, r: 0 }],
        ...partial,
    };
}

describe('useEditorClipboard storage helpers', () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, 'sessionStorage', {
            configurable: true,
            value: new MemoryStorage(),
        });
    });

    it('sanitizes persisted clipboard on write', () => {
        writeClipboardSs([
            makeBatch({ template_name_ru: 'known' }),
            makeBatch({
                template_name_ru: 'unknown',
                template_hash: 999999,
                facet_fv: 0,
            }),
        ]);

        expect(readClipboardSs()).toEqual([makeBatch({ template_name_ru: 'known' })]);
    });

    it('keeps line-stroke batches when re-sanitizing stale persisted clipboard on read', () => {
        sessionStorage.setItem(
            SS_CLIP_KEY,
            JSON.stringify({
                v: 1,
                batches: [
                    makeBatch({ template_name_ru: 'known' }),
                    makeBatch({
                        template_name_ru: 'line-stroke',
                        line_stroke: true,
                    }),
                ],
            }),
        );

        expect(readClipboardSs()).toEqual([
            makeBatch({ template_name_ru: 'known' }),
            makeBatch({
                template_name_ru: 'line-stroke',
                line_stroke: true,
            }),
        ]);
        expect(JSON.parse(sessionStorage.getItem(SS_CLIP_KEY) ?? 'null')).toEqual({
            v: 1,
            batches: [
                makeBatch({ template_name_ru: 'known' }),
                makeBatch({
                    template_name_ru: 'line-stroke',
                    line_stroke: true,
                }),
            ],
        });
    });

    it('clears persisted clipboard to prevent stale paste path', () => {
        writeClipboardSs([makeBatch({ template_name_ru: 'known' })]);

        clearClipboardSs();

        expect(readClipboardSs()).toBeNull();
        expect(sessionStorage.getItem(SS_CLIP_KEY)).toBeNull();
    });
});
