export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

// Stable identity of a placement while the scene array shape is unchanged.
export type PlacementObjectId = Brand<string, 'PlacementObjectId'>;

// Stable identity of a paint layer within the current scene array (array index).
export type LayerId = Brand<number, 'LayerId'>;

// Rounded world cell key used by move/collision validation.
export type WorldCellKey = Brand<string, 'WorldCellKey'>;

// Occupancy map: one rounded world cell -> placement that occupies it.
export type OccupiedWorldCells = ReadonlyMap<WorldCellKey, PlacementObjectId>;

export function placementObjectId(value: string): PlacementObjectId {
    return value as PlacementObjectId;
}

export function layerId(value: number): LayerId {
    return value as LayerId;
}

export function worldCellKey(value: string): WorldCellKey {
    return value as WorldCellKey;
}
