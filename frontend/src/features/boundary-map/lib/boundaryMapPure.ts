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
  distinctPlacementNames,
  markerFromNameField,
  matchesBoundaryMarker,
  mostFrequentPlacementType,
  placementsWithoutBoundaryMarkers,
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
