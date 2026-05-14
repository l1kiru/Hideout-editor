import { viewToWorld, worldToView } from '../../../lib/coords';
import {
    DECORATIONS,
    LINE_STROKE_ANALYSIS_FOOTPRINT,
    templatePlacementFootprintView,
} from '../../../lib/sceneDecorations';
import { worldPointAllowed } from '../../../lib/polygon';
import type {
    AssetKey,
    FillConnectivity,
    FillMode,
    FillModeParams,
    FillWallsScope,
    PaintLayer,
    XYZRPlacement,
} from '../../../types/scene';
import { previewRotateDegForDoodad } from './editorPreview';
import {
    occupiedCoordKeysExcludingRefs,
    worldPlacementCoordKey,
} from './editorPlacementCoords';
import { placementFootprintAllowed } from './editorPlacementValidate';
import type { LayerId } from './editorIds';
import type { ViewBox } from './editorViewport';

export const FILL_WALL_HEIGHT_SCALE = 1.5;
export const FILL_MARGIN_DEFAULT_WORLD = -4;
// Safety limit for BFS on step-1 grid; guards against huge wall-less zones.
export const FILL_MAX_BFS_VISITS = 500_000;

const CARDINAL_MOVES: readonly Move[] = [
    { dx: 1, dy: 0, cost: 1, diagonal: false },
    { dx: -1, dy: 0, cost: 1, diagonal: false },
    { dx: 0, dy: 1, cost: 1, diagonal: false },
    { dx: 0, dy: -1, cost: 1, diagonal: false },
];

const DIAGONAL_MOVES: readonly Move[] = [
    { dx: 1, dy: 1, cost: 1, diagonal: true },
    { dx: 1, dy: -1, cost: 1, diagonal: true },
    { dx: -1, dy: 1, cost: 1, diagonal: true },
    { dx: -1, dy: -1, cost: 1, diagonal: true },
];

type Move = {
    dx: number;
    dy: number;
    cost: number;
    diagonal: boolean;
};

type TraversalConfig = {
    moves: Move[];
    cornerSafeDiagonal: boolean;
    usePriorityQueue: boolean;
    radiusWorld: number | null;
    minPassageWidthWorld: number | null;
};

type FrontierItem = {
    x: number;
    y: number;
    cost: number;
};

class MinHeap {
    private data: FrontierItem[] = [];

    get size(): number {
        return this.data.length;
    }

    push(item: FrontierItem): void {
        this.data.push(item);
        this.bubbleUp(this.data.length - 1);
    }

    pop(): FrontierItem | undefined {
        if (this.data.length === 0)
            return undefined;
        const top = this.data[0];
        const last = this.data.pop();
        if (!top)
            return undefined;
        if (this.data.length > 0 && last) {
            this.data[0] = last;
            this.bubbleDown(0);
        }
        return top;
    }

    private bubbleUp(index: number): void {
        let i = index;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (this.data[p].cost <= this.data[i].cost)
                break;
            [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
            i = p;
        }
    }

    private bubbleDown(index: number): void {
        let i = index;
        for (;;) {
            const l = i * 2 + 1;
            const r = l + 1;
            let m = i;
            if (l < this.data.length && this.data[l].cost < this.data[m].cost)
                m = l;
            if (r < this.data.length && this.data[r].cost < this.data[m].cost)
                m = r;
            if (m === i)
                break;
            [this.data[m], this.data[i]] = [this.data[i], this.data[m]];
            i = m;
        }
    }
}

function normalizedFillMargin(raw: number | undefined): number {
    const m = Number.isFinite(raw) ? Number(raw) : FILL_MARGIN_DEFAULT_WORLD;
    return Math.max(FILL_MARGIN_DEFAULT_WORLD, m);
}

function resolveFillMode(
    fillMode: FillMode | undefined,
    fillConnectivity: FillConnectivity,
): FillMode {
    if (fillMode)
        return fillMode;
    return fillConnectivity === 8 ? 'eight_way_free' : 'four_way';
}

function normalizeModeParams(raw: FillModeParams | undefined): Required<FillModeParams> {
    return {
        radius_world: Math.max(1, Math.round(raw?.radius_world ?? 24)),
        min_passage_width_world: Math.max(2, Math.round(raw?.min_passage_width_world ?? 2)),
        cardinal_cost: Math.max(0.1, Number((raw?.cardinal_cost ?? 1).toFixed(2))),
        diagonal_cost: Math.max(0.1, Number((raw?.diagonal_cost ?? 1.4).toFixed(2))),
    };
}

