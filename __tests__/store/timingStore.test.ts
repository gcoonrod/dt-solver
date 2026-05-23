import { beforeEach, describe, expect, it } from "vitest";

import { useTimingStore } from "@/store/useTimingStore";
import type { Constraint } from "@/types/constraint";
import type { AnySignal } from "@/types/signal";

// Snapshot the module-scope singleton's initial state at import time.
// Actions only ever produce new arrays (via spread), so this reference stays clean.
const INITIAL = {
  signals: useTimingStore.getState().signals,
  constraints: useTimingStore.getState().constraints,
  solved: useTimingStore.getState().solved,
  tMinNs: useTimingStore.getState().tMinNs,
  tMaxNs: useTimingStore.getState().tMaxNs,
  cursorTimeNs: useTimingStore.getState().cursorTimeNs,
  hoveredConstraintId: useTimingStore.getState().hoveredConstraintId,
  selectedSignalId: useTimingStore.getState().selectedSignalId,
};

beforeEach(() => {
  useTimingStore.setState(INITIAL);
});

describe("useTimingStore — re-solve cascade", () => {
  it("addConstraint(c) appends a solved entry for c.id", () => {
    const sigs = useTimingStore.getState().signals;
    const clk = sigs.find((s) => s.type === "CLOCK")!;
    const dat = sigs.find((s) => s.type === "DATA")!;
    const c: Constraint = {
      id: "test-c",
      name: "Test C",
      type: "SETUP",
      anchor: { signalId: clk.id, edgeDirection: "FALLING" },
      target: { signalId: dat.id, edgeDirection: "TRANSITION" },
      minNs: 1,
    };
    useTimingStore.getState().addConstraint(c);
    const solvedIds = useTimingStore.getState().solved.map((s) => s.id);
    expect(solvedIds).toContain("test-c");
  });

  it("addSignal(sig) re-solves with the new signal in scope", () => {
    const before = useTimingStore.getState().signals.length;
    const sig: AnySignal = {
      id: "synthetic-sig",
      name: "synthetic",
      type: "DATA",
      baseState: "LOW",
      transitions: [
        { id: "t1", timeNs: 10, newState: "HIGH", direction: "RISING" },
      ],
    };
    useTimingStore.getState().addSignal(sig);
    expect(useTimingStore.getState().signals.length).toBe(before + 1);
    expect(useTimingStore.getState().signals.some((s) => s.id === "synthetic-sig")).toBe(true);
    // Re-solve produces one result per constraint.
    expect(useTimingStore.getState().solved.length).toBe(
      useTimingStore.getState().constraints.length,
    );
  });

  it("removeSignal(id) prunes constraints that reference it and re-solves", () => {
    const before = useTimingStore.getState();
    const targetId = "phi2";
    expect(before.signals.some((s) => s.id === targetId)).toBe(true);
    const constraintsTouchingPhi2 = before.constraints.filter(
      (c) => c.anchor.signalId === targetId || c.target.signalId === targetId,
    );
    expect(constraintsTouchingPhi2.length).toBeGreaterThan(0);

    useTimingStore.getState().removeSignal(targetId);

    const after = useTimingStore.getState();
    expect(after.signals.some((s) => s.id === targetId)).toBe(false);
    for (const c of after.constraints) {
      expect(c.anchor.signalId).not.toBe(targetId);
      expect(c.target.signalId).not.toBe(targetId);
    }
    expect(after.solved.length).toBe(after.constraints.length);
  });
});

describe("useTimingStore — viewport math", () => {
  it("zoomAt(50, 0.5) keeps the focal point at the same screen position", () => {
    // From [0, 100], focal at the midpoint (50). Halve the span (0.5 factor).
    // New span = 50; focal ratio = 0.5 ⇒ newMin = 50 - 0.5*50 = 25, newMax = 75.
    useTimingStore.setState({ tMinNs: 0, tMaxNs: 100 });
    useTimingStore.getState().zoomAt(50, 0.5);
    const { tMinNs, tMaxNs } = useTimingStore.getState();
    expect(tMinNs).toBeCloseTo(25, 1);
    expect(tMaxNs).toBeCloseTo(75, 1);
    // Focal point preserved at the same fraction of the viewport (here 0.5).
    expect((tMinNs + tMaxNs) / 2).toBeCloseTo(50, 1);
  });

  it("zoomAt clamps the span between 5 and 5000 ns", () => {
    useTimingStore.setState({ tMinNs: 0, tMaxNs: 100 });
    // Try to zoom in 1000x — span should clamp to 5.
    useTimingStore.getState().zoomAt(50, 0.001);
    const inAfter = useTimingStore.getState();
    expect(inAfter.tMaxNs - inAfter.tMinNs).toBeCloseTo(5, 1);

    useTimingStore.setState({ tMinNs: 0, tMaxNs: 100 });
    // Try to zoom out 1000x — span should clamp to 5000.
    useTimingStore.getState().zoomAt(50, 1000);
    const outAfter = useTimingStore.getState();
    expect(outAfter.tMaxNs - outAfter.tMinNs).toBeCloseTo(5000, 1);
  });

  it("fitView() resets the viewport to the profile's defaultWindowNs", () => {
    useTimingStore.setState({ tMinNs: 999, tMaxNs: 2000 });
    useTimingStore.getState().fitView();
    const { tMinNs, tMaxNs } = useTimingStore.getState();
    // W65C02S_14MHz.defaultWindowNs = { tMinNs: 0, tMaxNs: 150 }
    expect(tMinNs).toBe(0);
    expect(tMaxNs).toBe(150);
  });
});
