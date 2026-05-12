import type { FillMode, FillModeParams, Tool } from '../../../../types/scene';

export function normalizedFillStep(raw: number | undefined): number {
    return Math.max(1, Math.round(raw ?? 4));
}

export function normalizedFillMaxPlacements(raw: number | undefined): number {
    return Math.max(1, Math.round(raw ?? 120));
}

export function resolvedFillMode(tool: Pick<Tool, 'fill_mode' | 'fill_connectivity'>): FillMode {
    if (tool.fill_mode)
        return tool.fill_mode;
    return (tool.fill_connectivity ?? 4) === 8 ? 'eight_way_free' : 'four_way';
}

export function normalizedFillModeParams(raw: FillModeParams | undefined): Required<FillModeParams> {
    const radius = Math.max(1, Math.round(raw?.radius_world ?? 24));
    const minPassage = Math.max(2, Math.round(raw?.min_passage_width_world ?? 2));
    const cardinalCost = Math.max(0.1, Number((raw?.cardinal_cost ?? 1).toFixed(2)));
    const diagonalCost = Math.max(0.1, Number((raw?.diagonal_cost ?? 1.4).toFixed(2)));
    return {
        radius_world: radius,
        min_passage_width_world: minPassage,
        cardinal_cost: cardinalCost,
        diagonal_cost: diagonalCost,
    };
}
