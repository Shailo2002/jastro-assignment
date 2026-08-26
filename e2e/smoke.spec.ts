import { expect, test } from '@playwright/test'

/** MANUAL_QA "Editor shell" is written for 1280 x 720. */
test.use({ viewport: { width: 1280, height: 720 } })

test('editor shell loads without console errors', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Scoped AI Template Editor' }),
  ).toBeVisible()
  await expect(page.getByRole('main', { name: 'Template preview' })).toBeVisible()
  expect(consoleErrors).toEqual([])
})

test('every preview size is inspectable without editor-shell horizontal overflow', async ({
  page,
}) => {
  await page.goto('/')

  const frame = page.locator('.preview__frame')
  const hasPageOverflow = async (): Promise<boolean> =>
    page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)

  for (const [name, width] of [
    ['Desktop', 1440],
    ['Tablet', 768],
    ['Mobile', 375],
  ] as const) {
    await page.getByRole('button', { name: new RegExp(name) }).click()

    await expect(page.getByRole('button', { name: new RegExp(name) })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // The template lays out at its true virtual width...
    await expect(frame).toHaveCSS('width', `${width}px`)
    // ...is scaled to fit, and never forces the shell to scroll sideways.
    await expect(frame).toBeVisible()
    expect(await hasPageOverflow(), `${name} caused page overflow`).toBe(false)
  }

  // Mobile preview shows the single-column grid, not a clipped desktop layout.
  await expect(page.locator('[data-element-id="features.grid"]')).toHaveCSS(
    'grid-template-columns',
    /^[0-9.]+px$/,
  )
})

test('viewport controls are reachable and operable by keyboard', async ({ page }) => {
  await page.goto('/')

  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /Desktop/ })).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')

  await expect(page.getByRole('button', { name: /Tablet/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('.preview__frame')).toHaveCSS('width', '768px')
})
