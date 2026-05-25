import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import TypeChipSelector from "./TypeChipSelector";

interface TestType {
  id: string;
  label: string;
  blurb: string;
}

const TYPES: TestType[] = [
  { id: "A", label: "Alpha", blurb: "First type" },
  { id: "B", label: "Beta", blurb: "Second type" },
  { id: "C", label: "Gamma", blurb: "Third type" },
];

describe("TypeChipSelector", () => {
  const defaultProps = {
    types: TYPES,
    value: "A",
    onChange: vi.fn(),
    getId: (t: TestType) => t.id,
    getLabel: (t: TestType) => t.label,
    getBlurb: (t: TestType) => t.blurb,
  };

  it("renders one button per type", () => {
    const { container } = render(<TypeChipSelector {...defaultProps} />);
    expect(container.querySelectorAll("button")).toHaveLength(3);
  });

  it("highlights the active chip", () => {
    const { container } = render(<TypeChipSelector {...defaultProps} value="B" />);
    const buttons = container.querySelectorAll("button");
    expect(buttons[1].className).toContain("border-current");
    expect(buttons[0].className).not.toContain("border-current");
  });

  it("calls onChange when clicking an inactive chip", async () => {
    const onChange = vi.fn();
    const { container } = render(<TypeChipSelector {...defaultProps} onChange={onChange} value="A" />);
    const buttons = container.querySelectorAll("button");
    await userEvent.click(buttons[1]);
    expect(onChange).toHaveBeenCalledWith("B");
  });

  it("renders symbol when getSymbol is provided", () => {
    render(
      <TypeChipSelector
        {...defaultProps}
        getSymbol={(t: TestType) => `[${t.id}]`}
      />,
    );
    expect(screen.getByText("[A]")).toBeInTheDocument();
  });
});
