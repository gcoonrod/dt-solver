import { describe, it, expect } from "vitest";

import {
  evaluateConstraint,
  generateClockEdges,
  periodNs,
  resolveReference,
  solve,
  stateAt,
} from "@/core/solver";
import type { Constraint } from "@/types/constraint";
import type { ClockSignal, DataSignal } from "@/types/signal";

const PRECISION = 6;

function makeClock(overrides: Partial<ClockSignal> = {}): ClockSignal {
  return {
    id: "clk",
    name: "CLK",
    type: "CLOCK",
    frequencyMHz: 5,
    dutyCycle: 0.5,
    phaseOffsetNs: 0,
    ...overrides,
  };
}

function makeData(overrides: Partial<DataSignal> = {}): DataSignal {
  return {
    id: "dat",
    name: "DAT",
    type: "DATA",
    baseState: "INVALID",
    transitions: [],
    ...overrides,
  };
}

describe("periodNs", () => {
  it("inverts MHz to nanoseconds", () => {
    expect(periodNs(1)).toBeCloseTo(1000, PRECISION);
  });

  it("handles 14 MHz", () => {
    expect(periodNs(14)).toBeCloseTo(71.4285714, PRECISION);
  });
});

describe("generateClockEdges", () => {
  it("emits zero-width intervals when slew is undefined", () => {
    const clk = makeClock({ frequencyMHz: 10 }); // period 100 ns
    const edges = generateClockEdges(clk, 0, 200);
    // Rises at 0, 100, 200; falls at 50, 150. All zero-width.
    expect(edges.length).toBe(5);
    for (const e of edges) {
      expect(e.endNs - e.startNs).toBeCloseTo(0, PRECISION);
      expect(e.midNs).toBeCloseTo((e.startNs + e.endNs) / 2, PRECISION);
    }
  });

  it("widens intervals asymmetrically when riseTimeNs ≠ fallTimeNs", () => {
    const clk = makeClock({ frequencyMHz: 10, riseTimeNs: 2, fallTimeNs: 4 });
    const edges = generateClockEdges(clk, 0, 200);
    const rising = edges.filter((e) => e.direction === "RISING");
    const falling = edges.filter((e) => e.direction === "FALLING");
    expect(rising.length).toBeGreaterThan(0);
    expect(falling.length).toBeGreaterThan(0);
    for (const e of rising) expect(e.endNs - e.startNs).toBeCloseTo(2, PRECISION);
    for (const e of falling) expect(e.endNs - e.startNs).toBeCloseTo(4, PRECISION);
  });

  it("returns edges in chronological order by midNs", () => {
    const clk = makeClock({ frequencyMHz: 10, riseTimeNs: 2, fallTimeNs: 4 });
    const edges = generateClockEdges(clk, 0, 500);
    for (let i = 1; i < edges.length; i++) {
      expect(edges[i].midNs).toBeGreaterThanOrEqual(edges[i - 1].midNs);
    }
  });
});

describe("stateAt", () => {
  it("returns HIGH during the first half of a 50% clock", () => {
    const clk = makeClock({ frequencyMHz: 10 }); // period 100 ns, duty 0.5
    expect(stateAt(clk, 10).state).toBe("HIGH");
    expect(stateAt(clk, 60).state).toBe("LOW");
  });

  it("walks data-signal transitions in order", () => {
    const dat = makeData({
      baseState: "INVALID",
      transitions: [
        { id: "t1", timeNs: 10, newState: "VALID", direction: "TRANSITION", value: "0xAA" },
        { id: "t2", timeNs: 50, newState: "HIGH_Z", direction: "TRANSITION" },
      ],
    });
    expect(stateAt(dat, 5).state).toBe("INVALID");
    expect(stateAt(dat, 20).state).toBe("VALID");
    expect(stateAt(dat, 20).value).toBe("0xAA");
    expect(stateAt(dat, 100).state).toBe("HIGH_Z");
  });
});

describe("resolveReference", () => {
  it("filters clock edges by direction", () => {
    const clk = makeClock({ frequencyMHz: 10 }); // rises at 0,100,200; falls at 50,150
    const rising = resolveReference(
      { signalId: "clk", edgeDirection: "RISING" },
      clk,
      200,
    );
    expect(rising.every((e) => e.direction === "RISING")).toBe(true);
    expect(rising.length).toBe(3);
  });

  it("honors occurrenceIndex", () => {
    const clk = makeClock({ frequencyMHz: 10 });
    const second = resolveReference(
      { signalId: "clk", edgeDirection: "RISING", occurrenceIndex: 1 },
      clk,
      500,
    );
    expect(second.length).toBe(1);
    expect(second[0].midNs).toBeCloseTo(100, PRECISION);
  });
});

