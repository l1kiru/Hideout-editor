import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { HideoutMapSummary } from '../../../api/client';
import type { Scene, TemplateUploadResponse } from '../../../types/scene';
import { useNativeDialogs } from '../../../context/NativeDialogContext';
import { localizeApiError } from '../../../i18n/localizeApiError';
import {
    ACTIVE_MAP_ID_LS,
    firstBaseHideoutMap,
    hideoutForkSubtreeIds,
    isBaseHideoutMap,
} from '../lib/editorConstants';
import {
    removeSceneForMapFromLocalStorage,
    writeSceneForMapToLocalStorage,
} from '../lib/editorSceneStorage';
import type { EditorApiPorts } from '../hooks/editorApiPorts';

type UseEditorMapCommandsArgs = {
    api: EditorApiPorts;
    hideoutMaps: HideoutMapSummary[];
    activeMapId: number | null;
    buildScene: () => Scene;
    persistSceneNow: () => void;
    applyBundledDefaultLayerBatches: (tpl: TemplateUploadResponse | null) => void;
    setHideoutMaps: Dispatch<SetStateAction<HideoutMapSummary[]>>;
    setActiveMapId: Dispatch<SetStateAction<number | null>>;
    setActiveMapDisplayName: Dispatch<SetStateAction<string>>;
    setBoundary: Dispatch<SetStateAction<[number, number][]>>;
    setTemplateId: Dispatch<SetStateAction<string>>;
    setTemplateDots: Dispatch<SetStateAction<[number, number][]>>;
    setStatus: Dispatch<SetStateAction<string>>;
};

