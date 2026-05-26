import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import ChannelLabels from "@/components/features/ChannelLabels";
import { formatChannelLabelDisplay } from "@/components/features/signalDisplay";
import { useTimingStore } from "@/store/useTimingStore";
import { TEST_STORE_STATE } from "@/test/fixtures";



beforeEach(() => {
  useTimingStore.setState(TEST_STORE_STATE);
});

afterEach(() => {
  cleanup();
});

describe("<ChannelLabels />", () => {
  it("renders every seeded signal by its display name", () => {
    render(<ChannelLabels />);
    const { signals } = useTimingStore.getState().activeProfile;
    for (const sig of signals) {
      expect(screen.getByText(sig.name)).toBeInTheDocument();
    }
  });

  it("re-renders at least one badge when the cursor moves", () => {
    render(<ChannelLabels />);

    // Pick a signal whose display changes between t=35.7 and t=50 — PHI2 at
    // 14 MHz has period 71.43 ns (HIGH 0..35.71, LOW 35.71..71.43), so 35.7
    // is HIGH ("HIGH") and 50 is LOW ("LOW").
    const phi2 = useTimingStore
      .getState()
      .activeProfile.signals.find((s) => s.id === "phi2")!;
    const before = formatChannelLabelDisplay(phi2, 35.7);
    const after = formatChannelLabelDisplay(phi2, 50);
    expect(before).not.toBe(after); // sanity-check the fixture

    expect(screen.getAllByText(before).length).toBeGreaterThan(0);

    act(() => {
      useTimingStore.getState().setCursor(50);
    });

    expect(screen.getAllByText(after).length).toBeGreaterThan(0);
  });
});
