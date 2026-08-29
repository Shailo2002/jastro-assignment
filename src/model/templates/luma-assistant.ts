import type { TemplateDocument } from '../document'
import { buildTemplateDocument, type ElementSeed } from '../template-builder'

/**
 * "Luma Assistant" - an AI chat interface.
 *
 * A conversation, not a marketing page: an app header, a thread of assistant
 * and user bubbles (user turns right-aligned by a wrapping row), suggestion
 * chips, and a composer bar. The transcript itself is what the user edits.
 */

const CANVAS = '#120911'
const BUBBLE = '#1f1220'
const BORDER = '#4a2842'
const HEADING = '#fafafa'
const BODY = '#d4c3d0'
const MUTED = '#9d8a99'
const ACCENT = '#f472b6'

function assistantBubble(id: string): ElementSeed {
  return {
    id,
    type: 'card',
    parentId: 'chat.section',
    childIds: [`${id}.text`],
    base: {
      surface: { background: BUBBLE, borderColor: BORDER, borderWidth: 1, borderRadius: 16 },
      spacing: { padding: { top: 14, right: 18, bottom: 14, left: 18 }, gap: 10 },
      layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
      size: { maxWidth: { value: 640, unit: 'px' } },
    },
    overrides: { mobile: { size: { maxWidth: { value: 100, unit: '%' } } } },
  }
}

function bubbleText(parentId: string, text: string, color: string): ElementSeed {
  return {
    id: `${parentId}.text`,
    type: 'text',
    parentId,
    base: {
      content: { text },
      typography: { fontSize: 15, lineHeight: 1.65, color },
    },
  }
}

function userTurn(index: number, text: string): readonly ElementSeed[] {
  const rowId = `chat.user.${index}`
  return [
    {
      id: rowId,
      type: 'container',
      parentId: 'chat.section',
      childIds: [`${rowId}.bubble`],
      base: {
        layout: { display: 'flex', flexDirection: 'row', justifyContent: 'end' },
        size: { width: { value: 100, unit: '%' } },
      },
    },
    {
      id: `${rowId}.bubble`,
      type: 'card',
      parentId: rowId,
      childIds: [`${rowId}.bubble.text`],
      base: {
        surface: { background: ACCENT, borderRadius: 16, borderWidth: 0, borderColor: 'transparent' },
        spacing: { padding: { top: 12, right: 18, bottom: 12, left: 18 } },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
        size: { maxWidth: { value: 480, unit: 'px' } },
      },
      overrides: { mobile: { size: { maxWidth: { value: 90, unit: '%' } } } },
    },
    {
      id: `${rowId}.bubble.text`,
      type: 'text',
      parentId: `${rowId}.bubble`,
      base: {
        content: { text },
        typography: { fontSize: 15, lineHeight: 1.6, fontWeight: 500, color: '#2b0a1e' },
      },
    },
  ]
}

function suggestionChip(index: number, text: string): ElementSeed {
  return {
    id: `suggest.chip.${index}`,
    type: 'badge',
    parentId: 'suggest.row',
    base: {
      content: { text },
      typography: { fontSize: 13, fontWeight: 600, color: BODY },
      surface: { background: 'transparent', borderColor: BORDER, borderWidth: 1, borderRadius: 999 },
      spacing: { padding: { top: 8, right: 16, bottom: 8, left: 16 } },
    },
  }
}