export function useEditorMapCommands(args: UseEditorMapCommandsArgs) {
    const { t } = useTranslation('editor');
    const dialogs = useNativeDialogs();
    const {
        api,
        hideoutMaps,
        activeMapId,
        buildScene,
        persistSceneNow,
        applyBundledDefaultLayerBatches,
        setHideoutMaps,
        setActiveMapId,
        setActiveMapDisplayName,
        setBoundary,
        setTemplateId,
        setTemplateDots,
        setStatus,
    } = args;

    const applyHideoutMapSelection = useCallback(
        (mapId: number, mapsList: HideoutMapSummary[]) => {
            const map = mapsList.find((item) => item.id === mapId);
            if (!map) return;
            localStorage.setItem(ACTIVE_MAP_ID_LS, String(mapId));
            setActiveMapId(mapId);
            setActiveMapDisplayName(map.display_name);
        },
        [setActiveMapId, setActiveMapDisplayName],
    );

    const onHideoutMapSelect = useCallback(
        (mapIdStr: string) => {
            const mapId = Number.parseInt(mapIdStr, 10);
            if (
                Number.isFinite(mapId)
                && activeMapId !== null
                && mapId !== activeMapId
            ) {
                persistSceneNow();
            }
            applyHideoutMapSelection(mapId, hideoutMaps);
        },
        [activeMapId, applyHideoutMapSelection, hideoutMaps, persistSceneNow],
    );

    const onDeleteActiveHideoutMap = useCallback(async () => {
        if (activeMapId === null) return;
        const current = hideoutMaps.find((item) => item.id === activeMapId);
        if (!current) return;

        const subtree = hideoutForkSubtreeIds(hideoutMaps, activeMapId);
        const subtreeCount = subtree.length;
        const isBase = isBaseHideoutMap(current);
        const baseHint = isBase
            ? t('prompts.baseMapDeleteHint', {
                  count: Math.max(0, subtreeCount - 1),
              })
            : subtreeCount > 1
              ? t('prompts.childMapDeleteHint', { count: subtreeCount })
              : '';

        if (
            !(await dialogs.confirm(
                t('prompts.confirmDeleteMap', {
                    hint: baseHint,
                    name: current.display_name,
                }),
                isBase ? { danger: true, holdSeconds: 5 } : undefined,
            ))
        ) {
            return;
        }

        try {
            for (const subtreeId of subtree) {
                removeSceneForMapFromLocalStorage(subtreeId);
            }
            await api.deleteHideoutMap(activeMapId);
            const maps = await api.listHideoutMaps();
            setHideoutMaps(maps);

            if (maps.length === 0) {
                localStorage.removeItem(ACTIVE_MAP_ID_LS);
                setActiveMapId(null);
                setActiveMapDisplayName(
                    firstBaseHideoutMap(maps)?.display_name ?? '',
                );
                setBoundary([]);
                setTemplateId('');
                setTemplateDots([]);
                applyBundledDefaultLayerBatches(null);
                setStatus(t('status.mapDeletedNoMaps'));
                return;
            }

            const next = firstBaseHideoutMap(maps) ?? maps[0];
            applyHideoutMapSelection(next.id, maps);
            setStatus(t('status.mapDeleted', { name: current.display_name }));
        } catch (error) {
            setStatus(
                t('status.mapDeleteError', {
                    error: localizeApiError(t, error),
                }),
            );
        }
    }, [
        activeMapId,
        hideoutMaps,
        dialogs,
        api,
        setHideoutMaps,
        setActiveMapId,
        setActiveMapDisplayName,
        setBoundary,
        setTemplateId,
        setTemplateDots,
        applyBundledDefaultLayerBatches,
        applyHideoutMapSelection,
        setStatus,
        t,
    ]);

    const onSaveMapAsNew = useCallback(async () => {
        if (activeMapId === null) return;
        const current = hideoutMaps.find((map) => map.id === activeMapId);
        const raw = await dialogs.prompt(
            current != null && isBaseHideoutMap(current)
                ? t('prompts.childMapNamePrompt')
                : t('prompts.newMapNamePrompt'),
            '',
        );
        if (raw === null) return;

        const name = raw.trim();
        if (!name) {
            setStatus(t('status.enterMapName'));
            return;
        }

        const lowerCaseName = name.toLocaleLowerCase('ru');
        if (
            hideoutMaps.some(
                (map) =>
                    map.is_base === true &&
                    map.display_name.trim().toLocaleLowerCase('ru') ===
                        lowerCaseName,
            )
        ) {
            setStatus(t('status.reservedBaseName'));
            return;
        }

        try {
            const snapshot = buildScene();
            if (current == null || !isBaseHideoutMap(current)) {
                persistSceneNow();
                await api.putEditorSceneForMap(activeMapId, snapshot);
            }
            const created = await api.duplicateHideoutMap(activeMapId, name);
            const childScene = {
                ...snapshot,
                hideout_map_display_name: created.display_name,
            };
            await api.putEditorSceneForMap(created.id, childScene);
            writeSceneForMapToLocalStorage(created.id, childScene);
            const maps = await api.listHideoutMaps();
            setHideoutMaps(maps);
            applyHideoutMapSelection(created.id, maps);
            setStatus(t('status.newMapSaved', { name: created.display_name }));
        } catch (error) {
            setStatus(
                t('status.saveMapError', {
                    error: localizeApiError(t, error),
                }),
            );
        }
    }, [
        activeMapId,
        hideoutMaps,
        dialogs,
        buildScene,
        persistSceneNow,
        api,
        setHideoutMaps,
        applyHideoutMapSelection,
        setStatus,
        t,
    ]);

    const onCreateMapFromHideoutFile = useCallback(
        async (
            file: File,
            baseMapId: number,
            mapDisplayName?: string,
        ): Promise<void> => {
            try {
                setStatus(t('status.importStarted', { name: file.name }));
                const created = await api.createMapFromHideoutOnBase(
                    file,
                    baseMapId,
                    mapDisplayName,
                );
                removeSceneForMapFromLocalStorage(created.id);
                const maps = await api.listHideoutMaps();
                setHideoutMaps(maps);
                applyHideoutMapSelection(created.id, maps);
                setStatus(t('status.importDone', { name: created.display_name }));
            } catch (error) {
                setStatus(
                    t('status.importError', {
                        error: localizeApiError(t, error),
                    }),
                );
            }
        },
        [api, setHideoutMaps, applyHideoutMapSelection, setStatus, t],
    );

    return {
        onHideoutMapSelect,
        onDeleteActiveHideoutMap,
        onSaveMapAsNew,
        onCreateMapFromHideoutFile,
    };
}
