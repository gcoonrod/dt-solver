import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import ToolBtn, { type ToolBtnIcon } from "@/components/ui/ToolBtn";

afterEach(() => {
  cleanup();
});

const ICONS: ToolBtnIcon[] = ["zoom-in", "zoom-out", "maximize"];

describe("<ToolBtn />", () => {
  it.each(ICONS)("renders label and accessible button for icon=%s", (icon) => {
    render(<ToolBtn icon={icon} label={`Action-${icon}`} />);
    const btn = screen.getByRole("button", { name: `Action-${icon}` });
    expect(btn).toBeInTheDocument();
  });

  it("includes the kbd hint in the title attribute when provided", () => {
    render(<ToolBtn icon="zoom-in" label="Zoom In" kbd="⌘+" />);
    const btn = screen.getByRole("button", { name: "Zoom In" });
    expect(btn).toHaveAttribute("title", "Zoom In (⌘+)");
  });

  it("omits the kbd hint from the title attribute when kbd is absent", () => {
    render(<ToolBtn icon="maximize" label="Fit" />);
    const btn = screen.getByRole("button", { name: "Fit" });
    expect(btn).toHaveAttribute("title", "Fit");
  });

  it("fires onClick when the user activates the button", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ToolBtn icon="zoom-out" label="Zoom Out" onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "Zoom Out" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
