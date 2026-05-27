import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { formatTime } from "@/components/canvas/WaveformTimeline";
import CursorReadout from "@/components/ui/CursorReadout";

afterEach(() => {
  cleanup();
});

describe("<CursorReadout />", () => {
  it("renders the formatted time with the 'T:' prefix", () => {
    render(<CursorReadout timeNs={35.7} />);
    expect(
      screen.getByText(`T: ${formatTime(35.7)}`),
    ).toBeInTheDocument();
  });

  it("renders the 'cursor' label", () => {
    render(<CursorReadout timeNs={0} />);
    expect(screen.getByText(/cursor/i)).toBeInTheDocument();
  });

  it("updates the displayed value when timeNs changes", () => {
    const { rerender } = render(<CursorReadout timeNs={10} />);
    expect(screen.getByText(`T: ${formatTime(10)}`)).toBeInTheDocument();

    rerender(<CursorReadout timeNs={120} />);
    expect(screen.getByText(`T: ${formatTime(120)}`)).toBeInTheDocument();
  });
});