function buildTraversalConfig(
    mode: FillMode,
    params: Required<FillModeParams>,
): TraversalConfig {
    switch (mode) {
        case 'four_way':
            return {
                moves: [...CARDINAL_MOVES],
                cornerSafeDiagonal: false,
                usePriorityQueue: false,
                radiusWorld: null,
                minPassageWidthWorld: null,
            };
        case 'eight_way_free':
            return {
                moves: [...CARDINAL_MOVES, ...DIAGONAL_MOVES],
                cornerSafeDiagonal: false,
                usePriorityQueue: false,
                radiusWorld: null,
                minPassageWidthWorld: null,
            };
        case 'eight_way_corner_safe':
            return {
                moves: [...CARDINAL_MOVES, ...DIAGONAL_MOVES],
                cornerSafeDiagonal: true,
                usePriorityQueue: false,
                radiusWorld: null,
                minPassageWidthWorld: null,
            };
        case 'orthogonal_first': {
            const moves: Move[] = [
                ...CARDINAL_MOVES,
                ...DIAGONAL_MOVES.map((m) => ({ ...m, cost: 2 })),
            ];
            return {
                moves,
                cornerSafeDiagonal: false,
                usePriorityQueue: true,
                radiusWorld: null,
                minPassageWidthWorld: null,
            };
        }
        case 'radius_limited':
            return {
                moves: [...CARDINAL_MOVES, ...DIAGONAL_MOVES],
                cornerSafeDiagonal: false,
                usePriorityQueue: false,
                radiusWorld: params.radius_world,
                minPassageWidthWorld: null,
            };
        case 'narrow_passage_block':
            return {
                moves: [...CARDINAL_MOVES, ...DIAGONAL_MOVES],
                cornerSafeDiagonal: false,
                usePriorityQueue: false,
                radiusWorld: null,
                minPassageWidthWorld: params.min_passage_width_world,
            };
        case 'weighted': {
            const moves: Move[] = [
                ...CARDINAL_MOVES.map((m) => ({ ...m, cost: params.cardinal_cost })),
                ...DIAGONAL_MOVES.map((m) => ({ ...m, cost: params.diagonal_cost })),
            ];
            return {
                moves,
                cornerSafeDiagonal: false,
                usePriorityQueue: true,
                radiusWorld: null,
                minPassageWidthWorld: null,
            };
        }
    }
}

function isDiagonalBlockedByCornerCut(
    x: number,
    y: number,
    nx: number,
    ny: number,
    wallKeys: Set<string>,
): boolean {
    const dx = nx - x;
    const dy = ny - y;
    if (Math.abs(dx) !== 1 || Math.abs(dy) !== 1)
        return false;
    const sideA = worldPlacementCoordKey(x + dx, y);
    const sideB = worldPlacementCoordKey(x, y + dy);
    return wallKeys.has(sideA) || wallKeys.has(sideB);
}

function isWithinRadius(
    x: number,
    y: number,
    sx: number,
    sy: number,
    radiusWorld: number,
): boolean {
    const dx = x - sx;
    const dy = y - sy;
    return dx * dx + dy * dy <= radiusWorld * radiusWorld;
}

function isPassageBlockedCell(
    x: number,
    y: number,
    wallKeys: Set<string>,
    boundary: [number, number][],
    toolMargin: number,
): boolean {
    if (wallKeys.has(worldPlacementCoordKey(x, y)))
        return true;
    return !worldPointAllowed(x, y, boundary, toolMargin);
}

function measureAxisWidthAt(
    x: number,
    y: number,
    leftDx: number,
    leftDy: number,
    rightDx: number,
    rightDy: number,
    minWidth: number,
    wallKeys: Set<string>,
    boundary: [number, number][],
    toolMargin: number,
): number {
    let width = 1;
    for (let step = 1; step < minWidth; step += 1) {
        const px = x + leftDx * step;
        const py = y + leftDy * step;
        if (isPassageBlockedCell(px, py, wallKeys, boundary, toolMargin))
            break;
        width += 1;
    }
    for (let step = 1; step < minWidth; step += 1) {
        const px = x + rightDx * step;
        const py = y + rightDy * step;
        if (isPassageBlockedCell(px, py, wallKeys, boundary, toolMargin))
            break;
        width += 1;
    }
    return width;
}

function isNarrowPassage(
    x: number,
    y: number,
    minWidth: number,
    wallKeys: Set<string>,
    boundary: [number, number][],
    toolMargin: number,
): boolean {
    const horizontal = measureAxisWidthAt(
        x,
        y,
        -1,
        0,
        1,
        0,
        minWidth,
        wallKeys,
        boundary,
        toolMargin,
    );
    const vertical = measureAxisWidthAt(
        x,
        y,
        0,
        -1,
        0,
        1,
        minWidth,
        wallKeys,
        boundary,
        toolMargin,
    );
    return Math.min(horizontal, vertical) < minWidth;
}

