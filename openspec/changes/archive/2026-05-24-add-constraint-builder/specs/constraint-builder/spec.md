## ADDED Requirements

### Requirement: Store exposes modal lifecycle for the constraint builder

`useTimingStore` SHALL expose modal-state keys and actions that let any
component request the constraint-builder modal to open or close without
prop drilling.

- The store SHALL contain a boolean state key `builderOpen` initialized
  to `false`.
- The store SHALL contain a state key `builderInitial: Constraint | null`
  initialized to `null`, used to seed the modal with pre-existing values
  for future edit affordances.
- The store SHALL expose an action `openBuilder(initial?: Constraint)`
  that sets `builderOpen` to `true` and `builderInitial` to the
  passed value (or `null` when no value is passed).
- The store SHALL expose an action `closeBuilder()` that sets
  `builderOpen` to `false` and `builderInitial` to `null`.
- Neither action SHALL mutate `signals`, `constraints`, or any other
  domain state.

#### Scenario: Initial store state has the builder closed

- **GIVEN** a fresh `useTimingStore` instance
- **WHEN** the state is read
- **THEN** `builderOpen` SHALL equal `false`
- **AND** `builderInitial` SHALL equal `null`

#### Scenario: `openBuilder` without arguments opens the modal with no seed

- **GIVEN** a fresh `useTimingStore` instance
- **WHEN** `openBuilder()` is called
- **THEN** `builderOpen` SHALL equal `true`
- **AND** `builderInitial` SHALL equal `null`

#### Scenario: `openBuilder` with a constraint seeds the modal

- **GIVEN** a fresh `useTimingStore` instance and a valid `Constraint` value `c`
- **WHEN** `openBuilder(c)` is called
- **THEN** `builderOpen` SHALL equal `true`
- **AND** `builderInitial` SHALL equal `c`

#### Scenario: `closeBuilder` resets both keys

- **GIVEN** a `useTimingStore` instance where `openBuilder({...})` has been called
- **WHEN** `closeBuilder()` is called
- **THEN** `builderOpen` SHALL equal `false`
- **AND** `builderInitial` SHALL equal `null`

#### Scenario: Modal lifecycle actions do not mutate domain state

- **GIVEN** a `useTimingStore` instance with the `W65C02S_14MHz` profile loaded
- **WHEN** `openBuilder()` followed by `closeBuilder()` is dispatched
- **THEN** `signals`, `constraints`, and `solved` SHALL be the same references they were before

### Requirement: Constraint Inspector's `+ New constraint` button opens the modal

The `+ New constraint` button in `ConstraintInspector` SHALL invoke
`openBuilder()` and SHALL NOT directly call `addConstraint`.

#### Scenario: Clicking the button opens the modal

- **GIVEN** the inspector rendered against a store reset to `W65C02S_14MHz`
- **WHEN** the user clicks the `+ New constraint` button
- **THEN** `useTimingStore.getState().builderOpen` SHALL equal `true`

#### Scenario: Clicking the button does not insert a constraint

- **GIVEN** the inspector rendered against a store reset to `W65C02S_14MHz`
- **AND** the initial constraint count `n0 = useTimingStore.getState().constraints.length`
- **WHEN** the user clicks the `+ New constraint` button
- **THEN** `useTimingStore.getState().constraints.length` SHALL equal `n0`

### Requirement: Constraint Builder modal lifecycle

A `ConstraintBuilder` feature component SHALL exist at
`src/components/features/ConstraintBuilder.tsx`, SHALL be mounted from
`src/app/page.tsx`, and SHALL render its modal chrome only when
`builderOpen` is `true`.

- The component SHALL be a `"use client"` component.
- The component SHALL return `null` when `useTimingStore((s) => s.builderOpen)` is `false`.
- The component SHALL render its modal inside a `fixed`-positioned
  full-viewport backdrop with `z-index >= 50`.
- Clicking the backdrop (outside the shell) SHALL dispatch `closeBuilder`.
- Pressing `Escape` SHALL dispatch `closeBuilder`.
- Pressing `Cmd+Enter` (or `Ctrl+Enter`) SHALL submit the current form
  when valid (see Validation requirement below) and SHALL be a no-op
  otherwise.

#### Scenario: Modal does not render when closed

- **GIVEN** the page rendered against a store reset to `W65C02S_14MHz`
- **WHEN** `useTimingStore.getState().builderOpen === false`
- **THEN** the modal SHALL NOT be present in the DOM

