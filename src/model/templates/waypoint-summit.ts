import type { TemplateDocument } from '../document'
import { buildTemplateDocument, type ElementSeed } from '../template-builder'

/**
 * "Waypoint Summit" - a conference page.
 *
 * A night-sky event identity, not a product pitch: a navigation bar with a
 * ticket action, a big-type hero over the ridge artwork, three colour-coded
 * tracks, a real day-one agenda with stages, a speakers grid, and a tiered
 * ticket strip. Everything is built from the closed element vocabulary and
 * flows through the shared validation pipeline.
 */

/* Palette: deep indigo night with violet, cyan, and amber signal colours. */
const BG = '#0a0e21'
const BG_RAISED = '#0e1330'
const PANEL = '#141a3d'
const BORDER = '#262e5e'
const BORDER_SOFT = '#1c2348'
const HEADING = '#f4f6ff'
const BODY = '#a8b0d3'
const MUTED = '#6f77a0'
const VIOLET = '#8b7cf6'
const VIOLET_WASH = '#1d1b4b'
const VIOLET_EDGE = '#3d3a8c'
const CYAN = '#38cde0'
const CYAN_WASH = '#0e2a44'
const AMBER = '#fbbf24'
const AMBER_INK = '#1c1602'

const HERO_IMAGE_SRC = '/template/waypoint-ridge.svg'

function navSeeds(): readonly ElementSeed[] {
  return [
    {
      id: 'nav.bar',
      type: 'section',
      parentId: null,
      childIds: ['nav.brand', 'nav.meta', 'nav.tickets'],
      base: {
        content: { accessibleLabel: 'Event navigation' },
        surface: { background: BG, borderColor: BORDER_SOFT, borderWidth: 1 },
        spacing: { padding: { top: 16, right: 56, bottom: 16, left: 56 }, gap: 20 },
        layout: {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 12, right: 20, bottom: 12, left: 20 }, gap: 10 } },
      },
    },
    {
      id: 'nav.brand',
      type: 'container',
      parentId: 'nav.bar',
      childIds: ['nav.brand.mark', 'nav.brand.name'],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
        spacing: { gap: 10 },
      },
    },
    {
      id: 'nav.brand.mark',
      type: 'badge',
      parentId: 'nav.brand',
      base: {
        content: { text: '▲' },
        typography: { fontSize: 13, fontWeight: 700, color: AMBER_INK },
        surface: { background: AMBER, borderRadius: 8 },
        spacing: { padding: { top: 5, right: 8, bottom: 5, left: 8 } },
      },
    },
    {
      id: 'nav.brand.name',
      type: 'text',
      parentId: 'nav.brand',
      base: {
        content: { text: 'Waypoint Summit' },
        typography: { fontSize: 16, fontWeight: 700, letterSpacing: 0.2, color: HEADING },
      },
    },
    {
      id: 'nav.meta',
      type: 'badge',
      parentId: 'nav.bar',
      base: {
        content: { text: 'Oct 14–16 · Lisbon' },
        typography: { fontSize: 13, fontWeight: 600, color: BODY },
        surface: { background: BG_RAISED, borderColor: BORDER, borderWidth: 1, borderRadius: 999 },
        spacing: { padding: { top: 6, right: 14, bottom: 6, left: 14 } },
      },
    },
    {
      id: 'nav.tickets',
      type: 'button',
      parentId: 'nav.bar',
      base: {
        content: { text: 'Get tickets', href: '#tickets' },
        typography: { fontSize: 14, fontWeight: 700, color: AMBER_INK },
        surface: { background: AMBER, borderRadius: 999, borderWidth: 0, borderColor: 'transparent' },
        spacing: { padding: { top: 8, right: 18, bottom: 8, left: 18 } },
      },
    },
  ]
}

