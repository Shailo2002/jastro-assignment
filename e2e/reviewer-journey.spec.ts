import { expect, test, type Locator, type Page } from '@playwright/test'

import { setViewport, viewportControl } from './controls'

/**
 * The single reviewer journey, end to end in a real browser.
 *
 * TEST_PLAN.md lists eleven numbered steps; this file walks all of them once,
 * in order, with the pointer. It is the short smoke journey to run against a
 * deployed build. It deliberately does NOT re-prove the fine-grained rules -
 * scope isolation, proposal validation, and restore isolation each have their
 * own focused tests - it proves that the whole path holds together.
 */

const STORAGE_KEY = 'scoped-ai-template-editor.project'

test.use({ viewport: { width: 1280, height: 720 } })

function scopeButton(page: Page, name: RegExp): Locator {
  return page.getByRole('group', { name: 'Edit scope' }).getByRole('button', { name })
}

function layer(page: Page, id: string): Locator {
  return page.getByRole('tree', { name: 'Template layers' }).locator(`[data-target-id="${id}"]`)
}

/** Docks one panel; exactly one of the three is ever showing. */
async function showPanel(page: Page, name: 'Design' | 'Code' | 'Layers'): Promise<void> {
  const button = page.getByRole('button', { name: `${name} panel` })
  if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
}

function headingSize(page: Page): Promise<string> {
  return page
    .locator('h2[data-element-id="hero.heading"]')
    .evaluate((node) => window.getComputedStyle(node).fontSize)
}

test('the whole reviewer journey holds together', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  /* 1. Load the gallery and choose the catalogued template. */
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Choose a starting point' })).toBeVisible()
  await page.getByRole('button', { name: /Use template|Continue editing/ }).first().click()
  await expect(page.getByRole('main', { name: 'Template preview' })).toBeVisible()

  /* 2. Switch among the three previews. */
  for (const [name, width] of [
    ['Tablet', 768],
    ['Mobile', 375],
    ['Desktop', 1440],
  ] as const) {
    await setViewport(page, name)
    await expect(viewportControl(page)).toHaveAccessibleName(new RegExp(`${name} ${width}px`))
    await expect(page.locator('.preview__frame')).toHaveCSS('width', `${width}px`)
  }

  /* 3. Select the heading, then add the CTA to the selection, then narrow back. */
  await showPanel(page, 'Layers')
  await layer(page, 'hero.heading').click()
  await expect(page.getByRole('region', { name: 'Scope Lock' })).toContainText('1 selected')
  await layer(page, 'hero.cta.primary').click({ modifiers: ['Shift'] })
  await expect(page.getByRole('region', { name: 'Scope Lock' })).toContainText('2 selected')
  await layer(page, 'hero.cta.primary').click({ modifiers: ['Shift'] })
  await expect(page.getByRole('region', { name: 'Scope Lock' })).toContainText('1 selected')

  /* 4. A mobile-only manual edit. */
  await scopeButton(page, /Mobile only/).click()
  await showPanel(page, 'Design')
  const fontSize = page.getByLabel(/Font size/)
  await fontSize.fill('26')
  await fontSize.press('Enter')
  await setViewport(page, 'Mobile')
  await expect.poll(() => headingSize(page)).toBe('26px')

  /* 5. Desktop is provably untouched by it. */
  await setViewport(page, 'Desktop')
  await expect.poll(() => headingSize(page)).toBe('56px')

  /* 6a. A valid structured code edit, applied under the All views scope. */
  await scopeButton(page, /All views/).click()
  await showPanel(page, 'Code')
  const editor = page.getByLabel('Element properties (JSON)')
  const draft = JSON.parse(await editor.inputValue()) as Record<
    string,
    { typography?: Record<string, unknown> }
  >
  const heading = draft['hero.heading']
  if (heading?.typography === undefined) throw new Error('The heading draft has no typography.')
  heading.typography['fontSize'] = 50
  await editor.fill(JSON.stringify(draft))
  await page.getByRole('button', { name: 'Apply' }).click()
  // The canvas is never replaced by a panel, so the rendered result is read
  // back without switching anything.
  await expect.poll(() => headingSize(page)).toBe('50px')

  /* 6b. An invalid one is refused, and the last valid state survives. */
  await editor.fill('{ "hero.heading": { "typography": { "fontSize": 12 "fontWeight": 700 } } }')
  await expect(page.getByRole('button', { name: 'Apply' })).toBeDisabled()
  await expect(page.getByText(/not valid JSON/)).toBeVisible()
  expect(await headingSize(page)).toBe('50px')
  await page.getByRole('button', { name: 'Revert' }).click()

  /* 7. A deterministic multi-element proposal over the current selection. */
  await showPanel(page, 'Layers')
  await layer(page, 'hero.heading').click()
  await layer(page, 'hero.subheading').click({ modifiers: ['Shift'] })
  const instruction = page.getByLabel('Instruction')
  await instruction.fill('Align the selected elements to center')
  await page.getByRole('button', { name: 'Run instruction' }).click()
  const cards = page.locator('.proposal-card')
  await expect(cards).toHaveCount(2)
  // Generating is not a commit: the heading still reads its committed value.
  expect(await headingSize(page)).toBe('50px')

  /* 8. Accept one, reject the other; each is its own decision. */
  await cards.nth(0).getByRole('button', { name: /^Accept change for/ }).click()
  await expect(cards.nth(0)).toContainText(/Accepted/i)
  await cards.nth(1).getByRole('button', { name: /^Reject change for/ }).click()
  await expect(cards.nth(1)).toContainText(/Rejected/i)

  /* 9. Restore one element in one scope, from the history in the rail. */
  const card = page.locator('.revision-card').first()
  await card.getByRole('button', { name: /^Restore/ }).click()
  await card.getByRole('button', { name: 'Restore', exact: true }).click()
  await expect(page.locator('.revision-card__status').filter({ hasText: 'Restored' })).toHaveCount(1)
  // The restore is recorded as a new entry rather than rewinding the document.
  await expect(page.locator('.revision-card').first()).toHaveAttribute('data-source', 'restore')

  /* 10. A real reload keeps the document and its history. */
  const beforeReload = await headingSize(page)
  const revisionCount = await page.locator('.revision-card').count()
  await page.reload()
  await expect(page.getByRole('main', { name: 'Template preview' })).toBeVisible()
  await showPanel(page, 'Layers')
  await layer(page, 'hero.heading').click()
  expect(await headingSize(page)).toBe(beforeReload)
  await expect(page.locator('.revision-card')).toHaveCount(revisionCount)

  /* 11. Reset is deliberate, confirmed, and complete. */
  await page.getByRole('banner').getByRole('button', { name: /Reset project/ }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Reset project?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /^Reset/ }).click()
  await expect(dialog).toBeHidden()
  await expect.poll(() => headingSize(page)).toBe('56px')
  await expect(page.locator('.revision-card')).toHaveCount(0)
  // Reset persists the fixture rather than leaving a stale project behind.
  const stored = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)
  expect(JSON.parse(stored ?? 'null')).toMatchObject({ document: { revision: 0, history: {} } })

  expect(consoleErrors).toEqual([])
})
