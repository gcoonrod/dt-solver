## ADDED Requirements

### Requirement: Store exposes modal lifecycle for the signal builder

`useTimingStore` SHALL expose modal-state keys and actions that let any
component request the signal-builder modal to open or close without
prop drilling.

- The store SHALL contain a boolean state key `signalBuilderOpen`
  initialized to `false`.
- The store SHALL contain a state key
  `signalBuilderInitial: SignalBuilderInitial | null` initialized to
  `null`, where `SignalBuilderInitial = AnySignal | { mode: 'CLOCK' | 'BUS' | 'LINE' }`.
- The store SHALL expose an action
  `openSignalBuilder(initial?: SignalBuilderInitial)` that sets
  `signalBuilderOpen` to `true` and `signalBuilderInitial` to the
  passed value (or `null`).
- The store SHALL expose an action `closeSignalBuilder()` that sets
  `signalBuilderOpen` to `false` and `signalBuilderInitial` to `null`.
- Neither action SHALL mutate `signals`, `constraints`, or any other
  domain state.

#### Scenario: Initial store state has the builder closed

- **GIVEN** a fresh `useTimingStore` instance
- **WHEN** the state is read
- **THEN** `signalBuilderOpen` SHALL equal `false`
- **AND** `signalBuilderInitial` SHALL equal `null`

#### Scenario: `openSignalBuilder` with no argument

- **GIVEN** a fresh `useTimingStore` instance
- **WHEN** `openSignalBuilder()` is called
- **THEN** `signalBuilderOpen` SHALL equal `true`
- **AND** `signalBuilderInitial` SHALL equal `null`

#### Scenario: `openSignalBuilder` with a mode hint

- **GIVEN** a fresh `useTimingStore` instance
- **WHEN** `openSignalBuilder({ mode: 'CLOCK' })` is called
- **THEN** `signalBuilderOpen` SHALL equal `true`
- **AND** `signalBuilderInitial` SHALL equal `{ mode: 'CLOCK' }`

#### Scenario: `closeSignalBuilder` resets both keys

- **GIVEN** a `useTimingStore` instance where `openSignalBuilder({...})` has been called
- **WHEN** `closeSignalBuilder()` is called
- **THEN** `signalBuilderOpen` SHALL equal `false`
- **AND** `signalBuilderInitial` SHALL equal `null`

#### Scenario: Modal lifecycle actions do not mutate domain state

- **GIVEN** a `useTimingStore` instance with the `W65C02S_14MHz` profile loaded
- **WHEN** `openSignalBuilder()` followed by `closeSignalBuilder()` is dispatched
- **THEN** `signals`, `constraints`, and `solved` SHALL be the same references they were before

### Requirement: ComponentLibrary controls open the modal

The `+ Add Signal` button and the three Clock / Bus / Line shortcut
buttons in `ComponentLibrary` SHALL invoke `openSignalBuilder`
appropriately and SHALL NOT directly call `addSignal`.

- The `+ Add Signal` button SHALL invoke `openSignalBuilder()` with no
  argument.
- Each of the three shortcut buttons (Clock / Bus / Line) SHALL
  invoke `openSignalBuilder({ mode: <X> })` where `<X>` is the type
  the button represents.

#### Scenario: Clicking + Add Signal opens the modal without a seed

- **GIVEN** the ComponentLibrary rendered against a store reset to `W65C02S_14MHz`
- **WHEN** the user clicks `+ Add Signal`
- **THEN** `useTimingStore.getState().signalBuilderOpen` SHALL equal `true`
- **AND** `useTimingStore.getState().signalBuilderInitial` SHALL equal `null`

#### Scenario: Clicking the Clock shortcut pre-selects Clock

- **GIVEN** the ComponentLibrary rendered against a store reset to `W65C02S_14MHz`
- **WHEN** the user clicks the `Clock` shortcut button
- **THEN** `useTimingStore.getState().signalBuilderInitial` SHALL equal `{ mode: 'CLOCK' }`

#### Scenario: ComponentLibrary controls do not insert signals directly

- **GIVEN** the ComponentLibrary rendered against a store reset to `W65C02S_14MHz`
- **AND** the initial signal count `n0 = useTimingStore.getState().signals.length`
- **WHEN** the user clicks `+ Add Signal` or any of the three shortcut buttons
- **THEN** `useTimingStore.getState().signals.length` SHALL equal `n0`

### Requirement: Signal Builder modal lifecycle

