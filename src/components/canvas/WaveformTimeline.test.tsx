import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import WaveformTimeline, { formatTime } from "@/components/canvas/WaveformTimeline";
import { W65C02S_14MHz } from "@/data/w65c02s-14mhz";
import { solve } from "@/core/solver";
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

describe("WaveformTimeline", () => {
  it("renders an SVG without throwing and shows seed-derived time-axis labels", () => {
    const { container } = render(<WaveformTimeline />);
    // SVG canvas is present.
    expect(container.querySelector("svg")).toBeInTheDocument();
    // Seeded viewport is [0, 150] ns — major ticks land on whole-number ns
    // values formatted by formatTime, so "0 ns" is always rendered.
    expect(screen.getByText("0 ns")).toBeInTheDocument();
  });

  it("renders at least one seeded bus value from the demo profile", () => {
    render(<WaveformTimeline />);
    // The DATA[7:0] signal in the canonical profile has a transition with
    // value "0xA9" at 22 ns — wide enough to clear the in-component label
    // threshold (w > 28 px) at the default viewport.
    expect(screen.getByText("0xA9")).toBeInTheDocument();
  });
});

describe("formatTime", () => {
  it.each([
    [0, "0 ns"],
    [0.0004, "0 ns"],
    [5000, "5.00 µs"],
    [-5000, "-5.00 µs"],
    [50, "50 ns"],
    [10, "10 ns"],
    [5, "5.0 ns"],
    [1, "1.0 ns"],
    [0.5, "500 ps"],
  ])("formatTime(%p) === %p", (input, expected) => {
    expect(formatTime(input)).toBe(expected);
  });

  it("handles negative magnitudes with a leading minus sign", () => {
    const out = formatTime(-50);
    expect(out.startsWith("-")).toBe(true);
    expect(out).toBe("-50 ns");
  });
});
