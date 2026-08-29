import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LandingPage } from "./LandingPage";

/**
 * jsdom evaluates no media queries, so the hero demo's desktop/narrow choice
 * is driven here through a matchMedia stub: `desktop` answers the landing's
 * width query, everything else (reduced motion included) stays unmatched.
 */
/**
 * This vitest environment boots with node's experimental localStorage
 * disabled, so `window.localStorage` is undefined at runtime even though the
 * DOM types promise one - reach around the type, not the API.
 */
function browserLocalStorage(): Storage | undefined {
  return (globalThis as { localStorage?: Storage }).localStorage;
}

function stubMatchMedia(desktop: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    (query: string): MediaQueryList =>
      ({
        matches: desktop && query === "(min-width: 900px)",
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

function renderLanding(overrides?: {
  onOpenGallery?: () => void;
  onOpenEditor?: (templateId: string) => void;
}): {
  onOpenGallery: ReturnType<typeof vi.fn>;
  onOpenEditor: ReturnType<typeof vi.fn>;
} {
  const onOpenGallery = vi.fn();
  const onOpenEditor = vi.fn();
  render(
    <LandingPage
      onOpenGallery={overrides?.onOpenGallery ?? onOpenGallery}
      onOpenEditor={overrides?.onOpenEditor ?? onOpenEditor}
    />,
  );
  return { onOpenGallery, onOpenEditor };
}

beforeEach(() => {
  stubMatchMedia(false);
  browserLocalStorage()?.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("page structure", () => {
  it("renders the hero as the only level-one heading", () => {
    renderLanding();

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(/Edit templates with\s*AI precision/);
  });

  it("renders every marketing section and the footer", () => {
    renderLanding();

    expect(
      screen.getByRole("heading", { name: /A full editor, made\s*scoped/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /One pipeline,\s*four doors/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /A plan for every\s*scope/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Ready to edit with\s*precision\s*\?/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("routes every primary call to action to the gallery", async () => {
    const user = userEvent.setup();
    const { onOpenGallery } = renderLanding();

    for (const button of screen.getAllByRole("button", {
      name: /Start editing/,
    })) {
      await user.click(button);
    }
    await user.click(screen.getByRole("button", { name: /Open the gallery/ }));

    expect(onOpenGallery).toHaveBeenCalledTimes(3);
  });

  it("jumps to a section in place instead of navigating", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderLanding();

    await user.click(
      within(
        screen.getByRole("navigation", { name: "Landing page" }),
      ).getByRole("button", {
        name: "Features",
      }),
    );

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    // The app lives under a HashRouter: an anchor jump that wrote `#features`
    // into the URL would be a route change, so the hash must stay untouched.
    expect(window.location.hash).not.toContain("features");
  });
});

describe("pricing", () => {
  it("switches the Studio price with the billing period", async () => {
    const user = userEvent.setup();
    renderLanding();

    expect(screen.getByText("$19")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Annually" }));
    expect(screen.getByText("$15")).toBeInTheDocument();
    expect(screen.queryByText("$19")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Monthly" }));
    expect(screen.getByText("$19")).toBeInTheDocument();
  });
});

describe("hero editor demo", () => {
  it("mounts the real editor on a desktop viewport, stepped down to one h1 and one main", () => {
    stubMatchMedia(true);
    renderLanding();

    // The real shell is present and interactive...
    expect(
      screen.getByRole("button", { name: /Reset project/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Template preview" }),
    ).toBeInTheDocument();
    // ...but as a widget: the landing keeps the page's single h1 and single main.
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("keeps demo work out of real browser storage", () => {
    stubMatchMedia(true);
    renderLanding();

    // The embedded store hydrates from its own throwaway storage, so the
    // demo can never read or overwrite a visitor's saved project.
    expect(
      screen.getByRole("button", { name: /Reset project/ }),
    ).toBeInTheDocument();
    expect(browserLocalStorage()?.length ?? 0).toBe(0);
  });

  it("shows an inert render instead of a squeezed editor on narrow viewports", () => {
    stubMatchMedia(false);
    renderLanding();

    expect(screen.queryByRole("button", { name: /Reset project/ })).toBeNull();
    expect(
      screen.getByText(
        /live, editable copy of this editor opens here on a larger screen/,
      ),
    ).toBeInTheDocument();
  });
});
