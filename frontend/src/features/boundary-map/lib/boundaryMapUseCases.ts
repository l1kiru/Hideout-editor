import type { PublishBoundaryPayload } from '../../../api/client'
import { i18n } from '../../../i18n'
import {
  chainFromSelections,
  orderChainNearestNeighbor,
  pickFirstSimplePolygonOrder,
  placementsWithoutBoundaryMarkers,
  polygonClosedSelfIntersects,
  type ParsedPayload,
  type PlacementRow,
} from './boundaryMapPure'

export const NEAREST_NEIGHBOR_LABEL = 'nearest-neighbor'

export function deriveMarkerChainState(
  rows: PlacementRow[],
  markerName: string | null,
  markerHash: number | null,
): {
  ordered: [number, number][]
  status: string
} {
  const chain = chainFromSelections(rows, markerName, markerHash)
  if (chain.length < 2) {
    return {
      ordered: chain,
      status: i18n.t('status.markerTooFew', { ns: 'boundary' }),
    }
  }
  if (chain.length < 3) {
    return {
      ordered: chain,
      status: i18n.t('status.chainExtracted', {
        ns: 'boundary',
        count: chain.length,
      }),
    }
  }
  const picked = pickFirstSimplePolygonOrder(chain, {
    preferredFn: orderChainNearestNeighbor,
    preferredLabel: NEAREST_NEIGHBOR_LABEL,
  })
  if (!picked) {
    return {
      ordered: chain,
      status: i18n.t('status.autoOrderFallback', {
        ns: 'boundary',
        count: chain.length,
      }),
    }
  }
  const status = i18n.t('status.autoOrderApplied', {
    ns: 'boundary',
    count: chain.length,
  })
  return { ordered: picked.order, status }
}

export function deriveHeuristicOrderState(
  chain: [number, number][],
  preferredFn: (pts: [number, number][]) => [number, number][],
  preferredShortLabel: string,
): { order: [number, number][]; status: string } | null {
  if (chain.length < 3)
    return null
  const picked = pickFirstSimplePolygonOrder(chain, {
    preferredFn,
    preferredLabel: preferredShortLabel,
  })
  if (!picked) {
    return {
      order: chain,
      status: i18n.t('status.heuristicNoSimple', { ns: 'boundary' }),
    }
  }
  const primary =
    picked.how === preferredShortLabel
    || picked.how.startsWith(`${preferredShortLabel} ·`)
  return {
    order: picked.order,
    status: primary
      ? i18n.t('status.heuristicApplied', { ns: 'boundary' })
      : i18n.t('status.heuristicFallback', { ns: 'boundary' }),
  }
}

export function validateOrderedRing(ordered: [number, number][]): string | null {
  if (ordered.length >= 3 && polygonClosedSelfIntersects(ordered)) {
    return i18n.t('status.ringSelfIntersects', { ns: 'boundary' })
  }
  return null
}

export function buildPublishPayload(args: {
  name: string
  ordered: [number, number][]
  markerName: string | null
  sourceFileName: string | null
  parsed: ParsedPayload | null
  createAsBaseMap: boolean
  publishMapId: number | null
}): PublishBoundaryPayload {
  const {
    name,
    ordered,
    markerName,
    sourceFileName,
    parsed,
    createAsBaseMap,
    publishMapId,
  } = args
  const payload: PublishBoundaryPayload = {
    map_display_name: name,
    points: ordered.map(([x, y]) => ({ x, y })),
    marker_name: markerName,
    marker_hash: null,
    source_hideout: sourceFileName ?? undefined,
    hideout_hash: parsed?.hideout_hash,
  }
  if (parsed) {
    payload.placements = placementsWithoutBoundaryMarkers(
      parsed.placements,
      markerName,
      null,
    )
  }
  payload.create_as_base_map = createAsBaseMap
  if (publishMapId != null)
    payload.map_id = publishMapId
  return payload
}
