import { beforeEach, describe, expect, it } from "vitest";

import { W65C02S_14MHz } from "@/data/w65c02s-14mhz";
import { useTimingStore } from "@/store/useTimingStore";
import type { Constraint } from "@/types/constraint";
import type { TimingProfile } from "@/types/profile";
import type { AnySignal } from "@/types/signal";

// Snapshot the module-scope singleton's initial state at import time.
// Actions only ever produce new arrays (via spread), so this reference stays clean.
const INITIAL = {
  activeProfile: useTimingStore.getState().activeProfile,
  signals: useTimingStore.getState().signals,
  constraints: useTimingStore.getState().constraints,
  solved: useTimingStore.getState().solved,
  tMinNs: useTimingStore.getState().tMinNs,
  tMaxNs: useTimingStore.getState().tMaxNs,
  cursorTimeNs: useTimingStore.getState().cursorTimeNs,
  hoveredConstraintId: useTimingStore.getState().hoveredConstraintId,
  selectedSignalId: useTimingStore.getState().selectedSignalId,
  builderOpen: useTimingStore.getState().builderOpen,
  builderInitial: useTimingStore.getState().builderInitial,
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

  it("fitView() honors the current activeProfile after a swap", () => {
    // Regression: fitView used to close over the module-scope bootstrap
    // constant and snap to the seed window even after setActiveProfile.
    const p2: TimingProfile = {
      id: "alt",
      name: "Alt",
      description: "",
      signals: [],
      constraints: [],
      defaultWindowNs: { tMinNs: 50, tMaxNs: 500 },
    };
    useTimingStore.getState().setActiveProfile(p2);
    // Move the viewport away from p2's defaults so fitView has work to do.
    useTimingStore.setState({ tMinNs: 0, tMaxNs: 999 });

    useTimingStore.getState().fitView();

    const { tMinNs, tMaxNs } = useTimingStore.getState();
    expect(tMinNs).toBe(50);
    expect(tMaxNs).toBe(500);
  });
});

describe("useTimingStore — activeProfile", () => {
  it("bootstraps activeProfile to W65C02S_14MHz", () => {
    // Fresh state via the snapshot; activeProfile is the seed by reference.
    expect(useTimingStore.getState().activeProfile).toBe(W65C02S_14MHz);
  });

  it("setActiveProfile(p) swaps signals, constraints, viewport, and re-solves", () => {
    const altClock: AnySignal = {
      id: "clk2",
      type: "CLOCK",
      name: "CLK2",
      frequencyMHz: 1,
      dutyCycle: 0.5,
      phaseOffsetNs: 0,
    };
    const altData: AnySignal = {
      id: "d2",
      type: "DATA",
      name: "D2",
      baseState: "LOW",
      transitions: [
        { id: "d2-1", timeNs: 100, newState: "HIGH", direction: "RISING" },
      ],
    };
    const altConstraint: Constraint = {
      id: "alt-c",
      name: "Alt C",
      type: "SETUP",
      anchor: { signalId: "clk2", edgeDirection: "FALLING" },
      target: { signalId: "d2", edgeDirection: "TRANSITION" },
      minNs: 5,
    };
    const p2: TimingProfile = {
      id: "alt",
      name: "Alt Profile",
      description: "alternate",
      signals: [altClock, altData],
      constraints: [altConstraint],
      defaultWindowNs: { tMinNs: 0, tMaxNs: 999 },
    };

    const prevSolved = useTimingStore.getState().solved;
    useTimingStore.getState().setActiveProfile(p2);

    const s = useTimingStore.getState();
    expect(s.activeProfile).toBe(p2);
    expect(s.signals).toBe(p2.signals);
    expect(s.constraints).toBe(p2.constraints);
    expect(s.tMinNs).toBe(0);
    expect(s.tMaxNs).toBe(999);
    // Re-solve produces a fresh array, one result per new constraint.
    expect(s.solved).not.toBe(prevSolved);
    expect(s.solved.length).toBe(1);
    expect(s.solved[0].id).toBe("alt-c");
  });

  it("setActiveProfile leaves cursor/hover/selection untouched", () => {
    useTimingStore.setState({
      cursorTimeNs: 42,
      hoveredConstraintId: "tads",
      selectedSignalId: "phi2",
    });

    const p2: TimingProfile = {
      id: "alt",
      name: "Alt",
      description: "",
      signals: [],
      constraints: [],
      defaultWindowNs: { tMinNs: 0, tMaxNs: 10 },
    };
    useTimingStore.getState().setActiveProfile(p2);

    const s = useTimingStore.getState();
    expect(s.cursorTimeNs).toBe(42);
    expect(s.hoveredConstraintId).toBe("tads");
    expect(s.selectedSignalId).toBe("phi2");
  });
});

describe("useTimingStore — constraint builder modal lifecycle", () => {
  it("bootstraps with builderOpen=false and builderInitial=null", () => {
    expect(useTimingStore.getState().builderOpen).toBe(false);
    expect(useTimingStore.getState().builderInitial).toBeNull();
  });

  it("openBuilder() with no argument opens the modal with a null seed", () => {
    useTimingStore.getState().openBuilder();
    const s = useTimingStore.getState();
    expect(s.builderOpen).toBe(true);
    expect(s.builderInitial).toBeNull();
  });

  it("openBuilder(c) seeds builderInitial with the passed constraint", () => {
    const seed: Constraint = {
      id: "seed-1",
      name: "Seed",
      type: "SETUP",
      anchor: { signalId: "phi2", edgeDirection: "FALLING" },
      target: { signalId: "addr", edgeDirection: "TRANSITION" },
      minNs: 12,
    };
    useTimingStore.getState().openBuilder(seed);
    const s = useTimingStore.getState();
    expect(s.builderOpen).toBe(true);
    expect(s.builderInitial).toBe(seed);
  });

  it("closeBuilder() resets both keys to their initial values", () => {
    const seed: Constraint = {
      id: "seed-2",
      name: "Seed",
      type: "HOLD",
      anchor: { signalId: "phi2", edgeDirection: "RISING" },
      target: { signalId: "addr", edgeDirection: "TRANSITION" },
      minNs: 3,
    };
    useTimingStore.getState().openBuilder(seed);
    useTimingStore.getState().closeBuilder();
    const s = useTimingStore.getState();
    expect(s.builderOpen).toBe(false);
    expect(s.builderInitial).toBeNull();
  });

  it("open then close does not mutate signals, constraints, or solved", () => {
    const before = useTimingStore.getState();
    const sigsRef = before.signals;
    const consRef = before.constraints;
    const solvedRef = before.solved;
    useTimingStore.getState().openBuilder();
    useTimingStore.getState().closeBuilder();
    const after = useTimingStore.getState();
    expect(after.signals).toBe(sigsRef);
    expect(after.constraints).toBe(consRef);
    expect(after.solved).toBe(solvedRef);
  });
});

