import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Shared queries for the editor's two scoping controls.
 *
 * The preview viewport is ONE button that cycles Desktop -> Tablet -> Mobile,
 * so its whole state lives in its accessible name; a spec asks for a viewport
 * by pressing until the control reports it. The edit scope stays a segmented
 * group whose wording is deliberately close ("Tablet" vs "Tablet only"), which
 * is why a scope query always names its group.
 */

export type ViewportName = 'Desktop' | 'Tablet' | 'Mobile'

const VIEWPORT_CYCLE = 3

export function viewportControl(page: Page): Locator {
  return page.getByRole('button', { name: /^Preview viewport/ })
}

export function scopeButton(page: Page, name: RegExp): Locator {
  return page.getByRole('group', { name: 'Edit scope' }).getByRole('button', { name })
}

/**
 * One control of the panel switcher. Scoped to the switcher because each dock
 * also carries a "Close <name> panel" button, which a loose name would match.
 */
export function panelButton(page: Page, name: PanelName): Locator {
  return page
    .getByRole('group', { name: 'Editor panel' })
    .getByRole('button', { name: `${name} panel` })
}

export type PanelName = 'Design' | 'Code' | 'Layers'

/** Docks one panel; at most one of the three is ever showing. */
export async function showPanel(page: Page, name: PanelName): Promise<void> {
  const button = panelButton(page, name)
  if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
}

async function reports(page: Page, name: ViewportName): Promise<boolean> {
  const label = await viewportControl(page).getAttribute('aria-label')
  return new RegExp(`^Preview viewport: ${name}`).test(label ?? '')
}

/** Clicks the cycle until the preview is `name`. */
export async function setViewport(page: Page, name: ViewportName): Promise<void> {
  for (let press = 0; press < VIEWPORT_CYCLE; press += 1) {
    if (await reports(page, name)) return
    await viewportControl(page).click()
  }
  expect(await reports(page, name), `the viewport control never reached ${name}`).toBe(true)
}

/** The same, driven from the keyboard; the control must already have focus. */
export async function pressToViewport(page: Page, name: ViewportName): Promise<void> {
  for (let press = 0; press < VIEWPORT_CYCLE; press += 1) {
    if (await reports(page, name)) return
    await page.keyboard.press('Enter')
  }
  expect(await reports(page, name), `the viewport control never reached ${name}`).toBe(true)
}
