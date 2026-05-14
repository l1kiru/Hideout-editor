import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { listInputImages } from '../../../api/inputImages';
import type { HideoutMapSummary } from '../../../api/client';
import {
    backgroundWidthViewBaseForFit,
    limitsToViewBox,
    zoneViewLimitsWithPad,
} from '../../../lib/viewLimits';
import type { Background, Scene, TemplateUploadResponse } from '../../../types/scene';
import {
    ACTIVE_MAP_ID_LS,
    firstBaseHideoutMap,
} from '../lib/editorConstants';
import {
    readSceneForMapFromLocalStorage,
} from '../lib/editorSceneStorage';
import { sanitizeEditorSceneLayer0 } from '../lib/editorSceneDedupe';
import { validateEditorSceneJson } from '../lib/editorSceneJsonValidate';
import { pointsFromBoundaryDoc } from '../lib/editorDefaults';
import type { EditorApiPorts } from '../hooks/editorApiPorts';
import type { ViewBox } from '../lib/editorViewport';
import { localizeApiError } from '../../../i18n/localizeApiError';

export function useEditorSceneBootstrap(opts: {
    api: EditorApiPorts;
    setApiOk: Dispatch<SetStateAction<boolean | null>>;
    setHideoutMaps: Dispatch<SetStateAction<HideoutMapSummary[]>>;
    setActiveMapId: Dispatch<SetStateAction<number | null>>;
    setActiveMapDisplayName: Dispatch<SetStateAction<string>>;
    setStatus: Dispatch<SetStateAction<string>>;
    setInputImageNames: Dispatch<SetStateAction<string[]>>;
    hydrateFromScene: (s: Scene) => void;
    resetEditorForMapSwitch: () => void;

    hideoutMaps: HideoutMapSummary[];
    activeMapId: number | null;
    boundary: [number, number][];
    cameraDeg: number;
    setBoundary: Dispatch<SetStateAction<[number, number][]>>;
    setTemplateId: Dispatch<SetStateAction<string>>;
    setTemplateDots: Dispatch<SetStateAction<[number, number][]>>;
    setViewBox: Dispatch<SetStateAction<ViewBox>>;

    background: Background;
    bgNaturalSize: { w: number; h: number } | null;
    setBgNaturalSize: Dispatch<
        SetStateAction<{ w: number; h: number } | null>
    >;
    setBackground: Dispatch<SetStateAction<Background>>;
    applyBundledDefaultLayerBatches: (tpl: TemplateUploadResponse | null) => void;
}) {
    const { t } = useTranslation('editor');
    const {
        api,
        setApiOk,
        setHideoutMaps,
        setActiveMapId,
        setActiveMapDisplayName,
        setStatus,
        setInputImageNames,
        hydrateFromScene,
        resetEditorForMapSwitch,
        hideoutMaps,
        activeMapId,
        boundary,
        cameraDeg,
        setBoundary,
        setTemplateId,
        setTemplateDots,
        setViewBox,
        background,
        bgNaturalSize,
        setBgNaturalSize,
        setBackground,
        applyBundledDefaultLayerBatches,
    } = opts;

    const prevBootstrappedMapIdRef = useRef<number | null>(null);
    const mapApiGenerationRef = useRef(0);

    useEffect(() => {
        void api.health().then(setApiOk);
        void api
            .listHideoutMaps()
            .then((maps) => {
                setHideoutMaps(maps);
                const savedIdRaw = localStorage.getItem(ACTIVE_MAP_ID_LS);
                const savedId = savedIdRaw
                    ? Number.parseInt(savedIdRaw, 10)
                    : Number.NaN;
                const defaultMap =
                    firstBaseHideoutMap(maps)
                    ?? maps[0];
                const selectedMap =
                    maps.find((m) => m.id === savedId) ?? defaultMap;
                if (selectedMap) {
                    setActiveMapId(selectedMap.id);
                    setActiveMapDisplayName(selectedMap.display_name);
                }
            })
            .catch(() => setStatus(t('status.mapsLoadError')));
    }, [api, setApiOk, setHideoutMaps, setActiveMapId, setActiveMapDisplayName, setStatus, t]);

    const mapsReady =
        activeMapId != null
        && hideoutMaps.some((m) => m.id === activeMapId);

    useEffect(() => {
        if (!activeMapId) {
            prevBootstrappedMapIdRef.current = null;
            return;
        }
        if (!mapsReady) return;

        if (prevBootstrappedMapIdRef.current === activeMapId) return;
        prevBootstrappedMapIdRef.current = activeMapId;

        const meta = hideoutMaps.find((m) => m.id === activeMapId);
        if (!meta) return;

        mapApiGenerationRef.current += 1;
        const gen = mapApiGenerationRef.current;

        void (async () => {
            let stored = readSceneForMapFromLocalStorage(activeMapId);
            if (!stored) {
                try {
                    let allowedLayer0: string[] | undefined;
                    try {
                        allowedLayer0 = await api.getLayer0DoodadNamesForMap(
                            activeMapId,
                        );
                    }
                    catch {
                        allowedLayer0 = undefined;
                    }
                    const remote = await api.getEditorSceneForMap(activeMapId);
                    if (remote != null) {
                        const checked = validateEditorSceneJson(remote);
                        if (checked.ok) {
                            stored = sanitizeEditorSceneLayer0(
                                checked.scene,
                                {
                                    allowedLayer0TemplateNamesRu:
                                        allowedLayer0,
                                },
                            ).scene;
                        }
                    }
                }
                catch {
                    /* ignore */
                }
            }
            if (gen !== mapApiGenerationRef.current) return;

            if (stored) {
                hydrateFromScene(stored);
                setStatus(t('status.sceneRestored'));
                return;
            }

            resetEditorForMapSwitch();

            if (gen !== mapApiGenerationRef.current) return;

            try {
                const doc = await api.getBoundaryOrderForMap(activeMapId);
                if (gen !== mapApiGenerationRef.current) return;
                if (doc === null) {
                    setBoundary([]);
                }
                else {
                    const pts = pointsFromBoundaryDoc(doc);
                    if (pts.length >= 3) {
                        setBoundary(pts);
                        const lims = zoneViewLimitsWithPad(pts, cameraDeg);
                        if (lims) setViewBox(limitsToViewBox(lims));
                    }
                    else {
                        setBoundary([]);
                    }
                }
                try {
                    const tpl = await api.loadMapTemplate(activeMapId);
                    if (gen !== mapApiGenerationRef.current) return;
                    setTemplateId(tpl.template_id);
                    setTemplateDots(
                        tpl.dots.map((d): [number, number] => [d.x, d.y]),
                    );
                    applyBundledDefaultLayerBatches(tpl);
                    setStatus(t('status.mapLoaded', { name: meta.display_name }));
                }
                catch {
                    if (gen !== mapApiGenerationRef.current) return;
                    applyBundledDefaultLayerBatches(null);
                    setStatus(t('status.mapLoaded', { name: meta.display_name }));
                }
            }
            catch (e) {
                if (gen !== mapApiGenerationRef.current) return;
                setStatus(t('status.mapLoadError', { error: localizeApiError(t, e) }));
            }
        })();
    }, [
        activeMapId,
        mapsReady,
        hideoutMaps,
        api,
        cameraDeg,
        hydrateFromScene,
        resetEditorForMapSwitch,
        setBoundary,
        setTemplateId,
        setTemplateDots,
        setViewBox,
        setStatus,
        applyBundledDefaultLayerBatches,
        t,
    ]);

    const refreshInputImages = useCallback(async (): Promise<string[]> => {
        const list = await listInputImages().catch(async () => {
            const t = Date.now();
            try {
                const r = await fetch(`/input_images_index.json?t=${t}`, {
                    cache: 'no-store',
                });
                if (!r.ok) return [];
                const x = (await r.json()) as unknown;
                if (Array.isArray(x) && x.every((i) => typeof i === 'string'))
                    return x as string[];
                return [];
            } catch {
                return [];
            }
        });
        setInputImageNames(list);
        return list;
    }, [setInputImageNames]);

    useEffect(() => {
        void refreshInputImages();
    }, [refreshInputImages]);

    useEffect(() => {
        const p = background.path?.trim();
        // Reset bgNaturalSize on any path change so the auto-fit below does
        // not run against the previous image's stale dimensions.
        setBgNaturalSize(null);
        if (!p) return;
        const img = new Image();
        img.onload = () =>
            setBgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => {
            setBgNaturalSize(null);
            setStatus(t('status.bgLoadError'));
        };
        img.src = p;
    }, [background.path, setBgNaturalSize, setStatus, t]);

    // Auto fit-to-zone on first load of a new image. Runs while
    // width_view_base is still unset (it is forced to null when the
    // background changes via the select dropdown or a file upload). Also
    // centers the background on the zone, matching the "Fit to zone" button.
    useEffect(() => {
        const p = background.path?.trim();
        if (!p || !bgNaturalSize || boundary.length < 3) return;
        setBackground((b) => {
            if (b.width_view_base != null) return b;
            const lims = zoneViewLimitsWithPad(boundary, cameraDeg);
            if (!lims) return b;
            const zoneW = lims.xmax - lims.xmin;
            const zoneH = lims.ymax - lims.ymin;
            const cx = (lims.xmin + lims.xmax) / 2;
            const cy = (lims.ymin + lims.ymax) / 2;
            const fitted = backgroundWidthViewBaseForFit(
                zoneW,
                zoneH,
                bgNaturalSize.w,
                bgNaturalSize.h,
            );
            return {
                ...b,
                width_view_base: fitted,
                offset_x: cx,
                offset_y: cy,
            };
        });
    }, [
        background.path,
        bgNaturalSize,
        boundary,
        cameraDeg,
        setBackground,
    ]);

    return { refreshInputImages };
}