A `SignalBuilder` feature component SHALL exist at
`src/components/features/SignalBuilder.tsx`, SHALL be mounted from
`src/app/page.tsx`, and SHALL render its modal chrome only when
`signalBuilderOpen` is `true`.

- The component SHALL be a `"use client"` component.
- The component SHALL return `null` when
  `useTimingStore((s) => s.signalBuilderOpen)` is `false`.
- The component SHALL render its modal inside a `fixed`-positioned
  full-viewport backdrop with `z-index >= 50`.
- Clicking the backdrop (outside the shell) SHALL dispatch
  `closeSignalBuilder`.
- Pressing `Escape` SHALL dispatch `closeSignalBuilder`.
- Pressing `Cmd+Enter` (or `Ctrl+Enter`) SHALL submit the current
  form when valid and SHALL be a no-op otherwise.

#### Scenario: Modal does not render when closed

- **GIVEN** the page rendered against a store reset to `W65C02S_14MHz`
- **WHEN** `useTimingStore.getState().signalBuilderOpen === false`
- **THEN** the modal SHALL NOT be present in the DOM

#### Scenario: Escape closes the modal

- **GIVEN** the modal open against a store reset to `W65C02S_14MHz`
- **WHEN** a `keydown` event with `key = "Escape"` is dispatched on `window`
- **THEN** `useTimingStore.getState().signalBuilderOpen` SHALL equal `false`

#### Scenario: Re-opening with a different mode reseeds the form

- **GIVEN** the modal already open in CLOCK mode
- **WHEN** `openSignalBuilder({ mode: 'BUS' })` is dispatched
- **THEN** the active type chip SHALL be `Bus`
- **AND** the form fields SHALL reset to the BUS defaults (initial state
  INVALID, widthBits 8, three default transitions)

### Requirement: Type chip taxonomy

The form SHALL present three signal types as selectable chips:

| Type ID | Label  | Symbol  | Underlying     | Same-signal config |
|---------|--------|---------|----------------|--------------------|
| `CLOCK` | Clock  | `clk`   | `type: 'CLOCK'` | clock params       |
| `BUS`   | Bus    | `[n:0]` | `type: 'BUS'`, `widthBits ≥ 2` | initial state + transitions |
| `LINE`  | Line   | `1b`    | `type: 'LINE'` | initial state + transitions |

- Switching the type SHALL re-seed type-specific defaults: `baseState`,
  `widthBits`, and the `transitions[]` array.
- Switching the type SHALL re-derive the auto-name when the user has
  not manually edited the name field.

#### Scenario: Switching from LINE to BUS expands the transitions to bus defaults

- **GIVEN** the modal open with type `LINE` and default seeded transitions
- **WHEN** the user clicks the `Bus` chip
- **THEN** the transitions table SHALL show the BUS default rows
  (INVALID → VALID → INVALID with `value` strings)
- **AND** the `Width` field SHALL be visible and read `8`

### Requirement: Clock — frequency input with unit selector

The Clock parameters section SHALL provide a frequency input split into
a numeric value and a unit selector (Hz / kHz / MHz / GHz). The
underlying `frequencyMHz` field of the draft signal SHALL be computed
as `Number(value) * FREQ_TO_MHZ[unit]` where `FREQ_TO_MHZ = { Hz: 1e-6, kHz: 1e-3, MHz: 1, GHz: 1e3 }`.

- The unit dropdown SHALL be a native `<select>` populated from the
  four-value list above.
- The dropdown's rendered text SHALL not be visually clipped — minimum
  width 56px.
- The unit choice SHALL NOT be persisted on the signal; only
  `frequencyMHz` is stored.

#### Scenario: GHz conversion

- **GIVEN** the modal open in CLOCK mode
- **WHEN** the user sets the frequency input to `2.5` and the unit to `GHz`
- **AND** submits
- **THEN** the new signal in the store SHALL have `frequencyMHz === 2500`

#### Scenario: Edit-mode unit picking

- **GIVEN** `openSignalBuilder(sig)` is called with a clock whose `frequencyMHz === 0.001`
- **WHEN** the modal opens
- **THEN** the frequency value input SHALL read `1` and the unit dropdown SHALL read `kHz`

### Requirement: Clock — duty cycle as HIGH percent

The duty cycle SHALL be edited as a HIGH percentage in the range
`(0, 100)`. The LOW percentage SHALL be derived as `100 - high` and
rendered live next to the input. The underlying `dutyCycle` field of
the draft signal SHALL be `high / 100`.

#### Scenario: Live low caption

