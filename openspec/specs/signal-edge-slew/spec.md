# signal-edge-slew Specification

## Purpose

Defines how signal edges carry rise/fall (slew) timing data through the type system, solver, profile data, waveform rendering, and supporting UI panels, and how the constraint evaluator chooses worst-case endpoints within an edge interval.

## Requirements

### Requirement: BaseSignal carries rise and fall time

`BaseSignal` SHALL expose optional `riseTimeNs` and `fallTimeNs` fields, each a non-negative finite number expressing the 10%-to-90% (rise) or 90%-to-10% (fall) transition duration in nanoseconds. Both fields default to `0`, which MUST preserve the existing instantaneous-edge solver behavior. A negative or non-finite value SHALL be rejected at the type-system level (the field is `number | undefined`; runtime callers SHALL treat undefined as `0`).

#### Scenario: Default-omitted slew preserves legacy behavior

- **WHEN** a signal is created without `riseTimeNs` or `fallTimeNs`
- **THEN** the solver SHALL treat every rising and falling edge as a single instant (`startNs === midNs === endNs`)
- **AND** all previously-passing constraints whose anchor and target signals also omit slew SHALL continue to compute identical `calculatedMarginNs` values

#### Scenario: Specified slew widens edge intervals

- **WHEN** a signal has `riseTimeNs = 4` and `fallTimeNs = 6`
- **THEN** every rising edge emitted by the solver SHALL have `endNs - startNs === 4`
- **AND** every falling edge SHALL have `endNs - startNs === 6`
- **AND** `midNs` SHALL equal `(startNs + endNs) / 2`

### Requirement: Solver emits interval-valued edges

`generateClockEdges` and `resolveReference` in `src/core/solver.ts` SHALL return events whose shape includes `startNs`, `midNs`, and `endNs` (all nanosecond timestamps) instead of a single `timeNs`. The `midNs` value SHALL be the canonical "edge time" exposed through `ResolvedEvent.timeNs` for backward compatibility with existing UI consumers that only read a single time.

#### Scenario: Clock edge interval reflects clock rise/fall time

- **WHEN** `generateClockEdges` is called for a clock with `frequencyMHz = 14`, `riseTimeNs = 2`, `fallTimeNs = 3`, and a window of `[0, 100]`
- **THEN** every rising edge SHALL satisfy `endNs - startNs === 2`
- **AND** every falling edge SHALL satisfy `endNs - startNs === 3`
- **AND** edges SHALL still be returned in chronological order by `midNs`

#### Scenario: Data-signal transition interval reflects signal slew

- **WHEN** `resolveReference` resolves a `RISING` reference against a `DataSignal` with `riseTimeNs = 5` and a transition at `timeNs = 20`
- **THEN** the returned event SHALL have `startNs = 17.5`, `midNs = 20`, `endNs = 22.5`

### Requirement: Constraint evaluator picks worst-case threshold

`evaluateConstraint` SHALL choose the worst-case point within the edge interval based on constraint type, so that reported `calculatedMarginNs` is conservative (never overstates margin). Specifically:

- For **SETUP**: anchor SHALL use `startNs` of the anchor edge (earliest point the clock could be sampled); target SHALL use `endNs` of the target edge (latest point the data could still be transitioning).
- For **HOLD**: anchor SHALL use `endNs` of the anchor edge; target SHALL use `startNs` of the target edge.
- For **PROP_DELAY**: anchor SHALL use `endNs` of the anchor edge; target SHALL use `endNs` of the target edge (worst case is the latest-completing transition).
- For **MIN_PULSE** and **CYCLE_TIME**: behavior is unchanged in this change — these constraint types continue to be unimplemented and SHALL be skipped exactly as today.

#### Scenario: Setup margin shrinks when slew is introduced

- **GIVEN** a clock with `frequencyMHz = 14`, `fallingEdge` at `midNs = 35.7`, and `fallTimeNs = 2`
- **AND** a data signal with a `VALID` transition at `midNs = 20` and `riseTimeNs = 4`
- **AND** a `SETUP` constraint anchored to the clock falling edge and targeting the data transition with `minNs = 15`
- **WHEN** the solver evaluates the constraint
- **THEN** `calculatedMarginNs` SHALL equal `34.7 - 22 = 12.7 ns` (anchor `startNs = 35.7 - 1 = 34.7`; target `endNs = 20 + 2 = 22`)
- **AND** `status` SHALL be `FAIL`

