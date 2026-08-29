import { expect, test, type Page } from "@playwright/test";

/** The landing page is designed desktop-first, like the editor it embeds. */
test.use({ viewport: { width: 1280, height: 720 } });

function demoHeadingSize(page: Page): Promise<string> {
  return page
    .locator('h2[data-element-id="hero.heading"]')
    .evaluate((node) => window.getComputedStyle(node).fontSize);
}

test("the landing page loads clean and its hero demo is the real editor", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /Edit templates with/ }),
  ).toBeVisible();

  // The frame holds the live editor: selecting an element on its canvas moves
  // the real Scope Lock, exactly as it would on /editor.
  await page
    .locator('.selection-target[data-target-id="hero.heading"]')
    .click();
  await expect(page.getByRole("region", { name: "Scope Lock" })).toContainText(
    "1 selected",
  );

  expect(consoleErrors).toEqual([]);
});

test("demo edits commit through the real pipeline and die with the frame", async ({
  page,
}) => {
  await page.goto("/");

  // A real manual edit inside the demo: select the template's hero heading,
  // and commit a font size through the Design panel the selection docked.
  await page
    .locator('.selection-target[data-target-id="hero.heading"]')
    .click();
  const fontSize = page.getByLabel(/Font size/);
  await fontSize.fill("72");
  await fontSize.press("Enter");
  await expect.poll(() => demoHeadingSize(page)).toBe("72px");

  // The commit went into the demo's throwaway store, not browser storage: a
  // visitor's own saved projects live there, and the hero must never be able
  // to reach them.
  const storedKeys = await page.evaluate(() =>
    Object.keys(window.localStorage).filter((key) =>
      key.includes("scoped-ai-template-editor"),
    ),
  );
  expect(storedKeys).toEqual([]);

  // And with nothing stored, a reload starts the demo over, pristine.
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: /Edit templates with/ }),
  ).toBeVisible();
  await expect.poll(() => demoHeadingSize(page)).toBe("56px");
  await expect(page.getByRole("status", { name: "Selection" })).toContainText(
    "Nothing selected",
  );
});

test("every road leads into the product", async ({ page }) => {
  await page.goto("/");

  // Top-bar call to action -> gallery.
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Start editing" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Choose a starting point" }),
  ).toBeVisible();
  expect(page.url()).toContain("#/templates");

  // Footer -> straight into the editor route.
  await page.goto("/");
  await page
    .getByRole("contentinfo")
    .getByRole("button", { name: "Open the editor" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Scoped AI Template Editor" }),
  ).toBeVisible();
  expect(page.url()).toContain("#/editor/aster-labs");

  // In-page nav scrolls instead of navigating: under a HashRouter the URL
  // fragment belongs to the router, and Features must not steal it.
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Landing page" })
    .getByRole("button", { name: "Features" })
    .click();
  await expect(
    page.getByRole("heading", { name: /A full editor, made/ }),
  ).toBeInViewport();
  expect(page.url()).not.toContain("features");
});
