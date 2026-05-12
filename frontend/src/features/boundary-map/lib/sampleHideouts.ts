// Sample .hideout maps shipped under repo://input/hideout/ and served by
// the Vite plugin at /input/hideout/. Used by the boundary marking page to
// let the user load a curated base map without an OS file dialog.

const SAMPLES_INDEX_URL = '/input_hideout_index.json';
const SAMPLES_FILE_PREFIX = '/input/hideout/';

// Trim the trailing .hideout extension for display. Falls back to the raw
// filename if the extension is missing (defensive — the Vite plugin only
// indexes *.hideout, so this is unlikely in practice).
export function sampleDisplayName(filename: string): string {
    const m = /^(.+)\.hideout$/i.exec(filename);
    return m ? m[1]! : filename;
}

// Build a single-element FileList that mirrors what <input type="file">
// would deliver, so the boundary-map controller's onUploadHideout can
// consume it without any branching.
function singletonFileList(file: File): FileList {
    const dt = new DataTransfer();
    dt.items.add(file);
    return dt.files;
}

export async function fetchSampleHideoutsIndex(): Promise<string[]> {
    const r = await fetch(SAMPLES_INDEX_URL, { cache: 'no-cache' });
    if (!r.ok) return [];
    const body = (await r.json()) as unknown;
    if (!Array.isArray(body)) return [];
    return body.filter((x): x is string => typeof x === 'string');
}

export async function fetchSampleHideoutAsFileList(
    filename: string,
): Promise<FileList> {
    const r = await fetch(`${SAMPLES_FILE_PREFIX}${encodeURIComponent(filename)}`);
    if (!r.ok) {
        throw new Error(`Failed to fetch sample "${filename}": HTTP ${r.status}`);
    }
    const blob = await r.blob();
    const file = new File([blob], filename, {
        type: 'application/octet-stream',
    });
    return singletonFileList(file);
}
