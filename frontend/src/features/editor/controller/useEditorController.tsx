import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { HideoutMapSummary } from '../../../api/client';
import {
    limitsToViewBox,
    zoneViewLimitsWithPad,
} from '../../../lib/viewLimits';
import type { EditorSvgSceneProps } from '../components/EditorSvgScene';
import { EditorBackgroundLayer } from '../components/EditorBackgroundLayer';
import {
    ACTIVE_MAP_ID_LS,
    DEFAULT_MAP_LAYER_INDEX,
    DEFAULT_MAP_LAYER_TITLE,
    firstBaseHideoutMap,
    hideoutForkSubtreeIds,
    isBaseHideoutMap,
} from '../lib/editorConstants';
import { layerId } from '../lib/editorIds';
import {
    cloneDefaultLayerBatches,
    createInitialEditorLayers,
    ensureDefaultMapLayerFirst,
} from '../lib/editorDefaultMapLayer';
import {
    currentInputImageName,
    defaultBackground,
    defaultTool,
    defaultUi,
} from '../lib/editorDefaults';
import { type ViewBox } from '../lib/editorViewport';
import type { PlacementRef, SelectionState } from '../model/editorSessionTypes';
import type {
    Background,
    PaintLayer,
    TemplateUploadResponse,
    Tool,
    UiState,
} from '../../../types/scene';

import {
    normalizeSelectionLayer0,
    refEqual,
    uniqRefs,
} from '../lib/placementSelection';

import {
    defaultEditorApi,
    type EditorApiPorts,
    type UseEditorControllerOptions,
} from '../hooks/editorApiPorts';
import { useEditorCanvasGestures } from '../hooks/useEditorCanvasGestures';
import { useEditorUndoStack } from '../hooks/useEditorUndoStack';

import { useEditorClipboard } from './useEditorClipboard';
import { useEditorKeyboardShortcuts } from './useEditorKeyboardShortcuts';
import { useEditorLayerActions } from './useEditorLayerActions';
import { useEditorPersistence } from './useEditorPersistence';
import { useEditorPlacementActions } from './useEditorPlacementActions';
import { useEditorSceneBootstrap } from './useEditorSceneBootstrap';
import { useEditorViewportInteractions } from './useEditorViewportInteractions';
import { logEditorDevEvent } from '../lib/editorDevLog';
import { useEditorBackgroundController } from './useEditorBackgroundController';
import { useEditorCanvasClassName } from './useEditorCanvasBindings';
import { useEditorDerivedSceneState } from './useEditorDerivedSceneState';
import { useEditorSidebarBindings } from './useEditorSidebarBindings';
import {
    copyStoredSceneBetweenMaps,
    removeSceneForMapFromLocalStorage,
} from '../lib/editorSceneStorage';
import { useNativeDialogs } from '../../../context/NativeDialogContext.tsx';
import { localizeApiError } from '../../../i18n/localizeApiError';

