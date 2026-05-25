import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import NumberField from "./NumberField";

describe("NumberField", () => {
  it("displays the current value", () => {
    render(<NumberField label="PHASE" value="50" onChange={vi.fn()} />);
    expect(screen.getByLabelText("PHASE")).toHaveValue(50);
  });

  it("renders suffix when provided", () => {
    render(<NumberField label="PHASE" value="50" onChange={vi.fn()} suffix="ns" />);
    expect(screen.getByText("ns")).toBeInTheDocument();
  });

  it("does not render suffix when omitted", () => {
    const { container } = render(<NumberField label="PHASE" value="50" onChange={vi.fn()} />);
    expect(container.querySelector(".border-l")).not.toBeInTheDocument();
  });

  it("calls onChange when user types", async () => {
    const onChange = vi.fn();
    const { container } = render(<NumberField label="PHASE" value="" onChange={onChange} />);
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    await userEvent.type(input, "42");
    expect(onChange).toHaveBeenCalled();
  });

  it("renders the label text", () => {
    render(<NumberField label="WIDTH" value="8" onChange={vi.fn()} suffix="bits" />);
    expect(screen.getByText("WIDTH")).toBeInTheDocument();
  });
});
