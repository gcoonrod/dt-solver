import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import KeyboardShortcuts from "./KeyboardShortcuts";

describe("KeyboardShortcuts", () => {
  it("invokes onEsc when Escape is pressed", () => {
    const onEsc = vi.fn();
    render(<KeyboardShortcuts onEsc={onEsc} onSubmit={vi.fn()} />);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onEsc).toHaveBeenCalledTimes(1);
  });

  it("invokes onSubmit when Meta+Enter is pressed", () => {
    const onSubmit = vi.fn();
    render(<KeyboardShortcuts onEsc={vi.fn()} onSubmit={onSubmit} />);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("invokes onSubmit when Ctrl+Enter is pressed", () => {
    const onSubmit = vi.fn();
    render(<KeyboardShortcuts onEsc={vi.fn()} onSubmit={onSubmit} />);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not invoke onSubmit on plain Enter", () => {
    const onSubmit = vi.fn();
    render(<KeyboardShortcuts onEsc={vi.fn()} onSubmit={onSubmit} />);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders nothing visible", () => {
    const { container } = render(<KeyboardShortcuts onEsc={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });
});
