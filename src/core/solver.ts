// Pure functions. No React, no DOM, no D3, no store. Trivially unit-testable.

import type {
  AnySignal,
  ClockSignal,
  EdgeDirection,
  EdgeInterval,
  SignalState,
  TransitionEvent,
} from "@/types/signal";
import type { Constraint, SignalReference } from "@/types/constraint";

/** Compute clock period in nanoseconds from frequency in megahertz. */
export function periodNs(mhz: number): number {
  return 1000 / mhz;
}

export type ClockEdge = EdgeInterval;

function slewFor(signal: AnySignal, direction: EdgeDirection): number {
  if (direction === "RISING") return signal.riseTimeNs ?? 0;
  if (direction === "FALLING") return signal.fallTimeNs ?? 0;
  // TRANSITION (bus-style state change): use the larger of rise/fall so the
  // worst-case window is conservative for both directions of slew.
  return Math.max(signal.riseTimeNs ?? 0, signal.fallTimeNs ?? 0);
}

function intervalAt(
  midNs: number,
  direction: EdgeDirection,
  slewNs: number,
): EdgeInterval {
  const half = slewNs / 2;
  return { startNs: midNs - half, midNs, endNs: midNs + half, direction };
}

/**
 * Generate the absolute rising/falling edge intervals for a clock over a
 * given time window. Edges are returned in chronological order by `midNs`.
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
    if (rise >= tMinNs && rise <= tMaxNs) {
      edges.push(intervalAt(rise, "RISING", slewFor(clock, "RISING")));
    }
    if (fall >= tMinNs && fall <= tMaxNs) {
      edges.push(intervalAt(fall, "FALLING", slewFor(clock, "FALLING")));
    }
    k++;
  }
  return edges.sort((a, b) => a.midNs - b.midNs);
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

export interface ResolvedEvent extends EdgeInterval {
  newState?: SignalState;
  value?: string;
}

/**
 * Resolve a SignalReference to the list of matching event intervals in the
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
        ...intervalAt(tr.timeNs, tr.direction, slewFor(signal, tr.direction)),
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
  anchorTimeNs: number;
  targetTimeNs: number;
}

/**
 * Forward-propagation constraint evaluator. Considers every anchor occurrence
 * and pairs it with the most-relevant target event for the constraint type.
 * Reports the worst-case margin (the one that determines PASS/FAIL).
 *
 * Edge endpoint selection (conservative worst-case per spec):
 *   SETUP:      anchor.startNs ↔ target.endNs
 *   HOLD:       anchor.endNs   ↔ target.startNs
 *   PROP_DELAY: anchor.endNs   ↔ target.endNs
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
  const considerWorse = (next: WorstCase, kind: Constraint["type"]) => {
    if (!worst) {
      worst = next;
      return;
    }
    // SETUP / HOLD: lower margin = worse.  PROP_DELAY: higher margin = worse.
    if (kind === "PROP_DELAY" ? next.margin > worst.margin : next.margin < worst.margin) {
      worst = next;
    }
  };

  for (const a of anchorEvts) {
    let pick: ResolvedEvent | undefined;
    let aPoint = 0;
    let tPoint = 0;
    let margin = NaN;

    if (constraint.type === "SETUP") {
      aPoint = a.startNs;
      // Target should occur strictly before anchor; prefer transition→VALID.
      let cands = targetEvts.filter((e) => e.endNs < aPoint);
      if (targetSig.type === "BUS") {
        const valid = cands.filter((e) => e.newState === "VALID");
        if (valid.length) cands = valid;
      }
      pick = cands[cands.length - 1];
      if (!pick) continue;
      tPoint = pick.endNs;
      margin = aPoint - tPoint;
    } else if (constraint.type === "HOLD") {
      aPoint = a.endNs;
      const cands = targetEvts.filter((e) => e.startNs > aPoint);
      pick = cands[0];
      if (!pick) continue;
      tPoint = pick.startNs;
      margin = tPoint - aPoint;
    } else if (constraint.type === "PROP_DELAY") {
      aPoint = a.endNs;
      const cands = targetEvts.filter((e) => e.endNs > aPoint);
      if (targetSig.type === "BUS") {
        const valid = cands.find((e) => e.newState === "VALID");
        pick = valid ?? cands[0];
      } else {
        pick = cands[0];
      }
      if (!pick) continue;
      tPoint = pick.endNs;
      margin = tPoint - aPoint;
    } else {
      // MIN_PULSE / CYCLE_TIME — not implemented in MVP yet.
      continue;
    }

    considerWorse(
      { margin, anchor: a, target: pick, anchorTimeNs: aPoint, targetTimeNs: tPoint },
      constraint.type,
    );
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
      anchorTimeNs: w.anchorTimeNs,
      targetTimeNs: w.targetTimeNs,
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
