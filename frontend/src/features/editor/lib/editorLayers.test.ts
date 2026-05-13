import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import type { PaintLayer } from '../../../types/scene';
import {
    getLayerDisplayTitle,
    normalizePaintLayer,
} from './editorLayers';

function makeLayer(partial: Partial<PaintLayer>): PaintLayer {
    return {
        visible: true,
        locked: false,
        batches: [],
        ...partial,
    };
}

function createLayerT(
    dict: Record<string, string>,
): TFunction<'editor'> {
    return ((key: string, options?: Record<string, unknown>) => {
        const template = dict[key] ?? key;
        return template.replace(
            /\{\{(\w+)\}\}/g,
            (_m, name: string) => String(options?.[name] ?? ''),
        );
    }) as TFunction<'editor'>;
}

const tEn = createLayerT({
    'layers.defaultLayerTitle': 'Default objects',
    'layers.importedDecorationsTitle': 'Imported decorations',
    'layers.paletteRecognizedTitle': 'Palette-recognized objects',
    'layers.userLayerTitle': 'Layer {{index}}',
});

const tRu = createLayerT({
    'layers.defaultLayerTitle': 'Объекты по умолчанию',
    'layers.importedDecorationsTitle': 'Импортированные украшения',
    'layers.paletteRecognizedTitle': 'Объекты, распознанные как палитра',
    'layers.userLayerTitle': 'Слой {{index}}',
});

describe('editorLayers', () => {
    it('localizes semantic system layers instead of using stored UI text', () => {
        expect(
            getLayerDisplayTitle(makeLayer({ kind: 'default' }), 0, tEn),
        ).toBe('Default objects');
        expect(
            getLayerDisplayTitle(makeLayer({ kind: 'decorations' }), 1, tRu),
        ).toBe('Импортированные украшения');
        expect(
            getLayerDisplayTitle(makeLayer({ kind: 'palette' }), 2, tEn),
        ).toBe('Palette-recognized objects');
    });

    it('falls back to locale-aware user layer numbering when title is absent', () => {
        expect(
            getLayerDisplayTitle(makeLayer({ kind: 'user' }), 1, tEn),
        ).toBe('Layer 1');
        expect(
            getLayerDisplayTitle(makeLayer({}), 2, tRu),
        ).toBe('Слой 2');
    });

    it('normalizes legacy localized system titles into stable kinds', () => {
        expect(
            normalizePaintLayer(
                makeLayer({
                    title: 'Объекты по умолчанию',
                    locked: true,
                }),
            ),
        ).toEqual(
            makeLayer({
                kind: 'default',
                locked: true,
            }),
        );
        expect(
            normalizePaintLayer(
                makeLayer({
                    title: 'Palette decorations',
                }),
            ),
        ).toEqual(
            makeLayer({
                kind: 'palette',
            }),
        );
    });
});
