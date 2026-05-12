import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'

import { NativeDialogProvider } from './context/NativeDialogContext.tsx'
import { APP_MODE_ROUTES } from './pages/shared/appModeRoutes.ts'

const EditorPage = lazy(() => import('./pages/EditorPage.tsx'))
const BoundaryMapPage = lazy(() => import('./pages/BoundaryMapPage.tsx'))

export default function App() {
  return (
    <NativeDialogProvider>
      <HashRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path={APP_MODE_ROUTES.editor} element={<EditorPage />} />
            <Route path={APP_MODE_ROUTES.boundary} element={<BoundaryMapPage />} />
            <Route path="*" element={<Navigate to={APP_MODE_ROUTES.editor} replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </NativeDialogProvider>
  )
}
