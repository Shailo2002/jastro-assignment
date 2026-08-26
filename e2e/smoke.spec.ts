import { expect, test } from '@playwright/test'

test('application shell loads without console errors', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Scoped AI Template Editor' }),
  ).toBeVisible()
  expect(consoleErrors).toEqual([])
})
