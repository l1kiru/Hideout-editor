import type { Dispatch, RefObject, SetStateAction } from 'react';

import type { HideoutMapSummary } from '../../../api/client';
import type { Background, Scene, TemplateUploadResponse } from '../../../types/scene';
import type { EditorApiPorts } from '../hooks/editorApiPorts';
import type { ViewBox } from '../lib/editorViewport';
import { useEditorMapCommands } from './useEditorMapCommands';
import { useEditorPersistence } from './useEditorPersistence';
import { useEditorSceneBootstrap } from './useEditorSceneBootstrap';

type UseEditorMapLifecycleArgs = {
    refs: {
        svgRef: RefObject<SVGSVGElement | null>;
    };
    api: EditorApiPorts;
    sceneSnapshot: Scene;
    sceneReadOnly: boolean;
    appSession: {
        hideoutMaps: HideoutMapSummary[];
        activeMapId: number | null;
        activeMapDisplayName: string;
    };
    documentState: {
        templateId: string;
        boundary: [number, number][];
        cameraDeg: number;
        background: Background;
    };
    appSessionActions: {
        setApiOk: Dispatch<SetStateAction<boolean | null>>;
        setHideoutMaps: Dispatch<SetStateAction<HideoutMapSummary[]>>;
        setActiveMapId: Dispatch<SetStateAction<number | null>>;
        setActiveMapDisplayName: Dispatch<SetStateAction<string>>;
        setStatus: Dispatch<SetStateAction<string>>;
        setInputImageNames: Dispatch<SetStateAction<string[]>>;
    };
    documentActions: {
        getSceneSnapshot: () => Scene;
        hydrateEditorDocumentFromScene: (scene: Scene) => void;
        setBoundary: Dispatch<SetStateAction<[number, number][]>>;
        setTemplateId: Dispatch<SetStateAction<string>>;
        setTemplateDots: Dispatch<SetStateAction<[number, number][]>>;
        setViewBox: Dispatch<SetStateAction<ViewBox>>;
        setBackground: Dispatch<SetStateAction<Background>>;
    };
    backgroundViewState: {
        bgNaturalSize: { w: number; h: number } | null;
        setBgNaturalSize: Dispatch<
            SetStateAction<{ w: number; h: number } | null>
        >;
    };
    canvasWorkflow: {
        abortCanvasInteractions: (svgEl: SVGSVGElement | null) => void;
        applyBundledDefaultLayerBatches: (
            tpl: TemplateUploadResponse | null,
        ) => void;
        resetEditorForMapSwitch: () => void;
    };
};

export function useEditorMapLifecycle(args: UseEditorMapLifecycleArgs) {
    const {
        refs: { svgRef },
        api,
        sceneSnapshot,
        sceneReadOnly,
        appSession: { hideoutMaps, activeMapId, activeMapDisplayName },
        documentState: { templateId, boundary, cameraDeg, background },
        appSessionActions: {
            setApiOk,
            setHideoutMaps,
            setActiveMapId,
            setActiveMapDisplayName,
            setStatus,
            setInputImageNames,
        },
        documentActions: {
            getSceneSnapshot,
            hydrateEditorDocumentFromScene,
            setBoundary,
            setTemplateId,
            setTemplateDots,
            setViewBox,
            setBackground,
        },
        backgroundViewState: { bgNaturalSize, setBgNaturalSize },
        canvasWorkflow: {
            abortCanvasInteractions,
            applyBundledDefaultLayerBatches,
            resetEditorForMapSwitch,
        },
    } = args;

    const persistence = useEditorPersistence({
        svgRef,
        abortCanvasInteractions,
        api,
        buildScene: getSceneSnapshot,
        sceneSnapshot,
        hydrateEditorDocumentFromScene,
        templateId,
        activeMapDisplayName,
        activeMapId,
        sceneReadOnly,
        setActiveMapDisplayName,
        setStatus,
    });

    const mapCommands = useEditorMapCommands({
        api,
        hideoutMaps,
        activeMapId,
        buildScene: persistence.buildScene,
        persistSceneNow: persistence.persistSceneNow,
        applyBundledDefaultLayerBatches,
        setHideoutMaps,
        setActiveMapId,
        setActiveMapDisplayName,
        setBoundary,
        setTemplateId,
        setTemplateDots,
        setStatus,
    });

    const bootstrap = useEditorSceneBootstrap({
        api,
        setApiOk,
        setHideoutMaps,
        setActiveMapId,
        setActiveMapDisplayName,
        setStatus,
        setInputImageNames,
        hydrateFromScene: persistence.hydrateFromScene,
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

    return {
        ...persistence,
        ...mapCommands,
        ...bootstrap,
    };
}
