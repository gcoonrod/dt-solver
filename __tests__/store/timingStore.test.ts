import { beforeEach, describe, expect, it } from "vitest";

import { W65C02S_14MHz } from "@/data/w65c02s-14mhz";
import { useTimingStore } from "@/store/useTimingStore";
import { TEST_STORE_STATE } from "@/test/fixtures";
import type { Constraint } from "@/types/constraint";
import type { TimingProfile } from "@/types/profile";
import type { AnySignal } from "@/types/signal";

beforeEach(() => {
  useTimingStore.setState(TEST_STORE_STATE);
});

describe("useTimingStore — re-solve cascade", () => {
  it("addConstraint(c) appends a solved entry for c.id", () => {
    const sigs = useTimingStore.getState().signals;
    const clk = sigs.find((s) => s.type === "CLOCK")!;
    const dat = sigs.find((s) => s.type === "BUS")!;
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
      type: "LINE",
      baseState: "LOW",
      transitions: [
        { id: "t1", timeNs: 10, newState: "HIGH", direction: "RISING" },
      ],
    };
    useTimingStore.getState().addSignal(sig);
    expect(useTimingStore.getState().signals.length).toBe(before + 1);
    expect(useTimingStore.getState().signals.some((s) => s.id === "synthetic-sig")).toBe(true);
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

describe("useTimingStore — dirty tracking", () => {
  it("addSignal sets isDirty to true", () => {
    expect(useTimingStore.getState().isDirty).toBe(false);
    const sig: AnySignal = {
      id: "test", name: "test", type: "LINE", baseState: "LOW",
      transitions: [{ id: "t1", timeNs: 10, newState: "HIGH", direction: "RISING" }],
    };
    useTimingStore.getState().addSignal(sig);
    expect(useTimingStore.getState().isDirty).toBe(true);
  });

  it("removeSignal sets isDirty to true", () => {
    useTimingStore.getState().removeSignal("phi2");
    expect(useTimingStore.getState().isDirty).toBe(true);
  });

  it("addConstraint sets isDirty to true", () => {
    const c: Constraint = {
      id: "tc", name: "TC", type: "SETUP",
      anchor: { signalId: "phi2", edgeDirection: "FALLING" },
      target: { signalId: "addr", edgeDirection: "TRANSITION" },
      minNs: 1,
    };
    useTimingStore.getState().addConstraint(c);
    expect(useTimingStore.getState().isDirty).toBe(true);
  });

  it("removeConstraint sets isDirty to true", () => {
    useTimingStore.getState().removeConstraint("tads");
    expect(useTimingStore.getState().isDirty).toBe(true);
  });
});

describe("useTimingStore — viewport math", () => {
  it("zoomAt(50, 0.5) keeps the focal point at the same screen position", () => {
    useTimingStore.setState({ tMinNs: 0, tMaxNs: 100 });
    useTimingStore.getState().zoomAt(50, 0.5);
    const { tMinNs, tMaxNs } = useTimingStore.getState();
    expect(tMinNs).toBeCloseTo(25, 1);
    expect(tMaxNs).toBeCloseTo(75, 1);
    expect((tMinNs + tMaxNs) / 2).toBeCloseTo(50, 1);
  });

  it("zoomAt clamps the span between 5 and 5000 ns", () => {
    useTimingStore.setState({ tMinNs: 0, tMaxNs: 100 });
    useTimingStore.getState().zoomAt(50, 0.001);
    const inAfter = useTimingStore.getState();
    expect(inAfter.tMaxNs - inAfter.tMinNs).toBeCloseTo(5, 1);

    useTimingStore.setState({ tMinNs: 0, tMaxNs: 100 });
    useTimingStore.getState().zoomAt(50, 1000);
    const outAfter = useTimingStore.getState();
    expect(outAfter.tMaxNs - outAfter.tMinNs).toBeCloseTo(5000, 1);
  });

  it("fitView() resets the viewport to the profile's defaultWindowNs", () => {
    useTimingStore.setState({ tMinNs: 999, tMaxNs: 2000 });
    useTimingStore.getState().fitView();
    const { tMinNs, tMaxNs } = useTimingStore.getState();
    expect(tMinNs).toBe(0);
    expect(tMaxNs).toBe(150);
  });

  it("fitView() honors the current activeProfile after a swap", () => {
    const p2: TimingProfile = {
      id: "alt", name: "Alt", description: "",
      signals: [], constraints: [],
      defaultWindowNs: { tMinNs: 50, tMaxNs: 500 },
    };
    useTimingStore.getState().setActiveProfile(p2);
    useTimingStore.setState({ tMinNs: 0, tMaxNs: 999 });
    useTimingStore.getState().fitView();
    const { tMinNs, tMaxNs } = useTimingStore.getState();
    expect(tMinNs).toBe(50);
    expect(tMaxNs).toBe(500);
  });
});

describe("useTimingStore — activeProfile", () => {
  it("TEST_STORE_STATE loads W65C02S_14MHz", () => {
    expect(useTimingStore.getState().activeProfile).toBe(W65C02S_14MHz);
  });

  it("setActiveProfile(p) swaps signals, constraints, viewport, and re-solves", () => {
    const altClock: AnySignal = {
      id: "clk2", type: "CLOCK", name: "CLK2",
      frequencyMHz: 1, dutyCycle: 0.5, phaseOffsetNs: 0,
    };
    const altData: AnySignal = {
      id: "d2", type: "LINE", name: "D2", baseState: "LOW",
      transitions: [{ id: "d2-1", timeNs: 100, newState: "HIGH", direction: "RISING" }],
    };
    const altConstraint: Constraint = {
      id: "alt-c", name: "Alt C", type: "SETUP",
      anchor: { signalId: "clk2", edgeDirection: "FALLING" },
      target: { signalId: "d2", edgeDirection: "TRANSITION" },
      minNs: 5,
    };
    const p2: TimingProfile = {
      id: "alt", name: "Alt Profile", description: "alternate",
      signals: [altClock, altData], constraints: [altConstraint],
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
    expect(s.solved).not.toBe(prevSolved);
    expect(s.solved.length).toBe(1);
    expect(s.solved[0].id).toBe("alt-c");
  });

  it("setActiveProfile leaves cursor/hover/selection untouched", () => {
    useTimingStore.setState({
      cursorTimeNs: 42, hoveredConstraintId: "tads", selectedSignalId: "phi2",
    });
    const p2: TimingProfile = {
      id: "alt", name: "Alt", description: "",
      signals: [], constraints: [],
      defaultWindowNs: { tMinNs: 0, tMaxNs: 10 },
    };
    useTimingStore.getState().setActiveProfile(p2);
    const s = useTimingStore.getState();
    expect(s.cursorTimeNs).toBe(42);
    expect(s.hoveredConstraintId).toBe("tads");
    expect(s.selectedSignalId).toBe("phi2");
  });
});

describe("useTimingStore — signal builder modal lifecycle", () => {
  it("openSignalBuilder() with no argument opens with signalBuilderInitial=null", () => {
    useTimingStore.getState().openSignalBuilder();
    const s = useTimingStore.getState();
    expect(s.signalBuilderOpen).toBe(true);
    expect(s.signalBuilderInitial).toBeNull();
  });

  it("openSignalBuilder({ mode: 'CLOCK' }) seeds with the mode hint", () => {
    useTimingStore.getState().openSignalBuilder({ mode: "CLOCK" });
    expect(useTimingStore.getState().signalBuilderInitial).toEqual({ mode: "CLOCK" });
  });

  it("closeSignalBuilder() resets both keys", () => {
    useTimingStore.getState().openSignalBuilder({ mode: "BUS" });
    useTimingStore.getState().closeSignalBuilder();
    const s = useTimingStore.getState();
    expect(s.signalBuilderOpen).toBe(false);
    expect(s.signalBuilderInitial).toBeNull();
  });

  it("open then close does not mutate signals, constraints, or solved", () => {
    const before = useTimingStore.getState();
    const sigsRef = before.signals;
    const consRef = before.constraints;
    const solvedRef = before.solved;
    useTimingStore.getState().openSignalBuilder();
    useTimingStore.getState().closeSignalBuilder();
    const after = useTimingStore.getState();
    expect(after.signals).toBe(sigsRef);
    expect(after.constraints).toBe(consRef);
    expect(after.solved).toBe(solvedRef);
  });
});

describe("useTimingStore — constraint builder modal lifecycle", () => {
  it("openBuilder() with no argument opens the modal with a null seed", () => {
    useTimingStore.getState().openBuilder();
    const s = useTimingStore.getState();
    expect(s.builderOpen).toBe(true);
    expect(s.builderInitial).toBeNull();
  });

  it("closeBuilder() resets both keys to their initial values", () => {
    useTimingStore.getState().openBuilder();
    useTimingStore.getState().closeBuilder();
    const s = useTimingStore.getState();
    expect(s.builderOpen).toBe(false);
    expect(s.builderInitial).toBeNull();
  });

  it("open then close does not mutate signals, constraints, or solved", () => {
    const sigsRef = useTimingStore.getState().signals;
    const consRef = useTimingStore.getState().constraints;
    const solvedRef = useTimingStore.getState().solved;
    useTimingStore.getState().openBuilder();
    useTimingStore.getState().closeBuilder();
    const after = useTimingStore.getState();
    expect(after.signals).toBe(sigsRef);
    expect(after.constraints).toBe(consRef);
    expect(after.solved).toBe(solvedRef);
  });
});

describe("useTimingStore — initial empty state", () => {
  it("starts with profileId null and isLoading true", () => {
    useTimingStore.setState(useTimingStore.getInitialState(), true);
    const s = useTimingStore.getState();
    expect(s.profileId).toBeNull();
    expect(s.isLoading).toBe(true);
    expect(s.isDirty).toBe(false);
    expect(s.signals).toHaveLength(0);
  });
});

describe("useTimingStore — importSignalFromIC", () => {
  it("creates a signal with a fresh id and provenance", () => {
    const template = {
      templateId: "phi2",
      id: "phi2",
      type: "CLOCK" as const,
      name: "PHI2",
      frequencyMHz: 14,
      dutyCycle: 0.5,
      phaseOffsetNs: 0,
    };
    const before = useTimingStore.getState().signals.length;
    useTimingStore.getState().importSignalFromIC("w65c02s", "phi2", template);
    const after = useTimingStore.getState();
    expect(after.signals.length).toBe(before + 1);

    const imported = after.signals[after.signals.length - 1];
    expect(imported.id).not.toBe("phi2");
    expect(imported.name).toBe("PHI2");
    expect(imported.provenance).toBeDefined();
    expect(imported.provenance!.icId).toBe("w65c02s");
    expect(imported.provenance!.templateId).toBe("phi2");
    expect(imported.provenance!.importedAt).toBeTruthy();
  });

  it("sets isDirty to true", () => {
    useTimingStore.setState({ isDirty: false });
    const template = {
      templateId: "test",
      id: "test",
      type: "LINE" as const,
      name: "Test",
      baseState: "LOW" as const,
      transitions: [],
    };
    useTimingStore.getState().importSignalFromIC("ic1", "test", template);
    expect(useTimingStore.getState().isDirty).toBe(true);
  });
});
