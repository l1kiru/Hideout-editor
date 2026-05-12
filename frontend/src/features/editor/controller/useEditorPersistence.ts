import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
    limitsToViewBox,
    zoneViewLimitsWithPad,
} from '../../../lib/viewLimits';
import type {
    Background,
    PaintLayer,
    Scene,
    Tool,
    UiState,
} from '../../../types/scene';
import {
    HIDEOUT_PLACEMENTS_HARD_LIMIT,
    sceneStorageKeyForMap,
} from '../lib/editorConstants';
import {
    defaultBackground,
    defaultTool,
    defaultUi,
} from '../lib/editorDefaults';
import {
    ensureDefaultMapLayerFirst,
    preferredDrawingLayerIndex,
} from '../lib/editorDefaultMapLayer';
import { layerId } from '../lib/editorIds';
import {
    migrateLayersRopeLineRToTangent,
    migrateLegacyToolAssetKeys,
} from '../lib/sceneMigration';
import type { SelectionState } from '../model/editorSessionTypes';
import type { LayerId } from '../lib/editorIds';
import type { ViewBox } from '../lib/editorViewport';
import type { EditorApiPorts } from '../hooks/editorApiPorts';
import type { HideoutMapSummary } from '../../../api/client';
import { logEditorDevEvent } from '../lib/editorDevLog';
import { buildExportPayload, countScenePlacements } from './buildExportPayload';
import { exportFilenameForMap } from './exportFilenameForMap';
import { useEditorAutosaveEffects } from './useEditorAutosaveEffects';
import { localizeApiError } from '../../../i18n/localizeApiError';
import { useNativeDialogs } from '../../../context/NativeDialogContext';

