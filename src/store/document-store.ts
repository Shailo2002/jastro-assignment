import type { TemplateDocument } from '../model/document'
import type { EditSource } from '../model/history'
import { commandId, type CommandId, type ElementId, type RevisionEntryId } from '../model/ids'
import { createInitialTemplateDocument } from '../model/initial-template'
import type { EditablePropertyPatch } from '../model/properties'
import type { EditScope } from '../model/viewport'
import { applyEditCommand, type CommitResult } from '../engine/apply-edit-command'
import {
  createEditCommand,
  type EditCommandContext,
  type EditMode,
} from '../engine/edit-command'
import { createRestoreCommand } from '../engine/restore'
import {
  clearStoredProject,
  getBrowserStorage,
  loadStoredDocument,
  saveDocument,
  type StorageLike,
} from './persistence'

/**
 * The document store.
 *
 * This is the only object the UI is given for changing the canonical document,
 * and it exposes exactly three durable actions: `commit`, `restore`, and
 * `reset`. There is deliberately no `setDocument`, no partial-state setter, and
 * no way to write an element without going through `applyEditCommand`.
 *
 * It owns the two impure concerns the engine refuses to have - the clock and
 * command ids - and injects them, so the engine stays deterministic and the
 * store stays testable.
 *
 * UI state (selection, viewport, edit scope, panels, drafts, proposals) is NOT
 * kept here; it belongs to a separate UI store.
 */

export type HydrationStatus =
  | 'initial'
  | 'restored'
  | 'recovered-corrupt'
  | 'recovered-unsupported'
  | 'storage-unavailable'

export interface DocumentStoreState {
  readonly document: TemplateDocument
  readonly hydration: HydrationStatus
  /** Human-readable explanation when hydration or saving did not go cleanly. */
  readonly recoveryMessage: string | undefined
  readonly persistError: string | undefined
}

/** A durable edit as the UI expresses it: no id, no timestamp, no plumbing. */
export interface EditDraft {
  readonly source: EditSource
  readonly targetIds: readonly ElementId[]
  readonly scope: EditScope
  readonly mode?: EditMode | undefined
  readonly changes: Readonly<Record<ElementId, EditablePropertyPatch>>
  /**
   * The revision this edit was prepared against. Omit for an edit composed from
   * the current document (a canvas control). Any surface holding state prepared
   * earlier - an AI proposal, a code draft - MUST pass the revision it captured,
   * otherwise staleness cannot be detected.
   */
  readonly baseRevision?: number | undefined
}

export interface DocumentStore {
  getState(): DocumentStoreState
  subscribe(listener: () => void): () => void
  commit(draft: EditDraft, context?: EditCommandContext): CommitResult
  restore(input: { elementId: ElementId; revisionId: RevisionEntryId }): CommitResult
  reset(): void
}

export interface DocumentStoreOptions {
  /** Defaults to `window.localStorage` when usable. Pass `null` to disable. */
  readonly storage?: StorageLike | null | undefined
  /** Injected clock; the engine never reads one. */
  readonly now?: (() => string) | undefined
  /** Injected command-id source; must return a unique slug per call. */
  readonly nextCommandId?: (() => CommandId) | undefined
  /** Overrides the fixture, for tests. */
  readonly createDocument?: (() => TemplateDocument) | undefined
}

function defaultNow(): string {
  return new Date().toISOString()
}

function createSequentialCommandIds(): () => CommandId {
  let sequence = 0
  return () => {
    sequence += 1
    // Slug-safe and unique within a session.
    return commandId(`cmd.${Date.now().toString(36)}.${sequence}`)
  }
}

export function createDocumentStore(options: DocumentStoreOptions = {}): DocumentStore {
  const storage = options.storage === null ? undefined : (options.storage ?? getBrowserStorage())
  const now = options.now ?? defaultNow
  const nextCommandId = options.nextCommandId ?? createSequentialCommandIds()
  const createDocument = options.createDocument ?? createInitialTemplateDocument

  const listeners = new Set<() => void>()
  let state: DocumentStoreState = hydrate()

  function hydrate(): DocumentStoreState {
    const loaded = loadStoredDocument(storage)

    switch (loaded.status) {
      case 'loaded':
        return {
          document: loaded.document,
          hydration: 'restored',
          recoveryMessage: undefined,
          persistError: undefined,
        }
      case 'empty':
        return {
          document: createDocument(),
          hydration: 'initial',
          recoveryMessage: undefined,
          persistError: undefined,
        }
      case 'corrupt':
        return {
          document: createDocument(),
          hydration: 'recovered-corrupt',
          recoveryMessage: `${loaded.message} The template was reloaded; your saved copy was kept aside. Reset the project to clear it.`,
          persistError: undefined,
        }
      case 'unsupported-version':
        return {
          document: createDocument(),
          hydration: 'recovered-unsupported',
          recoveryMessage: `${loaded.message} The template was reloaded; your saved copy was kept aside. Reset the project to clear it.`,
          persistError: undefined,
        }
      case 'unavailable':
        return {
          document: createDocument(),
          hydration: 'storage-unavailable',
          recoveryMessage: loaded.message,
          persistError: undefined,
        }
    }
  }

  function notify(): void {
    for (const listener of listeners) listener()
  }

  /** Persists the new document, but never lets a save failure lose it. */
  function setDocumentState(document: TemplateDocument, hydration?: HydrationStatus): void {
    const saved = saveDocument(storage, document, now())
    state = {
      document,
      hydration: hydration ?? state.hydration,
      recoveryMessage: hydration === undefined ? state.recoveryMessage : undefined,
      persistError: saved.ok ? undefined : saved.message,
    }
    notify()
  }

  return {
    getState() {
      return state
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    commit(draft, context = {}) {
      const command = createEditCommand({
        id: nextCommandId(),
        source: draft.source,
        targetIds: draft.targetIds,
        scope: draft.scope,
        mode: draft.mode ?? 'merge',
        baseRevision: draft.baseRevision ?? state.document.revision,
        changes: draft.changes,
        createdAt: now(),
      })

      const result = applyEditCommand(state.document, command, context)
      if (result.ok) {
        setDocumentState(result.document)
      }
      return result
    },

    restore(input) {
      const prepared = createRestoreCommand({
        document: state.document,
        elementId: input.elementId,
        revisionId: input.revisionId,
        id: nextCommandId(),
        createdAt: now(),
      })
      if (!prepared.ok) {
        return { ok: false, errors: prepared.errors }
      }

      const result = applyEditCommand(state.document, prepared.command)
      if (result.ok) {
        setDocumentState(result.document)
      }
      return result
    },

    reset() {
      clearStoredProject(storage)
      setDocumentState(createDocument(), 'initial')
    },
  }
}
