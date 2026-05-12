import { expectOk } from './base';

export async function uploadInputImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    const r = await fetch('/api/input-images/upload', {
        method: 'POST',
        body: fd,
    });
    await expectOk(r);
    const data = (await r.json()) as { name?: string };
    return data?.name ?? file.name;
}

export async function listInputImages(): Promise<string[]> {
    const r = await fetch(`/api/input-images?ts=${Date.now()}`, {
        cache: 'no-store',
    });
    await expectOk(r);
    const json = (await r.json()) as unknown;
    const namesRaw = Array.isArray(json)
        ? json
        : Array.isArray((json as { names?: unknown })?.names)
          ? ((json as { names?: unknown[] }).names ?? [])
          : [];
    return namesRaw
        .map((v) => String(v))
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

export async function deleteInputImage(name: string): Promise<void> {
    const r = await fetch(`/api/input-images/${encodeURIComponent(name)}`, {
        method: 'DELETE',
    });
    await expectOk(r);
}
