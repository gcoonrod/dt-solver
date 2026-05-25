import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import ConstraintBuilder from "@/components/features/ConstraintBuilder";
import { useTimingStore } from "@/store/useTimingStore";

const INITIAL_STORE_STATE = useTimingStore.getInitialState();

beforeEach(() => {
  useTimingStore.setState(INITIAL_STORE_STATE, true);
});

afterEach(() => {
  cleanup();
});

function openBuilder() {
  act(() => {
    useTimingStore.getState().openBuilder();
  });
}

describe("<ConstraintBuilder />", () => {
  it("does not render when builderOpen is false", () => {
    render(<ConstraintBuilder />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the modal when openBuilder is dispatched", () => {
    render(<ConstraintBuilder />);
    openBuilder();
    expect(screen.getByRole("dialog", { name: /constraint builder/i })).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/constraint name/i) as HTMLInputElement;
    expect(nameInput.value.length).toBeGreaterThan(0);
  });

  it("type chip selection updates the inequality hint", async () => {
    const user = userEvent.setup();
    render(<ConstraintBuilder />);
    openBuilder();

    await user.click(screen.getByRole("button", { name: /prop delay/i }));
    // The inequality is rendered in both the bounds row and the preview header.
    expect(screen.getAllByText("Δ ≤ tPD,max").length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole("button", { name: /^tSU.*setup/i }));
    expect(screen.getAllByText("Δ ≥ tSU,min").length).toBeGreaterThanOrEqual(1);
  });

  it("MIN_PULSE collapses target to same signal and disables the target picker", async () => {
    const user = userEvent.setup();
    render(<ConstraintBuilder />);
    openBuilder();

    const anchorSelectBefore = screen.getByRole("combobox", { name: /^anchor signal/i }) as HTMLSelectElement;
    const anchorId = anchorSelectBefore.value;

    await user.click(screen.getByRole("button", { name: /min pulse/i }));

    const targetSelect = screen.getByRole("combobox", { name: /^target/i }) as HTMLSelectElement;
    expect(targetSelect).toBeDisabled();
    expect(targetSelect.value).toBe(anchorId);

    // Change anchor — target should follow.
    const anchorSelectAfter = screen.getByRole("combobox", { name: /^anchor signal/i }) as HTMLSelectElement;
    const otherClock = within(anchorSelectAfter).getAllByRole("option")
      .find((o) => (o as HTMLOptionElement).value !== anchorId);
    if (otherClock) {
      await user.selectOptions(anchorSelectAfter, (otherClock as HTMLOptionElement).value);
      const targetAfter = screen.getByRole("combobox", { name: /^target/i }) as HTMLSelectElement;
      expect(targetAfter.value).toBe((otherClock as HTMLOptionElement).value);
    }
  });

  it("live preview reports PASS for a permissive bound", () => {
    render(<ConstraintBuilder />);
    openBuilder();

    // Defaults: SETUP, anchor = PHI2 FALLING, target = ADDR TRANSITION, min = 20.
    // Drop min to 1 so it's well below the calculated margin → PASS.
    const minInput = screen.getByLabelText(/tSU min bound \(ns\)/i) as HTMLInputElement;
    fireEvent.change(minInput, { target: { value: "1" } });

    expect(screen.getByText(/live · pass/i)).toBeInTheDocument();
    // Slack metric in the footer should be a positive value.
    const slackValue = screen.getByText("slack").parentElement!.querySelector("span:last-child")!;
    expect(slackValue.textContent).toMatch(/^\+/);
  });

  it("live preview reports FAIL when bound is bumped past the calculated margin", () => {
    render(<ConstraintBuilder />);
    openBuilder();

    const minInput = screen.getByLabelText(/tSU min bound \(ns\)/i) as HTMLInputElement;
    fireEvent.change(minInput, { target: { value: "200" } });

    expect(screen.getByText(/live · fail/i)).toBeInTheDocument();
  });

  it("submit dispatches addConstraint and closes the modal", async () => {
    const user = userEvent.setup();
    render(<ConstraintBuilder />);
    openBuilder();

    const before = useTimingStore.getState().constraints.length;
    const nameInput = screen.getByLabelText(/constraint name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "MyCustom" } });

    await user.click(screen.getByRole("button", { name: /^add constraint$/i }));

    const s = useTimingStore.getState();
    expect(s.builderOpen).toBe(false);
    expect(s.constraints.length).toBe(before + 1);
    const added = s.constraints[s.constraints.length - 1];
    expect(added.name).toBe("MyCustom");
    expect(added.type).toBe("SETUP");
    expect(added.anchor.signalId).toBe("phi2");
    expect(added.target.signalId).toBe("addr");
    expect(added.minNs).toBe(20);
  });

  it("Esc closes the modal without dispatching addConstraint", () => {
    render(<ConstraintBuilder />);
    openBuilder();

    const before = useTimingStore.getState().constraints.length;
    fireEvent.keyDown(document, { key: "Escape" });

    const s = useTimingStore.getState();
    expect(s.builderOpen).toBe(false);
    expect(s.constraints.length).toBe(before);
  });

  it("Cmd+Enter submits when valid", () => {
    render(<ConstraintBuilder />);
    openBuilder();

    const before = useTimingStore.getState().constraints.length;
    fireEvent.keyDown(document, { key: "Enter", metaKey: true });

    const s = useTimingStore.getState();
    expect(s.builderOpen).toBe(false);
    expect(s.constraints.length).toBe(before + 1);
  });
});
