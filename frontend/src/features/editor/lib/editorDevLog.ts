export type EditorDevEvent = {
    ts: number;
    event: string;
    payload?: Record<string, unknown>;
};

const MAX_EVENTS = 50;
const ring: EditorDevEvent[] = [];

function isDev(): boolean {
    return Boolean(import.meta.env?.DEV);
}

export function logEditorDevEvent(
    event: string,
    payload?: Record<string, unknown>,
): void {
    if (!isDev()) return;
    const row: EditorDevEvent = { ts: Date.now(), event, payload };
    ring.push(row);
    if (ring.length > MAX_EVENTS) ring.splice(0, ring.length - MAX_EVENTS);
    try {
        const w = window as unknown as {
            __hideoutEditorDevLog?: EditorDevEvent[];
        };
        w.__hideoutEditorDevLog = [...ring];
    } catch {
        /* ignore */
    }
    // Lightweight trace to the dev console.
    console.debug('[editor-dev]', event, payload ?? {});
}
