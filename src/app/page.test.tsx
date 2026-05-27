import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import Page from "@/app/page";
import { useTimingStore } from "@/store/useTimingStore";
import { TEST_STORE_STATE } from "@/test/fixtures";

// jsdom returns 0 for clientHeight, which would make the splitter drag math
// divide by zero. Stub a non-zero height on the prototype for the duration of
// this file so the drag handler can compute a real fraction.
//
// In jsdom `clientHeight` is inherited from `Element.prototype` rather than
// defined as an own property on `HTMLElement.prototype`, so the saved
// descriptor will usually be `undefined`. The cleanup path must delete the
// own-property stub (so the inherited getter takes over again) rather than
// gate restoration on a truthy saved descriptor — otherwise the stub leaks
// to every later test file in the same Vitest worker.
let originalClientHeight: PropertyDescriptor | undefined;
const originalFetch = globalThis.fetch;

beforeAll(() => {
  originalClientHeight = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "clientHeight",
  );
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      return 400;
    },
  });
});

afterAll(() => {
  if (originalClientHeight) {
    Object.defineProperty(
      HTMLElement.prototype,
      "clientHeight",
      originalClientHeight,
    );
  } else {
    delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
  }
  globalThis.fetch = originalFetch;
});

beforeEach(() => {
  useTimingStore.setState(TEST_STORE_STATE);
  globalThis.fetch = () => Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
});

afterEach(() => {
  cleanup();
});

function findBottomPanel(container: HTMLElement): HTMLElement {
  // The page renders two `flex-basis: <pct>%` panels. The bottom panel's
  // initial fraction is 0.42 (the page's `useVerticalSplit({ initialFrac: 0.42 })` default).
  const panel = Array.from(
    container.querySelectorAll<HTMLElement>("[style*='flex-basis']"),
  ).find((el) => el.style.flexBasis.startsWith("42"));
  if (!panel) throw new Error("bottom panel (flex-basis ~42%) not found");
  return panel;
}

describe("<Page /> integration", () => {
  it("dragging the splitter past the upper bound clamps to maxFrac=0.7", () => {
    const { container } = render(<Page />);
    const splitter = screen.getByTestId("splitter");
    const bottomPanel = findBottomPanel(container);

    // Massive upward drag (clientY 1000 → 0): next = 0.42 - (-1000/400) = 2.92,
    // clamped to maxFrac=0.7 → flexBasis "70%".
    fireEvent.mouseDown(splitter, { clientY: 1000 });
    fireEvent.mouseMove(window, { clientY: 0 });

    expect(bottomPanel.style.flexBasis).toBe("70%");
  });

  it("dragging the splitter past the lower bound clamps to minFrac=0.15", () => {
    const { container } = render(<Page />);
    const splitter = screen.getByTestId("splitter");
    const bottomPanel = findBottomPanel(container);

    // Massive downward drag (clientY 0 → 1000): next = 0.42 - (1000/400) = -2.08,
    // clamped to minFrac=0.15 → flexBasis "15%".
    fireEvent.mouseDown(splitter, { clientY: 0 });
    fireEvent.mouseMove(window, { clientY: 1000 });

    expect(bottomPanel.style.flexBasis).toBe("15%");
  });

  it("dragging the splitter updates the bottom-panel flex basis", () => {
    const { container } = render(<Page />);
    const splitter = screen.getByTestId("splitter");
    const bottomPanel = findBottomPanel(container);

    // Drag upward: clientY 200 → 100 (delta -100). With h=400 (stubbed) and
    // startFrac=0.42, next = 0.42 - (-100 / 400) = 0.67 → clamped to [0.15,0.7].
    fireEvent.mouseDown(splitter, { clientY: 200 });
    fireEvent.mouseMove(window, { clientY: 100 });

    expect(bottomPanel.style.flexBasis).not.toBe("42%");
  });

  it("Cmd/Meta + '=' narrows the viewport (zoom in)", () => {
    render(<Page />);
    const w0 = useTimingStore.getState().tMaxNs - useTimingStore.getState().tMinNs;

    // Dispatch on `window` to match the listener target in useGlobalShortcuts.
    fireEvent.keyDown(window, { key: "=", metaKey: true });

    const w1 = useTimingStore.getState().tMaxNs - useTimingStore.getState().tMinNs;
    expect(w1).toBeLessThan(w0);
  });

  it("'f' restores the profile's default viewport", () => {
    render(<Page />);

    // First zoom in so the window is non-default.
    fireEvent.keyDown(window, { key: "=", metaKey: true });
    const wZoomed =
      useTimingStore.getState().tMaxNs - useTimingStore.getState().tMinNs;
    const { defaultWindowNs } = useTimingStore.getState().activeProfile;
    const wDefault = defaultWindowNs.tMaxNs - defaultWindowNs.tMinNs;
    expect(wZoomed).toBeLessThan(wDefault);

    fireEvent.keyDown(window, { key: "f" });

    const { tMinNs, tMaxNs } = useTimingStore.getState();
    expect(tMinNs).toBe(defaultWindowNs.tMinNs);
    expect(tMaxNs).toBe(defaultWindowNs.tMaxNs);
  });

  it("'ArrowRight' advances the cursor by 1 ns", () => {
    render(<Page />);
    const before = useTimingStore.getState().cursorTimeNs;

    fireEvent.keyDown(window, { key: "ArrowRight" });

    const after = useTimingStore.getState().cursorTimeNs;
    expect(after).toBeCloseTo(before + 1, 6);
  });

  it("mounts the ConstraintBuilder modal in response to openBuilder/closeBuilder", () => {
    render(<Page />);
    // Closed by default — no dialog in the DOM.
    expect(screen.queryByRole("dialog", { name: /constraint builder/i })).not.toBeInTheDocument();

    act(() => {
      useTimingStore.getState().openBuilder();
    });
    expect(screen.getByRole("dialog", { name: /constraint builder/i })).toBeInTheDocument();

    act(() => {
      useTimingStore.getState().closeBuilder();
    });
    expect(screen.queryByRole("dialog", { name: /constraint builder/i })).not.toBeInTheDocument();
  });

  it("mounts the SignalBuilder modal in response to openSignalBuilder/closeSignalBuilder", () => {
    render(<Page />);
    expect(screen.queryByRole("dialog", { name: /signal builder/i })).not.toBeInTheDocument();

    act(() => {
      useTimingStore.getState().openSignalBuilder();
    });
    expect(screen.getByRole("dialog", { name: /signal builder/i })).toBeInTheDocument();

    act(() => {
      useTimingStore.getState().closeSignalBuilder();
    });
    expect(screen.queryByRole("dialog", { name: /signal builder/i })).not.toBeInTheDocument();
  });

  it("shortcuts are ignored when the event target is an <input>", () => {
    render(<Page />);

    // Zoom in first so we have a non-default window to detect a missed fit.
    fireEvent.keyDown(window, { key: "=", metaKey: true });
    const wZoomed =
      useTimingStore.getState().tMaxNs - useTimingStore.getState().tMinNs;

    // The guard checks `e.target.tagName === "INPUT"`, so this case must
    // dispatch from the input itself (keeps bubbling to the window listener,
    // but with target=input). Switching to window here would silently defeat
    // the test.
    const input = document.createElement("input");
    document.body.appendChild(input);
    try {
      fireEvent.keyDown(input, { key: "f" });
      const wAfter =
        useTimingStore.getState().tMaxNs - useTimingStore.getState().tMinNs;
      expect(wAfter).toBe(wZoomed);
    } finally {
      document.body.removeChild(input);
    }
  });
});
