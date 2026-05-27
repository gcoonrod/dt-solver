import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import SignalBuilder from "@/components/features/SignalBuilder";
import { useTimingStore } from "@/store/useTimingStore";
import { TEST_STORE_STATE } from "@/test/fixtures";
import type { SignalBuilderInitial } from "@/types/signal";



beforeEach(() => {
  useTimingStore.setState(TEST_STORE_STATE);
});

afterEach(() => {
  cleanup();
});

function openBuilder(initial?: SignalBuilderInitial) {
  act(() => {
    useTimingStore.getState().openSignalBuilder(initial);
  });
}

describe("<SignalBuilder />", () => {
  it("does not render when signalBuilderOpen is false", () => {
    render(<SignalBuilder />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when openSignalBuilder() is dispatched", () => {
    render(<SignalBuilder />);
    openBuilder();
    expect(screen.getByRole("dialog", { name: /signal builder/i })).toBeInTheDocument();
    const lineChip = screen.getByRole("button", { name: /1b line/i });
    expect(lineChip.className).toContain("violet");
  });

  it("openSignalBuilder({ mode: 'CLOCK' }) pre-selects the Clock chip", () => {
    render(<SignalBuilder />);
    openBuilder({ mode: "CLOCK" });
    const clockChip = screen.getByRole("button", { name: /clk clock/i });
    expect(clockChip.className).toContain("sky");
    expect(screen.getByLabelText(/frequency value/i)).toBeInTheDocument();
  });

  it("switching type chips re-seeds the form", async () => {
    const user = userEvent.setup();
    render(<SignalBuilder />);
    openBuilder({ mode: "CLOCK" });

    expect(screen.getByLabelText(/frequency value/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /\[n:0\] bus/i }));

    expect(screen.queryByLabelText(/frequency value/i)).not.toBeInTheDocument();
    expect(screen.getByText(/transitions/i)).toBeInTheDocument();
  });

  it("frequency unit conversion", () => {
    render(<SignalBuilder />);
    openBuilder({ mode: "CLOCK" });

    const freqInput = screen.getByLabelText(/frequency value/i) as HTMLInputElement;
    fireEvent.change(freqInput, { target: { value: "2.5" } });

    const unitSelect = screen.getByLabelText(/frequency unit/i) as HTMLSelectElement;
    fireEvent.change(unitSelect, { target: { value: "GHz" } });

    const addBtn = screen.getByRole("button", { name: /add signal/i });
    fireEvent.click(addBtn);

    const signals = useTimingStore.getState().signals;
    const added = signals[signals.length - 1];
    expect(added.type).toBe("CLOCK");
    if (added.type === "CLOCK") {
      expect(added.frequencyMHz).toBe(2500);
    }
  });

  it("duty percent conversion", () => {
    render(<SignalBuilder />);
    openBuilder({ mode: "CLOCK" });

    const dutyInput = screen.getByLabelText(/duty cycle high percent/i) as HTMLInputElement;
    fireEvent.change(dutyInput, { target: { value: "60" } });

    const addBtn = screen.getByRole("button", { name: /add signal/i });
    fireEvent.click(addBtn);

    const signals = useTimingStore.getState().signals;
    const added = signals[signals.length - 1];
    expect(added.type).toBe("CLOCK");
    if (added.type === "CLOCK") {
      expect(added.dutyCycle).toBeCloseTo(0.6);
    }
  });

  it("low duty caption derives live", () => {
    render(<SignalBuilder />);
    openBuilder({ mode: "CLOCK" });

    const dutyInput = screen.getByLabelText(/duty cycle high percent/i) as HTMLInputElement;
    fireEvent.change(dutyInput, { target: { value: "40" } });

    expect(screen.getByText(/low 60%/i)).toBeInTheDocument();
  });

  it("negative phase renders the phi ruler on the left of t=0", () => {
    render(<SignalBuilder />);
    openBuilder({ mode: "CLOCK" });

    const phaseInput = screen.getByLabelText("PHASE") as HTMLInputElement;
    fireEvent.change(phaseInput, { target: { value: "-10" } });

    // The preview SVG is the large one with defs containing arrow markers
    const allSvgs = document.querySelectorAll("svg");
    const previewSvg = Array.from(allSvgs).find((s) => s.querySelector("defs marker"));
    expect(previewSvg).toBeDefined();
    const rulerTexts = previewSvg!.querySelectorAll("text");
    const phiText = Array.from(rulerTexts).find((t) => t.textContent?.includes("φ"));
    expect(phiText).toBeDefined();
  });

  it("transitions editor add row", async () => {
    const user = userEvent.setup();
    render(<SignalBuilder />);
    openBuilder({ mode: "BUS" });

    const initialRows = screen.getAllByLabelText(/transition \d+ time/i);
    const initialCount = initialRows.length;

    await user.click(screen.getByRole("button", { name: /\+ add row/i }));

    const afterRows = screen.getAllByLabelText(/transition \d+ time/i);
    expect(afterRows.length).toBe(initialCount + 1);

    const lastRow = afterRows[afterRows.length - 1] as HTMLInputElement;
    const prevRow = afterRows[afterRows.length - 2] as HTMLInputElement;
    expect(Number(lastRow.value)).toBeGreaterThanOrEqual(Number(prevRow.value));
  });

  it("transitions editor remove row", async () => {
    const user = userEvent.setup();
    render(<SignalBuilder />);
    openBuilder({ mode: "LINE" });

    const initialRows = screen.getAllByLabelText(/transition \d+ time/i);
    expect(initialRows.length).toBe(3);

    const removeButtons = screen.getAllByLabelText(/remove transition/i);
    await user.click(removeButtons[1]);

    const afterRows = screen.getAllByLabelText(/transition \d+ time/i);
    expect(afterRows.length).toBe(2);
  });

  it("sort by time appears when out of order", () => {
    render(<SignalBuilder />);
    openBuilder({ mode: "LINE" });

    // Make row 2 time less than row 1
    const rows = screen.getAllByLabelText(/transition \d+ time/i);
    fireEvent.change(rows[1], { target: { value: "5" } });

    expect(screen.getByText(/out of order/i)).toBeInTheDocument();

    const sortButton = screen.getByRole("button", { name: /sort by time/i });
    fireEvent.click(sortButton);

    expect(screen.queryByText(/out of order/i)).not.toBeInTheDocument();
  });

  it("submit dispatches addSignal and closes the modal", () => {
    render(<SignalBuilder />);
    openBuilder({ mode: "CLOCK" });

    const beforeCount = useTimingStore.getState().signals.length;

    const addBtn = screen.getByRole("button", { name: /add signal/i });
    fireEvent.click(addBtn);

    const state = useTimingStore.getState();
    expect(state.signalBuilderOpen).toBe(false);
    expect(state.signals.length).toBe(beforeCount + 1);

    const added = state.signals[state.signals.length - 1];
    expect(added.type).toBe("CLOCK");
    expect(added.name.length).toBeGreaterThan(0);
    expect(added.color).toBeDefined();
  });

  it("Esc closes without dispatching", () => {
    render(<SignalBuilder />);
    openBuilder();
    const beforeCount = useTimingStore.getState().signals.length;

    fireEvent.keyDown(document, { key: "Escape" });

    expect(useTimingStore.getState().signalBuilderOpen).toBe(false);
    expect(useTimingStore.getState().signals.length).toBe(beforeCount);
  });

  it("Cmd+Enter submits when valid", () => {
    render(<SignalBuilder />);
    openBuilder({ mode: "CLOCK" });
    const beforeCount = useTimingStore.getState().signals.length;

    fireEvent.keyDown(document, { key: "Enter", metaKey: true });

    expect(useTimingStore.getState().signals.length).toBe(beforeCount + 1);
  });
});
