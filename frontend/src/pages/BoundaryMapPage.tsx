import '../App.css';

import {
    BoundaryMapHeader,
    BoundaryMarkerSection,
    BoundaryOrderSection,
    BoundaryPolygonPreview,
    BoundarySaveSection,
    BoundarySourceSection,
    useBoundaryMapController,
} from '../features/boundary-map';

export default function BoundaryMapPage() {
  const c = useBoundaryMapController();

  return (
    <div className="appRoot">
      <aside className="leftSidebar">
        <BoundarySourceSection
          parsed={c.parsed}
          onUploadHideout={c.onUploadHideout}
        />
        <BoundaryMarkerSection
          parsed={c.parsed}
          choiceList={c.choiceList}
          safePresetPick={c.safePresetPick}
          markerNameStr={c.markerNameStr}
          onPresetChange={c.onPresetChange}
          onMarkerNameChange={c.setMarkerNameStr}
          onApplyMarkerFilters={c.onApplyMarkerFilters}
        />
        <BoundaryOrderSection
          ordered={c.ordered}
          selectedIdx={c.selectedIdx}
          onSelectVertex={c.setSelectedIdx}
          moveUp={c.moveUp}
          moveDown={c.moveDown}
          rotateFwd={c.rotateFwd}
          reverse={c.reverse}
          orderByNearestNeighbor={c.orderByNearestNeighbor}
          orderByPolarAngle={c.orderByPolarAngle}
        />
        <BoundarySaveSection
          mapDisplayName={c.mapDisplayName}
          onMapDisplayNameChange={c.setMapDisplayName}
          createAsBaseMap={c.createAsBaseMap}
          onCreateAsBaseMapChange={c.setCreateAsBaseMap}
          orderedLength={c.ordered.length}
          onPublish={c.onPublish}
        />
        <p className="status">{c.status}</p>
      </aside>

      <div className="mainColumn boundaryMapPreview">
        <BoundaryMapHeader />
        <BoundaryPolygonPreview
          ordered={c.ordered}
          allPlacements={c.parsed?.placements ?? []}
          selectedIdx={c.selectedIdx}
          onSelectVertex={c.setSelectedIdx}
          onWheelCycleOrder={c.cycleVertexWheel}
          ringSelfIntersects={c.orderedRingSelfIntersects}
        />
      </div>
    </div>
  );
}
