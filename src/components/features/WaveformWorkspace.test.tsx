import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import WaveformWorkspace from "@/components/features/WaveformWorkspace";
import { useTimingStore } from "@/store/useTimingStore";

const INITIAL_STORE_STATE = useTimingStore.getInitialState();

beforeEach(() => {
  useTimingStore.setState(INITIAL_STORE_STATE, true);
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
    const firstSignalName =
      useTimingStore.getState().activeProfile.signals[0].name;
    expect(screen.getByText(firstSignalName)).toBeInTheDocument();

    // WaveformTimeline — renders an SVG.
    expect(container.querySelector("svg")).toBeInTheDocument();

    // CornerLabel — the live/scale pill.
    expect(screen.getByText(/live · 1\.0× \/ div/)).toBeInTheDocument();
  });
});
