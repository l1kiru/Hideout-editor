import { useEffect } from 'react'

import type { Scene } from '../../../types/scene'
import type { EditorApiPorts } from '../hooks/editorApiPorts'
import { sceneStorageKeyForMap } from '../lib/editorConstants'
import { logEditorDevEvent } from '../lib/editorDevLog'

type UseEditorAutosaveEffectsArgs = {
  activeMapId: number | null
  sceneReadOnly: boolean
  api: EditorApiPorts
  sceneSnapshot: Scene
}

export function useEditorAutosaveEffects(args: UseEditorAutosaveEffectsArgs) {
  const { activeMapId, sceneReadOnly, api, sceneSnapshot } = args

  useEffect(() => {
    if (activeMapId == null || sceneReadOnly)
      return
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          sceneStorageKeyForMap(activeMapId),
          JSON.stringify(sceneSnapshot),
        )
        logEditorDevEvent('scene.save.local.ok', { mapId: activeMapId })
      } catch {
        logEditorDevEvent('scene.save.local.error', { mapId: activeMapId })
      }
    }, 50)
    return () => window.clearTimeout(t)
  }, [sceneSnapshot, activeMapId, sceneReadOnly])

  useEffect(() => {
    if (activeMapId == null || sceneReadOnly)
      return
    const t = window.setTimeout(() => {
      try {
        void api
          .putEditorSceneForMap(activeMapId, sceneSnapshot)
          .then(() => {
            logEditorDevEvent('scene.save.remote.ok', { mapId: activeMapId })
          })
          .catch((e) => {
            logEditorDevEvent('scene.save.remote.error', {
              mapId: activeMapId,
              error: String(e),
            })
          })
      } catch {
        logEditorDevEvent('scene.save.remote.error', { mapId: activeMapId })
      }
    }, 300)
    return () => window.clearTimeout(t)
  }, [sceneSnapshot, activeMapId, api, sceneReadOnly])

  useEffect(() => {
    if (activeMapId == null || sceneReadOnly)
      return
    const flush = () => {
      try {
        const json = JSON.stringify(sceneSnapshot)
        try {
          localStorage.setItem(sceneStorageKeyForMap(activeMapId), json)
        } catch {
          void 0
        }
        try {
          void fetch(`/api/maps/${activeMapId}/editor-scene`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: json,
            keepalive: true,
          })
        } catch {
          void 0
        }
      } catch {
        void 0
      }
    }
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [activeMapId, sceneSnapshot, sceneReadOnly])
}