- **GIVEN** the modal open in CLOCK mode
- **WHEN** the user sets duty to `40`
- **THEN** a caption next to the duty input SHALL display `low 60%`

#### Scenario: Submit conversion

- **GIVEN** the modal open in CLOCK mode with duty set to `60`
- **WHEN** the user submits
- **THEN** the new signal SHALL have `dutyCycle === 0.6`

### Requirement: Clock preview uses a fixed time window

The clock preview SHALL use a fixed time window `[-T, 2*T]` where
`T = 1000 / frequencyMHz`, regardless of phase offset. Phase shall
shift the waveform within the window, NOT the window itself. The
preview SHALL render a t=0 reference line so the fixed origin is
visible.

#### Scenario: Phase does not change the time window

- **GIVEN** the modal open in CLOCK mode with frequency 14 MHz (period ≈ 71.43 ns)
- **WHEN** the user changes phase from `0` to `15` to `-12`
- **THEN** the leftmost tick label SHALL continue to read approximately `-71 ns`
- **AND** the rightmost tick label SHALL continue to read approximately `143 ns`

### Requirement: Clock preview overlays parameter rulers

The clock preview SHALL overlay four ruler annotations directly on the
trace:

- A neutral-color **T** bracket above the trace, spanning one full
  period
- A signal-colored **tH** bracket below the trace, spanning the high
  duration of one cycle
- A neutral-color **tL** bracket below the trace, spanning the low
  duration of one cycle
- A yellow dashed **φ** bracket below the trace, spanning `t = 0` to
  the rising edge that represents the user's typed phase

Each bracket SHALL display its measured value as a centered label.

#### Scenario: Phase ruler sign matches input sign

- **GIVEN** the modal open in CLOCK mode with frequency 14 MHz
- **WHEN** the user sets phase to `-10`
- **THEN** the φ ruler SHALL span from `t = 0` LEFTWARD to `t = -10 ns`
- **AND** the label SHALL read `φ = -10 ns` (the typed value, not a positive modular equivalent)

#### Scenario: Phase ruler hidden when phase is zero

- **GIVEN** the modal open in CLOCK mode with phase `0`
- **WHEN** the preview is rendered
- **THEN** no φ ruler SHALL be visible

### Requirement: Tick labels use a single consistent unit

The time-axis tick labels in the preview SHALL be formatted by picking
a SINGLE unit from the tick step magnitude, then rendering all tick
values in that unit. The zero tick SHALL NOT render in a different
unit than its neighbours.

#### Scenario: Picosecond-scale ticks all show ps

- **GIVEN** the modal open in CLOCK mode with frequency `2 GHz` (period 500 ps)
- **WHEN** the preview is rendered
- **THEN** every visible tick label SHALL end in `ps`
- **AND** the zero tick label SHALL be `0 ps`, not `0 ns`

### Requirement: Transitions editor for BUS / LINE

For BUS and LINE types, the form SHALL provide an inline-editable
transitions table with the following columns:

- ordinal (read-only, 1-indexed)
- `timeNs` (numeric input, ns suffix)
- `newState` (segmented selector — LINE: LOW / HIGH / HiZ; BUS:
  VALID / INVALID / HiZ)
- `value` (BUS only — text input, disabled when state ≠ VALID)
- delete button

- Adding a new row SHALL append at the end with `timeNs = lastTime + 25`,
  an alternating state, and (for BUS with VALID) a default
  `value: '0x00'`.
- Editing the `newState` SHALL implicitly update the `direction` field:
  `HIGH → RISING`, `LOW → FALLING`, otherwise `TRANSITION`. The form
  does not expose `direction` directly.
- When transitions go non-monotonic by time, an `out of order` caption
  SHALL appear in the section header next to the count, alongside a
  `sort by time` action that re-orders the rows ascending.
- On submit, the transitions array SHALL be sorted by `timeNs` ascending
  before being written to the store.

#### Scenario: Add row appends with sensible defaults

- **GIVEN** the modal open in BUS mode with default seeded rows ending at `t = 70`
- **WHEN** the user clicks `+ add row`
- **THEN** a new row SHALL appear with `timeNs = 95`

#### Scenario: Sort-by-time normalizes order

- **GIVEN** the modal open in LINE mode with rows in order `[t=0, t=25, t=80]`
- **WHEN** the user edits the middle row's time to `100`
- **THEN** the section header SHALL display `out of order` next to a `sort by time` action
- **WHEN** the user clicks `sort by time`
- **THEN** the rows SHALL be `[t=0, t=80, t=100]` and the warning SHALL disappear