function heroSeeds(): readonly ElementSeed[] {
  return [
    {
      id: 'hero.stage',
      type: 'section',
      parentId: null,
      childIds: ['hero.kicker', 'hero.title', 'hero.tagline', 'hero.actions', 'hero.stats', 'hero.art'],
      base: {
        surface: { background: BG, shadow: 'glow' },
        spacing: { padding: { top: 88, right: 64, bottom: 72, left: 64 }, gap: 22 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        typography: { textAlign: 'center' },
      },
      overrides: {
        tablet: { spacing: { padding: { top: 64, right: 40, bottom: 56, left: 40 } } },
        mobile: {
          spacing: { padding: { top: 44, right: 20, bottom: 40, left: 20 }, gap: 16 },
          layout: { alignItems: 'start' },
          typography: { textAlign: 'left' },
        },
      },
    },
    {
      id: 'hero.kicker',
      type: 'badge',
      parentId: 'hero.stage',
      base: {
        content: { text: 'Third edition · 3 stages · 1,800 builders' },
        typography: {
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: VIOLET,
        },
        surface: { background: VIOLET_WASH, borderColor: VIOLET_EDGE, borderWidth: 1, borderRadius: 999 },
        spacing: { padding: { top: 7, right: 16, bottom: 7, left: 16 } },
      },
    },
    {
      id: 'hero.title',
      type: 'heading',
      parentId: 'hero.stage',
      base: {
        content: { text: 'Three days at the edge of what ships next.' },
        typography: { fontSize: 64, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1.8, color: HEADING },
        size: { maxWidth: { value: 820, unit: 'px' } },
      },
      overrides: {
        tablet: { typography: { fontSize: 46 } },
        mobile: { typography: { fontSize: 34, lineHeight: 1.15, letterSpacing: -0.6, textAlign: 'left' } },
      },
    },
    {
      id: 'hero.tagline',
      type: 'text',
      parentId: 'hero.stage',
      base: {
        content: {
          text: 'Talks, workshops, and open hallway time with the people building AI systems, design tooling, and the open web - October 14–16 at Altice Arena, Lisbon.',
        },
        typography: { fontSize: 18, lineHeight: 1.65, color: BODY },
        size: { maxWidth: { value: 640, unit: 'px' } },
      },
      overrides: { mobile: { typography: { fontSize: 16, textAlign: 'left' } } },
    },
    {
      id: 'hero.actions',
      type: 'container',
      parentId: 'hero.stage',
      childIds: ['hero.cta.tickets', 'hero.cta.schedule'],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
        spacing: { gap: 14, margin: { top: 6 } },
      },
      overrides: {
        mobile: {
          layout: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'start' },
          size: { width: { value: 100, unit: '%' } },
        },
      },
    },
    {
      id: 'hero.cta.tickets',
      type: 'button',
      parentId: 'hero.actions',
      base: {
        content: { text: 'Get your pass', href: '#tickets', accessibleLabel: 'Get your Waypoint Summit pass' },
        typography: { fontSize: 16, fontWeight: 700, color: AMBER_INK },
        surface: { background: AMBER, borderRadius: 10, borderWidth: 0, borderColor: 'transparent', shadow: 'soft' },
        spacing: { padding: { top: 13, right: 28, bottom: 13, left: 28 } },
        size: { minHeight: { value: 46, unit: 'px' } },
      },
    },
    {
      id: 'hero.cta.schedule',
      type: 'button',
      parentId: 'hero.actions',
      base: {
        content: { text: 'Browse the agenda', href: '#agenda' },
        typography: { fontSize: 16, fontWeight: 500, color: HEADING },
        surface: { background: 'transparent', borderColor: BORDER, borderWidth: 1, borderRadius: 10 },
        spacing: { padding: { top: 13, right: 24, bottom: 13, left: 24 } },
        size: { minHeight: { value: 46, unit: 'px' } },
      },
    },
    {
      id: 'hero.stats',
      type: 'container',
      parentId: 'hero.stage',
      childIds: ['hero.stat.talks', 'hero.stat.speakers', 'hero.stat.workshops'],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
        spacing: { gap: 12, margin: { top: 10 } },
      },
      overrides: { mobile: { layout: { flexDirection: 'column', alignItems: 'start' }, spacing: { gap: 8 } } },
    },
    ...([
      { key: 'talks', text: '48 talks' },
      { key: 'speakers', text: '52 speakers' },
      { key: 'workshops', text: '12 hands-on workshops' },
    ] as const).map(
      (stat): ElementSeed => ({
        id: `hero.stat.${stat.key}`,
        type: 'badge',
        parentId: 'hero.stats',
        base: {
          content: { text: stat.text },
          typography: { fontSize: 13, fontWeight: 600, color: BODY },
          surface: { background: BG_RAISED, borderColor: BORDER_SOFT, borderWidth: 1, borderRadius: 999 },
          spacing: { padding: { top: 6, right: 14, bottom: 6, left: 14 } },
        },
      }),
    ),
    {
      id: 'hero.art',
      type: 'image',
      parentId: 'hero.stage',
      base: {
        content: {
          imageSrc: HERO_IMAGE_SRC,
          imageAlt: 'Stylised night ridge line with waypoint markers tracing a lit path to the summit.',
        },
        size: { width: { value: 100, unit: '%' }, maxWidth: { value: 980, unit: 'px' } },
        surface: { borderRadius: 16, borderColor: BORDER_SOFT, borderWidth: 1, shadow: 'glow' },
        spacing: { margin: { top: 28 } },
      },
      overrides: { mobile: { spacing: { margin: { top: 14 } }, surface: { borderRadius: 10 } } },
    },
  ]
}

