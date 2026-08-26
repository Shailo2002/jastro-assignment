import { useLayoutEffect, useState, type JSX } from 'react'
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'

import { EditorShell } from './editor/EditorShell'
import { TemplateGallery } from './gallery/TemplateGallery'
import { getTemplate } from './gallery/template-catalog'
import { createDocumentStore, type DocumentStore } from './store/document-store'

function ScrollToTop(): null {
  const location = useLocation()

  useLayoutEffect(() => {
    // Each app view starts at its own top. Without this, opening the editor
    // after scrolling the gallery can leave the toolbar above the viewport.
    const resetScroll = (): void => {
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }

    resetScroll()
    // Hash navigation can restore the previous position after layout effects;
    // repeat once on the next frame so the new route wins that race.
    const frame = window.requestAnimationFrame(resetScroll)
    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [location.pathname])

  return null
}

function GalleryRoute(props: { store: DocumentStore }): JSX.Element {
  const navigate = useNavigate()
  const storeState = props.store.getState()

  return (
    <TemplateGallery
      hasSavedProject={storeState.hydration === 'restored' || storeState.document.revision > 0}
      onSelectTemplate={(templateId) => {
        void navigate(`/editor/${templateId}`)
      }}
    />
  )
}

function EditorRoute(props: { store: DocumentStore }): JSX.Element {
  const navigate = useNavigate()
  const { templateId } = useParams<{ templateId: string }>()

  if (templateId === undefined || getTemplate(templateId) === undefined) {
    return <Navigate to="/templates" replace />
  }

  return (
    <EditorShell
      store={props.store}
      onBackToTemplates={() => {
        void navigate('/templates')
      }}
    />
  )
}

/**
 * Application root. The document store is created once per mount and handed to
 * the shell; tests inject their own store instead of touching real storage.
 */
export function App(props: { store?: DocumentStore }): JSX.Element {
  const [store] = useState<DocumentStore>(() => props.store ?? createDocumentStore())
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route index element={<Navigate to="/templates" replace />} />
        <Route path="/templates" element={<GalleryRoute store={store} />} />
        <Route path="/editor/:templateId" element={<EditorRoute store={store} />} />
        <Route path="*" element={<Navigate to="/templates" replace />} />
      </Routes>
    </HashRouter>
  )
}
