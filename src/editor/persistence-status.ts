import type { DocumentStoreState, HydrationStatus } from '../store/document-store'

/**
 * Persistence status, as a pure description.
 *
 * The shell needs to say three different things about the same store state:
 * whether this session is being saved at all, how the document on screen was
 * obtained, and whether anything needs a deliberate decision from the user.
 * Deriving that here keeps the shell free of branching and makes every wording
 * testable without rendering.
 *
 * `tone` is for styling only. Nothing here is conveyed by colour alone: the
 * label, the detail sentence, and the icon glyph all carry the meaning.
 */

export type PersistenceTone = 'saved' | 'idle' | 'warning'

export interface PersistenceStatus {
  /** Short label for the toolbar chip. */
  readonly label: string
  /** One sentence explaining what happened and what, if anything, is at risk. */
  readonly detail: string
  readonly tone: PersistenceTone
  /**
   * True when the user has an outstanding decision - unreadable saved data, an
   * unsupported version, or a failing write. The shell escalates these into a
   * notice with a reset action instead of a quiet chip.
   */
  readonly needsAttention: boolean
}

const HYDRATION_DETAIL: Readonly<Record<HydrationStatus, string>> = {
  initial: 'Starting from the original template. Edits are saved in this browser.',
  restored: 'Your saved project was restored from this browser.',
  'recovered-corrupt': 'Saved project data could not be read.',
  'recovered-unsupported': 'Saved project data came from a different version.',
  'storage-unavailable': 'Browser storage is unavailable, so this session will not be saved.',
}

export function describePersistenceStatus(state: DocumentStoreState): PersistenceStatus {
  // A failing write outranks how the document was loaded: the document on
  // screen is fine, but it is no longer being kept.
  if (state.persistError !== undefined) {
    return {
      label: 'Not saved',
      detail: state.persistError,
      tone: 'warning',
      needsAttention: true,
    }
  }

  switch (state.hydration) {
    case 'restored':
      return {
        label: 'Saved locally',
        detail: HYDRATION_DETAIL.restored,
        tone: 'saved',
        needsAttention: false,
      }
    case 'initial':
      return {
        label: state.document.revision === 0 ? 'Original template' : 'Saved locally',
        detail: HYDRATION_DETAIL.initial,
        tone: state.document.revision === 0 ? 'idle' : 'saved',
        needsAttention: false,
      }
    case 'recovered-corrupt':
    case 'recovered-unsupported':
      return {
        label: 'Recovered',
        detail: state.recoveryMessage ?? HYDRATION_DETAIL[state.hydration],
        tone: 'warning',
        needsAttention: true,
      }
    case 'storage-unavailable':
      return {
        label: 'Not saved',
        detail: state.recoveryMessage ?? HYDRATION_DETAIL['storage-unavailable'],
        tone: 'warning',
        needsAttention: true,
      }
  }
}
