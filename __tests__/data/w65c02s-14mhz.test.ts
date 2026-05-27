import { describe, expect, it } from "vitest";

import { solve } from "@/core/solver";
import {
  W65C02S_14MHz_constraints,
  W65C02S_14MHz_signals,
} from "@/data/w65c02s-14mhz";

// This file pins the *story* of the W65C02S demo scene: which constraints fail.
// Exact margins are tested in __tests__/core/solver.test.ts with constructed
// inputs — so a legitimate solver retune that changes margins by a fraction of
// a nanosecond does not flip this canary. What this test catches is:
//   - someone edits the profile data and accidentally makes an extra constraint
//     fail (or makes the failing one pass)
//   - someone changes solver semantics in a way that silently flips PASS/FAIL
//     for one of the W65C02S constraints
describe("W65C02S @ 14 MHz demo profile", () => {
  const solved = solve(W65C02S_14MHz_signals, W65C02S_14MHz_constraints, 1000);

  it("produces exactly one FAIL constraint", () => {
    const failing = solved.filter((c) => c.status === "FAIL");
    expect(failing.length).toBe(1);
  });

  it("identifies tADS (Address Setup) as the failure case", () => {
    const failing = solved.find((c) => c.status === "FAIL");
    expect(failing?.id).toBe("tads");
  });

  it("PASSes the other five constraints", () => {
    const passing = solved.filter((c) => c.status === "PASS");
    expect(passing.length).toBe(5);
    // No constraint is left UNRESOLVED — every entry is accounted for.
    expect(solved.length).toBe(passing.length + 1);
  });
});
