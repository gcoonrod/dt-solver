import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ColorDotPicker from "./ColorDotPicker";

const PALETTE = ["#22d3ee", "#f59e0b", "#a78bfa"];

describe("ColorDotPicker", () => {
  it("renders one button per palette color", () => {
    const { container } = render(<ColorDotPicker value="#22d3ee" onChange={vi.fn()} palette={PALETTE} />);
    expect(container.querySelectorAll("button")).toHaveLength(3);
  });

  it("marks the active color with aria-pressed true", () => {
    const { container } = render(<ColorDotPicker value="#f59e0b" onChange={vi.fn()} palette={PALETTE} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange when a dot is clicked", async () => {
    const onChange = vi.fn();
    const { container } = render(<ColorDotPicker value="#22d3ee" onChange={onChange} palette={PALETTE} />);
    const buttons = container.querySelectorAll("button");
    await userEvent.click(buttons[2]);
    expect(onChange).toHaveBeenCalledWith("#a78bfa");
  });

  it("dims used colors that are not active", () => {
    const usedColors = new Set(["#f59e0b"]);
    const { container } = render(<ColorDotPicker value="#22d3ee" onChange={vi.fn()} palette={PALETTE} usedColors={usedColors} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons[1].className).toContain("opacity-40");
  });

  it("does not dim the active color even if used", () => {
    const usedColors = new Set(["#22d3ee"]);
    const { container } = render(<ColorDotPicker value="#22d3ee" onChange={vi.fn()} palette={PALETTE} usedColors={usedColors} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons[0].className).not.toContain("opacity-40");
  });
});
