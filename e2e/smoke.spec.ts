import { expect, test, type Page } from '@playwright/test'

/**
 * Preview viewport and edit scope are separate controls with deliberately
 * similar labels ("Tablet" vs "Tablet only"), so a query must name its group.
 */
function viewportButton(page: Page, name: RegExp) {
  return page.getByRole('group', { name: 'Preview viewport' }).getByRole('button', { name })
}

function scopeButton(page: Page, name: RegExp) {
  return page.getByRole('group', { name: 'Edit scope' }).getByRole('button', { name })
}

/** MANUAL_QA "Editor shell" is written for 1280 x 720. */
test.use({ viewport: { width: 1280, height: 720 } })

test('template gallery opens the selected template without console errors', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Choose a starting point' })).toBeVisible()
  await page.getByRole('button', { name: /Use template|Continue editing/ }).first().click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Scoped AI Template Editor' }),
  ).toBeVisible()
  await expect(page.getByRole('main', { name: 'Template preview' })).toBeVisible()
  expect(consoleErrors).toEqual([])
})

test('every preview size is inspectable without editor-shell horizontal overflow', async ({
  page,
}) => {
  await page.goto('/#/editor/aster-labs')

  const frame = page.locator('.preview__frame')
  const hasPageOverflow = async (): Promise<boolean> =>
    page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)

  for (const [name, width] of [
    ['Desktop', 1440],
    ['Tablet', 768],
    ['Mobile', 375],
  ] as const) {
    await viewportButton(page, new RegExp(name)).click()

    await expect(viewportButton(page, new RegExp(name))).toHaveAttribute('aria-pressed', 'true')
    // The template lays out at its true virtual width...
    await expect(frame).toHaveCSS('width', `${width}px`)
    // ...is scaled to fit, and never forces the shell to scroll sideways.
    await expect(frame).toBeVisible()
    expect(await hasPageOverflow(), `${name} caused page overflow`).toBe(false)
  }

  // Mobile preview shows the single-column grid, not a clipped desktop layout.
  await expect(page.locator('div[data-element-id="features.grid"]')).toHaveCSS(
    'grid-template-columns',
    /^[0-9.]+px$/,
  )
})

test('viewport controls are reachable and operable by keyboard', async ({ page }) => {
  await page.goto('/')

  const search = page.getByRole('searchbox', { name: 'Search templates' })
  await search.focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /All templates/ })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /Marketing/ })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /Portfolio/ })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /SaaS/ })).toBeFocused()
  await page.keyboard.press('Tab')

  // The real template thumbnail contains links, but its inert preview must not
  // interrupt the gallery's keyboard route to the one explicit card action.
  const useTemplate = page.getByRole('button', { name: /Use template|Continue editing/ }).first()
  await expect(useTemplate).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Scoped AI Template Editor' })).toBeVisible()

  await viewportButton(page, /Desktop/).focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')

  await expect(viewportButton(page, /Tablet/)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.preview__frame')).toHaveCSS('width', '768px')
})

test('canvas selection overlay lines up with the rendered element and agrees with layers', async ({
  page,
}) => {
  await page.goto('/#/editor/aster-labs')

  const rendered = page.locator('h2[data-element-id="hero.heading"]')
  const overlayTarget = page.locator('.selection-target[data-target-id="hero.heading"]')

  // jsdom cannot measure, so this is the only place the overlay geometry is
  // actually verified: the hit target must sit on top of what it selects.
  await expect.poll(async () => {
    const renderedBox = await rendered.boundingBox()
    const targetBox = await overlayTarget.boundingBox()
    if (renderedBox === null || targetBox === null) return false
    return (
      Math.abs(renderedBox.x - targetBox.x) < 2 &&
      Math.abs(renderedBox.y - targetBox.y) < 2 &&
      Math.abs(renderedBox.width - targetBox.width) < 2 &&
      Math.abs(renderedBox.height - targetBox.height) < 2
    )
  }).toBe(true)

  await overlayTarget.click()
  await expect(overlayTarget).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('button', { name: /^Layers/ }).click()
  await expect(
    page.getByRole('tree', { name: 'Template layers' }).locator('[data-target-id="hero.heading"]'),
  ).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('status', { name: 'Selection' })).toContainText('1 selected')

  // Additive selection from the layers tree adds a second independent id.
  await page
    .getByRole('tree', { name: 'Template layers' })
    .locator('[data-target-id="cta.button"]')
    .click({ modifiers: ['Shift'] })
  await expect(page.getByRole('status', { name: 'Selection' })).toContainText('2 selected')
  await expect(overlayTarget).toHaveAttribute('aria-selected', 'true')

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
  ).toBe(false)
})


test('a scoped inspector edit changes one viewport and protects the others', async ({ page }) => {
  await page.goto('/#/editor/aster-labs')

  const headingSize = async (): Promise<string> => {
    const value = await page
      .locator('h2[data-element-id="hero.heading"]')
      .evaluate((node) => window.getComputedStyle(node).fontSize)
    return value
  }

  await page.getByRole('button', { name: /^Layers/ }).click()
  await page.getByRole('tree', { name: 'Template layers' }).locator('[data-target-id="hero.heading"]').click()
  await scopeButton(page, /Desktop only/).click()

  await expect(page.getByRole('region', { name: 'Scope Lock' })).toContainText('1 selected')
  await expect(page.getByRole('region', { name: 'Scope Lock' })).toContainText(
    'Tablet and Mobile keep their current values.',
  )

  expect(await headingSize()).toBe('56px')

  const fontSize = page.getByLabel(/Font size/)
  await fontSize.fill('40')
  await fontSize.press('Enter')

  await expect.poll(headingSize).toBe('40px')

  // The protected views still resolve to their own values.
  await viewportButton(page, /Tablet/).click()
  await expect.poll(headingSize).toBe('42px')
  await viewportButton(page, /Mobile/).click()
  await expect.poll(headingSize).toBe('32px')

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
  ).toBe(false)
})