interface TrackSeedInput {
  readonly key: string
  readonly label: string
  readonly labelColor: string
  readonly labelBg: string
  readonly labelEdge: string
  readonly title: string
  readonly body: string
}

function trackCard(track: TrackSeedInput): readonly ElementSeed[] {
  const cardId = `tracks.card.${track.key}`
  return [
    {
      id: cardId,
      type: 'card',
      parentId: 'tracks.grid',
      childIds: [`${cardId}.label`, `${cardId}.title`, `${cardId}.body`],
      base: {
        surface: { background: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 16, shadow: 'soft' },
        spacing: { padding: { top: 26, right: 26, bottom: 26, left: 26 }, gap: 12 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
      },
      overrides: { mobile: { spacing: { padding: { top: 18, right: 18, bottom: 18, left: 18 } } } },
    },
    {
      id: `${cardId}.label`,
      type: 'badge',
      parentId: cardId,
      base: {
        content: { text: track.label },
        typography: {
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: track.labelColor,
        },
        surface: { background: track.labelBg, borderColor: track.labelEdge, borderWidth: 1, borderRadius: 999 },
        spacing: { padding: { top: 5, right: 12, bottom: 5, left: 12 }, margin: { bottom: 2 } },
      },
    },
    {
      id: `${cardId}.title`,
      type: 'heading',
      parentId: cardId,
      base: {
        content: { text: track.title },
        typography: { fontSize: 21, fontWeight: 700, lineHeight: 1.25, color: HEADING },
      },
    },
    {
      id: `${cardId}.body`,
      type: 'text',
      parentId: cardId,
      base: {
        content: { text: track.body },
        typography: { fontSize: 15, lineHeight: 1.6, color: BODY },
      },
    },
  ]
}

function tracksSeeds(): readonly ElementSeed[] {
  return [
    {
      id: 'tracks.section',
      type: 'section',
      parentId: null,
      childIds: ['tracks.heading', 'tracks.grid'],
      base: {
        content: { accessibleLabel: 'Conference tracks' },
        surface: { background: BG_RAISED },
        spacing: { padding: { top: 80, right: 64, bottom: 80, left: 64 }, gap: 28 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 48, right: 20, bottom: 48, left: 20 }, gap: 18 } },
      },
    },
    {
      id: 'tracks.heading',
      type: 'heading',
      parentId: 'tracks.section',
      base: {
        content: { text: 'Three tracks, one hallway' },
        typography: { fontSize: 38, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.8, color: HEADING },
      },
      overrides: { mobile: { typography: { fontSize: 27 } } },
    },
    {
      id: 'tracks.grid',
      type: 'container',
      parentId: 'tracks.section',
      childIds: ['tracks.card.ai', 'tracks.card.design', 'tracks.card.open'],
      base: {
        layout: { display: 'grid', gridColumns: 3, alignItems: 'stretch' },
        spacing: { gap: 20 },
        size: { width: { value: 100, unit: '%' } },
      },
      overrides: {
        tablet: { layout: { gridColumns: 3 }, spacing: { gap: 14 } },
        mobile: { layout: { gridColumns: 1 }, spacing: { gap: 12 } },
      },
    },
    ...trackCard({
      key: 'ai',
      label: 'Track 01',
      labelColor: VIOLET,
      labelBg: VIOLET_WASH,
      labelEdge: VIOLET_EDGE,
      title: 'AI systems in production',
      body: 'Evals, agents, and the unglamorous plumbing between a demo and a dependable product.',
    }),
    ...trackCard({
      key: 'design',
      label: 'Track 02',
      labelColor: CYAN,
      labelBg: CYAN_WASH,
      labelEdge: '#1e4a66',
      title: 'Design engineering',
      body: 'Design systems, motion, and the tooling that lets small teams ship interfaces with taste.',
    }),
    ...trackCard({
      key: 'open',
      label: 'Track 03',
      labelColor: AMBER,
      labelBg: '#2b2208',
      labelEdge: '#57431a',
      title: 'The open web',
      body: 'Standards, performance, and keeping the platform weird - reports from maintainers in the trenches.',
    }),
  ]
}

