## Why

Real digital signals do not switch instantaneously — they exhibit non-zero rise time (`tr`) and fall time (`tf`) bounded by source impedance and load capacitance. The current model treats every transition as a zero-width event, which silently overstates timing margin: a setup/hold check anchored to a clock edge is meaningless if the engineer cannot see that the edge actually spans several nanoseconds between the 10% and 90% logic thresholds. Adding rise/fall time to `BaseSignal` and propagating it through the solver and visualization lets the tool answer the question every datasheet review starts with — "do my edges still meet setup at the worst-case slew?"

## What Changes

- Extend `BaseSignal` with optional `riseTimeNs` and `fallTimeNs` fields (typed as non-negative numbers; absent or `0` preserves today's instantaneous behavior).
- Introduce an `EdgeThreshold` concept (defaults to `50%` mid-point) so solver math has a deterministic point in the slew region to anchor against. Setup constraints anchor to the *late* threshold of a rising edge; hold constraints anchor to the *early* threshold. This is a **BREAKING** semantic change for any constraint where target/anchor edges have a non-zero slew — calculated margins will shrink relative to the previous instantaneous model.
- Update `generateClockEdges` and `resolveReference` in `src/core/solver.ts` so each emitted edge carries `startNs`, `midNs`, and `endNs`, and the constraint evaluator picks the worst-case point based on constraint type.
- Update the `W65C02S_14MHz` example profile (and stub data files) with realistic `riseTimeNs` / `fallTimeNs` values per the WDC datasheet so the demo scene actually exercises the new math.
- Render slew as sloped (not vertical) edges in `WaveformTimeline.tsx` for clock and single-bit traces, and show a slew indicator in the bus-transition X markers.
- Surface `rise/fall` in `ComponentLibrary.tsx` signal rows (metadata) and as editable fields in the constraint inspector hover state.

## Capabilities

### New Capabilities

- `signal-edge-slew`: Models non-instantaneous edge transitions on signals via rise/fall time fields, defines threshold-anchored solver semantics for constraint evaluation against slewed edges, and specifies how slew is presented in the waveform UI.

### Modified Capabilities

<!-- None: no existing specs yet — this is the first capability in openspec/specs/. -->

## Impact

- **Types** (`src/types/signal.ts`): `BaseSignal` gains `riseTimeNs?` and `fallTimeNs?`; new `EdgeThreshold` type and exported defaults.
- **Solver** (`src/core/solver.ts`): `ClockEdge` and `ResolvedEvent` shapes change to carry interval data; `evaluateConstraint` worst-case selection is updated; downstream callers in the store re-solve automatically.
- **Data** (`src/data/w65c02s-14mhz.ts`, `src/data/6502-profile.ts`, `src/data/62256-profile.ts`): seed profiles get realistic slew values; the W65C02S demo's expected PASS/FAIL outcomes shift and must be re-verified.
- **Components** (`src/components/canvas/WaveformTimeline.tsx`, `src/components/panels/ComponentLibrary.tsx`, `src/components/panels/ConstraintInspector.tsx`): rendering and metadata display updates; no new dependencies.
- **No new runtime deps**; pure-TS work confined to the `src/core/` purity boundary.
- **Tests**: none today; if a runner is added during this change, slew-aware solver behavior is the natural first target.
