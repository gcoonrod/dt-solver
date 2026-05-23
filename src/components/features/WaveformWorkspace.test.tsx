import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import WaveformWorkspace from "@/components/features/WaveformWorkspace";
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

describe("<WaveformWorkspace />", () => {
  it("composes the toolbar, channel labels, timeline, and corner label", () => {
    const { container } = render(<WaveformWorkspace />);

    // Toolbar — the "Zoom In" button is an unambiguous toolbar signature.
    expect(screen.getByRole("button", { name: "Zoom In" })).toBeInTheDocument();

    // ChannelLabels — every seeded signal name should appear.
    const firstSignalName = W65C02S_14MHz.signals[0].name;
    expect(screen.getByText(firstSignalName)).toBeInTheDocument();

    // WaveformTimeline — renders an SVG.
    expect(container.querySelector("svg")).toBeInTheDocument();

    // CornerLabel — the live/scale pill.
    expect(screen.getByText(/live · 1\.0× \/ div/)).toBeInTheDocument();
  });
});
