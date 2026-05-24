import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import ComponentLibrary from "@/components/panels/ComponentLibrary";
import { useTimingStore } from "@/store/useTimingStore";

const INITIAL_STORE_STATE = useTimingStore.getInitialState();

beforeEach(() => {
  useTimingStore.setState(INITIAL_STORE_STATE, true);
});

afterEach(() => {
  cleanup();
});

describe("ComponentLibrary", () => {
  it("renders every seeded signal by its display name", () => {
    render(<ComponentLibrary />);
    for (const sig of useTimingStore.getState().activeProfile.signals) {
      expect(screen.getByText(sig.name)).toBeInTheDocument();
    }
  });

  it("shows the profile name and signal count in the header", () => {
    render(<ComponentLibrary />);
    const { name, signals } = useTimingStore.getState().activeProfile;
    expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getByText(String(signals.length))).toBeInTheDocument();
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