export type FillComputeStatus =
    | 'ok'
    | 'invalid_seed'
    | 'occupied_seed'
    | 'open_area'
    | 'too_large';

export type FillComputeResult = {
    status: FillComputeStatus;
    placements: XYZRPlacement[];
    openArea: boolean;
    visits: number;
    maxPlacementsHit: boolean;
};

export function computeFillPlacements(params: {
    layers: PaintLayer[];
    layerIdx: LayerId;
    boundary: [number, number][];
    cameraDeg: number;
    toolMargin: number;
    fillStepWorld: number;
    fillMaxPlacements: number;
    fillMarginWorld: number | undefined;
    fillMode?: FillMode;
    fillModeParams?: FillModeParams;
    fillConnectivity: FillConnectivity;
    fillWallsScope: FillWallsScope;
    activeAssetKey: AssetKey;
    seedView: [number, number];
    viewBox: ViewBox;
    maxBfsVisits?: number;
}): FillComputeResult {
    const {
        layers,
        layerIdx,
        boundary,
        cameraDeg,
        toolMargin,
        fillStepWorld,
        fillMaxPlacements,
        fillMarginWorld,
        fillMode,
        fillModeParams,
        fillConnectivity,
        fillWallsScope,
        activeAssetKey,
        seedView,
        viewBox,
        maxBfsVisits = FILL_MAX_BFS_VISITS,
    } = params;

    const mode = resolveFillMode(fillMode, fillConnectivity);
    const normalizedModeParams = normalizeModeParams(fillModeParams);
    const traversal = buildTraversalConfig(mode, normalizedModeParams);
    const placeSpacing = Math.max(1, Math.round(fillStepWorld || 1));
    const maxPlacements = Math.max(1, Math.round(fillMaxPlacements || 1));
    const fillWallMargin = normalizedFillMargin(fillMarginWorld);
    const [seedWx, seedWy] = viewToWorld(seedView[0], seedView[1], cameraDeg);
    const seedX = Math.round(seedWx);
    const seedY = Math.round(seedWy);

    if (!worldPointAllowed(seedX, seedY, boundary, toolMargin)) {
        return {
            status: 'invalid_seed',
            placements: [],
            openArea: false,
            visits: 0,
            maxPlacementsHit: false,
        };
    }

    const bx = boundary.map((p) => p[0]);
    const by = boundary.map((p) => p[1]);
    const minX = Math.floor(Math.min(...bx));
    const maxX = Math.ceil(Math.max(...bx));
    const minY = Math.floor(Math.min(...by));
    const maxY = Math.ceil(Math.max(...by));

    const occupied = occupiedCoordKeysExcludingRefs(layers, new Set());
    const seedKey = worldPlacementCoordKey(seedX, seedY);
    if (occupied.has(seedKey)) {
        return {
            status: 'occupied_seed',
            placements: [],
            openArea: false,
            visits: 0,
            maxPlacementsHit: false,
        };
    }

    const wallKeys = new Set<string>(occupied);
    const wallLayers =
        fillWallsScope === 'active_layer'
            ? [layers[layerIdx]].filter(Boolean)
            : layers;

    for (const layer of wallLayers) {
        for (const batch of layer.batches) {
            const fp = templatePlacementFootprintView(
                batch.template_hash,
                batch.facet_fv,
            );
            const analysisFp = batch.line_stroke
                ? LINE_STROKE_ANALYSIS_FOOTPRINT
                : fp;
            const halfW = analysisFp.widthView / 2 + fillWallMargin;
            const halfH
                = (analysisFp.heightView * FILL_WALL_HEIGHT_SCALE) / 2 + fillWallMargin;
            if (halfW <= 0 || halfH <= 0)
                continue;
            for (const p of batch.placements) {
                const [cvx, cvy] = worldToView(p.x, p.y, cameraDeg);
                const viewDeg = -previewRotateDegForDoodad(
                    p.r,
                    cameraDeg,
                    batch.template_hash,
                    batch.facet_fv,
                    batch.line_stroke === true,
                );
                const theta = (viewDeg * Math.PI) / 180;
                const cos = Math.cos(theta);
                const sin = Math.sin(theta);
                const radius = Math.ceil(Math.hypot(halfW, halfH)) + 1;
                const fromX = Math.max(minX, Math.floor(p.x - radius));
                const toX = Math.min(maxX, Math.ceil(p.x + radius));
                const fromY = Math.max(minY, Math.floor(p.y - radius));
                const toY = Math.min(maxY, Math.ceil(p.y + radius));

                for (let y = fromY; y <= toY; y += 1) {
                    for (let x = fromX; x <= toX; x += 1) {
                        const [pvx, pvy] = worldToView(x, y, cameraDeg);
                        const dx = pvx - cvx;
                        const dy = pvy - cvy;
                        const lx = dx * cos + dy * sin;
                        const lyRect = -dx * sin + dy * cos;
                        if (Math.abs(lx) <= halfW + 1e-9 && Math.abs(lyRect) <= halfH + 1e-9)
                            wallKeys.add(worldPlacementCoordKey(x, y));
                    }
                }
            }
        }
    }

    const asset = DECORATIONS[activeAssetKey];
    const fillR = 0;
    const placements: XYZRPlacement[] = [];
    const bestCost = new Map<string, number>([[seedKey, 0]]);
    const fifoQueue: FrontierItem[] = [{ x: seedX, y: seedY, cost: 0 }];
    const pq = traversal.usePriorityQueue ? new MinHeap() : null;
    if (pq)
        pq.push({ x: seedX, y: seedY, cost: 0 });

    let qi = 0;
    let openArea = false;
    let visits = 0;

    const pop = (): FrontierItem | undefined => {
        if (pq)
            return pq.pop();
        if (qi >= fifoQueue.length)
            return undefined;
        const item = fifoQueue[qi];
        qi += 1;
        return item;
    };

    const push = (item: FrontierItem): void => {
        if (pq)
            pq.push(item);
        else
            fifoQueue.push(item);
    };

    const hasPending = (): boolean => {
        if (pq)
            return pq.size > 0;
        return qi < fifoQueue.length;
    };

    while (hasPending()) {
        const cur = pop();
        if (!cur)
            break;

        const k = worldPlacementCoordKey(cur.x, cur.y);
        const knownCost = bestCost.get(k);
        if (knownCost == null || cur.cost > knownCost)
            continue;

        visits += 1;
        if (visits > maxBfsVisits) {
            return {
                status: 'too_large',
                placements,
                openArea: false,
                visits,
                maxPlacementsHit: false,
            };
        }

        if (cur.x <= minX || cur.x >= maxX || cur.y <= minY || cur.y >= maxY) {
            openArea = true;
            break;
        }

        if (wallKeys.has(k))
            continue;
        if (!worldPointAllowed(cur.x, cur.y, boundary, toolMargin))
            continue;

        if (traversal.radiusWorld != null) {
            if (!isWithinRadius(cur.x, cur.y, seedX, seedY, traversal.radiusWorld))
                continue;
        }

        if (traversal.minPassageWidthWorld != null) {
            if (
                isNarrowPassage(
                    cur.x,
                    cur.y,
                    traversal.minPassageWidthWorld,
                    wallKeys,
                    boundary,
                    toolMargin,
                )
            ) {
                continue;
            }
        }

        const aligned =
            Math.abs(cur.x - seedX) % placeSpacing === 0
            && Math.abs(cur.y - seedY) % placeSpacing === 0;

        if (
            aligned
            && placementFootprintAllowed(
                cur.x,
                cur.y,
                fillR,
                boundary,
                toolMargin,
                cameraDeg,
                asset.hash,
                asset.fv,
                viewBox,
                false,
            )
        ) {
            placements.push({ x: cur.x, y: cur.y, r: fillR });
            if (placements.length > maxPlacements) {
                return {
                    status: 'ok',
                    placements,
                    openArea: false,
                    visits,
                    maxPlacementsHit: true,
                };
            }
        }

        for (const move of traversal.moves) {
            const nx = cur.x + move.dx;
            const ny = cur.y + move.dy;
            if (
                move.diagonal
                && traversal.cornerSafeDiagonal
                && isDiagonalBlockedByCornerCut(cur.x, cur.y, nx, ny, wallKeys)
            ) {
                continue;
            }
            if (
                traversal.radiusWorld != null
                && !isWithinRadius(nx, ny, seedX, seedY, traversal.radiusWorld)
            ) {
                continue;
            }

            const nk = worldPlacementCoordKey(nx, ny);
            if (wallKeys.has(nk))
                continue;

            const nextCost = cur.cost + move.cost;
            const prevCost = bestCost.get(nk);
            if (prevCost != null && prevCost <= nextCost)
                continue;
            bestCost.set(nk, nextCost);
            push({ x: nx, y: ny, cost: nextCost });
        }
    }

    return {
        status: openArea ? 'open_area' : 'ok',
        placements,
        openArea,
        visits,
        maxPlacementsHit: false,
    };
}
