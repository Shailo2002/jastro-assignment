import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Accessibility acceptance, in a real browser.
 *
 * DESIGN_SYSTEM.md's acceptance checks are the specification here: the whole
 * required journey by keyboard alone, visible focus, no colour-only state, 44px
 * touch targets, reduced motion, and 200% zoom without two-dimensional
 * scrolling. jsdom can assert the semantics; only a browser can assert the
 * computed style, the geometry, and the real tab order.
 */

test.use({ viewport: { width: 1280, height: 720 } })

/**
 * Tabs until `target` holds focus, so reachability is proven by the real tab
 * order rather than by a scripted `focus()` call.
 */
async function isFocused(target: Locator): Promise<boolean> {
  return target.evaluate((node) => node === document.activeElement)
}

async function tabTo(page: Page, target: Locator, limit = 80): Promise<void> {
  for (let step = 0; step < limit; step += 1) {
    if (await isFocused(target)) return
    await page.keyboard.press('Tab')
  }
  throw new Error(`Tab order never reached ${target.toString()} within ${limit} steps`)
}

/**
 * Moves between sidebar panels the way a keyboard user must: the tablist uses a
 * roving tabindex, so only the ACTIVE tab is a tab stop; the others are reached
 * with the arrow keys and activated with Enter.
 */
async function activatePanel(page: Page, from: string, to: string, steps: number): Promise<void> {
  await tabTo(page, page.getByRole('tab', { name: from }))
  // Arrow movement clamps rather than wrapping, so backwards moves go left.
  const key = steps < 0 ? 'ArrowLeft' : 'ArrowRight'
  for (let step = 0; step < Math.abs(steps); step += 1) await page.keyboard.press(key)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('tab', { name: to })).toHaveAttribute('aria-selected', 'true')
}

/** Walks a roving-tabindex group with the arrow key until `target` has focus. */
async function arrowTo(page: Page, target: Locator, limit = 40): Promise<void> {
  for (let step = 0; step < limit; step += 1) {
    if (await isFocused(target)) return
    await page.keyboard.press('ArrowDown')
  }
  throw new Error(`Arrow navigation never reached ${target.toString()}`)
}

function viewportButton(page: Page, name: RegExp): Locator {
  return page.getByRole('group', { name: 'Preview viewport' }).getByRole('button', { name })
}

function scopeButton(page: Page, name: RegExp): Locator {
  return page.getByRole('group', { name: 'Edit scope' }).getByRole('button', { name })
}

function layer(page: Page, id: string): Locator {
  return page.getByRole('tree', { name: 'Template layers' }).locator(`[data-target-id="${id}"]`)
}

async function analyze(page: Page) {
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
}

test('the gallery has no serious or critical axe findings', async ({ page }) => {
  await page.goto('/#/templates')
  const results = await analyze(page)

  expect(
    results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical'),
  ).toEqual([])
})

test('every editor panel has no serious or critical axe findings', async ({ page }) => {
  await page.goto('/#/editor/aster-labs')
  await layer(page, 'hero.heading').click()

  for (const panel of ['Design', 'Code', 'AI', 'History']) {
    await page.getByRole('tab', { name: panel }).click()
    const results = await analyze(page)
    const serious = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    )
    expect(serious, `${panel} panel: ${serious.map((v) => v.id).join(', ')}`).toEqual([])
  }
})

test('the reset confirmation has no serious or critical axe findings', async ({ page }) => {
  await page.goto('/#/editor/aster-labs')
  await page.getByRole('banner').getByRole('button', { name: /Reset project/ }).click()

  const results = await analyze(page)
  expect(
    results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical'),
  ).toEqual([])
})

