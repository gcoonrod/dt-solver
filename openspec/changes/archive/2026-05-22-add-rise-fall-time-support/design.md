## Context

The current solver in `src/core/solver.ts` treats every signal transition as a single nanosecond instant: `generateClockEdges` returns `{ timeNs, direction }`, and `resolveReference` does the same for data signals. The renderer in `src/components/canvas/WaveformTimeline.tsx` further commits to this by drawing edges with a hard-coded `EDGE_SLOPE = 1.2 px` purely for anti-aliasing — the slope has no physical meaning. Real ICs do not behave this way: the WDC W65C02S datasheet specifies a rise/fall time `tr/tf` of roughly 2-5 ns depending on load, and an SRAM like the 62256 specifies access timing measured from the 50% threshold of the address edge to the 50% threshold of the data edge.

This change adds first-class slew (`riseTimeNs`, `fallTimeNs`) to `BaseSignal` and propagates the new shape through three layers:

1. **Types** (`src/types/signal.ts`) — the public contract.
2. **Solver** (`src/core/solver.ts`) — every emitted edge becomes a `{startNs, midNs, endNs}` interval, and `evaluateConstraint` picks the worst-case endpoint per constraint type.
3. **Presentation** (`WaveformTimeline.tsx`, `ComponentLibrary.tsx`, `ConstraintInspector.tsx`) — sloped edges and metadata badges replace the cosmetic-slope rendering.

The store (`useTimingStore`) does not need behavioral changes; it already re-solves on mutation and treats `Constraint`/`AnySignal` opaquely.

## Goals / Non-Goals

**Goals:**

- Make rise/fall time a first-class field on every signal, with `undefined`/`0` preserving today's behavior so no existing code path silently regresses.
- Give the solver deterministic, conservative worst-case semantics for constraints anchored to slewed edges (setup tightens by `½tr + ½tf` in the typical case).
- Render slew visually so the user can see *why* a margin shrank — the slope is no longer cosmetic.
- Keep the `src/core/` purity boundary intact: no React/DOM/D3 imports leak in.

**Non-Goals:**

- Modeling overshoot, ringing, or non-monotonic edges. Edges remain monotonic ramps.
- Process/voltage/temperature corner sweeps. Slew is a single nominal value per signal.
- Driver-strength or load-capacitance modeling that *derives* slew. The user supplies `riseTimeNs`/`fallTimeNs` directly.
- Adding a test runner. The `__tests__/` directory remains stubs; if a runner is added later, the new solver math is the obvious first target but is not blocking.
- Editing slew from the UI. Slew is read-only in this change (display only); editing is a follow-up.

## Decisions

### Decision 1: Edges become intervals, not points

The solver internally and externally represents an edge as `{ startNs, midNs, endNs, direction }`. `ResolvedEvent.timeNs` is retained and aliased to `midNs` so existing call sites (e.g., the cursor position, the hover annotation midpoint) keep working.

**Alternatives considered:**

- *Keep `timeNs` as the single time and pass slew separately to the evaluator.* Rejected — the evaluator then needs to look up the source signal to recover slew per event, re-introducing the coupling we removed when we made events self-describing. The interval form keeps `resolveReference` cohesive.
- *Use a `thresholdPct` parameter on each call (e.g., 10/50/90%).* Rejected for now — only adds value if we also model overshoot or asymmetric thresholds. The 50%-mid + start/end endpoints cover every constraint type we currently support, and adding a threshold parameter later is non-breaking (default 50%).

### Decision 2: Anchor at `startNs`/`endNs` based on constraint type, not at midpoint

For a SETUP constraint, the worst case is: the clock *might* sample as early as `startNs` of its falling edge (50% threshold could land at the leading edge of the slew region), while the data *might* still be transitioning at `endNs` of its valid-arrival edge. That maximizes the time the constraint window can "slip" and is what real STA tools report.

Similar logic for HOLD (opposite endpoints) and PROP_DELAY (latest possible target arrival).

