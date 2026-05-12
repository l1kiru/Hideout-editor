import { TOOL_VARIANTS, type Scene } from '../../../types/scene';

function isRecord(x: unknown): x is Record<string, unknown> {
    return x !== null && typeof x === 'object' && !Array.isArray(x);
}

// Validates JSON before handing it to the editor. Rejects .hideout files and obviously broken structure.
export function validateEditorSceneJson(
    parsed: unknown,
): { ok: true; scene: Scene } | { ok: false; message: string } {
    if (!isRecord(parsed)) {
        return {
            ok: false,
            message:
                'Ожидается JSON-объект сцены редактора, а не массив или примитив.',
        };
    }

    const ver = parsed.scene_version;
    if (typeof ver !== 'number' || ver < 1 || !Number.isFinite(ver)) {
        if (Array.isArray(parsed.doodads)) {
            return {
                ok: false,
                message:
                    'Это не файл сцены редактора — для загрузки нужен JSON из пункта «Сохранить».',
            };
        }
        return {
            ok: false,
            message:
                'Некорректное поле scene_version: нужно число ≥ 1 (формат hideout-editor).',
        };
    }

    if (typeof parsed.camera_deg !== 'number' || !Number.isFinite(parsed.camera_deg)) {
        return {
            ok: false,
            message: 'Некорректное поле camera_deg: ожидается число.',
        };
    }

    if (!isRecord(parsed.boundary)) {
        return { ok: false, message: 'Некорректное поле boundary.' };
    }
    const pts = parsed.boundary.points;
    if (!Array.isArray(pts) || pts.length < 3) {
        return {
            ok: false,
            message:
                'boundary.points должен быть массивом минимум из трёх точек { x, y }.',
        };
    }
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (
            !isRecord(p)
            || typeof p.x !== 'number'
            || typeof p.y !== 'number'
            || !Number.isFinite(p.x)
            || !Number.isFinite(p.y)
        ) {
            return {
                ok: false,
                message: `boundary.points[${i}]: ожидаются конечные числа x и y.`,
            };
        }
    }

    if (!isRecord(parsed.template)) {
        return { ok: false, message: 'Некорректное поле template.' };
    }
    if (typeof parsed.template.template_id !== 'string') {
        return {
            ok: false,
            message: 'Поле template.template_id должно быть строкой.',
        };
    }

    if (!Array.isArray(parsed.layers)) {
        return {
            ok: false,
            message: 'Поле layers должно быть массивом слоёв.',
        };
    }

    for (let li = 0; li < parsed.layers.length; li++) {
        const ly = parsed.layers[li];
        if (!isRecord(ly)) {
            return {
                ok: false,
                message: `layers[${li}]: ожидается объект слоя.`,
            };
        }
        if (
            typeof ly.title !== 'string'
            || typeof ly.visible !== 'boolean'
            || typeof ly.locked !== 'boolean'
        ) {
            return {
                ok: false,
                message: `layers[${li}]: нужны строка title и булевы visible, locked.`,
            };
        }
        if (!Array.isArray(ly.batches)) {
            return {
                ok: false,
                message: `layers[${li}]: batches должен быть массивом.`,
            };
        }
        for (let bi = 0; bi < ly.batches.length; bi++) {
            const batch = ly.batches[bi];
            if (!isRecord(batch)) {
                return {
                    ok: false,
                    message: `layers[${li}].batches[${bi}]: ожидается объект батча.`,
                };
            }
            if (
                typeof batch.template_name_ru !== 'string'
                || typeof batch.template_hash !== 'number'
                || !Number.isFinite(batch.template_hash)
            ) {
                return {
                    ok: false,
                    message: `layers[${li}].batches[${bi}]: нужны template_name_ru (строка) и template_hash (число).`,
                };
            }
            if (!Array.isArray(batch.placements)) {
                return {
                    ok: false,
                    message: `layers[${li}].batches[${bi}]: placements должен быть массивом.`,
                };
            }
            for (let pi = 0; pi < batch.placements.length; pi++) {
                const pl = batch.placements[pi];
                if (
                    !isRecord(pl)
                    || typeof pl.x !== 'number'
                    || typeof pl.y !== 'number'
                    || typeof pl.r !== 'number'
                    || !Number.isFinite(pl.x)
                    || !Number.isFinite(pl.y)
                    || !Number.isFinite(pl.r)
                ) {
                    return {
                        ok: false,
                        message: `Слой ${li}, батч ${bi}, placement ${pi}: нужны конечные числа x, y, r.`,
                    };
                }
            }
        }
    }

    if (!isRecord(parsed.tool)) {
        return { ok: false, message: 'Некорректное поле tool.' };
    }
    const variant = parsed.tool.variant;
    if (
        typeof variant !== 'string'
        || !(TOOL_VARIANTS as readonly string[]).includes(variant)
    ) {
        // Do not lose a drawn scene because of a new/unknown tool variant
        // (e.g. a build that saved a tool absent from this validator); fall
        // back to 'select' instead.
        (parsed.tool as Record<string, unknown>).variant = 'select';
    }

    if (!isRecord(parsed.background)) {
        return {
            ok: false,
            message: 'Некорректное поле background (ожидается объект).',
        };
    }

    return { ok: true, scene: parsed as unknown as Scene };
}