function buildSeeds(): readonly ElementSeed[] {
  return [
    /* ------------------------------ header ------------------------------ */
    {
      id: 'header.section',
      type: 'section',
      parentId: null,
      childIds: ['header.brand', 'header.meta'],
      base: {
        content: { accessibleLabel: 'Assistant header' },
        surface: { background: CANVAS, borderColor: BORDER, borderWidth: 1 },
        spacing: { padding: { top: 18, right: 32, bottom: 18, left: 32 }, gap: 16 },
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
      },
      overrides: { mobile: { spacing: { padding: { top: 14, right: 16, bottom: 14, left: 16 } } } },
    },
    {
      id: 'header.brand',
      type: 'heading',
      parentId: 'header.section',
      base: {
        content: { text: 'Luma' },
        typography: { fontSize: 20, fontWeight: 700, color: HEADING },
      },
    },
    {
      id: 'header.meta',
      type: 'container',
      parentId: 'header.section',
      childIds: ['header.model', 'header.status'],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
        spacing: { gap: 10 },
      },
    },
    {
      id: 'header.model',
      type: 'badge',
      parentId: 'header.meta',
      base: {
        content: { text: 'Creative co-pilot' },
        typography: { fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: '#f9a8d4' },
        surface: { background: 'transparent', borderColor: '#5d2f54', borderWidth: 1, borderRadius: 999 },
        spacing: { padding: { top: 5, right: 12, bottom: 5, left: 12 } },
      },
    },
    {
      id: 'header.status',
      type: 'badge',
      parentId: 'header.meta',
      base: {
        content: { text: '● Online' },
        typography: { fontSize: 13, fontWeight: 600, color: '#86efac' },
        surface: { background: BUBBLE, borderColor: BORDER, borderWidth: 1, borderRadius: 999 },
        spacing: { padding: { top: 5, right: 12, bottom: 5, left: 12 } },
      },
    },

    /* ------------------------------- chat ------------------------------- */
    {
      id: 'chat.section',
      type: 'section',
      parentId: null,
      childIds: [
        'chat.day',
        'chat.assistant.1',
        'chat.user.1',
        'chat.assistant.2',
        'chat.typing',
      ],
      base: {
        content: { accessibleLabel: 'Conversation' },
        surface: { background: CANVAS },
        spacing: { padding: { top: 32, right: 96, bottom: 16, left: 96 }, gap: 16 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
      },
      overrides: {
        tablet: { spacing: { padding: { top: 24, right: 40, bottom: 12, left: 40 } } },
        mobile: { spacing: { padding: { top: 20, right: 16, bottom: 8, left: 16 }, gap: 12 } },
      },
    },
    {
      id: 'chat.day',
      type: 'badge',
      parentId: 'chat.section',
      base: {
        content: { text: 'Today, 09:12' },
        typography: { fontSize: 12, fontWeight: 600, color: MUTED },
        surface: { background: 'transparent', borderRadius: 999 },
      },
    },
    assistantBubble('chat.assistant.1'),
    bubbleText(
      'chat.assistant.1',
      'Morning! I read through the launch brief you saved yesterday. Want me to draft the announcement email, or start with naming ideas for the campaign?',
      BODY,
    ),
    ...userTurn(1, 'Let’s start with names. Something short, warm, and easy to say out loud.'),
    {
      id: 'chat.assistant.2',
      type: 'card',
      parentId: 'chat.section',
      childIds: ['chat.assistant.2.text', 'chat.assistant.2.list', 'chat.assistant.2.note'],
      base: {
        surface: { background: BUBBLE, borderColor: BORDER, borderWidth: 1, borderRadius: 16 },
        spacing: { padding: { top: 14, right: 18, bottom: 14, left: 18 }, gap: 10 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
        size: { maxWidth: { value: 640, unit: 'px' } },
      },
      overrides: { mobile: { size: { maxWidth: { value: 100, unit: '%' } } } },
    },
    {
      id: 'chat.assistant.2.text',
      type: 'text',
      parentId: 'chat.assistant.2',
      base: {
        content: { text: 'Here are three directions that fit the brief:' },
        typography: { fontSize: 15, lineHeight: 1.65, color: BODY },
      },
    },
    {
      id: 'chat.assistant.2.list',
      type: 'card',
      parentId: 'chat.assistant.2',
      childIds: ['chat.assistant.2.option.1', 'chat.assistant.2.option.2', 'chat.assistant.2.option.3'],
      base: {
        surface: { background: '#170b16', borderColor: '#3a2036', borderWidth: 1, borderRadius: 10 },
        spacing: { padding: { top: 12, right: 16, bottom: 12, left: 16 }, gap: 8 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
        size: { width: { value: 100, unit: '%' } },
      },
    },
    {
      id: 'chat.assistant.2.option.1',
      type: 'text',
      parentId: 'chat.assistant.2.list',
      base: {
        content: { text: '1. Ember — warm, small, easy to build a wordmark around' },
        typography: { fontSize: 14, lineHeight: 1.6, color: HEADING },
      },
    },
    {
      id: 'chat.assistant.2.option.2',
      type: 'text',
      parentId: 'chat.assistant.2.list',
      base: {
        content: { text: '2. Sundial — a launch that marks a moment in time' },
        typography: { fontSize: 14, lineHeight: 1.6, color: HEADING },
      },
    },
    {
      id: 'chat.assistant.2.option.3',
      type: 'text',
      parentId: 'chat.assistant.2.list',
      base: {
        content: { text: '3. Willow — soft, familiar, and pleasant to say' },
        typography: { fontSize: 14, lineHeight: 1.6, color: HEADING },
      },
    },
    {
      id: 'chat.assistant.2.note',
      type: 'text',
      parentId: 'chat.assistant.2',
      base: {
        content: { text: 'I can sketch taglines for any of these — just pick one.' },
        typography: { fontSize: 14, lineHeight: 1.6, color: MUTED },
      },
    },
    {
      id: 'chat.typing',
      type: 'badge',
      parentId: 'chat.section',
      base: {
        content: { text: 'Luma is typing…' },
        typography: { fontSize: 13, fontWeight: 500, color: MUTED },
        surface: { background: BUBBLE, borderColor: BORDER, borderWidth: 1, borderRadius: 999 },
        spacing: { padding: { top: 6, right: 14, bottom: 6, left: 14 } },
      },
    },

    /* ---------------------------- suggestions ---------------------------- */
    {
      id: 'suggest.section',
      type: 'section',
      parentId: null,
      childIds: ['suggest.row'],
      base: {
        content: { accessibleLabel: 'Suggested prompts' },
        surface: { background: CANVAS },
        spacing: { padding: { top: 8, right: 96, bottom: 12, left: 96 } },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
      },
      overrides: {
        tablet: { spacing: { padding: { top: 8, right: 40, bottom: 12, left: 40 } } },
        mobile: { spacing: { padding: { top: 4, right: 16, bottom: 8, left: 16 } } },
      },
    },
    {
      id: 'suggest.row',
      type: 'container',
      parentId: 'suggest.section',
      childIds: ['suggest.chip.1', 'suggest.chip.2', 'suggest.chip.3'],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
        spacing: { gap: 10 },
      },
      overrides: { mobile: { layout: { flexDirection: 'column', alignItems: 'start' }, spacing: { gap: 8 } } },
    },
    suggestionChip(1, 'Draft the announcement email'),
    suggestionChip(2, 'Write taglines for Ember'),
    suggestionChip(3, 'Plan the launch-week posts'),

    /* ------------------------------ composer ------------------------------ */
    {
      id: 'composer.section',
      type: 'section',
      parentId: null,
      childIds: ['composer.bar'],
      base: {
        content: { accessibleLabel: 'Message composer' },
        surface: { background: CANVAS, borderColor: BORDER, borderWidth: 1 },
        spacing: { padding: { top: 16, right: 96, bottom: 24, left: 96 } },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
      },
      overrides: {
        tablet: { spacing: { padding: { top: 12, right: 40, bottom: 20, left: 40 } } },
        mobile: { spacing: { padding: { top: 10, right: 16, bottom: 16, left: 16 } } },
      },
    },
    {
      id: 'composer.bar',
      type: 'card',
      parentId: 'composer.section',
      childIds: ['composer.placeholder', 'composer.send'],
      base: {
        surface: { background: BUBBLE, borderColor: BORDER, borderWidth: 1, borderRadius: 14 },
        spacing: { padding: { top: 10, right: 10, bottom: 10, left: 18 }, gap: 12 },
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
      },
    },
    {
      id: 'composer.placeholder',
      type: 'text',
      parentId: 'composer.bar',
      base: {
        content: { text: 'Ask Luma anything…' },
        typography: { fontSize: 15, color: MUTED },
      },
    },
    {
      id: 'composer.send',
      type: 'button',
      parentId: 'composer.bar',
      base: {
        content: { text: 'Send', accessibleLabel: 'Send message' },
        typography: { fontSize: 15, fontWeight: 600, color: '#2b0a1e' },
        surface: { background: ACCENT, borderRadius: 10, borderWidth: 0, borderColor: 'transparent' },
        spacing: { padding: { top: 10, right: 22, bottom: 10, left: 22 } },
        size: { minHeight: { value: 44, unit: 'px' } },
      },
    },
  ]
}

export function createLumaAssistantDocument(): TemplateDocument {
  return buildTemplateDocument({
    documentId: 'luma-assistant-chat',
    rootElementIds: ['header.section', 'chat.section', 'suggest.section', 'composer.section'],
    seeds: buildSeeds(),
  })
}
