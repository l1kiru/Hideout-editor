import { useMemo } from 'react';

import {
    defaultEditorApi,
    type EditorApiPorts,
    type UseEditorControllerOptions,
} from '../hooks/editorApiPorts';
import {
    adaptEditorControllerResult,
    type EditorControllerResult,
} from './types';

import { useCanvasWorkflowArgs } from './adapters/useCanvasWorkflowArgs';
import { useControllerViewPropsArgs } from './adapters/useControllerViewPropsArgs';
import { useInteractionEffectsArgs } from './adapters/useInteractionEffectsArgs';
import { useEditorCanvasWorkflow } from './useEditorCanvasWorkflow';
import { useEditorControllerInteractionEffects } from './useEditorControllerInteractionEffects';
import { useEditorControllerScaffold } from './useEditorControllerScaffold';
import { useEditorControllerViewProps } from './useEditorControllerViewProps';
import { useInitializeEditorStore } from './useInitializeEditorStore';
import { useEditorMapLifecycle } from './useEditorMapLifecycle';

export function useEditorControllerResult(
    options?: UseEditorControllerOptions,
): EditorControllerResult {
    const api = useMemo(
        (): EditorApiPorts => ({
            ...defaultEditorApi,
            ...options?.api,
        }),
        [options?.api],
    );
    useInitializeEditorStore();

    const scaffold = useEditorControllerScaffold();
    const canvasWorkflowArgs = useCanvasWorkflowArgs(scaffold);
    const canvasWorkflow = useEditorCanvasWorkflow(canvasWorkflowArgs);

    const lifecycle = useEditorMapLifecycle({
        refs: {
            svgRef: scaffold.svgRef,
        },
        api,
        sceneSnapshot: scaffold.documentActions.getSceneSnapshot(),
        sceneReadOnly: scaffold.sceneReadOnly,
        appSession: {
            hideoutMaps: scaffold.appSession.hideoutMaps,
            activeMapId: scaffold.appSession.activeMapId,
            activeMapDisplayName: scaffold.appSession.activeMapDisplayName,
        },
        documentState: {
            templateId: scaffold.documentState.templateId,
            boundary: scaffold.documentState.boundary,
            cameraDeg: scaffold.documentState.cameraDeg,
            background: scaffold.documentState.background,
        },
        appSessionActions: {
            setApiOk: scaffold.appSessionActions.setApiOk,
            setHideoutMaps: scaffold.appSessionActions.setHideoutMaps,
            setActiveMapId: scaffold.appSessionActions.setActiveMapId,
            setActiveMapDisplayName: scaffold.appSessionActions.setActiveMapDisplayName,
            setStatus: scaffold.appSessionActions.setStatus,
            setInputImageNames: scaffold.appSessionActions.setInputImageNames,
        },
        documentActions: {
            getSceneSnapshot: scaffold.documentActions.getSceneSnapshot,
            hydrateEditorDocumentFromScene: scaffold.documentActions.hydrateFromScene,
            setBoundary: scaffold.documentActions.setBoundary,
            setTemplateId: scaffold.documentActions.setTemplateId,
            setTemplateDots: scaffold.documentActions.setTemplateDots,
            setViewBox: scaffold.viewportActions.setViewBox,
            setBackground: scaffold.documentActions.setBackground,
        },
        backgroundViewState: {
            bgNaturalSize: scaffold.bgNaturalSize,
            setBgNaturalSize: scaffold.setBgNaturalSize,
        },
        canvasWorkflow: {
            abortCanvasInteractions: canvasWorkflow.abortCanvasInteractions,
            applyBundledDefaultLayerBatches:
                canvasWorkflow.applyBundledDefaultLayerBatches,
            resetEditorForMapSwitch: canvasWorkflow.resetEditorForMapSwitch,
        },
    });

    const interactionEffectsArgs = useInteractionEffectsArgs({
        scaffold,
        canvasWorkflow,
    });
    const interactionEffects = useEditorControllerInteractionEffects(
        interactionEffectsArgs,
    );

    const viewPropsArgs = useControllerViewPropsArgs({
        scaffold,
        canvasWorkflow,
        lifecycle,
        interactionEffects,
    });
    const { sidebarProps, headerProps, canvasProps } =
        useEditorControllerViewProps(viewPropsArgs);

    return {
        view: {
            sidebar: sidebarProps,
            header: headerProps,
            canvas: canvasProps,
            status: scaffold.appSession.status,
        },
    };
}

export function useEditorController(options?: UseEditorControllerOptions) {
    return adaptEditorControllerResult(useEditorControllerResult(options));
}

export type UseEditorControllerReturn = ReturnType<
    typeof useEditorController
>;
export type UseEditorControllerResultReturn = ReturnType<
    typeof useEditorControllerResult
>;