interface SessionSeedInput {
  readonly index: number
  readonly time: string
  readonly title: string
  readonly detail: string
  readonly stage: string
  readonly keynote?: boolean
}

function sessionRow(session: SessionSeedInput): readonly ElementSeed[] {
  const rowId = `agenda.session.${session.index}`
  const keynote = session.keynote === true
  return [
    {
      id: rowId,
      type: 'card',
      parentId: 'agenda.list',
      childIds: [`${rowId}.time`, `${rowId}.info`, `${rowId}.stage`],
      base: {
        surface: {
          background: keynote ? VIOLET_WASH : PANEL,
          borderColor: keynote ? VIOLET_EDGE : BORDER,
          borderWidth: 1,
          borderRadius: 14,
          ...(keynote ? { shadow: 'soft' as const } : {}),
        },
        spacing: { padding: { top: 18, right: 22, bottom: 18, left: 22 }, gap: 18 },
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
      },
      overrides: {
        mobile: {
          layout: { flexDirection: 'column', alignItems: 'start' },
          spacing: { gap: 8, padding: { top: 14, right: 16, bottom: 14, left: 16 } },
        },
      },
    },
    {
      id: `${rowId}.time`,
      type: 'badge',
      parentId: rowId,
      base: {
        content: { text: session.time },
        typography: { fontSize: 13, fontWeight: 700, letterSpacing: 0.4, color: keynote ? VIOLET : BODY },
        surface: {
          background: BG,
          borderColor: keynote ? VIOLET_EDGE : BORDER_SOFT,
          borderWidth: 1,
          borderRadius: 8,
        },
        spacing: { padding: { top: 6, right: 12, bottom: 6, left: 12 } },
      },
    },
    {
      id: `${rowId}.info`,
      type: 'container',
      parentId: rowId,
      childIds: [`${rowId}.title`, `${rowId}.detail`],
      base: {
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
        spacing: { gap: 3 },
        size: { width: { value: 100, unit: '%' } },
      },
    },
    {
      id: `${rowId}.title`,
      type: 'heading',
      parentId: `${rowId}.info`,
      base: {
        content: { text: session.title },
        typography: { fontSize: 17, fontWeight: 700, lineHeight: 1.3, color: HEADING },
      },
    },
    {
      id: `${rowId}.detail`,
      type: 'text',
      parentId: `${rowId}.info`,
      base: {
        content: { text: session.detail },
        typography: { fontSize: 14, lineHeight: 1.5, color: BODY },
      },
    },
    {
      id: `${rowId}.stage`,
      type: 'badge',
      parentId: rowId,
      base: {
        content: { text: session.stage },
        typography: { fontSize: 12, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: MUTED },
        surface: { background: 'transparent', borderColor: BORDER, borderWidth: 1, borderRadius: 999 },
        spacing: { padding: { top: 5, right: 12, bottom: 5, left: 12 } },
      },
    },
  ]
}