**Alternatives considered:**

- *Anchor everything at `midNs` (50% threshold), like the current instantaneous model.* Rejected — this would mean adding slew has *no* effect on margin, defeating the purpose of the change.
- *Let each constraint declare its own threshold percentages.* Over-engineered for this iteration. Hard-coding the worst-case selection per constraint type is the minimum sufficient semantic.

### Decision 3: Render with proportional slope, not cosmetic

`WaveformTimeline.tsx`'s `EDGE_SLOPE = 1.2` becomes derived: the path from `(tToX(startNs), yPrev)` to `(tToX(endNs), yNext)` is drawn. When `startNs === endNs`, the math degenerates to the legacy vertical-with-anti-aliasing visual, which we preserve by adding back a `±1 px` cosmetic offset *only* when the computed slope-width is zero.

**Alternative considered:** make the slope visual cosmetic and unrelated to slew, with a separate annotation. Rejected — the whole point is to make the timing visible; a separate annotation buries the lede.

### Decision 4: Bus transitions show widened X marker

For bus signals, the X-shaped transition marker in `BusTrace` currently spans `2 * BUS_X_SLOPE = 6 px`. When the bus signal has slew, the X widens so that its center sits at `midNs` and its arms span the interval. This is purely visual; the solver still consumes the same `{start,mid,end}` data.

### Decision 5: Slew display is read-only this iteration

`ComponentLibrary` shows slew in the existing metadata badge slot (`14M · 2/3ns`). `ConstraintInspector` does *not* gain new editable fields — the inspector already lacks any editing UI for `minNs`/`maxNs` today, so adding slew-edit before that exists would be inconsistent. A follow-up change can introduce a dedicated signal-editor panel.

## Risks / Trade-offs

- **[Risk]** Previously-passing constraints in the W65C02S demo flip to FAIL once realistic slew lands, because the demo data was tuned against the instantaneous model. **Mitigation:** intentionally retune the demo's `transitions[].timeNs` values so that exactly one constraint fails (the same one as today) and the demo story stays coherent. Document the retune in the data file's header comment.
- **[Risk]** Floating-point drift in `(startNs + endNs) / 2 !== midNs` could cause flaky equality checks in future tests. **Mitigation:** treat `midNs` as authoritative input and derive `start`/`end` as `midNs ∓ riseOrFall/2`; never reconstruct `midNs` by averaging.
- **[Risk]** Sloped edges at very high zoom levels could render as visually-noisy diagonal lines that obscure the high/low logic state. **Mitigation:** Once the slope width in pixels exceeds, say, 60% of the cell height, optionally clip the slope visual — punt this to a follow-up; in the default `[0, 150]` ns viewport with `riseTimeNs ≤ 5`, slope width stays below 30 px which is well-behaved.
- **[Trade-off]** Threshold semantics are hard-coded per constraint type rather than configurable. We get simpler call sites at the cost of expressivity for use cases (e.g., LVDS at 20%/80%) that we don't currently target.
- **[Trade-off]** No test coverage lands with this change. Acceptable because the repo has no test runner today; the math is small and reviewable by inspection.

## Migration Plan

The change is in-tree only — no deploy artifacts, no DB, no API consumers — but the *visible behavior* of the W65C02S demo changes. Sequence:

1. Land types + solver + (retuned) data together in one commit so the demo always tells a coherent story.
2. Land renderer + UI metadata in a follow-up commit so reviewers can see solver math separately from visual changes.
3. No rollback strategy needed beyond `git revert`; there is no persisted user state.

## Open Questions

- Should the eventual editable-slew UI live in `ComponentLibrary` (alongside the signal list) or in a new dedicated inspector panel? Punted to the next change.
- Do stub profiles (`6502-profile.ts`, `62256-profile.ts`) get populated as part of this change, or do they remain `// stub` and gain slew when they get real content? *Recommendation:* leave as stubs; only W65C02S has real content today, and seeding slew into empty stubs adds no value.
