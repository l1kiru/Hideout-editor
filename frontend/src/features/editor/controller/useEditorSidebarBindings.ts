import { useMemo } from 'react';

import { ROT_STEP } from '../lib/editorConstants';
import type {
    EditorSidebarProps,
    EditorSidebarToolProps,
} from '../sidebar/editorSidebarTypes';
import { degToR, rToDeg } from '../lib/editorViewport';

// Composer hook that injects rotation constants and the rToDeg/degToR helpers
// into the `tool` section so they do not leak into controller logic. The
// caller passes a bare tool prop and gets the complete EditorSidebarProps.
type ToolPropsFromController = Omit<
    EditorSidebarToolProps,
    'rotStep' | 'rToDeg' | 'degToR'
>;

type UseEditorSidebarBindingsArgs = Omit<EditorSidebarProps, 'tool'> & {
    tool: ToolPropsFromController;
};

export function useEditorSidebarBindings(
    args: UseEditorSidebarBindingsArgs,
): EditorSidebarProps {
    return useMemo(
        () =>
            ({
                ...args,
                tool: {
                    ...args.tool,
                    rotStep: ROT_STEP,
                    rToDeg,
                    degToR,
                },
            }) satisfies EditorSidebarProps,
        [args],
    );
}
