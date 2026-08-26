import { expect, test, type Page } from '@playwright/test'

/**
 * Persistence and reset in a real browser.
 *
 * These are the two claims jsdom cannot make: that a genuine reload of the page
 * brings the document AND its history back, and that reset is a deliberate act
 * with a real confirmation in front of it. Everything else about the pipeline is
 * covered by the component tests.
 */

const STORAGE_KEY = 'scoped-ai-template-editor.project'

test.use({ viewport: { width: 1280, height: 720 } })

function layer(page: Page, id: string) {
  return page.getByRole('tree', { name: 'Template layers' }).locator(`[data-target-id="${id}"]`)
}

function resetButton(page: Page) {
  return page.getByRole('banner').getByRole('button', { name: /Reset project/ })
}

function dialog(page: Page) {
  return page.getByRole('alertdialog', { name: 'Reset project?' })
}

function headingSize(page: Page): Promise<string> {
  return page
    .locator('h2[data-element-id="hero.heading"]')
    .evaluate((node) => window.getComputedStyle(node).fontSize)
}

/** One committed desktop-base edit: the work every test below expects to keep. */
async function editHeading(page: Page, value: string): Promise<void> {
  await layer(page, 'hero.heading').click()
  const fontSize = page.getByLabel(/Font size/)
  await fontSize.fill(value)
  await fontSize.press('Enter')
  await expect.poll(() => headingSize(page)).toBe(`${value}px`)
}

test('a committed edit and its history survive a real reload', async ({ page }) => {
  await page.goto('/#/editor/aster-labs')
  await editHeading(page, '40')

  await page.reload()

  await expect(page.getByText('Saved locally')).toBeVisible()
  await expect.poll(() => headingSize(page)).toBe('40px')

  // The inspector agrees with the canvas...
  await layer(page, 'hero.heading').click()
  await expect(page.getByLabel(/Font size/)).toHaveValue('40')

  // ...and the revision is still recoverable after the reload.
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('button', { name: /Restore/ }).first()).toBeVisible()
})

test('the gallery offers to continue the saved project after a reload', async ({ page }) => {
  await page.goto('/#/editor/aster-labs')
  await editHeading(page, '40')

  await page.goto('/#/templates')
  await page.reload()

  await page.getByRole('button', { name: /Continue editing/ }).click()
  await expect.poll(() => headingSize(page)).toBe('40px')
})

test('cancelling reset preserves every part of the project', async ({ page }) => {
  await page.goto('/#/editor/aster-labs')
  await editHeading(page, '40')

  await resetButton(page).click()
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()
  await expect.poll(() => headingSize(page)).toBe('40px')

  await resetButton(page).click()
  await dialog(page).getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog(page)).toBeHidden()
  await expect(resetButton(page)).toBeFocused()
  await expect.poll(() => headingSize(page)).toBe('40px')

  // Cancel left storage alone, so the next reload still has the work.
  await page.reload()
  await expect.poll(() => headingSize(page)).toBe('40px')
})

test('confirming reset restores the fixture and clears stored history', async ({ page }) => {
  await page.goto('/#/editor/aster-labs')
  await editHeading(page, '40')

  await resetButton(page).click()
  await dialog(page).getByRole('button', { name: 'Reset project' }).click()

  await expect(dialog(page)).toBeHidden()
  await expect.poll(() => headingSize(page)).toBe('56px')
  await expect(page.getByText('Original template')).toBeVisible()

  // Nothing is left to restore, and nothing is left to rehydrate.
  await layer(page, 'hero.heading').click()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('button', { name: /Restore/ })).toHaveCount(0)

  await page.reload()
  await expect.poll(() => headingSize(page)).toBe('56px')
  const stored = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)
  expect(stored).not.toContain('"fontSize": 40')
})

test('corrupt stored data produces an explained editor, not a crash', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/#/editor/aster-labs')
  await page.evaluate((key) => {
    window.localStorage.setItem(key, '{{{ not json')
  }, STORAGE_KEY)
  await page.reload()

  await expect(page.getByRole('main', { name: 'Template preview' })).toBeVisible()
  const notice = page.getByRole('alert')
  await expect(notice).toContainText('Attention')
  await expect.poll(() => headingSize(page)).toBe('56px')
  expect(pageErrors).toEqual([])

  // The offered recovery clears the untrusted copy for good.
  await notice.getByRole('button', { name: /Reset project/ }).click()
  await dialog(page).getByRole('button', { name: 'Reset project' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