function agendaSeeds(): readonly ElementSeed[] {
  const sessions: readonly SessionSeedInput[] = [
    {
      index: 1,
      time: '09:30',
      title: 'Opening keynote: software that earns trust',
      detail: 'Ilse Marchetti, Waypoint - why the next platform shift is about verifiability, not velocity.',
      stage: 'Summit',
      keynote: true,
    },
    {
      index: 2,
      time: '11:00',
      title: 'Agents that survive contact with production',
      detail: 'Dayo Adeyemi, Northline - guardrails, evals, and the incidents that shaped them.',
      stage: 'Summit',
    },
    {
      index: 3,
      time: '13:30',
      title: 'Design tokens at the scale of a city',
      detail: 'Ren Ishikawa, Goodday - one semantic layer across four products and eleven teams.',
      stage: 'Ridge',
    },
    {
      index: 4,
      time: '15:00',
      title: 'The browser is the runtime',
      detail: 'Petra Lindqvist, Harbor - local-first apps without a backend on the critical path.',
      stage: 'Ridge',
    },
    {
      index: 5,
      time: '17:30',
      title: 'Fireside: maintaining the unmaintainable',
      detail: 'Open-source maintainers on funding, burnout, and saying no - with the audience on stage.',
      stage: 'Basecamp',
    },
  ]
  return [
    {
      id: 'agenda.section',
      type: 'section',
      parentId: null,
      childIds: ['agenda.header', 'agenda.list'],
      base: {
        content: { accessibleLabel: 'Day one agenda' },
        surface: { background: BG },
        spacing: { padding: { top: 80, right: 64, bottom: 80, left: 64 }, gap: 26 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 48, right: 20, bottom: 48, left: 20 }, gap: 16 } },
      },
    },
    {
      id: 'agenda.header',
      type: 'container',
      parentId: 'agenda.section',
      childIds: ['agenda.heading', 'agenda.day'],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        spacing: { gap: 16 },
      },
      overrides: { mobile: { layout: { flexDirection: 'column', alignItems: 'start' }, spacing: { gap: 8 } } },
    },
    {
      id: 'agenda.heading',
      type: 'heading',
      parentId: 'agenda.header',
      base: {
        content: { text: 'Day one, main stages' },
        typography: { fontSize: 38, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.8, color: HEADING },
      },
      overrides: { mobile: { typography: { fontSize: 27 } } },
    },
    {
      id: 'agenda.day',
      type: 'badge',
      parentId: 'agenda.header',
      base: {
        content: { text: 'Tuesday, Oct 14' },
        typography: { fontSize: 13, fontWeight: 700, color: CYAN },
        surface: { background: CYAN_WASH, borderColor: '#1e4a66', borderWidth: 1, borderRadius: 999 },
        spacing: { padding: { top: 7, right: 16, bottom: 7, left: 16 } },
      },
    },
    {
      id: 'agenda.list',
      type: 'container',
      parentId: 'agenda.section',
      childIds: sessions.map((session) => `agenda.session.${session.index}`),
      base: {
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
        spacing: { gap: 12 },
      },
    },
    ...sessions.flatMap((session) => sessionRow(session)),
  ]
}

interface SpeakerSeedInput {
  readonly key: string
  readonly initials: string
  readonly name: string
  readonly role: string
  readonly tileBg: string
  readonly tileColor: string
}