export function useEditorPersistence(opts: {
    svgRef: RefObject<SVGSVGElement | null>;
    abortCanvasInteractions: (svgEl: SVGSVGElement | null) => void;
    clearUndoStack: () => void;
    api: EditorApiPorts;

    cameraDeg: number;
    boundary: [number, number][];
    templateId: string;
    layers: PaintLayer[];
    tool: Tool;
    background: Background;
    ui: UiState;
    templateDots: [number, number][];
    activeMapDisplayName: string;
    activeMapId: number | null;
    hideoutMaps: HideoutMapSummary[];
    // Base map flag: scene is not written to the server or to localStorage.
    sceneReadOnly: boolean;

    setCameraDeg: Dispatch<SetStateAction<number>>;
    setBoundary: Dispatch<SetStateAction<[number, number][]>>;
    setTemplateId: Dispatch<SetStateAction<string>>;
    setLayers: Dispatch<SetStateAction<PaintLayer[]>>;
    setLayerIdx: Dispatch<SetStateAction<LayerId>>;
    setTool: Dispatch<SetStateAction<Tool>>;
    setUi: Dispatch<SetStateAction<UiState>>;
    setTemplateDots: Dispatch<SetStateAction<[number, number][]>>;
    setBackground: Dispatch<SetStateAction<Background>>;
    setBgSelected: Dispatch<SetStateAction<boolean>>;
    setActiveMapDisplayName: Dispatch<SetStateAction<string>>;
    setSelected: Dispatch<SetStateAction<SelectionState>>;
    setViewBox: Dispatch<SetStateAction<ViewBox>>;
    setStatus: Dispatch<SetStateAction<string>>;
}) {
    const { t } = useTranslation('editor');
    const dialogs = useNativeDialogs();
    const {
        svgRef,
        abortCanvasInteractions,
        clearUndoStack,
        api,
        cameraDeg,
        boundary,
        templateId,
        layers,
        tool,
        background,
        ui,
        templateDots,
        activeMapDisplayName,
        activeMapId,
        hideoutMaps,
        sceneReadOnly,
        setCameraDeg,
        setBoundary,
        setTemplateId,
        setLayers,
        setLayerIdx,
        setTool,
        setUi,
        setTemplateDots,
        setBackground,
        setBgSelected,
        setActiveMapDisplayName,
        setSelected,
        setViewBox,
        setStatus,
    } = opts;

    const buildScene = useCallback(
        (): Scene => {
            const lineageBase =
                activeMapId == null
                    ? null
                    : (hideoutMaps.find((m) => m.id === activeMapId)
                          ?.lineage_base_display_name ?? null);
            return {
                scene_version: 2,
                camera_deg: cameraDeg,
                boundary: { points: boundary.map(([x, y]) => ({ x, y })) },
                template: { template_id: templateId },
                layers,
                tool: { ...tool, draw_style: 'object' },
                background: { ...defaultBackground(), ...background },
                ui: { ...defaultUi(), ...ui },
                template_dots_cache: templateDots.map(([x, y]) => ({ x, y })),
                hideout_map_display_name: activeMapDisplayName,
                lineage_base_display_name: lineageBase,
            };
        },
        [
            cameraDeg,
            boundary,
            templateId,
            layers,
            tool,
            background,
            ui,
            templateDots,
            activeMapDisplayName,
            activeMapId,
            hideoutMaps,
        ],
    );

    const hydrateFromScene = useCallback(
        (s: Scene) => {
            abortCanvasInteractions(svgRef.current);
            setCameraDeg(s.camera_deg);
            setBoundary(
                s.boundary.points.map((p): [number, number] => [p.x, p.y]),
            );
            setTemplateId(s.template?.template_id ?? '');
            const migrated =
                s.layers.length > 0
                    ? migrateLayersRopeLineRToTangent(
                          s.layers,
                          s.scene_version ?? 1,
                      )
                    : [];
            const nextLayers = ensureDefaultMapLayerFirst(migrated);
            setLayers(nextLayers);
            setLayerIdx(layerId(preferredDrawingLayerIndex(nextLayers)));
            const migratedTool = migrateLegacyToolAssetKeys(s.tool);
            setTool({
                ...defaultTool(),
                ...migratedTool,
                draw_style: 'object',
                eraser_targets: {
                    ...defaultTool().eraser_targets,
                    ...(migratedTool.eraser_targets ?? {}),
                },
            });
            setUi({ ...defaultUi(), ...s.ui });
            setTemplateDots(
                s.template_dots_cache?.map((p): [number, number] => [
                    p.x,
                    p.y,
                ]) ?? [],
            );
            setBackground({ ...defaultBackground(), ...(s.background ?? {}) });
            setBgSelected(false);
            setActiveMapDisplayName(
                String(s.hideout_map_display_name ?? ''),
            );
            setSelected([]);
            clearUndoStack();
            const lims = zoneViewLimitsWithPad(
                s.boundary.points.map((p): [number, number] => [p.x, p.y]),
                s.camera_deg,
            );
            if (lims) setViewBox(limitsToViewBox(lims));
        },
        [
            svgRef,
            abortCanvasInteractions,
            clearUndoStack,
            setCameraDeg,
            setBoundary,
            setTemplateId,
            setLayers,
            setLayerIdx,
            setTool,
            setUi,
            setTemplateDots,
            setBackground,
            setBgSelected,
            setActiveMapDisplayName,
            setSelected,
            setViewBox,
        ],
    );

    useEditorAutosaveEffects({ activeMapId, sceneReadOnly, api, buildScene });

    const persistSceneNow = useCallback(() => {
        try {
            if (activeMapId == null || sceneReadOnly) return;
            const payload = buildScene();
            localStorage.setItem(
                sceneStorageKeyForMap(activeMapId),
                JSON.stringify(payload),
            );
            void api.putEditorSceneForMap(activeMapId, payload).catch(() => {});
        } catch {
            /* ignore */
        }
    }, [activeMapId, buildScene, api, sceneReadOnly]);

    const onExport = useCallback(async () => {
        if (!templateId) {
            setStatus(t('status.noTemplateForExport'));
            return;
        }
        const forExport = buildExportPayload(buildScene());
        const placementsTotal = countScenePlacements(forExport);
        if (placementsTotal > HIDEOUT_PLACEMENTS_HARD_LIMIT) {
            const ok = await dialogs.confirm(
                t('status.exportOverLimitConfirm', {
                    count: placementsTotal,
                    limit: HIDEOUT_PLACEMENTS_HARD_LIMIT,
                }),
                {
                    confirmLabel: t('status.exportOverLimitDownload'),
                    cancelLabel: t('status.exportOverLimitCancel'),
                },
            );
            if (!ok) {
                setStatus(t('status.exportCancelled'));
                return;
            }
        }
        try {
            const blob = await api.exportHideout(forExport as Scene);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = exportFilenameForMap(activeMapDisplayName);
            a.click();
            URL.revokeObjectURL(a.href);
            logEditorDevEvent('export.ok', {
                mapId: activeMapId,
                templateId,
                filename: a.download,
                placementsTotal,
            });
            setStatus(t('status.exportReady'));
        } catch (e) {
            logEditorDevEvent('export.error', {
                mapId: activeMapId,
                templateId,
                error: String(e),
            });
            setStatus(t('status.exportError', { error: localizeApiError(t, e) }));
        }
    }, [
        api,
        buildScene,
        templateId,
        setStatus,
        activeMapDisplayName,
        activeMapId,
        dialogs,
        t,
    ]);

    return {
        buildScene,
        hydrateFromScene,
        persistSceneNow,
        onExport,
    };
}
