import { afterEach, describe, expect, it, vi } from 'vitest';

import { sampleEditorScene } from '../test-utils/fixtures/sampleEditorScene';
import { ApiError } from './base';
import { exportHideout, health } from './systemApi';

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

function stubFetch(impl: (input: string, init?: RequestInit) => Response): FetchMock {
    const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : String(input);
        return impl(url, init);
    }) as unknown as FetchMock;
    vi.stubGlobal('fetch', fn);
    return fn;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('exportHideout', () => {
    it('POSTs to /api/export/hideout with JSON content type', async () => {
        const fetchMock = stubFetch(
            () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
        );
        const scene = sampleEditorScene();

        const blob = await exportHideout(scene);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0]!;
        expect(url).toBe('/api/export/hideout');
        expect(init?.method).toBe('POST');
        const headers = init?.headers as Record<string, string>;
        expect(headers['Content-Type']).toBe('application/json');
        expect(blob).toBeInstanceOf(Blob);
    });

    it('serializes the full Scene payload in the request body', async () => {
        let captured: unknown = null;
        stubFetch((_url, init) => {
            captured = JSON.parse(String(init?.body ?? 'null'));
            return new Response(new Uint8Array(), { status: 200 });
        });
        const scene = sampleEditorScene();

        await exportHideout(scene);

        expect(captured).toEqual(JSON.parse(JSON.stringify(scene)));
    });

    it('throws ApiError carrying status and a localised error code', async () => {
        stubFetch(
            () =>
                new Response(
                    JSON.stringify({
                        error: { code: 'export_failed', params: { reason: 'x' } },
                        detail: 'Export failed',
                    }),
                    {
                        status: 422,
                        headers: { 'Content-Type': 'application/json' },
                    },
                ),
        );

        await expect(exportHideout(sampleEditorScene())).rejects.toMatchObject({
            status: 422,
            code: 'export_failed',
            message: 'Export failed',
        });
        await expect(exportHideout(sampleEditorScene())).rejects.toBeInstanceOf(
            ApiError,
        );
    });
});

describe('health', () => {
    it('returns true on a 2xx response', async () => {
        stubFetch(() => new Response(null, { status: 200 }));
        await expect(health()).resolves.toBe(true);
    });

    it('returns false on a network failure', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new Error('boom');
            }),
        );
        await expect(health()).resolves.toBe(false);
    });
});
