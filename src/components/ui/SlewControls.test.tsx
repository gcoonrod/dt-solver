import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import SlewControls from "./SlewControls";

function getRiseInput(container: HTMLElement) {
  return container.querySelector('input[aria-label="Rise time"]') as HTMLInputElement;
}

function getFallInput(container: HTMLElement) {
  return container.querySelector('input[aria-label="Fall time"]') as HTMLInputElement;
}

function getLinkButton(container: HTMLElement) {
  return container.querySelector('button[aria-label*="slew"]') as HTMLButtonElement;
}

describe("SlewControls", () => {
  const defaultProps = {
    riseTimeNs: "2",
    setRiseTimeNs: vi.fn(),
    fallTimeNs: "2",
    setFallTimeNs: vi.fn(),
    linked: true,
    setLinked: vi.fn(),
  };

  it("renders rise and fall inputs with current values", () => {
    const { container } = render(<SlewControls {...defaultProps} />);
    expect(getRiseInput(container)).toHaveValue(2);
    expect(getFallInput(container)).toHaveValue(2);
  });

  it("syncs fall when rise changes in linked mode", async () => {
    const setRise = vi.fn();
    const setFall = vi.fn();
    const { container } = render(
      <SlewControls {...defaultProps} setRiseTimeNs={setRise} setFallTimeNs={setFall} linked={true} />,
    );
    await userEvent.clear(getRiseInput(container));
    await userEvent.type(getRiseInput(container), "3");
    expect(setRise).toHaveBeenCalled();
    expect(setFall).toHaveBeenCalled();
  });

  it("does not sync fall when rise changes in unlinked mode", async () => {
    const setRise = vi.fn();
    const setFall = vi.fn();
    const { container } = render(
      <SlewControls {...defaultProps} setRiseTimeNs={setRise} setFallTimeNs={setFall} linked={false} />,
    );
    await userEvent.clear(getRiseInput(container));
    await userEvent.type(getRiseInput(container), "3");
    expect(setRise).toHaveBeenCalled();
    expect(setFall).not.toHaveBeenCalled();
  });

  it("toggles linked state when button is clicked", async () => {
    const setLinked = vi.fn();
    const { container } = render(<SlewControls {...defaultProps} setLinked={setLinked} linked={true} />);
    await userEvent.click(getLinkButton(container));
    expect(setLinked).toHaveBeenCalledWith(false);
  });
});