#### Scenario: Modal renders when opened

- **GIVEN** the page rendered against a store reset to `W65C02S_14MHz`
- **WHEN** `useTimingStore.getState().openBuilder()` is dispatched
- **THEN** the modal SHALL be present in the DOM
- **AND** a form field for the constraint name SHALL be visible

#### Scenario: Escape closes the modal

- **GIVEN** the modal open against a store reset to `W65C02S_14MHz`
- **WHEN** a `keydown` event with `key = "Escape"` is dispatched on `window`
- **THEN** `useTimingStore.getState().builderOpen` SHALL equal `false`

### Requirement: Form contract — type-driven taxonomy

The form SHALL present the following five constraint types as selectable
chips, each with a stable symbol, label, applicable bound, and same-signal
flag matching the table below:

| Type ID      | Symbol | Label        | Applicable bound  | Same-signal |
|--------------|--------|--------------|-------------------|-------------|
| `SETUP`      | `tSU`  | "Setup"      | `minNs`           | false       |
| `HOLD`       | `tH`   | "Hold"       | `minNs`           | false       |
| `PROP_DELAY` | `tPD`  | "Prop Delay" | `maxNs`           | false       |
| `MIN_PULSE`  | `tW`   | "Min Pulse"  | `minNs`           | true        |
| `CYCLE_TIME` | `tCYC` | "Cycle Time" | `minNs`           | true        |

- Switching type SHALL re-derive the auto-name when the user has not
  manually edited the name field.
- Switching to a same-signal type SHALL force `target.signalId === anchor.signalId`
  and SHALL disable the target signal/edge controls.
- The bounds row SHALL render BOTH `min` and `max` inputs but SHALL dim
  the one not applicable to the active type (e.g., `max` is dimmed for
  SETUP, `min` is dimmed for PROP_DELAY).

#### Scenario: Switching from SETUP to PROP_DELAY flips the active bound

- **GIVEN** the modal open with type set to `SETUP`
- **WHEN** the user clicks the `tPD · Prop Delay` chip
- **THEN** the `max` bound input SHALL become enabled
- **AND** the `min` bound input SHALL become disabled (visually dimmed)
- **AND** the inequality hint SHALL read `Δ ≤ tPD,max`

#### Scenario: Switching to MIN_PULSE locks target to anchor

- **GIVEN** the modal open with type `SETUP`, anchor `PHI2`, target `ADDR`
- **WHEN** the user clicks the `tW · Min Pulse` chip
- **THEN** the target signal `<select>` SHALL be disabled
- **AND** the target's effective `signalId` SHALL equal the anchor's `signalId`

### Requirement: Form contract — signal references

Anchor and Target SHALL each be a `SignalReference` ({ signalId,
edgeDirection }) edited via:

- a signal `<select>` populated from `useTimingStore((s) => s.signals)`,
  rendering each signal's name and a color-coded dot using `signal.color`;
- an edge-direction toggle that exposes `RISING` and `FALLING` for clock
  signals and `TRANSITION` / `RISING` / `FALLING` for data signals.

Switching the signal SHALL reset the edge to the first valid option for
the new signal type.

#### Scenario: Switching a reference from a clock to a data signal resets the edge

- **GIVEN** an anchor reference with signal `PHI2` and edge `FALLING`
- **WHEN** the user selects a data signal (e.g., `ADDR`) in the anchor `<select>`
- **THEN** the anchor edge direction SHALL be `TRANSITION` (the first
  edge option for data signals)

### Requirement: Live preview re-evaluates on every form mutation

The modal SHALL display a live preview that recomputes its status,
calculated margin, and worst-case window on every form mutation by
calling `evaluateConstraint(draft, signals, window)` from `@/core/solver`.

- The preview SHALL render a status pill in the modal header reading
  `live · pass`, `live · fail`, or `live · unresolved` matching the
  solver's status.
- The preview SHALL render at most two waveform rows (anchor + target)
  — collapsed to one row for same-signal types.
- The preview SHALL render an annotation band between the anchor and
  target events of `solved.worstWindow` colored green for PASS and red
  for FAIL, with the Δ value, the required bound, and the slack
  displayed in a centered pill over the band.
- The preview footer SHALL display four metrics: required, calculated,
  slack, status. The calculated and slack values SHALL be color-shifted
  to red on FAIL and green on PASS.
