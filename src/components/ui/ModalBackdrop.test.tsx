import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ModalBackdrop from "./ModalBackdrop";

describe("ModalBackdrop", () => {
  it("renders with correct ARIA attributes", () => {
    render(
      <ModalBackdrop onClose={vi.fn()} ariaLabel="Test dialog">
        <div>content</div>
      </ModalBackdrop>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Test dialog");
  });

  it("invokes onClose when clicking the backdrop", async () => {
    const onClose = vi.fn();
    render(
      <ModalBackdrop onClose={onClose} ariaLabel="Test">
        <div>content</div>
      </ModalBackdrop>,
    );
    const dialog = screen.getByLabelText("Test");
    await userEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not invoke onClose when clicking child content", async () => {
    const onClose = vi.fn();
    render(
      <ModalBackdrop onClose={onClose} ariaLabel="Test">
        <button>inner</button>
      </ModalBackdrop>,
    );
    await userEvent.click(screen.getByRole("button", { name: "inner" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders children", () => {
    render(
      <ModalBackdrop onClose={vi.fn()}>
        <span data-testid="child">hello</span>
      </ModalBackdrop>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
