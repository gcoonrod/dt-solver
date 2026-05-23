import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import ChannelLabels from "@/components/features/ChannelLabels";
import { formatSignalDisplay } from "@/components/features/signalDisplay";
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

describe("<ChannelLabels />", () => {
  it("renders every seeded signal by its display name", () => {
    render(<ChannelLabels />);
    for (const sig of W65C02S_14MHz.signals) {
      expect(screen.getByText(sig.name)).toBeInTheDocument();
    }
  });

  it("re-renders at least one badge when the cursor moves", () => {
    render(<ChannelLabels />);

    // Pick a signal whose display changes between t=35.7 and t=50 — PHI2 at
    // 14 MHz has period 71.43 ns (HIGH 0..35.71, LOW 35.71..71.43), so 35.7
    // is HIGH ("1") and 50 is LOW ("0").
    const phi2 = W65C02S_14MHz.signals.find((s) => s.id === "phi2")!;
    const before = formatSignalDisplay(phi2, 35.7);
    const after = formatSignalDisplay(phi2, 50);
    expect(before).not.toBe(after); // sanity-check the fixture

    expect(screen.getAllByText(before).length).toBeGreaterThan(0);

    act(() => {
      useTimingStore.getState().setCursor(50);
    });

    expect(screen.getAllByText(after).length).toBeGreaterThan(0);
  });
});