function speakerCard(speaker: SpeakerSeedInput): readonly ElementSeed[] {
  const cardId = `speakers.card.${speaker.key}`
  return [
    {
      id: cardId,
      type: 'card',
      parentId: 'speakers.grid',
      childIds: [`${cardId}.avatar`, `${cardId}.name`, `${cardId}.role`],
      base: {
        surface: { background: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 16 },
        spacing: { padding: { top: 24, right: 22, bottom: 24, left: 22 }, gap: 10 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
      },
      overrides: { mobile: { spacing: { padding: { top: 18, right: 16, bottom: 18, left: 16 } } } },
    },
    {
      id: `${cardId}.avatar`,
      type: 'badge',
      parentId: cardId,
      base: {
        content: { text: speaker.initials },
        typography: { fontSize: 17, fontWeight: 800, letterSpacing: 0.5, color: speaker.tileColor },
        surface: { background: speaker.tileBg, borderRadius: 12 },
        spacing: { padding: { top: 14, right: 15, bottom: 14, left: 15 }, margin: { bottom: 4 } },
      },
    },
    {
      id: `${cardId}.name`,
      type: 'heading',
      parentId: cardId,
      base: {
        content: { text: speaker.name },
        typography: { fontSize: 18, fontWeight: 700, lineHeight: 1.25, color: HEADING },
      },
    },
    {
      id: `${cardId}.role`,
      type: 'text',
      parentId: cardId,
      base: {
        content: { text: speaker.role },
        typography: { fontSize: 14, lineHeight: 1.5, color: BODY },
      },
    },
  ]
}

function speakersSeeds(): readonly ElementSeed[] {
  const speakers: readonly SpeakerSeedInput[] = [
    { key: 'ilse', initials: 'IM', name: 'Ilse Marchetti', role: 'Founder, Waypoint · opening keynote', tileBg: VIOLET, tileColor: '#ffffff' },
    { key: 'dayo', initials: 'DA', name: 'Dayo Adeyemi', role: 'Principal Engineer, Northline · AI systems', tileBg: CYAN, tileColor: '#04222b' },
    { key: 'ren', initials: 'RI', name: 'Ren Ishikawa', role: 'Design Platform Lead, Goodday · design engineering', tileBg: AMBER, tileColor: AMBER_INK },
    { key: 'petra', initials: 'PL', name: 'Petra Lindqvist', role: 'CTO, Harbor · the open web', tileBg: '#f472b6', tileColor: '#3d0f26' },
  ]
  return [
    {
      id: 'speakers.section',
      type: 'section',
      parentId: null,
      childIds: ['speakers.heading', 'speakers.intro', 'speakers.grid'],
      base: {
        content: { accessibleLabel: 'Featured speakers' },
        surface: { background: BG_RAISED },
        spacing: { padding: { top: 80, right: 64, bottom: 80, left: 64 }, gap: 16 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 48, right: 20, bottom: 48, left: 20 }, gap: 12 } },
      },
    },
    {
      id: 'speakers.heading',
      type: 'heading',
      parentId: 'speakers.section',
      base: {
        content: { text: 'Voices on the mountain' },
        typography: { fontSize: 38, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.8, color: HEADING },
      },
      overrides: { mobile: { typography: { fontSize: 27 } } },
    },
    {
      id: 'speakers.intro',
      type: 'text',
      parentId: 'speakers.section',
      base: {
        content: { text: 'Fifty-two speakers this year. Four to start with.' },
        typography: { fontSize: 16, lineHeight: 1.6, color: BODY },
        spacing: { margin: { bottom: 14 } },
      },
    },
    {
      id: 'speakers.grid',
      type: 'container',
      parentId: 'speakers.section',
      childIds: speakers.map((speaker) => `speakers.card.${speaker.key}`),
      base: {
        layout: { display: 'grid', gridColumns: 4, alignItems: 'stretch' },
        spacing: { gap: 18 },
        size: { width: { value: 100, unit: '%' } },
      },
      overrides: {
        tablet: { layout: { gridColumns: 2 } },
        mobile: { layout: { gridColumns: 1 }, spacing: { gap: 12 } },
      },
    },
    ...speakers.flatMap((speaker) => speakerCard(speaker)),
  ]
}

interface TicketSeedInput {
  readonly key: string
  readonly name: string
  readonly price: string
  readonly per: string
  readonly detail: string
  readonly action: string
  readonly featured?: boolean
}

