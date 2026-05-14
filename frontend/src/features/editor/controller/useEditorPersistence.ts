import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { Scene } from '../../../types/scene';
import {
    HIDEOUT_PLACEMENTS_HARD_LIMIT,
    sceneStorageKeyForMap,
} from '../lib/editorConstants';
import type { EditorApiPorts } from '../hooks/editorApiPorts';
import { logEditorDevEvent } from '../lib/editorDevLog';
import { buildExportPayload, countScenePlacements } from './buildExportPayload';
import { exportFilenameForMap } from './exportFilenameForMap';
import { useEditorAutosaveEffects } from './useEditorAutosaveEffects';
import { localizeApiError } from '../../../i18n/localizeApiError';
import { useNativeDialogs } from '../../../context/NativeDialogContext';

export function useEditorPersistence(opts: {
    svgRef: RefObject<SVGSVGElement | null>;
    abortCanvasInteractions: (svgEl: SVGSVGElement | null) => void;
    api: EditorApiPorts;
    buildScene: () => Scene;
    sceneSnapshot: Scene;
    hydrateEditorDocumentFromScene: (scene: Scene) => void;
    templateId: string;
    activeMapDisplayName: string;
    activeMapId: number | null;
    // Base map flag: scene is not written to the server or to localStorage.
    sceneReadOnly: boolean;
    setActiveMapDisplayName: Dispatch<SetStateAction<string>>;
    setStatus: Dispatch<SetStateAction<string>>;
}) {
    const { t } = useTranslation('editor');
    const dialogs = useNativeDialogs();
    const {
        svgRef,
        abortCanvasInteractions,
        api,
        buildScene,
        sceneSnapshot,
        hydrateEditorDocumentFromScene,
        templateId,
        activeMapDisplayName,
        activeMapId,
        sceneReadOnly,
        setActiveMapDisplayName,
        setStatus,
    } = opts;

    const hydrateFromScene = useCallback(
        (s: Scene) => {
            abortCanvasInteractions(svgRef.current);
            hydrateEditorDocumentFromScene(s);
            setActiveMapDisplayName(
                String(s.hideout_map_display_name ?? ''),
            );
        },
        [
            svgRef,
            abortCanvasInteractions,
            hydrateEditorDocumentFromScene,
            setActiveMapDisplayName,
        ],
    );

    useEditorAutosaveEffects({
        activeMapId,
        sceneReadOnly,
        api,
        sceneSnapshot,
    });

    const persistSceneNow = useCallback(() => {
        try {
            if (activeMapId == null || sceneReadOnly) return;
            const payload = sceneSnapshot;
            localStorage.setItem(
                sceneStorageKeyForMap(activeMapId),
                JSON.stringify(payload),
            );
            void api.putEditorSceneForMap(activeMapId, payload).catch(() => {});
        } catch {
            /* ignore */
        }
    }, [activeMapId, sceneSnapshot, api, sceneReadOnly]);

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