### Requirement: Validation gates submit

The submit button SHALL be disabled when ANY of the following are
true, and enabled otherwise:

- The name field is empty (after trim).
- The type is CLOCK and the frequency value is ≤ 0.
- The type is CLOCK and the duty HIGH percentage is outside `(0, 100)`.
- The type is BUS or LINE and the transitions array is empty.
- The type is BUS or LINE and any transition has a non-finite
  `timeNs`.

A name collision with an existing signal SHALL NOT block submit; the
footer SHALL surface an amber warning caption instead.

#### Scenario: Empty name disables submit

- **GIVEN** the modal open with all other fields valid
- **WHEN** the user clears the name field
- **THEN** the `Add signal` button SHALL be disabled

#### Scenario: Duty at 0 blocks submit; 50 does not

- **GIVEN** the modal open in CLOCK mode with valid frequency
- **WHEN** the user sets the duty to `0`
- **THEN** the `Add signal` button SHALL be disabled
- **WHEN** the user sets the duty to `50`
- **THEN** the `Add signal` button SHALL be enabled

#### Scenario: Name collision warns but does not block

- **GIVEN** the modal open with `name = "PHI2"` (already used by the active profile)
- **WHEN** all other fields are valid
- **THEN** the footer SHALL display an amber `name already used by another signal` caption
- **AND** the `Add signal` button SHALL be enabled

### Requirement: Submit adds the signal and closes the modal

Submitting the form SHALL dispatch `addSignal` with the form's current
values (assigning a fresh id) and SHALL dispatch
`closeSignalBuilder`.

- The new signal's `type` SHALL match the active type chip (`CLOCK`,
  `LINE`, or `BUS`, with `widthBits ≥ 2` when the chip is `BUS`).
- All other fields SHALL match the form state at submit time.
- The signal id SHALL be unique and non-empty.
- After submit, `signalBuilderOpen` SHALL be `false` and
  `signalBuilderInitial` SHALL be `null`.

#### Scenario: Submit appends a signal row in ComponentLibrary

- **GIVEN** the modal open against a store reset to `W65C02S_14MHz`
- **AND** the initial signal count `n0 = useTimingStore.getState().signals.length`
- **WHEN** the user submits a valid form in CLOCK mode
- **THEN** `useTimingStore.getState().signals.length` SHALL equal `n0 + 1`
- **AND** the most-recently-added signal SHALL have `type: 'CLOCK'`

#### Scenario: Submit closes the modal

- **GIVEN** the modal open with valid form values
- **WHEN** the user submits
- **THEN** `useTimingStore.getState().signalBuilderOpen` SHALL equal `false`

### Requirement: Builder lives under `features/`, not `ui/`

The `SignalBuilder` component SHALL be located at
`src/components/features/SignalBuilder.tsx`, MAY import from
`@/store/useTimingStore`, and SHALL have a colocated test file at
`src/components/features/SignalBuilder.test.tsx` under the `ui`
Vitest project.

The root file at `src/components/features/SignalBuilder.tsx` SHALL be a thin re-export from the `./signal-builder` sub-directory. The actual implementation SHALL reside in `src/components/features/signal-builder/` with a barrel export at `index.ts`.

The trace renderers consumed by the preview SHALL be imported as named
exports from `@/components/canvas/WaveformTimeline` (no duplication of
SVG path generation).

#### Scenario: Builder component file exists under features/

- **GIVEN** the repository
- **WHEN** the filesystem is inspected
- **THEN** `src/components/features/SignalBuilder.tsx` SHALL exist
- **AND** `src/components/features/SignalBuilder.test.tsx` SHALL exist
- **AND** `src/components/features/signal-builder/index.ts` SHALL exist

#### Scenario: Root file is a thin re-export shell

- **GIVEN** `src/components/features/SignalBuilder.tsx`
- **WHEN** the file is inspected
- **THEN** it SHALL contain a re-export from `./signal-builder`
- **AND** it SHALL NOT contain component logic, state management, or JSX beyond the export statement

#### Scenario: Builder consumes traces from WaveformTimeline

- **GIVEN** `src/components/features/signal-builder/SBPreviewWaveform.tsx`
- **WHEN** the file is inspected
- **THEN** it SHALL import at least one of `ClockTrace`, `LineTrace`,
  `BusTrace` from `@/components/canvas/WaveformTimeline`
- **AND** it SHALL NOT define its own equivalent path-generation
  function for clock, line, or bus rendering