function ticketCard(ticket: TicketSeedInput): readonly ElementSeed[] {
  const cardId = `tickets.card.${ticket.key}`
  const featured = ticket.featured === true
  const flagChild = featured ? [`${cardId}.flag`] : []
  return [
    {
      id: cardId,
      type: 'card',
      parentId: 'tickets.grid',
      childIds: [
        ...flagChild,
        `${cardId}.name`,
        `${cardId}.price`,
        `${cardId}.per`,
        `${cardId}.detail`,
        `${cardId}.action`,
      ],
      base: {
        surface: {
          background: featured ? VIOLET_WASH : PANEL,
          borderColor: featured ? VIOLET : BORDER,
          borderWidth: featured ? 2 : 1,
          borderRadius: 18,
          ...(featured ? { shadow: 'glow' as const } : {}),
        },
        spacing: { padding: { top: 28, right: 26, bottom: 28, left: 26 }, gap: 8 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
      },
      overrides: { mobile: { spacing: { padding: { top: 20, right: 18, bottom: 20, left: 18 } } } },
    },
    ...(featured
      ? ([
          {
            id: `${cardId}.flag`,
            type: 'badge',
            parentId: cardId,
            base: {
              content: { text: 'Most popular' },
              typography: {
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: '#ffffff',
              },
              surface: { background: VIOLET, borderRadius: 999 },
              spacing: { padding: { top: 5, right: 12, bottom: 5, left: 12 }, margin: { bottom: 4 } },
            },
          },
        ] satisfies readonly ElementSeed[])
      : []),
    {
      id: `${cardId}.name`,
      type: 'heading',
      parentId: cardId,
      base: {
        content: { text: ticket.name },
        typography: { fontSize: 17, fontWeight: 700, letterSpacing: 0.2, color: HEADING },
      },
    },
    {
      id: `${cardId}.price`,
      type: 'heading',
      parentId: cardId,
      base: {
        content: { text: ticket.price },
        typography: { fontSize: 42, fontWeight: 800, lineHeight: 1, letterSpacing: -1, color: featured ? VIOLET : HEADING },
      },
    },
    {
      id: `${cardId}.per`,
      type: 'text',
      parentId: cardId,
      base: {
        content: { text: ticket.per },
        typography: { fontSize: 13, fontWeight: 600, color: MUTED },
      },
    },
    {
      id: `${cardId}.detail`,
      type: 'text',
      parentId: cardId,
      base: {
        content: { text: ticket.detail },
        typography: { fontSize: 14, lineHeight: 1.6, color: BODY },
        spacing: { margin: { top: 6, bottom: 10 } },
      },
    },
    {
      id: `${cardId}.action`,
      type: 'button',
      parentId: cardId,
      base: {
        content: { text: ticket.action, href: '#tickets' },
        typography: { fontSize: 15, fontWeight: 700, color: featured ? '#ffffff' : HEADING },
        surface: {
          background: featured ? VIOLET : 'transparent',
          borderColor: featured ? 'transparent' : BORDER,
          borderWidth: featured ? 0 : 1,
          borderRadius: 10,
        },
        spacing: { padding: { top: 11, right: 20, bottom: 11, left: 20 } },
        size: { width: { value: 100, unit: '%' }, minHeight: { value: 44, unit: 'px' } },
      },
    },
  ]
}

function ticketsSeeds(): readonly ElementSeed[] {
  return [
    {
      id: 'tickets.section',
      type: 'section',
      parentId: null,
      childIds: ['tickets.heading', 'tickets.note', 'tickets.grid'],
      base: {
        content: { accessibleLabel: 'Tickets' },
        surface: { background: BG },
        spacing: { padding: { top: 80, right: 64, bottom: 88, left: 64 }, gap: 14 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        typography: { textAlign: 'center' },
      },
      overrides: {
        mobile: {
          spacing: { padding: { top: 48, right: 20, bottom: 56, left: 20 }, gap: 10 },
          layout: { alignItems: 'start' },
          typography: { textAlign: 'left' },
        },
      },
    },
    {
      id: 'tickets.heading',
      type: 'heading',
      parentId: 'tickets.section',
      base: {
        content: { text: 'Choose your pass' },
        typography: { fontSize: 38, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.8, color: HEADING },
      },
      overrides: { mobile: { typography: { fontSize: 27 } } },
    },
    {
      id: 'tickets.note',
      type: 'text',
      parentId: 'tickets.section',
      base: {
        content: { text: 'Every pass covers all three days, all three stages, and lunch that is actually good.' },
        typography: { fontSize: 16, lineHeight: 1.6, color: BODY },
        spacing: { margin: { bottom: 18 } },
      },
    },
    {
      id: 'tickets.grid',
      type: 'container',
      parentId: 'tickets.section',
      childIds: ['tickets.card.early', 'tickets.card.regular', 'tickets.card.team'],
      base: {
        layout: { display: 'grid', gridColumns: 3, alignItems: 'stretch' },
        spacing: { gap: 20 },
        size: { width: { value: 100, unit: '%' }, maxWidth: { value: 1040, unit: 'px' } },
        typography: { textAlign: 'left' },
      },
      overrides: {
        tablet: { layout: { gridColumns: 3 }, spacing: { gap: 12 } },
        mobile: { layout: { gridColumns: 1 }, spacing: { gap: 14 } },
      },
    },
    ...ticketCard({
      key: 'early',
      name: 'Early bird',
      price: '€290',
      per: 'per person · until Aug 31',
      detail: 'All talks and the hallway track. The pass most of the room is holding.',
      action: 'Reserve a seat',
    }),
    ...ticketCard({
      key: 'regular',
      name: 'Full summit',
      price: '€420',
      per: 'per person',
      detail: 'Everything in early bird, plus two hands-on workshops and the summit dinner.',
      action: 'Get the full pass',
      featured: true,
    }),
    ...ticketCard({
      key: 'team',
      name: 'Team basecamp',
      price: '€1,400',
      per: 'four seats, transferable',
      detail: 'Bring the whole squad: four full passes, a shared table, and a private retro room.',
      action: 'Bring your team',
    }),
  ]
}

function footerSeeds(): readonly ElementSeed[] {
  return [
    {
      id: 'footer.strip',
      type: 'section',
      parentId: null,
      childIds: ['footer.venue', 'footer.note'],
      base: {
        surface: { background: BG_RAISED, borderColor: BORDER_SOFT, borderWidth: 1 },
        spacing: { padding: { top: 32, right: 64, bottom: 32, left: 64 }, gap: 8 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        typography: { textAlign: 'center' },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 22, right: 20, bottom: 22, left: 20 } } },
      },
    },
    {
      id: 'footer.venue',
      type: 'text',
      parentId: 'footer.strip',
      base: {
        content: { text: '▲ Waypoint Summit · Altice Arena, Lisbon · October 14–16' },
        typography: { fontSize: 14, fontWeight: 700, letterSpacing: 0.3, color: HEADING },
      },
    },
    {
      id: 'footer.note',
      type: 'text',
      parentId: 'footer.strip',
      base: {
        content: { text: 'A fictional conference, designed as an original demo template.' },
        typography: { fontSize: 13, lineHeight: 1.6, color: MUTED },
      },
    },
  ]
}

export const WAYPOINT_SUMMIT_DOCUMENT_ID = 'waypoint-summit-conference'

const ROOT_ELEMENT_IDS: readonly string[] = [
  'nav.bar',
  'hero.stage',
  'tracks.section',
  'agenda.section',
  'speakers.section',
  'tickets.section',
  'footer.strip',
]

/** Builds a fresh, validated Waypoint Summit document on every call. */
export function createWaypointSummitDocument(): TemplateDocument {
  return buildTemplateDocument({
    documentId: WAYPOINT_SUMMIT_DOCUMENT_ID,
    rootElementIds: ROOT_ELEMENT_IDS,
    seeds: [
      ...navSeeds(),
      ...heroSeeds(),
      ...tracksSeeds(),
      ...agendaSeeds(),
      ...speakersSeeds(),
      ...ticketsSeeds(),
      ...footerSeeds(),
    ],
  })
}
