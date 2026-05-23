import "@testing-library/jest-dom/vitest";

// jsdom does not implement ResizeObserver, but WaveformTimeline (and any future
// canvas component that measures its parent) constructs one on mount. A no-op
// stub lets the effect run without throwing; tests that care about layout
// observe the store, not the observer.
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = ResizeObserverStub;
}
