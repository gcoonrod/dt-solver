import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import ComponentLibrary from "@/components/panels/ComponentLibrary";
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

describe("ComponentLibrary", () => {
  it("renders every seeded signal by its display name", () => {
    render(<ComponentLibrary />);
    for (const sig of W65C02S_14MHz.signals) {
      expect(screen.getByText(sig.name)).toBeInTheDocument();
    }
  });

  it("shows the profile name and signal count in the header", () => {
    render(<ComponentLibrary />);
    expect(screen.getByText("W65C02S @ 14 MHz")).toBeInTheDocument();
    expect(
      screen.getByText(String(W65C02S_14MHz.signals.length)),
    ).toBeInTheDocument();
  });

  it("adds a new signal to the store when the Add Signal button is clicked", async () => {
    const user = userEvent.setup();
    const before = useTimingStore.getState().signals.length;
    render(<ComponentLibrary />);

    await user.click(screen.getByRole("button", { name: /add signal/i }));

    const after = useTimingStore.getState();
    expect(after.signals.length).toBe(before + 1);
    // Re-solve cascade fires on every mutation, so the new state must include
    // a solved entry per constraint (count unchanged because adding a signal
    // does not add constraints).
    expect(after.solved.length).toBe(after.constraints.length);
  });
});