- The waveform rows SHALL be rendered by reusing the trace components
  exported from `@/components/canvas/WaveformTimeline` (`ClockTrace`,
  `LineTrace`, `BusTrace`).

#### Scenario: Live status flips from PASS to FAIL when bound is bumped past margin

- **GIVEN** the modal open with type `SETUP`, anchor `PHI2 falling`,
  target `ADDR transition`, `minNs = 1`
- **AND** the resulting status is `PASS`
- **WHEN** the user changes `minNs` to a value above the calculated margin
- **THEN** the status pill text SHALL update to read `live · fail` (case-insensitive)
- **AND** the slack metric SHALL be a negative value

#### Scenario: Preview row count adapts to same-signal types

- **GIVEN** the modal open with type `MIN_PULSE` and anchor `PHI2`
- **WHEN** the preview is rendered
- **THEN** exactly one waveform row SHALL be visible

### Requirement: Validation gates submit

The submit button SHALL be disabled when ANY of the following are true,
and enabled otherwise:

- The name field is empty (after trim).
- The anchor signal is not selected (no matching signal in the active profile).
- The target signal is not selected (or, for same-signal types, the
  pinned signal is not in the active profile).
- The applicable bound value (per the type's `bounds` field) is `NaN`.

The modal SHALL NOT block submit on `solved.status === 'UNRESOLVED'`.

#### Scenario: Empty name disables submit

- **GIVEN** the modal open with all other fields valid
- **WHEN** the user clears the name field
- **THEN** the `Add constraint` button SHALL be disabled

#### Scenario: UNRESOLVED status does not block submit

- **GIVEN** the modal open with a configuration that produces `status: 'UNRESOLVED'`
- **AND** all required fields are non-empty
- **WHEN** the user clicks `Add constraint`
- **THEN** the constraint SHALL be added to the store

### Requirement: Submit adds the constraint and closes the modal

Submitting the form SHALL dispatch `addConstraint` with the form's
current values (assigning a fresh id) and SHALL dispatch `closeBuilder`.

- The new constraint's `type`, `anchor`, `target`, and applicable
  bound SHALL match the form state at submit time.
- The constraint id SHALL be unique and non-empty (e.g.,
  `c-${Date.now().toString(36)}` or a UUID).
- After submit, `builderOpen` SHALL be `false` and `builderInitial`
  SHALL be `null`.

#### Scenario: Submit adds a row to the inspector table

- **GIVEN** the modal open against a store reset to `W65C02S_14MHz`
- **AND** the initial constraint count `n0 = useTimingStore.getState().constraints.length`
- **WHEN** the user submits a valid form
- **THEN** `useTimingStore.getState().constraints.length` SHALL equal `n0 + 1`
- **AND** the most-recently-added constraint's `name`, `type`,
  `anchor`, and `target` SHALL match the form's values at submit time

#### Scenario: Submit closes the modal

- **GIVEN** the modal open with valid form values
- **WHEN** the user submits
- **THEN** `useTimingStore.getState().builderOpen` SHALL equal `false`

### Requirement: Builder lives under `features/`, not `ui/`

The `ConstraintBuilder` component SHALL be located at
`src/components/features/ConstraintBuilder.tsx`, MAY import from
`@/store/useTimingStore` and `@/core/solver`, and SHALL have a
colocated test file at
`src/components/features/ConstraintBuilder.test.tsx` under the `ui`
Vitest project.

The trace renderers consumed by the preview SHALL be imported as named
exports from `@/components/canvas/WaveformTimeline` (no duplication of
SVG path generation).

#### Scenario: Builder component file exists under features/

- **GIVEN** the repository
- **WHEN** the filesystem is inspected
- **THEN** `src/components/features/ConstraintBuilder.tsx` SHALL exist
- **AND** `src/components/features/ConstraintBuilder.test.tsx` SHALL exist

#### Scenario: Builder consumes traces from WaveformTimeline

- **GIVEN** `src/components/features/ConstraintBuilder.tsx`
- **WHEN** the file is inspected
- **THEN** it SHALL import at least one of `ClockTrace`, `LineTrace`,
  `BusTrace` from `@/components/canvas/WaveformTimeline`
- **AND** it SHALL NOT define its own equivalent path-generation
  function for clock, line, or bus rendering
