import { useLayoutEffect } from 'react';

import {
    normalizeSelectionLayer0,
    refEqual,
    uniqRefs,
} from '../lib/placementSelection';
import type { SelectionState } from '../model/editorSessionTypes';

type UseEditorSelectionNormalizationArgs = {
    selected: SelectionState;
    setSelected: (
        updater:
            | SelectionState
            | ((prev: SelectionState) => SelectionState)
    ) => void;
};

export function useEditorSelectionNormalization(
    args: UseEditorSelectionNormalizationArgs,
) {
    const { selected, setSelected } = args;

    useLayoutEffect(() => {
        setSelected((prev) => {
            const next = normalizeSelectionLayer0(uniqRefs(prev));
            if (
                next.length === prev.length &&
                next.every((ref, index) => refEqual(ref, prev[index]!))
            ) {
                return prev;
            }
            return next;
        });
    }, [selected, setSelected]);
}
