import { useLayoutEffect, useState, type JSX } from "react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { EditorShell } from "./editor/EditorShell";
import { TemplateGallery } from "./gallery/TemplateGallery";
import { LandingPage } from "./landing/LandingPage";
import { getTemplate, TEMPLATE_CATALOG } from "./gallery/template-catalog";
import {
  createDocumentStore,
  type DocumentStore,
} from "./store/document-store";
import { getBrowserStorage, type StorageLike } from "./store/persistence";

type StoreGetter = (templateId: string) => DocumentStore;

function getTemplateStorage(templateId: string): StorageLike | null {
  const browserStorage = getBrowserStorage();
  if (browserStorage === undefined) return null;

  // Keep the original key unchanged so existing Aster projects still restore.
  if (templateId === "aster-labs") return browserStorage;

  const namespace = `scoped-ai-template-editor.${templateId}.`;
  return {
    getItem: (key) => browserStorage.getItem(`${namespace}${key}`),
    setItem: (key, value) => {
      browserStorage.setItem(`${namespace}${key}`, value);
    },
    removeItem: (key) => {
      browserStorage.removeItem(`${namespace}${key}`);
    },
  };
}

function createStoreGetter(
  injectedStore: DocumentStore | undefined,
): StoreGetter {
  const stores = new Map<string, DocumentStore>();

  return (templateId) => {
    if (injectedStore !== undefined) return injectedStore;

    const template = getTemplate(templateId);
    if (template === undefined) {
      throw new Error(`Unknown template: ${templateId}`);
    }

    const existingStore = stores.get(templateId);
    if (existingStore !== undefined) return existingStore;

    const store = createDocumentStore({
      createDocument: template.createDocument,
      storage: getTemplateStorage(templateId),
    });
    stores.set(templateId, store);
    return store;
  };
}

function ScrollToTop(): null {
  const location = useLocation();

  useLayoutEffect(() => {
    // Each app view starts at its own top. Without this, opening the editor
    // after scrolling the gallery can leave the toolbar above the viewport.
    const resetScroll = (): void => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScroll();
    // Hash navigation can restore the previous position after layout effects;
    // repeat once on the next frame so the new route wins that race.
    const frame = window.requestAnimationFrame(resetScroll);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [location.pathname]);

  return null;
}

function LandingRoute(): JSX.Element {
  const navigate = useNavigate();
  return (
    <LandingPage
      onOpenGallery={() => {
        void navigate("/templates");
      }}
      onOpenEditor={(templateId) => {
        void navigate(`/editor/${templateId}`);
      }}
    />
  );
}

function GalleryRoute(props: { getStore: StoreGetter }): JSX.Element {
  const navigate = useNavigate();
  const savedTemplateIds = new Set(
    TEMPLATE_CATALOG.filter((template) => {
      const state = props.getStore(template.id).getState();
      return state.hydration === "restored" || state.document.revision > 0;
    }).map((template) => template.id),
  );

  return (
    <TemplateGallery
      savedTemplateIds={savedTemplateIds}
      onSelectTemplate={(templateId) => {
        void navigate(`/editor/${templateId}`);
      }}
    />
  );
}

function EditorRoute(props: { getStore: StoreGetter }): JSX.Element {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const template =
    templateId === undefined ? undefined : getTemplate(templateId);

  if (templateId === undefined || template === undefined) {
    return <Navigate to="/templates" replace />;
  }

  return (
    <EditorShell
      store={props.getStore(templateId)}
      templateName={template.name}
      onBackToTemplates={() => {
        void navigate("/templates");
      }}
    />
  );
}

/**
 * Application root. The document store is created once per mount and handed to
 * the shell; tests inject their own store instead of touching real storage.
 */
export function App(props: { store?: DocumentStore }): JSX.Element {
  const [getStore] = useState<StoreGetter>(() =>
    createStoreGetter(props.store),
  );
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        {/* The marketing page owns the root; the product starts one route in. */}
        <Route index element={<LandingRoute />} />
        <Route
          path="/templates"
          element={<GalleryRoute getStore={getStore} />}
        />
        <Route
          path="/editor/:templateId"
          element={<EditorRoute getStore={getStore} />}
        />
        <Route path="*" element={<Navigate to="/templates" replace />} />
      </Routes>
    </HashRouter>
  );
}
