import { useSyncExternalStore } from 'react'

import type { DocumentStore, DocumentStoreState } from '../store/document-store'

/**
 * React binding for the document store. `getState` returns a stable object
 * that only changes on a successful commit, so this is safe for
 * `useSyncExternalStore` without a selector or an equality function.
 */
export function useDocumentStore(store: DocumentStore): DocumentStoreState {
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getState(),
    () => store.getState(),
  )
}
