import "@testing-library/jest-dom/vitest";

/**
 * jsdom ships no IntersectionObserver, and the landing page's scroll reveals
 * (motion's `whileInView`) refuse to mount without one. This stand-in reports
 * every observed element as immediately in view - which is also the honest
 * jsdom answer, since there is no viewport to scroll something into.
 */
if (typeof globalThis.IntersectionObserver === "undefined") {
  class ImmediateIntersectionObserver {
    readonly root = null;
    readonly rootMargin = "0px";
    readonly thresholds: readonly number[] = [0];
    private readonly callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element): void {
      const rect = target.getBoundingClientRect();
      const entry = {
        isIntersecting: true,
        intersectionRatio: 1,
        target,
        boundingClientRect: rect,
        intersectionRect: rect,
        rootBounds: null,
        time: 0,
      } as IntersectionObserverEntry;
      this.callback([entry], this);
    }

    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  globalThis.IntersectionObserver =
    ImmediateIntersectionObserver;
}
