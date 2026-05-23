import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { formatTime } from "@/components/canvas/WaveformTimeline";
import WaveformToolbar from "@/components/features/WaveformToolbar";
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

beforeEach(() => {
  resetStoreToDemo();
});

afterEach(() => {
  cleanup();
});

describe("<WaveformToolbar />", () => {
  it("renders the cursor readout using the store's current cursorTimeNs", () => {
    render(<WaveformToolbar />);
    expect(
      screen.getByText(`T: ${formatTime(35.7)}`),
    ).toBeInTheDocument();
  });

  it("re-renders the cursor readout when setCursor is dispatched", () => {
    render(<WaveformToolbar />);
    expect(screen.getByText(`T: ${formatTime(35.7)}`)).toBeInTheDocument();

    act(() => {
      useTimingStore.getState().setCursor(50);
    });

    expect(screen.getByText(`T: ${formatTime(50)}`)).toBeInTheDocument();
  });

  it("narrows the viewport when the Zoom In button is clicked", async () => {
    const user = userEvent.setup();
    render(<WaveformToolbar />);
    const w0 = useTimingStore.getState().tMaxNs - useTimingStore.getState().tMinNs;

    await user.click(screen.getByRole("button", { name: "Zoom In" }));

    const w1 = useTimingStore.getState().tMaxNs - useTimingStore.getState().tMinNs;
    expect(w1).toBeLessThan(w0);
  });

  it("restores the default window when the Fit button is clicked", async () => {
    const user = userEvent.setup();
    render(<WaveformToolbar />);
    // Zoom in first so Fit has something to restore.
    await user.click(screen.getByRole("button", { name: "Zoom In" }));

    await user.click(screen.getByRole("button", { name: "Fit" }));

    const { tMinNs, tMaxNs } = useTimingStore.getState();
    expect(tMinNs).toBe(W65C02S_14MHz.defaultWindowNs.tMinNs);
    expect(tMaxNs).toBe(W65C02S_14MHz.defaultWindowNs.tMaxNs);
  });
});
