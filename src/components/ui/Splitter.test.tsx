import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Splitter from "@/components/ui/Splitter";

afterEach(() => {
  cleanup();
});

describe("<Splitter />", () => {
  it("renders with the horizontal cursor class for orientation=horizontal", () => {
    render(<Splitter orientation="horizontal" onMouseDown={() => {}} />);
    const bar = screen.getByTestId("splitter");
    expect(bar.className).toContain("cursor-row-resize");
    expect(bar).toHaveAttribute("data-orientation", "horizontal");
  });

  it("renders with the vertical cursor class for orientation=vertical", () => {
    render(<Splitter orientation="vertical" onMouseDown={() => {}} />);
    const bar = screen.getByTestId("splitter");
    expect(bar.className).toContain("cursor-col-resize");
    expect(bar).toHaveAttribute("data-orientation", "vertical");
  });

  it("invokes onMouseDown when the user presses the bar", () => {
    const onMouseDown = vi.fn();
    render(<Splitter orientation="horizontal" onMouseDown={onMouseDown} />);
    fireEvent.mouseDown(screen.getByTestId("splitter"));
    expect(onMouseDown).toHaveBeenCalledTimes(1);
  });
});