test('the required journey can be completed with the keyboard only', async ({ page }) => {
  await page.goto('/#/templates')

  // 1. Open the template from the gallery.
  await tabTo(page, page.getByRole('button', { name: /Use template|Continue editing/ }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Scoped AI Template Editor' })).toBeVisible()

  // 2. Change the preview viewport.
  await tabTo(page, viewportButton(page, /Desktop/))
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(viewportButton(page, /Tablet/)).toHaveAttribute('aria-pressed', 'true')

  // 3. Change the edit scope.
  await tabTo(page, scopeButton(page, /All views/))
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(scopeButton(page, /Desktop only/)).toHaveAttribute('aria-pressed', 'true')

  // 4. Select one element, then add a second, from the layers tree.
  await tabTo(page, page.getByRole('tree', { name: 'Template layers' }).locator('[tabindex="0"]'))
  await arrowTo(page, layer(page, 'hero.heading'))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toContainText('1 selected')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Shift+Enter')
  await expect(page.getByRole('status')).toContainText('2 selected')

  // Back to a single target for the property edit.
  await page.keyboard.press('Shift+Enter')
  await expect(page.getByRole('status')).toContainText('1 selected')

  // 5. Change one property from the inspector.
  const fontSize = page.getByLabel(/Font size/)
  await tabTo(page, fontSize)
  await fontSize.press('ControlOrMeta+a')
  await page.keyboard.type('44')
  await page.keyboard.press('Enter')
  // The inspector shows the EDIT SCOPE's value (Desktop only), while the
  // preview is still on Tablet - so this is what the commit is read from.
  await expect(page.getByLabel(/Font size/)).toHaveValue('44')
  // Committing with Enter keeps the keyboard where it was.
  await expect(page.getByLabel(/Font size/)).toBeFocused()
  // Tabbing back out of an unchanged field commits nothing and does not trap.
  await page.keyboard.press('Tab')
  await expect(page.getByLabel(/Font size/)).not.toBeFocused()

  // 6. Apply a valid structured code edit.
  await activatePanel(page, 'Design', 'Code', 1)
  const editor = page.getByLabel('Element properties (JSON)')
  await expect(editor).toBeVisible()
  await tabTo(page, editor)
  // The code surface sets values, it does not remove them, so the whole
  // property set is retyped with one field changed.
  const current = JSON.parse(await editor.inputValue()) as Record<
    string,
    { typography?: Record<string, unknown> }
  >
  const heading = current['hero.heading']
  if (heading?.typography !== undefined) heading.typography['fontSize'] = 48
  await editor.press('ControlOrMeta+a')
  await page.keyboard.type(JSON.stringify(current))
  // The documented escape route out of the code surface.
  await page.keyboard.press('Escape')
  await tabTo(page, page.getByRole('button', { name: 'Apply' }))
  await page.keyboard.press('Enter')
  await activatePanel(page, 'Code', 'Design', -1)
  await expect(page.getByLabel(/Font size/)).toHaveValue('48')

  // 7. Run an instruction and accept its proposal.
  await activatePanel(page, 'Design', 'AI', 2)
  await tabTo(page, page.getByRole('button', { name: 'Make the heading bolder' }))
  await page.keyboard.press('Enter')
  await tabTo(page, page.getByRole('button', { name: 'Run instruction' }))
  await page.keyboard.press('Enter')
  const acceptButton = page.locator('.proposal-card').first().getByRole('button', { name: 'Accept' })
  await tabTo(page, acceptButton)
  await page.keyboard.press('Enter')
  await expect(page.locator('.proposal-card').first()).toContainText(/Accepted/i)

  // 8. Restore one revision for one element and scope, and return focus.
  await activatePanel(page, 'AI', 'History', 1)
  const restoreTrigger = page.getByRole('button', { name: /^Restore/ }).first()
  await tabTo(page, restoreTrigger)
  await page.keyboard.press('Enter')
  await expect(page.getByText('Restore this revision?')).toBeFocused()
  // Escape cancels and hands focus back to the control that opened it.
  await page.keyboard.press('Escape')
  await expect(restoreTrigger).toBeFocused()
  await page.keyboard.press('Enter')
  await tabTo(page, page.getByRole('button', { name: 'Restore', exact: true }))
  await page.keyboard.press('Enter')
  // The restore reports on its own card, and is itself recorded as a new entry
  // at the top of the list rather than rewinding the document.
  await expect(
    page.locator('.revision-card__status').filter({ hasText: 'Restored' }),
  ).toHaveCount(1)
  await expect(page.locator('.revision-card').first()).toContainText('Restore')

  // 9. Back to the desktop preview, which is where every scoped edit landed.
  await tabTo(page, viewportButton(page, /Desktop/))
  await page.keyboard.press('Enter')
  await expect(viewportButton(page, /Desktop/)).toHaveAttribute('aria-pressed', 'true')
  await expect
    .poll(() =>
      page
        .locator('h2[data-element-id="hero.heading"]')
        .evaluate((node) => window.getComputedStyle(node).fontSize),
    )
    .toBe('48px')
})

test('a dialog returns focus to the control that opened it', async ({ page }) => {
  await page.goto('/#/editor/aster-labs')
  const reset = page.getByRole('banner').getByRole('button', { name: /Reset project/ })

  await tabTo(page, reset)
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('alertdialog', { name: 'Reset project?' })
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(reset).toBeFocused()
})

test('focus is visible and is not covered by the toolbar', async ({ page }) => {
  await page.goto('/#/editor/aster-labs')
  const button = viewportButton(page, /Tablet/)
  await button.focus()

  const outline = await button.evaluate((node) => {
    const style = window.getComputedStyle(node)
    return { width: style.outlineWidth, style: style.outlineStyle }
  })
  expect(outline.style).not.toBe('none')
  expect(Number.parseFloat(outline.width)).toBeGreaterThanOrEqual(2)

  // The focused control is fully inside the viewport, not clipped by chrome.
  const box = await button.boundingBox()
  expect(box).not.toBeNull()
  if (box !== null) {
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(720)
  }
})

test('touch-intended controls are at least 44 x 44 px', async ({ page }) => {
  await page.goto('/#/editor/aster-labs')

  const controls = page.getByRole('banner').getByRole('button')
  const count = await controls.count()
  expect(count).toBeGreaterThan(4)

  for (let index = 0; index < count; index += 1) {
    const box = await controls.nth(index).boundingBox()
    expect(box).not.toBeNull()
    if (box === null) continue
    const name = await controls.nth(index).getAttribute('aria-label')
    expect(box.width, `width of ${name ?? index}`).toBeGreaterThanOrEqual(44)
    expect(box.height, `height of ${name ?? index}`).toBeGreaterThanOrEqual(44)
  }
})

test('200% zoom keeps essential actions reachable without sideways scrolling', async ({ page }) => {
  // 1280 CSS px at 200% zoom is a 640 px layout viewport.
  await page.setViewportSize({ width: 640, height: 720 })
  await page.goto('/#/editor/aster-labs')

  await expect(viewportButton(page, /Mobile/)).toBeVisible()
  await expect(scopeButton(page, /Mobile only/)).toBeVisible()
  await expect(page.getByRole('banner').getByRole('button', { name: /Reset project/ })).toBeVisible()

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
  ).toBe(false)
})

test.describe('reduced motion', () => {
  test('removes non-essential transitions but keeps state changes', async ({ page }) => {
    // Set explicitly rather than through `test.use`, which this Playwright
    // build does not apply to the media query the stylesheets read.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/#/editor/aster-labs')
    const tablet = viewportButton(page, /Tablet/)

    const duration = await tablet.evaluate(
      (node) => window.getComputedStyle(node).transitionDuration,
    )
    expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.001)

    await tablet.click()
    await expect(tablet).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.preview__frame')).toHaveCSS('width', '768px')
  })
})
