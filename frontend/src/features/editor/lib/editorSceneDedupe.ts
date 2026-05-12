import type { PaintedBatch, Scene } from '../../../types/scene';

export type SanitizeLayer0Options = {
    // Allowed layer-0 template doodad names from the server
    // (GET /api/maps/:id/layer0-doodad-names). Without this list foreign
    // layer-0 batches are not pruned.
    allowedLayer0TemplateNamesRu?: readonly string[] | null;
};

function pruneLayer0ForeignTemplateBatches(
    scene: Scene,
    allowedLc: Set<string>,
): { scene: Scene; changed: boolean } {
    const layers = scene.layers;
    if (!layers?.length)
        return { scene, changed: false };

    const ly0 = layers[0];
    const batches = ly0.batches ?? [];
    const out: PaintedBatch[] = [];
    let changed = false;

    for (const b of batches) {
        if (b.line_stroke) {
            out.push(b);
            continue;
        }
        const nm = String(b.template_name_ru ?? '').trim();
        if (allowedLc.has(nm.toLocaleLowerCase('ru'))) {
            out.push(b);
            continue;
        }
        changed = true;
    }

    if (!changed)
        return { scene, changed: false };

    return {
        scene: {
            ...scene,
            layers: layers.map((l, i) =>
                i === 0 ? { ...ly0, batches: out } : l,
            ),
        },
        changed: true,
    };
}

// Name-based dedup plus optional pruning of foreign layer-0 decorations against a server allow-list.
export function sanitizeEditorSceneLayer0(
    scene: Scene,
    opts?: SanitizeLayer0Options,
): {
    scene: Scene;
    changed: boolean;
} {
    let s = scene;
    let changed = false;
    const d = dedupeSceneLayer0DuplicateTemplateNamesRu(s);
    if (d.changed) {
        s = d.scene;
        changed = true;
    }
    const allowed = opts?.allowedLayer0TemplateNamesRu;
    if (allowed?.length) {
        const allowedLc = new Set(
            allowed.map((n) => n.toLocaleLowerCase('ru')),
        );
        const p = pruneLayer0ForeignTemplateBatches(s, allowedLc);
        if (p.changed) {
            s = p.scene;
            changed = true;
        }
    }
    return { scene: s, changed };
}

function layer0BatchMergeKey(b: PaintedBatch): string {
    const fv =
        b.facet_fv === undefined || b.facet_fv === null
            ? ''
            : String(b.facet_fv);
    return `${b.template_name_ru}\0${b.template_hash}\0${fv}`;
}

// Merges layer-0 batches with identical name, hash and facet_fv (multiple
// identical doodads from .hideout collapse into a single batch with multiple
// placements). Line-stroke batches and batches missing key fields are left alone.
export function dedupeSceneLayer0DuplicateTemplateNamesRu(scene: Scene): {
    scene: Scene;
    changed: boolean;
} {
    const layers = scene.layers;
    if (!layers?.length)
        return { scene, changed: false };

    const ly0 = layers[0];
    const batches = ly0.batches ?? [];
    const strokeOut: PaintedBatch[] = [];
    const merged = new Map<string, PaintedBatch>();
    let mergedIntoExisting = false;

    for (const b of batches) {
        if (b.line_stroke) {
            strokeOut.push({
                ...b,
                placements: (b.placements ?? []).map((p) => ({ ...p })),
            });
            continue;
        }
        const pl = b.placements ?? [];
        if (pl.length === 0)
            continue;
        const key = layer0BatchMergeKey(b);
        const prev = merged.get(key);
        if (!prev) {
            merged.set(key, {
                ...b,
                placements: pl.map((p) => ({ ...p })),
            });
        }
        else {
            prev.placements = [
                ...prev.placements,
                ...pl.map((p) => ({ ...p })),
            ];
            mergedIntoExisting = true;
        }
    }

    const compactOut = [...strokeOut, ...merged.values()];
    const changed =
        mergedIntoExisting || compactOut.length !== batches.length;

    if (!changed)
        return { scene, changed: false };

    return {
        scene: {
            ...scene,
            layers: layers.map((l, i) =>
                i === 0 ? { ...ly0, batches: compactOut } : l,
            ),
        },
        changed: true,
    };
}
