import {
  createMapFromHideoutOnBase,
  deleteHideoutMap,
  duplicateHideoutMap,
  exportHideout,
  getBoundaryOrderForMap,
  getEditorSceneForMap,
  getLayer0DoodadNamesForMap,
  health,
  listHideoutMaps,
  loadMapTemplate,
  putEditorSceneForMap,
} from '../../../api/client';

export type EditorApiPorts = {
  health: typeof health;
  exportHideout: typeof exportHideout;
  getBoundaryOrderForMap: typeof getBoundaryOrderForMap;
  getEditorSceneForMap: typeof getEditorSceneForMap;
  getLayer0DoodadNamesForMap: typeof getLayer0DoodadNamesForMap;
  listHideoutMaps: typeof listHideoutMaps;
  loadMapTemplate: typeof loadMapTemplate;
  deleteHideoutMap: typeof deleteHideoutMap;
  duplicateHideoutMap: typeof duplicateHideoutMap;
  createMapFromHideoutOnBase: typeof createMapFromHideoutOnBase;
  putEditorSceneForMap: typeof putEditorSceneForMap;
};

export const defaultEditorApi: EditorApiPorts = {
  health,
  exportHideout,
  getBoundaryOrderForMap,
  getEditorSceneForMap,
  getLayer0DoodadNamesForMap,
  listHideoutMaps,
  loadMapTemplate,
  deleteHideoutMap,
  duplicateHideoutMap,
  createMapFromHideoutOnBase,
  putEditorSceneForMap,
};

export type UseEditorControllerOptions = {
    api?: Partial<EditorApiPorts>;
};
