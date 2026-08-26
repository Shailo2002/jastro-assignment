import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The token layer, enforced.
 *
 * DESIGN_SYSTEM.md makes two promises that are easy to break by accident and
 * impossible to notice in a screenshot: WCAG 2.2 AA contrast for every
 * text-on-surface pair the shell actually uses, and raw colour values confined
 * to this one file. Both are checked here against the real stylesheets, so a
 * palette tweak or a hurried component style fails the suite rather than the
 * audit.
 */

const STYLE_ROOT = join(process.cwd(), 'src')
const TOKENS = readFileSync(join(STYLE_ROOT, 'styles/tokens.css'), 'utf8')

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6});`).exec(TOKENS)
  if (match?.[1] === undefined) throw new Error(`No hex token --${name} in tokens.css`)
  return match[1]
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0)
}

function contrast(a: string, b: string): number {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05)
}

/** Every surface a token-coloured text can land on in the shell or gallery. */
const SURFACES = ['surface-canvas', 'surface-shell', 'surface-panel', 'surface-elevated', 'surface-hover'] as const

/** Text tokens, with the WCAG level their smallest real usage must reach. */
const TEXT_TOKENS = ['text-primary', 'text-secondary', 'text-muted'] as const

describe('contrast', () => {
  it.each(TEXT_TOKENS)('%s reaches AA normal text on every shell surface', (name) => {
    for (const surface of SURFACES) {
      expect(
        contrast(token(name), token(surface)),
        `${name} on ${surface}`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(['status-success', 'status-warning', 'status-danger', 'action-primary', 'focus-ring'])(
    '%s reaches AA normal text where it is used as text or as a 3:1 indicator',
    (name) => {
      for (const surface of SURFACES) {
        expect(contrast(token(name), token(surface)), `${name} on ${surface}`).toBeGreaterThanOrEqual(
          4.5,
        )
      }
    },
  )

  it.each(['action-primary', 'action-primary-hover', 'action-primary-active', 'status-danger'])(
    'text-on-accent reaches AA on the %s fill',
    (fill) => {
      expect(contrast(token('text-on-accent'), token(fill))).toBeGreaterThanOrEqual(4.5)
    },
  )

  it('keeps the selection border distinguishable from the canvas it sits on', () => {
    // Non-text contrast for a UI boundary is 3:1 under WCAG 2.2 (1.4.11).
    expect(contrast(token('border-selection'), token('surface-canvas'))).toBeGreaterThanOrEqual(3)
  })
})

function styleSheets(): readonly { readonly path: string; readonly source: string }[] {
  const files: { path: string; source: string }[] = []
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.name.endsWith('.css') && entry.name !== 'tokens.css') {
        files.push({ path, source: readFileSync(path, 'utf8') })
      }
    }
  }
  walk(STYLE_ROOT)
  return files
}

describe('no raw values outside the token layer', () => {
  it('finds stylesheets to check', () => {
    expect(styleSheets().length).toBeGreaterThan(1)
  })

  it.each(styleSheets().map((sheet) => sheet.path))('%s uses semantic tokens only', (path) => {
    const source = readFileSync(path, 'utf8')
    // Strip comments so an explanatory hex in prose is not a violation.
    const rules = source.replace(/\/\*[\s\S]*?\*\//g, '')

    expect(rules, 'raw hex colour').not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(rules, 'raw rgb()/hsl() colour').not.toMatch(/\b(?:rgba?|hsla?)\(/)
  })
})

describe('no emoji as interface icons', () => {
  const sources = (): readonly string[] => {
    const files: string[] = []
    const walk = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) walk(path)
        else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) files.push(path)
      }
    }
    walk(STYLE_ROOT)
    return files
  }

  it.each(sources())('%s draws icons as SVG, not emoji', (path) => {
    const source = readFileSync(path, 'utf8')

    // Literal emoji, and the numeric entities that render as one.
    expect(source).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(source).not.toMatch(/&#(?:1[0-9]{4}|9[0-9]{3});/)
  })
})
