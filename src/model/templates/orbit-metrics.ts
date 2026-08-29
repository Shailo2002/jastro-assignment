import type { TemplateDocument } from '../document'
import { buildTemplateDocument, type ElementSeed } from '../template-builder'

/**
 * "Orbit Metrics" - an analytics dashboard.
 *
 * Not a landing page: a top app bar, a four-up KPI row, a chart panel beside
 * an activity feed, and a status bar. The chart is the template's one asset;
 * every number, label, and feed row is an editable element.
 */

const CANVAS = '#06110d'
const PANEL = '#0b1713'
const BORDER = '#23483b'
const HEADING = '#fafafa'
const BODY = '#a3a3a3'
const ACCENT = '#34d399'
const ACCENT_SOFT = '#6ee7b7'

interface StatSeedInput {
  readonly index: number
  readonly label: string
  readonly value: string
  readonly delta: string
  readonly deltaColor: string
}

function statCard(stat: StatSeedInput): readonly ElementSeed[] {
  const cardId = `kpis.stat.${stat.index}`
  return [
    {
      id: cardId,
      type: 'card',
      parentId: 'kpis.row',
      childIds: [`${cardId}.label`, `${cardId}.value`, `${cardId}.delta`],
      base: {
        surface: { background: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 14 },
        spacing: { padding: { top: 18, right: 20, bottom: 18, left: 20 }, gap: 6 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
      },
    },
    {
      id: `${cardId}.label`,
      type: 'text',
      parentId: cardId,
      base: {
        content: { text: stat.label },
        typography: { fontSize: 12, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: BODY },
      },
    },
    {
      id: `${cardId}.value`,
      type: 'heading',
      parentId: cardId,
      base: {
        content: { text: stat.value },
        typography: { fontSize: 32, fontWeight: 700, lineHeight: 1.1, color: HEADING },
      },
      overrides: { mobile: { typography: { fontSize: 26 } } },
    },
    {
      id: `${cardId}.delta`,
      type: 'badge',
      parentId: cardId,
      base: {
        content: { text: stat.delta },
        typography: { fontSize: 13, fontWeight: 600, color: stat.deltaColor },
        surface: { background: 'transparent', borderRadius: 999 },
      },
    },
  ]
}

function activityRow(index: number, text: string): readonly ElementSeed[] {
  const rowId = `panels.activity.row.${index}`
  return [
    {
      id: rowId,
      type: 'container',
      parentId: 'panels.activity',
      childIds: [`${rowId}.dot`, `${rowId}.text`],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
        spacing: { gap: 10, padding: { top: 10, bottom: 10 } },
      },
    },
    {
      id: `${rowId}.dot`,
      type: 'badge',
      parentId: rowId,
      base: {
        content: { text: '●' },
        typography: { fontSize: 9, color: ACCENT },
      },
    },
    {
      id: `${rowId}.text`,
      type: 'text',
      parentId: rowId,
      base: {
        content: { text },
        typography: { fontSize: 14, lineHeight: 1.5, color: BODY },
      },
    },
  ]
}

