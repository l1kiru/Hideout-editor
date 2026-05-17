// Pure domain helpers for the boundary_order workflow (no React).

export type {
  BoundaryBBox,
  MarkerChoice,
  ParsedPayload,
  PlacementRow,
} from './boundaryMapTypes'

export {
  chainFromSelections,
  distinctMarkerChoices,
  distinctPlacementNameHints,
  distinctPlacementNames,
  markerFromNameField,
  matchesBoundaryMarker,
  mostFrequentPlacementType,
  placementsWithoutBoundaryMarkers,
  type PlacementNameHint,
} from './boundaryMapMarkers'

export {
  polygonClosedSelfIntersects,
  polygonPointsAttr,
  segmentsIntersectClosed,
} from './boundaryMapGeometry'

export {
  orderChainNearestNeighbor,
  orderChainPolarAroundCentroid,
  pickFirstSimplePolygonOrder,
} from './boundaryMapOrdering'