describe("evaluateConstraint — SETUP", () => {
  it("uses anchor.startNs and target.endNs for the worst-case window", () => {
    const clk = makeClock({ frequencyMHz: 5, fallTimeNs: 2 }); // fall mid 100
    const dat = makeData({
      riseTimeNs: 4, // TRANSITION dir uses max(rise, fall) = 4
      transitions: [
        { id: "v", timeNs: 90, newState: "VALID", direction: "TRANSITION", value: "0xC0" },
      ],
    });
    const c: Constraint = {
      id: "tSU",
      name: "tSU",
      type: "SETUP",
      anchor: { signalId: "clk", edgeDirection: "FALLING" },
      target: { signalId: "dat", edgeDirection: "TRANSITION" },
      minNs: 8,
    };
    const out = evaluateConstraint(c, [clk, dat], 300);
    // anchor.start = 99, target.end = 92 → margin 7
    expect(out.calculatedMarginNs).toBeCloseTo(7, 2);
    expect(out.status).toBe("FAIL"); // 7 < 8
    expect(out.worstWindow?.anchorTimeNs).toBeCloseTo(99, 2);
    expect(out.worstWindow?.targetTimeNs).toBeCloseTo(92, 2);
  });
});

describe("evaluateConstraint — HOLD", () => {
  it("uses anchor.endNs and target.startNs", () => {
    const clk = makeClock({ frequencyMHz: 5, fallTimeNs: 2 }); // fall mid 100; end 101
    const dat = makeData({
      riseTimeNs: 4,
      fallTimeNs: 4,
      transitions: [
        { id: "v", timeNs: 110, newState: "VALID", direction: "TRANSITION" },
      ],
    });
    const c: Constraint = {
      id: "tH",
      name: "tH",
      type: "HOLD",
      anchor: { signalId: "clk", edgeDirection: "FALLING" },
      target: { signalId: "dat", edgeDirection: "TRANSITION" },
      minNs: 10,
    };
    const out = evaluateConstraint(c, [clk, dat], 300);
    // anchor.end = 101, target.start = 108 → margin 7
    expect(out.calculatedMarginNs).toBeCloseTo(7, 2);
    expect(out.status).toBe("FAIL"); // 7 < 10
    expect(out.worstWindow?.anchorTimeNs).toBeCloseTo(101, 2);
    expect(out.worstWindow?.targetTimeNs).toBeCloseTo(108, 2);
  });
});

describe("evaluateConstraint — PROP_DELAY", () => {
  it("uses anchor.endNs and target.endNs, and the worst case is the LARGEST margin", () => {
    // Clock period 100 ns: rises at 0, 100, 200, ...
    const clk = makeClock({ frequencyMHz: 10, riseTimeNs: 2 });
    const dat = makeData({
      riseTimeNs: 4,
      fallTimeNs: 4,
      transitions: [
        { id: "v", timeNs: 150, newState: "VALID", direction: "TRANSITION" },
      ],
    });
    const c: Constraint = {
      id: "tPD",
      name: "tPD",
      type: "PROP_DELAY",
      anchor: { signalId: "clk", edgeDirection: "RISING" },
      target: { signalId: "dat", edgeDirection: "TRANSITION" },
      maxNs: 100,
    };
    // Anchor 1 (rise mid 0,   end 1):   target end 152 > 1   → margin 151
    // Anchor 2 (rise mid 100, end 101): target end 152 > 101 → margin 51
    // PROP_DELAY worst = MAX margin = 151 → FAIL (> 100)
    const out = evaluateConstraint(c, [clk, dat], 250);
    expect(out.calculatedMarginNs).toBeCloseTo(151, 2);
    expect(out.status).toBe("FAIL");
    expect(out.worstWindow?.anchorTimeNs).toBeCloseTo(1, 2);
    expect(out.worstWindow?.targetTimeNs).toBeCloseTo(152, 2);
  });
});

describe("solve", () => {
  it("maps every constraint to a result", () => {
    const clk = makeClock({ frequencyMHz: 10 });
    const dat = makeData({
      transitions: [
        { id: "v", timeNs: 50, newState: "VALID", direction: "TRANSITION" },
      ],
    });
    const constraints: Constraint[] = [
      {
        id: "a",
        name: "a",
        type: "SETUP",
        anchor: { signalId: "clk", edgeDirection: "FALLING" },
        target: { signalId: "dat", edgeDirection: "TRANSITION" },
        minNs: 1,
      },
      {
        id: "b",
        name: "b",
        type: "HOLD",
        anchor: { signalId: "clk", edgeDirection: "FALLING" },
        target: { signalId: "dat", edgeDirection: "TRANSITION" },
        minNs: 1,
      },
    ];
    const out = solve([clk, dat], constraints, 500);
    expect(out.length).toBe(constraints.length);
    expect(out.map((c) => c.id)).toEqual(["a", "b"]);
  });
});