function buildSeeds(): readonly ElementSeed[] {
  return [
    /* ------------------------------ topbar ------------------------------ */
    {
      id: 'topbar.section',
      type: 'section',
      parentId: null,
      childIds: ['topbar.brand', 'topbar.nav', 'topbar.status'],
      base: {
        content: { accessibleLabel: 'Workspace header' },
        surface: { background: CANVAS, borderColor: BORDER, borderWidth: 1 },
        spacing: { padding: { top: 18, right: 32, bottom: 18, left: 32 }, gap: 24 },
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
      },
      overrides: {
        mobile: {
          spacing: { padding: { top: 14, right: 16, bottom: 14, left: 16 }, gap: 12 },
        },
      },
    },
    {
      id: 'topbar.brand',
      type: 'heading',
      parentId: 'topbar.section',
      base: {
        content: { text: 'Orbit Metrics' },
        typography: { fontSize: 18, fontWeight: 700, color: HEADING },
      },
    },
    {
      id: 'topbar.nav',
      type: 'container',
      parentId: 'topbar.section',
      childIds: ['topbar.nav.overview', 'topbar.nav.reports', 'topbar.nav.alerts'],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
        spacing: { gap: 20 },
      },
      overrides: { mobile: { spacing: { gap: 12 } } },
    },
    {
      id: 'topbar.nav.overview',
      type: 'text',
      parentId: 'topbar.nav',
      base: { content: { text: 'Overview' }, typography: { fontSize: 14, fontWeight: 600, color: HEADING } },
    },
    {
      id: 'topbar.nav.reports',
      type: 'text',
      parentId: 'topbar.nav',
      base: { content: { text: 'Reports' }, typography: { fontSize: 14, color: BODY } },
    },
    {
      id: 'topbar.nav.alerts',
      type: 'text',
      parentId: 'topbar.nav',
      base: { content: { text: 'Alerts' }, typography: { fontSize: 14, color: BODY } },
    },
    {
      id: 'topbar.status',
      type: 'badge',
      parentId: 'topbar.section',
      base: {
        content: { text: '● Live' },
        typography: { fontSize: 13, fontWeight: 600, color: ACCENT_SOFT },
        surface: { background: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 999 },
        spacing: { padding: { top: 6, right: 14, bottom: 6, left: 14 } },
      },
    },

    /* ------------------------------- kpis ------------------------------- */
    {
      id: 'kpis.section',
      type: 'section',
      parentId: null,
      childIds: ['kpis.heading', 'kpis.row'],
      base: {
        content: { accessibleLabel: 'Key metrics' },
        surface: { background: CANVAS },
        spacing: { padding: { top: 32, right: 32, bottom: 8, left: 32 }, gap: 16 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
      },
      overrides: { mobile: { spacing: { padding: { top: 20, right: 16, bottom: 4, left: 16 } } } },
    },
    {
      id: 'kpis.heading',
      type: 'heading',
      parentId: 'kpis.section',
      base: {
        content: { text: 'This week at a glance' },
        typography: { fontSize: 22, fontWeight: 600, lineHeight: 1.25, color: HEADING },
      },
    },
    {
      id: 'kpis.row',
      type: 'container',
      parentId: 'kpis.section',
      childIds: ['kpis.stat.1', 'kpis.stat.2', 'kpis.stat.3', 'kpis.stat.4'],
      base: {
        layout: { display: 'grid', gridColumns: 4, alignItems: 'stretch' },
        spacing: { gap: 16 },
      },
      overrides: {
        tablet: { layout: { gridColumns: 2 } },
        mobile: { layout: { gridColumns: 1 }, spacing: { gap: 12 } },
      },
    },
    ...statCard({ index: 1, label: 'Active users', value: '18.4K', delta: '+12.8% vs last week', deltaColor: ACCENT_SOFT }),
    ...statCard({ index: 2, label: 'Activation', value: '68.2%', delta: '+4.1% vs last week', deltaColor: ACCENT_SOFT }),
    ...statCard({ index: 3, label: 'MRR', value: '$92K', delta: '+8.6% vs last week', deltaColor: ACCENT_SOFT }),
    ...statCard({ index: 4, label: 'Churn', value: '1.9%', delta: '-0.3% vs last week', deltaColor: '#fca5a5' }),

    /* ------------------------------ panels ------------------------------ */
    {
      id: 'panels.section',
      type: 'section',
      parentId: null,
      childIds: ['panels.chart', 'panels.activity'],
      base: {
        content: { accessibleLabel: 'Charts and activity' },
        surface: { background: CANVAS },
        spacing: { padding: { top: 24, right: 32, bottom: 32, left: 32 }, gap: 16 },
        layout: { display: 'grid', gridColumns: 2, alignItems: 'stretch' },
      },
      overrides: {
        tablet: { layout: { gridColumns: 1 } },
        mobile: { layout: { gridColumns: 1 }, spacing: { padding: { top: 16, right: 16, bottom: 20, left: 16 } } },
      },
    },
    {
      id: 'panels.chart',
      type: 'card',
      parentId: 'panels.section',
      childIds: ['panels.chart.heading', 'panels.chart.sub', 'panels.chart.figure'],
      base: {
        surface: { background: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 16 },
        spacing: { padding: { top: 20, right: 20, bottom: 20, left: 20 }, gap: 8 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
      },
    },
    {
      id: 'panels.chart.heading',
      type: 'heading',
      parentId: 'panels.chart',
      base: {
        content: { text: 'Growth signals' },
        typography: { fontSize: 17, fontWeight: 600, color: HEADING },
      },
    },
    {
      id: 'panels.chart.sub',
      type: 'text',
      parentId: 'panels.chart',
      base: {
        content: { text: 'Weekly active users, last 12 weeks' },
        typography: { fontSize: 13, color: BODY },
      },
    },
    {
      id: 'panels.chart.figure',
      type: 'image',
      parentId: 'panels.chart',
      base: {
        content: {
          imageSrc: '/template/orbit-chart.svg',
          imageAlt: 'Line chart of weekly active users trending upward over twelve weeks.',
        },
        size: { width: { value: 100, unit: '%' } },
        surface: { borderRadius: 10 },
        spacing: { margin: { top: 8 } },
      },
    },
    {
      id: 'panels.activity',
      type: 'card',
      parentId: 'panels.section',
      childIds: [
        'panels.activity.heading',
        'panels.activity.row.1',
        'panels.activity.row.2',
        'panels.activity.row.3',
        'panels.activity.row.4',
      ],
      base: {
        surface: { background: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 16 },
        spacing: { padding: { top: 20, right: 20, bottom: 20, left: 20 }, gap: 4 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
      },
    },
    {
      id: 'panels.activity.heading',
      type: 'heading',
      parentId: 'panels.activity',
      base: {
        content: { text: 'Recent activity' },
        typography: { fontSize: 17, fontWeight: 600, color: HEADING },
      },
    },
    ...activityRow(1, 'Activation crossed 68% for the first time.'),
    ...activityRow(2, 'Weekly growth report is ready to share.'),
    ...activityRow(3, 'New segment “Trial power users” saved.'),
    ...activityRow(4, 'Churn alert resolved after the billing fix.'),

    /* ----------------------------- statusbar ----------------------------- */
    {
      id: 'statusbar.section',
      type: 'section',
      parentId: null,
      childIds: ['statusbar.note'],
      base: {
        surface: { background: CANVAS, borderColor: BORDER, borderWidth: 1 },
        spacing: { padding: { top: 16, right: 32, bottom: 16, left: 32 } },
        layout: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between' },
      },
      overrides: { mobile: { spacing: { padding: { top: 12, right: 16, bottom: 12, left: 16 } } } },
    },
    {
      id: 'statusbar.note',
      type: 'text',
      parentId: 'statusbar.section',
      base: {
        content: { text: 'Orbit Metrics · All systems reporting · Data refreshed 2 minutes ago' },
        typography: { fontSize: 13, lineHeight: 1.5, color: '#737373' },
      },
    },
  ]
}

export function createOrbitMetricsDocument(): TemplateDocument {
  return buildTemplateDocument({
    documentId: 'orbit-metrics-dashboard',
    rootElementIds: ['topbar.section', 'kpis.section', 'panels.section', 'statusbar.section'],
    seeds: buildSeeds(),
  })
}
