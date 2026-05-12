import type { PlacementActionsCtx } from './placement-actions/types';
import { useDeleteSelected } from './placement-actions/useDeleteSelected';
import { useEraseAt } from './placement-actions/useEraseAt';
import { usePlaceFillAt } from './placement-actions/usePlaceFillAt';
import { usePlaceObjectAt } from './placement-actions/usePlaceObjectAt';
import { usePlaceStrokeAt } from './placement-actions/usePlaceStrokeAt';
import { useRotateSelected } from './placement-actions/useRotateSelected';

export function useEditorPlacementActions(opts: PlacementActionsCtx) {
    const eraseAt = useEraseAt(opts);
    const placeObjectAt = usePlaceObjectAt(opts);
    const placeStrokeAt = usePlaceStrokeAt(opts);
    const placeFillAt = usePlaceFillAt(opts);
    const rotateSelected = useRotateSelected(opts);
    const deleteSelected = useDeleteSelected(opts);

    return {
        eraseAt,
        placeObjectAt,
        placeStrokeAt,
        placeFillAt,
        rotateSelected,
        deleteSelected,
    };
}