export function useEditorController(options?: UseEditorControllerOptions) {
    const api = useMemo(
        (): EditorApiPorts => ({
            ...defaultEditorApi,
            ...options?.api,
        }),
        [options?.api],
    );
    const dialogs = useNativeDialogs();
    const { t } = useTranslation('editor');

    const [apiOk, setApiOk] = useState<boolean | null>(null);
    const [showTopPanel, setShowTopPanel] = useState(true);
    const [templateId, setTemplateId] = useState('');
    const [templateDots, setTemplateDots] = useState<[number, number][]>([]);
    const [boundary, setBoundary] = useState<[number, number][]>([]);
    const [layers, setLayers] = useState<PaintLayer[]>(() =>
        createInitialEditorLayers(),
    );
    const [layerIdx, setLayerIdx] = useState(() => layerId(1));
    const [cameraDeg, setCameraDeg] = useState(45);
    const [tool, setTool] = useState<Tool>(() => defaultTool());
    const [ui, setUi] = useState<UiState>(() => defaultUi());
    const [background, setBackground] = useState<Background>(() =>
        defaultBackground(),
    );
    const [bgSelected, setBgSelected] = useState(false);
    const [bgNaturalSize, setBgNaturalSize] = useState<{
        w: number;
        h: number;
    } | null>(null);
    const [inputImageNames, setInputImageNames] = useState<string[]>([]);
    const backgroundClipId = useRef(
        `editor-bg-clip-${Math.random().toString(36).slice(2, 11)}`,
    ).current;
    const [status, setStatus] = useState('');
    const [hideoutMaps, setHideoutMaps] = useState<HideoutMapSummary[]>([]);
    const [activeMapId, setActiveMapId] = useState<number | null>(null);
    const [activeMapDisplayName, setActiveMapDisplayName] = useState<string>(
        '',
    );
    // Backup of other layers' lock state captured when layer 0 is unlocked.
    const layer0UnlockLocksBackupRef = useRef<boolean[] | null>(null);
    const [viewBox, setViewBox] = useState<ViewBox>({
        x: -200,
        y: -200,
        width: 400,
        height: 400,
    });
    const [panDrag, setPanDrag] = useState<{
        lastCx: number;
        lastCy: number;
    } | null>(null);
    const [spaceHeld, setSpaceHeld] = useState(false);
    const [selected, setSelected] = useState<SelectionState>([]);
    const [cursorView, setCursorView] = useState<[number, number] | null>(null);
    const cursorViewRef = useRef<[number, number] | null>(null);
    const [lineDraft, setLineDraft] = useState<{
        points: [number, number][];
    } | null>(null);

    const lineBrushActiveRef = useRef(false);
    const lineDraftRef = useRef<{ points: [number, number][] } | null>(null);
    const placeStrokeRef = useRef<(pts: [number, number][]) => void>(() => {});

    const svgRef = useRef<SVGSVGElement | null>(null);
    const svgWrapRef = useRef<HTMLDivElement | null>(null);
    const viewBoxRef = useRef<ViewBox>(viewBox);
    const cameraDegRef = useRef(cameraDeg);
    const boundaryRef = useRef(boundary);
    const toolMarginRef = useRef(tool.margin);
    const spaceDownRef = useRef(false);
    const layersRef = useRef<PaintLayer[]>(layers);
    const backgroundRef = useRef<Background>(background);
    const bgNaturalSizeRef = useRef<typeof bgNaturalSize>(bgNaturalSize);
    const bgSelectedRef = useRef<boolean>(bgSelected);

    useEffect(() => {
        viewBoxRef.current = viewBox;
    }, [viewBox]);

    useEffect(() => {
        cameraDegRef.current = cameraDeg;
    }, [cameraDeg]);

    useEffect(() => {
        boundaryRef.current = boundary;
    }, [boundary]);

    useEffect(() => {
        toolMarginRef.current = tool.margin;
    }, [tool.margin]);

    useEffect(() => {
        layersRef.current = layers;
    }, [layers]);

    useEffect(() => {
        backgroundRef.current = background;
    }, [background]);

    useEffect(() => {
        bgNaturalSizeRef.current = bgNaturalSize;
    }, [bgNaturalSize]);

    useEffect(() => {
        bgSelectedRef.current = bgSelected;
    }, [bgSelected]);

    useEffect(() => {
        cursorViewRef.current = cursorView;
    }, [cursorView]);
    useEffect(() => {
        const asset =
            tool.variant === 'line'
                ? (tool.line_asset_key ?? null)
                : tool.variant === 'fill'
                  ? (tool.fill_asset_key ?? null)
                  : (tool.asset_key ?? null);
        logEditorDevEvent('tool.switch', {
            variant: tool.variant,
            asset,
        });
    }, [
        tool.variant,
        tool.asset_key,
        tool.line_asset_key,
        tool.fill_asset_key,
    ]);

    const sceneReadOnly = useMemo(() => {
        if (activeMapId == null) return false;
        const m = hideoutMaps.find((x) => x.id === activeMapId);
        return m != null && isBaseHideoutMap(m);
    }, [activeMapId, hideoutMaps]);

    useLayoutEffect(() => {
        setSelected((prev) => {
            const next = normalizeSelectionLayer0(uniqRefs(prev));
            if (
                next.length === prev.length &&
                next.every((r, i) => refEqual(r, prev[i]!))
            )
                return prev;
            return next;
        });
    }, [selected, setSelected]);

    const applyBundledDefaultLayerBatches = useCallback(
        (tpl: TemplateUploadResponse | null) => {
            if (!tpl) {
                setLayers((ls) => {
                    const base = ensureDefaultMapLayerFirst(ls);
                    return base.map((l, i) =>
                        i === DEFAULT_MAP_LAYER_INDEX ? { ...l, batches: [] } : l,
                    );
                });
                return;
            }
            const l0b = cloneDefaultLayerBatches(tpl.default_layer_batches);
            const l1b = cloneDefaultLayerBatches(tpl.decorations_layer_batches);
            const l2b = cloneDefaultLayerBatches(
                tpl.decorations_palette_layer_batches,
            );
            const hasPaletteDecoLayer = l2b.length > 0;
            setLayers(() => {
                if (hasPaletteDecoLayer) {
                    return [
                        {
                            title: DEFAULT_MAP_LAYER_TITLE,
                            visible: true,
                            locked: true,
                            batches: l0b,
                        },
                        {
                            title: 'Decorations',
                            visible: true,
                            locked: false,
                            batches: l1b,
                        },
                        {
                            title: 'Palette decorations',
                            visible: true,
                            locked: false,
                            batches: l2b,
                        },
                    ];
                }
                return [
                    {
                        title: DEFAULT_MAP_LAYER_TITLE,
                        visible: true,
                        locked: true,
                        batches: l0b,
                    },
                    {
                            title: 'Layer 1',
                        visible: true,
                        locked: false,
                        batches: l1b,
                    },
                ];
            });
        },
        [],
    );

    const onLayerLockedToggle = useCallback((i: number, locked: boolean) => {
        if (i === DEFAULT_MAP_LAYER_INDEX) {
            setLayers((ls) => {
                if (!locked) {
                    layer0UnlockLocksBackupRef.current = ls
                        .slice(1)
                        .map((l) => l.locked);
                    return ls.map((ly, idx) =>
                        idx === DEFAULT_MAP_LAYER_INDEX
                            ? { ...ly, locked: false }
                            : { ...ly, locked: true },
                    );
                }
                const backup = layer0UnlockLocksBackupRef.current;
                layer0UnlockLocksBackupRef.current = null;
                return ls.map((ly, idx) => {
                    if (idx === DEFAULT_MAP_LAYER_INDEX)
                        return { ...ly, locked: true };
                    const prevLock = backup?.[idx - 1];
                    return prevLock !== undefined
                        ? { ...ly, locked: prevLock }
                        : ly;
                });
            });
            return;
        }

        setLayers((ls) => {
            const z = ls[DEFAULT_MAP_LAYER_INDEX];
            if (z && !z.locked && !locked)
                return ls;
            return ls.map((ly, idx) =>
                idx === i ? { ...ly, locked } : ly,
            );
        });
    }, []);

    const onSelectSidebarPlacement = useCallback((r: PlacementRef) => {
        const ly = layers[r.layerIdx];
        if (ly?.locked) {
            setStatus(t('status.layerLockedSelect'));
            return;
        }
        setBgSelected(false);
        setSelected(normalizeSelectionLayer0([r]));
    }, [layers, setBgSelected, setSelected, setStatus, t]);

    const {
        redoStack,
        saveLayerSnapshot,
        saveLayerSnapshotAt,
        pushMultiUndoForRefs,
        pushBackgroundUndo,
        discardLastUndo,
        undo,
        redo,
        clearUndoStack,
    } = useEditorUndoStack({
        layersRef,
        backgroundRef,
        layers,
        layerIdx,
        setLayers,
        setSelected,
        setStatus,
        setBackground,
        clearTransientSelection: () => setBgSelected(false),
    });

    const { addLayer, removeLayer } = useEditorLayerActions({
        layers,
        setLayers,
        setLayerIdx,
        setSelected,
        setStatus,
    });

    const {
        activeAssetKey,
        boundaryView,
        dotsViewSvg,
        fillPreviewPlacements,
        placementStats,
        selectionDetail,
        viewBoxStr,
        lineWidthVU,
        eraserRadius,
        zonePolygonPoints,
        backgroundSelectionSvgPoints,
        templateDotRadius,
    } = useEditorDerivedSceneState({
        layers,
        layerIdx,
        tool,
        selected,
        cameraDeg,
        boundary,
        templateDots,
        uiPlacementPreviewScale: ui.placement_preview_scale,
        cursorView,
        viewBox,
        background,
        bgNaturalSize,
        bgSelected,
    });

    const {
        eraseAt,
        placeObjectAt,
        placeStrokeAt,
        placeFillAt,
        rotateSelected,
        deleteSelected,
    } = useEditorPlacementActions({
        layers,
        layerIdx,
        setLayers,
        cameraDeg,
        tool,
        activeAssetKey,
        eraserRadius,
        boundary,
        selected,
        setSelected,
        saveLayerSnapshot,
        discardLastUndo,
        pushMultiUndoForRefs,
        setStatus,
        viewBoxRef,
        boundaryRef,
        cameraDegRef,
        toolMarginRef,
    });

    placeStrokeRef.current = placeStrokeAt;

    const {
        selectDrag,
        selectRmbRotate,
        marqueeView,
        dragOverlay,
        dragOverlayHandleRef,
        abortCanvasInteractions,
        onPointerDownSvg,
        onPointerMoveSvg,
        finishSelectRotatePointer,
        onMouseDownSvg,
        onMouseMoveSvg,
    } = useEditorCanvasGestures({
        svgRef,
        viewBoxRef,
        cameraDegRef,
        boundaryRef,
        toolMarginRef,
        layersRef,
        spaceDownRef,
        lineBrushActiveRef,
        lineDraftRef,
        placeStrokeRef,
        ui,
        tool,
        viewBox,
        layers,
        layerIdx,
        selected,
        setSelected,
        setLayers,
        setPanDrag,
        setViewBox,
        setCursorView,
        setLineDraft,
        setStatus,
        panDrag,
        cameraDeg,
        sceneReadOnly,
        pushMultiUndoForRefs,
        eraseAt,
        placeObjectAt,
        placeFillAt,
        backgroundRef,
        bgNaturalSizeRef,
        setBackground,
        setBgSelected,
        pushBackgroundUndo,
        undo,
    });

    const resetEditorForMapSwitch = useCallback(() => {
        abortCanvasInteractions(svgRef.current);
        setBoundary([]);
        setTemplateId('');
        setTemplateDots([]);
        applyBundledDefaultLayerBatches(null);
        setBackground(defaultBackground());
        setLayers(createInitialEditorLayers());
        setLayerIdx(layerId(1));
        setTool(defaultTool());
        setUi(defaultUi());
        setSelected([]);
        setBgSelected(false);
        clearUndoStack();
        setViewBox({ x: -200, y: -200, width: 400, height: 400 });
    }, [
        abortCanvasInteractions,
        applyBundledDefaultLayerBatches,
        clearUndoStack,
        setBackground,
        setBoundary,
        setBgSelected,
        setLayers,
        setLayerIdx,
        setSelected,
        setTemplateDots,
        setTemplateId,
        setTool,
        setUi,
        setViewBox,
    ]);

    const {
        buildScene,
        hydrateFromScene,
        persistSceneNow,
        onExport,
    } = useEditorPersistence({
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
    });

    const { refreshInputImages } = useEditorSceneBootstrap({
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
    });

    const { copySelected, pasteClipboard } = useEditorClipboard({
        layersRef,
        layerIdx,
        selected,
        ui,
        tool,
        boundaryRef,
        cameraDegRef,
        toolMarginRef,
        viewBoxRef,
        cursorViewRef,
        saveLayerSnapshot,
        setLayers,
        setSelected,
        setStatus,
        setBgSelected,
    });

    const {
        rotateBackground,
        clearBackground,
        handleBackgroundCtrlWheel,
        applyBackgroundFitToZone,
    } = useEditorBackgroundController({
        background,
        backgroundRef,
        bgSelectedRef,
        bgNaturalSize,
        boundary,
        cameraDeg,
        setBackground,
        setBgSelected,
        setStatus,
        defaultBackground,
        pushBackgroundUndo,
    });

    useEditorKeyboardShortcuts({
        sceneReadOnly,
        spaceDownRef,
        lineBrushActiveRef,
        setSpaceHeld,
        undo,
        redo,
        setShowTopPanel,
        deleteSelected,
        rotateSelected,
        copySelected,
        pasteClipboard,
        bgSelected,
        rotateBackground,
        clearBackground,
    });

    useEditorViewportInteractions({
        svgWrapRef,
        svgRef,
        viewBoxRef,
        setViewBox,
        onCtrlWheel: handleBackgroundCtrlWheel,
    });

    const applyHomeView = () => {
        const lims = zoneViewLimitsWithPad(boundary, cameraDeg);
        if (lims) setViewBox(limitsToViewBox(lims));
    };

    const applyHideoutMapSelection = useCallback(
        (mapId: number, mapsList: HideoutMapSummary[]) => {
            const m = mapsList.find((x) => x.id === mapId);
            if (!m) return;
            localStorage.setItem(ACTIVE_MAP_ID_LS, String(mapId));
            setActiveMapId(mapId);
            setActiveMapDisplayName(m.display_name);
        },
        [setActiveMapId, setActiveMapDisplayName],
    );

    const onHideoutMapSelect = (mapIdStr: string) => {
        const mapId = Number.parseInt(mapIdStr, 10);
        applyHideoutMapSelection(mapId, hideoutMaps);
    };

    const onDeleteActiveHideoutMap = useCallback(async () => {
        if (activeMapId === null) return;
        const current = hideoutMaps.find((x) => x.id === activeMapId);
        if (!current) return;
        const subtree = hideoutForkSubtreeIds(hideoutMaps, activeMapId);
        const n = subtree.length;
        const isBase = isBaseHideoutMap(current);
        const baseHint = isBase
            ? t('prompts.baseMapDeleteHint', { count: Math.max(0, n - 1) })
            : n > 1
              ? t('prompts.childMapDeleteHint', { count: n })
              : '';
        if (
            !(await dialogs.confirm(
                t('prompts.confirmDeleteMap', {
                    hint: baseHint,
                    name: current.display_name,
                }),
                isBase ? { danger: true, holdSeconds: 5 } : undefined,
            ))
        )
            return;
        try {
            for (const sid of subtree)
                removeSceneForMapFromLocalStorage(sid);
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
            const next =
                firstBaseHideoutMap(maps)
                ?? maps[0];
            applyHideoutMapSelection(next.id, maps);
            setStatus(t('status.mapDeleted', { name: current.display_name }));
        } catch (e) {
            setStatus(t('status.mapDeleteError', { error: localizeApiError(t, e) }));
        }
    }, [
        activeMapId,
        hideoutMaps,
        api,
        dialogs,
        setHideoutMaps,
        applyBundledDefaultLayerBatches,
        applyHideoutMapSelection,
        setActiveMapDisplayName,
        setBoundary,
        setStatus,
        setTemplateDots,
        setTemplateId,
        setActiveMapId,
        t,
    ]);

    const onSaveMapAsNew = useCallback(async () => {
        if (activeMapId === null) return;
        const cur = hideoutMaps.find((m) => m.id === activeMapId);
        const raw = await dialogs.prompt(
            cur != null && isBaseHideoutMap(cur)
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
        const lc = name.toLocaleLowerCase('ru');
        if (
            hideoutMaps.some(
                (m) =>
                    m.is_base === true
                    && m.display_name.trim().toLocaleLowerCase('ru')
                        === lc,
            )
        ) {
            setStatus(t('status.reservedBaseName'));
            return;
        }
        try {
            const snapshot = buildScene();
            if (cur == null || !isBaseHideoutMap(cur)) {
                persistSceneNow();
                await api.putEditorSceneForMap(activeMapId, snapshot);
            }
            const created = await api.duplicateHideoutMap(
                activeMapId,
                name,
            );
            const childScene = {
                ...snapshot,
                hideout_map_display_name: created.display_name,
            };
            await api.putEditorSceneForMap(created.id, childScene);
            copyStoredSceneBetweenMaps(
                activeMapId,
                created.id,
                created.display_name,
            );
            const maps = await api.listHideoutMaps();
            setHideoutMaps(maps);
            applyHideoutMapSelection(created.id, maps);
            setStatus(t('status.newMapSaved', { name: created.display_name }));
        } catch (e) {
            setStatus(t('status.saveMapError', { error: localizeApiError(t, e) }));
        }
    }, [
        activeMapId,
        persistSceneNow,
        buildScene,
        api,
        dialogs,
        applyHideoutMapSelection,
        setHideoutMaps,
        setStatus,
        hideoutMaps,
        t,
    ]);

    const onCreateMapFromHideoutFile = useCallback(
        async (
            file: File,
            baseMapId: number,
            mapDisplayName?: string,
        ) => {
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
                setStatus(
                    t('status.importDone', { name: created.display_name }),
                );
            } catch (e) {
                setStatus(t('status.importError', { error: localizeApiError(t, e) }));
            }
        },
        [api, applyHideoutMapSelection, setHideoutMaps, setStatus, t],
    );

    const bgLocked = Boolean(background.locked);
    const bgSelectValue = currentInputImageName(background.path ?? '');
    const bgOrphanSelect = Boolean(
        bgSelectValue && !inputImageNames.includes(bgSelectValue),
    );

    const backgroundSvg = useMemo(
        () => (
            <EditorBackgroundLayer
                background={background}
                bgNaturalSize={bgNaturalSize}
                viewBox={viewBox}
                boundary={boundary}
                cameraDeg={cameraDeg}
                backgroundClipId={backgroundClipId}
            />
        ),
        [
            background,
            bgNaturalSize,
            viewBox,
            boundary,
            cameraDeg,
            backgroundClipId,
        ],
    );

    const sidebarProps = useEditorSidebarBindings({
        chrome: { showTopPanel },
        sceneReadOnly,
        files: {
            hideoutMaps,
            activeMapId,
            onHideoutMapSelect,
            onDeleteActiveHideoutMap,
            onExport,
            onSaveMapAsNew,
            applyHomeView,
            onCreateMapFromHideoutFile,
        },
        background: {
            bgSelectValue,
            bgLocked,
            setBackground,
            defaultBackground,
            inputImageNames,
            bgOrphanSelect,
            refreshInputImages,
            setStatus,
            background,
            applyBackgroundFitToZone,
        },
        tool: {
            ui,
            setUi,
            tool,
            setTool,
            selected,
            rotateSelected,
            deleteSelected,
            redo,
            canRedo: redoStack.length > 0,
            selectionDetail,
        },
        layers: {
            boundary,
            saveLayerSnapshotAt,
            setLayers,
            layers,
            layerIdx,
            setLayerIdx,
            addLayer,
            removeLayer,
            placementStats,
            selected,
            onSelectSidebarPlacement,
            onLayerLockedToggle,
        },
    });

    const canvasClassName = useEditorCanvasClassName({
        panDrag,
        spaceHeld,
        toolVariant: tool.variant,
        selectDrag,
        selectRmbRotate,
        marqueeView,
        bgSelected,
    });

    return {
        sidebarProps,
        headerProps: {
            apiOk,
            placementCount: placementStats.placementsTotal,
            showTopPanel,
            setShowTopPanel,
        },
        canvasProps: {
            svgWrapRef,
            svgRef,
            svgClassName: canvasClassName,
            viewBoxStr,
            toolVariant: tool.variant,
            lineBrushActiveRef,
            onPointerDownSvg,
            onPointerMoveSvg,
            finishSelectRotatePointer,
            onMouseDownSvg,
            onMouseMoveSvg,
            setPanDrag,
            setCursorView,
            setLineDraft,
            sceneProps: {
                zonePolygonPoints,
                boundaryViewLen: boundaryView.length,
                backgroundSvg,
                showTemplateDots: ui.show_template_dots,
                dotsViewSvg,
                templateDotRadius,
                layers,
                layerIdx,
                cameraDeg,
                selected,
                viewBox,
                activeAssetKey,
                fillPreviewPlacements,
                fillPreviewSpacingWorld: Math.max(
                    1,
                    Math.round(tool.fill_step_world ?? 4),
                ),
                lineDraft,
                toolSpacing: tool.spacing,
                toolMargin: tool.margin,
                cursorView,
                eraserVariant: tool.variant === 'eraser',
                eraserRadius,
                lineWidthVU,
                boundary,
                marqueeView,
                backgroundSelectionSvgPoints,
                hiddenKeys: dragOverlay?.hiddenKeys ?? null,
                dragOverlay: dragOverlay ?? null,
                dragOverlayRef: dragOverlayHandleRef,
            } satisfies EditorSvgSceneProps,
        },
        status,
    };
}

export type UseEditorControllerReturn = ReturnType<
    typeof useEditorController
>;
