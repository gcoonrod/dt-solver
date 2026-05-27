import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import CornerLabel from "@/components/ui/CornerLabel";

afterEach(() => {
  cleanup();
});

describe("<CornerLabel />", () => {
  it("renders the live/scale text", () => {
    render(<CornerLabel />);
    expect(screen.getByText(/live · 1\.0× \/ div/)).toBeInTheDocument();
  });

  it("renders the emerald status dot", () => {
    render(<CornerLabel />);
    const dot = screen.getByTestId("corner-label-dot");
    expect(dot).toBeInTheDocument();
    expect(dot.className).toContain("bg-emerald-400");
  });
});