#### Scenario: Hold margin uses opposite endpoints

- **GIVEN** a clock falling edge with `endNs = 36.7` (mid `35.7`, fall time `2 ns`)
- **AND** a data target `RISING` event with `startNs = 39` (mid `40`, rise time `2 ns`)
- **AND** a `HOLD` constraint with `minNs = 5`
- **WHEN** the solver evaluates the constraint
- **THEN** `calculatedMarginNs` SHALL equal `39 - 36.7 = 2.3 ns`
- **AND** `status` SHALL be `FAIL`

### Requirement: Profile data carries realistic slew values

Each timing profile in `src/data/` (W65C02S `@` 14 MHz, plus the stub 6502 and 62256 profiles when implemented) SHALL populate `riseTimeNs` and `fallTimeNs` on every signal it defines. The W65C02S profile SHALL use values consistent with the WDC datasheet AC characteristics; stub profiles SHALL use representative values from their respective datasheets. The `defaultWindowNs` of the demo scene SHALL remain visually coherent after the slew change (no edge shall extend outside the rendered window).

#### Scenario: W65C02S demo signals all carry slew

- **WHEN** `W65C02S_14MHz_signals` is consumed
- **THEN** every entry in the array SHALL have both `riseTimeNs` and `fallTimeNs` defined as numbers `>= 0`
- **AND** the PHI2 clock SHALL have non-zero rise and fall time
- **AND** the demo SHALL still produce at least one `FAIL` constraint (to exercise the failure UI)

### Requirement: Waveform renders slew as sloped edges

`WaveformTimeline.tsx` SHALL render edges using the signal's slew rather than the current near-vertical `EDGE_SLOPE` constant. For clock and single-bit line traces, the rising/falling segment SHALL span from `tToX(startNs)` to `tToX(endNs)`. For bus traces, the X-shaped transition marker SHALL widen to span the edge interval. When `startNs === endNs` (zero slew), rendering SHALL fall back to the current vertical-edge style so that legacy profiles look unchanged.

#### Scenario: Slewed clock has slanted edges

- **GIVEN** a clock with `riseTimeNs = 3` rendered at 10 px/ns
- **WHEN** the trace is drawn
- **THEN** the SVG path for a rising edge SHALL traverse a horizontal distance of `30 px` between the LOW and HIGH y-coordinates (not the legacy `EDGE_SLOPE` constant)

#### Scenario: Zero-slew signal keeps vertical edges

- **WHEN** a signal omits both `riseTimeNs` and `fallTimeNs`
- **THEN** every edge in its rendered trace SHALL keep `endNs - startNs === 0` and use the existing near-vertical visual

### Requirement: UI surfaces slew metadata

`ComponentLibrary.tsx` SHALL display slew alongside the existing per-signal metadata badge (e.g., `14M · 2/3ns` for a 14 MHz clock with 2 ns rise / 3 ns fall). `ConstraintInspector.tsx` SHALL show the slew-aware worst-case window in its hover annotation: the highlighted band SHALL span from anchor `startNs` (for setup) or `endNs` (for hold/prop_delay) to the target endpoint dictated by the constraint type defined in the solver requirement above.

#### Scenario: Component library shows slew badge for clocks

- **GIVEN** a clock signal with `frequencyMHz = 14`, `riseTimeNs = 2`, `fallTimeNs = 3`
- **WHEN** `ComponentLibrary` renders its signal row
- **THEN** the row's metadata label SHALL include `2/3ns` (or an equivalent format) in addition to `14M`

#### Scenario: Constraint inspector highlight matches solver endpoints

- **GIVEN** a SETUP constraint whose solved `worstWindow` was computed from anchor `startNs` and target `endNs`
- **WHEN** the user hovers the row
- **THEN** the timeline highlight band's left edge SHALL align with the anchor edge's `startNs`
- **AND** the right edge SHALL align with the target edge's `endNs`
