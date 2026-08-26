import { useState, type JSX } from 'react'

import { EditorShell } from './editor/EditorShell'
import { createDocumentStore, type DocumentStore } from './store/document-store'

/**
 * Application root. The document store is created once per mount and handed to
 * the shell; tests inject their own store instead of touching real storage.
 */
export function App(props: { store?: DocumentStore }): JSX.Element {
  const [store] = useState<DocumentStore>(() => props.store ?? createDocumentStore())
  return <EditorShell store={store} />
}
