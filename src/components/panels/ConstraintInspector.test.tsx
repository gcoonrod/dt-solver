import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import ConstraintInspector from "@/components/panels/ConstraintInspector";
import { useTimingStore } from "@/store/useTimingStore";

const INITIAL_STORE_STATE = useTimingStore.getInitialState();

beforeEach(() => {
  useTimingStore.setState(INITIAL_STORE_STATE, true);
});

afterEach(() => {
  cleanup();
});

describe("ConstraintInspector", () => {
  it("renders every seeded constraint by name", () => {
    render(<ConstraintInspector />);
    for (const c of useTimingStore.getState().activeProfile.constraints) {
      expect(screen.getByText(c.name)).toBeInTheDocument();
    }
  });

  it("visibly distinguishes the seeded FAIL constraint (tads) from the PASSes", () => {
    // Pinned by __tests__/data/w65c02s-14mhz.test.ts: exactly one FAIL, id=tads.
    render(<ConstraintInspector />);
    // Header counts: 5 pass, 1 fail (rendered as separate spans).
    expect(screen.getByText("5 pass")).toBeInTheDocument();
    expect(screen.getByText("1 fail")).toBeInTheDocument();
    // Footer summary uses singular form for one violation.
    expect(screen.getByText(/1 constraint violated/i)).toBeInTheDocument();
  });

  it("adds a constraint to the store when New constraint is clicked and re-solves", async () => {
    const user = userEvent.setup();
    const before = useTimingStore.getState();
    render(<ConstraintInspector />);

    await user.click(screen.getByRole("button", { name: /new constraint/i }));

    const after = useTimingStore.getState();
    expect(after.constraints.length).toBe(before.constraints.length + 1);
    // Re-solve cascade: solved tracks constraints 1:1.
    expect(after.solved.length).toBe(after.constraints.length);
  });
});
