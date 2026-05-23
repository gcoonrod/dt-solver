import { cleanup, fireEvent, render } from "@testing-library/react";
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
import { solve } from "@/core/solver";
import { W65C02S_14MHz } from "@/data/w65c02s-14mhz";
import { useTimingStore } from "@/store/useTimingStore";

function resetStoreToDemo(): void {
  const profile = W65C02S_14MHz;
  useTimingStore.setState(
    {
      signals: profile.signals,
      constraints: profile.constraints,
      solved: solve(profile.signals, profile.constraints, 1000),
      tMinNs: profile.defaultWindowNs.tMinNs,
      tMaxNs: profile.defaultWindowNs.tMaxNs,
      cursorTimeNs: 35.7,
      hoveredConstraintId: null,
      selectedSignalId: null,
    },
    false,
  );
}

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
});

beforeEach(() => {
  resetStoreToDemo();
});

afterEach(() => {
  cleanup();
});

describe("<Page /> integration", () => {
  it("dragging the splitter past the upper bound clamps to maxFrac=0.7", () => {
    const { container } = render(<Page />);
    const splitter = container.querySelector<HTMLDivElement>(
      ".cursor-row-resize",
    )!;
    const bottomPanel = Array.from(
      container.querySelectorAll<HTMLElement>("[style*='flex-basis']"),
    ).find((el) => el.style.flexBasis.startsWith("42"))!;

    // Massive upward drag (clientY 1000 → 0): next = 0.42 - (-1000/400) = 2.92,
    // clamped to maxFrac=0.7 → flexBasis "70%".
    fireEvent.mouseDown(splitter, { clientY: 1000 });
    fireEvent.mouseMove(window, { clientY: 0 });

    expect(bottomPanel.style.flexBasis).toBe("70%");
  });

  it("dragging the splitter past the lower bound clamps to minFrac=0.15", () => {
    const { container } = render(<Page />);
    const splitter = container.querySelector<HTMLDivElement>(
      ".cursor-row-resize",
    )!;
    const bottomPanel = Array.from(
      container.querySelectorAll<HTMLElement>("[style*='flex-basis']"),
    ).find((el) => el.style.flexBasis.startsWith("42"))!;

    // Massive downward drag (clientY 0 → 1000): next = 0.42 - (1000/400) = -2.08,
    // clamped to minFrac=0.15 → flexBasis "15%".
    fireEvent.mouseDown(splitter, { clientY: 0 });
    fireEvent.mouseMove(window, { clientY: 1000 });

    expect(bottomPanel.style.flexBasis).toBe("15%");
  });

  it("dragging the splitter updates the bottom-panel flex basis", () => {
    const { container } = render(<Page />);
    const splitter = container.querySelector<HTMLDivElement>(
      ".cursor-row-resize",
    );
    expect(splitter).not.toBeNull();

    // The page renders two `flex-basis: <pct>%` panels. The bottom panel's
    // initial fraction is 0.42 (the page's `useVerticalSplit({ initialFrac: 0.42 })` default).
    const bottomBefore = Array.from(
      container.querySelectorAll<HTMLElement>("[style*='flex-basis']"),
    ).find((el) => el.style.flexBasis.startsWith("42"));
    expect(bottomBefore).toBeDefined();

    // Drag upward: clientY 200 → 100 (delta -100). With h=400 (stubbed) and
    // startFrac=0.42, next = 0.42 - (-100 / 400) = 0.67 → clamped to [0.15,0.7].
    fireEvent.mouseDown(splitter!, { clientY: 200 });
    fireEvent.mouseMove(window, { clientY: 100 });

    expect(bottomBefore!.style.flexBasis).not.toBe("42%");
  });

  it("Cmd/Meta + '=' narrows the viewport (zoom in)", () => {
    render(<Page />);
    const w0 = useTimingStore.getState().tMaxNs - useTimingStore.getState().tMinNs;

    fireEvent.keyDown(document.body, { key: "=", metaKey: true });

    const w1 = useTimingStore.getState().tMaxNs - useTimingStore.getState().tMinNs;
    expect(w1).toBeLessThan(w0);
  });

  it("'f' restores the profile's default viewport", () => {
    render(<Page />);

    // First zoom in so the window is non-default.
    fireEvent.keyDown(document.body, { key: "=", metaKey: true });
    const wZoomed =
      useTimingStore.getState().tMaxNs - useTimingStore.getState().tMinNs;
    const wDefault =
      W65C02S_14MHz.defaultWindowNs.tMaxNs - W65C02S_14MHz.defaultWindowNs.tMinNs;
    expect(wZoomed).toBeLessThan(wDefault);

    fireEvent.keyDown(document.body, { key: "f" });

    const { tMinNs, tMaxNs } = useTimingStore.getState();
    expect(tMinNs).toBe(W65C02S_14MHz.defaultWindowNs.tMinNs);
    expect(tMaxNs).toBe(W65C02S_14MHz.defaultWindowNs.tMaxNs);
  });

  it("'ArrowRight' advances the cursor by 1 ns", () => {
    render(<Page />);
    const before = useTimingStore.getState().cursorTimeNs;

    fireEvent.keyDown(document.body, { key: "ArrowRight" });

    const after = useTimingStore.getState().cursorTimeNs;
    expect(after).toBeCloseTo(before + 1, 6);
  });

  it("shortcuts are ignored when the event target is an <input>", () => {
    render(<Page />);

    // Zoom in first so we have a non-default window to detect a missed fit.
    fireEvent.keyDown(document.body, { key: "=", metaKey: true });
    const wZoomed =
      useTimingStore.getState().tMaxNs - useTimingStore.getState().tMinNs;

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
