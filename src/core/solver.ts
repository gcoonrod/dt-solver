// Pure functions. No React, no DOM, no D3, no store. Trivially unit-testable.

import type {
  AnySignal,
  ClockSignal,
  EdgeDirection,
  SignalState,
  TransitionEvent,
} from "@/types/signal";
import type { Constraint, SignalReference } from "@/types/constraint";

/** Compute clock period in nanoseconds from frequency in megahertz. */
export function periodNs(mhz: number): number {
  return 1000 / mhz;
}

export interface ClockEdge {
  timeNs: number;
  direction: EdgeDirection;
}

/**
 * Generate the absolute rising/falling edge timestamps for a clock over a
 * given time window. Edges are returned in chronological order.
 */
export function generateClockEdges(
  clock: ClockSignal,
  tMinNs: number,
  tMaxNs: number,
): ClockEdge[] {
  const T = periodNs(clock.frequencyMHz);
  const phase = clock.phaseOffsetNs || 0;
  const highDur = clock.dutyCycle * T;
  const edges: ClockEdge[] = [];
  // start one cycle before tMin so we don't miss an edge at the boundary
  let k = Math.floor((tMinNs - phase) / T) - 1;
  for (;;) {
    const rise = phase + k * T;
    const fall = rise + highDur;
    if (rise > tMaxNs + T) break;
    if (rise >= tMinNs && rise <= tMaxNs) edges.push({ timeNs: rise, direction: "RISING" });
    if (fall >= tMinNs && fall <= tMaxNs) edges.push({ timeNs: fall, direction: "FALLING" });
    k++;
  }
  return edges.sort((a, b) => a.timeNs - b.timeNs);
}

export interface SignalSample {
  state: SignalState;
  value?: string;
}

/** Compute the state of a signal at a particular instant. */
export function stateAt(signal: AnySignal, timeNs: number): SignalSample {
  if (signal.type === "CLOCK") {
    const T = periodNs(signal.frequencyMHz);
    const phase = signal.phaseOffsetNs || 0;
    const dur = signal.dutyCycle * T;
    const cycleT = ((((timeNs - phase) % T) + T) % T);
    return { state: cycleT < dur ? "HIGH" : "LOW" };
  }
  let state: SignalState = signal.baseState;
  let value: string | undefined;
  for (const tr of signal.transitions) {
    if (tr.timeNs <= timeNs) {
      state = tr.newState;
      value = tr.value;
    } else {
      break;
    }
  }
  return { state, value };
}

export interface ResolvedEvent {
  timeNs: number;
  direction: EdgeDirection;
  newState?: SignalState;
  value?: string;
}

/**
 * Resolve a SignalReference to the list of matching event timestamps in the
 * chosen window. If `occurrenceIndex` is supplied, returns at most one;
 * otherwise returns all matches so the solver can find the worst case.
 */
export function resolveReference(
  ref: SignalReference,
  signal: AnySignal,
  tMaxNs: number,
): ResolvedEvent[] {
  let events: ResolvedEvent[];
  if (signal.type === "CLOCK") {
    events = generateClockEdges(signal, 0, tMaxNs);
  } else {
    events = signal.transitions
      .filter((tr: TransitionEvent) => tr.timeNs >= 0 && tr.timeNs <= tMaxNs)
      .map((tr: TransitionEvent) => ({
        timeNs: tr.timeNs,
        direction: tr.direction,
        newState: tr.newState,
        value: tr.value,
      }));
  }
  if (ref.edgeDirection !== "TRANSITION") {
    events = events.filter((e) => e.direction === ref.edgeDirection);
  }
  if (ref.occurrenceIndex != null) {
    events = events[ref.occurrenceIndex] ? [events[ref.occurrenceIndex]] : [];
  }
  return events;
}

interface WorstCase {
  margin: number;
  anchor: ResolvedEvent;
  target: ResolvedEvent;
}

/**
 * Forward-propagation constraint evaluator. Considers every anchor occurrence
 * and pairs it with the most-relevant target event for the constraint type.
 * Reports the worst-case margin (the one that determines PASS/FAIL).
 */
export function evaluateConstraint(
  constraint: Constraint,
  signals: AnySignal[],
  tMaxNs: number,
): Constraint {
  const anchorSig = signals.find((s) => s.id === constraint.anchor.signalId);
  const targetSig = signals.find((s) => s.id === constraint.target.signalId);
  if (!anchorSig || !targetSig) {
    return { ...constraint, status: "UNRESOLVED" };
  }

  const anchorEvts = resolveReference(constraint.anchor, anchorSig, tMaxNs);
  const targetEvts = resolveReference(constraint.target, targetSig, tMaxNs);
  if (!anchorEvts.length) return { ...constraint, status: "UNRESOLVED" };

  let worst: WorstCase | null = null;
  const considerWorse = (
    margin: number,
    kind: Constraint["type"],
    anchor: ResolvedEvent,
    target: ResolvedEvent,
  ) => {
    if (!worst) {
      worst = { margin, anchor, target };
      return;
    }
    // SETUP / HOLD: lower margin = worse.  PROP_DELAY: higher margin = worse.
    if (kind === "PROP_DELAY" ? margin > worst.margin : margin < worst.margin) {
      worst = { margin, anchor, target };
    }
  };

  for (const a of anchorEvts) {
    let pick: ResolvedEvent | undefined;
    let margin = NaN;

    if (constraint.type === "SETUP") {
      // Target should occur strictly before anchor; prefer transition→VALID.
      let cands = targetEvts.filter((e) => e.timeNs < a.timeNs);
      if (targetSig.type === "DATA") {
        const valid = cands.filter((e) => e.newState === "VALID");
        if (valid.length) cands = valid;
      }
      pick = cands[cands.length - 1];
      if (!pick) continue;
      margin = a.timeNs - pick.timeNs;
    } else if (constraint.type === "HOLD") {
      const cands = targetEvts.filter((e) => e.timeNs > a.timeNs);
      pick = cands[0];
      if (!pick) continue;
      margin = pick.timeNs - a.timeNs;
    } else if (constraint.type === "PROP_DELAY") {
      const cands = targetEvts.filter((e) => e.timeNs > a.timeNs);
      if (targetSig.type === "DATA") {
        const valid = cands.find((e) => e.newState === "VALID");
        pick = valid ?? cands[0];
      } else {
        pick = cands[0];
      }
      if (!pick) continue;
      margin = pick.timeNs - a.timeNs;
    } else {
      // MIN_PULSE / CYCLE_TIME — not implemented in MVP yet.
      continue;
    }

    considerWorse(margin, constraint.type, a, pick);
  }

  if (!worst) return { ...constraint, status: "UNRESOLVED" };
  const w: WorstCase = worst;

  let pass = true;
  if (constraint.minNs != null) pass = pass && w.margin >= constraint.minNs;
  if (constraint.maxNs != null) pass = pass && w.margin <= constraint.maxNs;

  return {
    ...constraint,
    status: pass ? "PASS" : "FAIL",
    calculatedMarginNs: w.margin,
    worstWindow: {
      anchorTimeNs: w.anchor.timeNs,
      targetTimeNs: w.target.timeNs,
    },
  };
}

/** Solve every constraint against the current signal set. */
export function solve(
  signals: AnySignal[],
  constraints: Constraint[],
  tMaxNs = 1000,
): Constraint[] {
  return constraints.map((c) => evaluateConstraint(c, signals, tMaxNs));
}
