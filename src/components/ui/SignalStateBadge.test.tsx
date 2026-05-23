import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import SignalStateBadge from "@/components/ui/SignalStateBadge";

afterEach(() => {
  cleanup();
});

describe("<SignalStateBadge />", () => {
  it("renders the display text", () => {
    render(<SignalStateBadge color="#22d3ee" display="0xA9" />);
    expect(screen.getByText("0xA9")).toBeInTheDocument();
  });

  it("paints the dot with the provided color", () => {
    render(<SignalStateBadge color="#f59e0b" display="1" />);
    const dot = screen.getByTestId("signal-state-badge-dot");
    // jsdom normalizes the hex color to its rgb() equivalent on the inline style.
    expect(dot.style.background).toMatch(/(?:#f59e0b|rgb\(245, 158, 11\))/i);
  });
});
