## Why

`ComponentLibrary`'s `+ Add Signal` button (and the three
`Clock / Bus / Line` shortcut buttons below it) currently call a
hardcoded `handleAdd` that inserts a `DATA` signal with three
placeholder transitions and a name like `SIG6` (see
`src/components/panels/ComponentLibrary.tsx:96–115` on `develop`).
The three shortcut buttons are visually present but **non-functional**
— they have no `onClick` handler at all. Every signal the user actually
wants must be edited by hand after creation, and the only way to make a
clock or a bus at the moment is to add a placeholder and then mutate
its `type` / `widthBits` directly in source.

The next product phase needs a real authoring surface for signals:
pick the kind (Clock / Bus / Line), pick the type-specific parameters
(frequency + unit + duty cycle + phase + slew for clocks; initial
state + width + slew + transitions table for buses and lines), see the
signal rendered live as a waveform with rulers that visualize the
parameters, and submit.

The store, the solver, and the type contracts are already ready for
this — `addSignal` exists, `generateClockEdges` and `stateAt` are
exported pure functions from `@/core/solver`, and `riseTimeNs` /
`fallTimeNs` already exist on `BaseSignal` (added in the slew-support
change). What's missing is the **UI**.

## What Changes

- Extend `useTimingStore` with a small modal-state slice —
  `signalBuilderOpen`, `signalBuilderInitial` — plus two actions,
  `openSignalBuilder(initial?)` and `closeSignalBuilder()`. The rest
  of the store is unchanged.
- Rewire `ComponentLibrary.handleAdd` from "insert default signal" to
  "open the builder modal". Wire the three Clock / Bus / Line shortcut
  buttons to `openSignalBuilder({ mode })` so they pre-select the type
  chip.
- Add a new feature component at
  `src/components/features/SignalBuilder.tsx` that mounts when
  `signalBuilderOpen` is `true` and renders the modal: vertical stack
  with a `Name | Type` row, a live waveform preview in the middle,
  then a type-conditional config block beneath. Clock params show
  frequency (with Hz / kHz / MHz / GHz dropdown), duty cycle (as HIGH
  %, with LOW % derived), phase offset, slew (linked rise/fall).
  Bus / Line show initial state, width (bus only), slew, and an
  inline-editable transitions table.
- Mount `<SignalBuilder />` from `src/app/page.tsx` so it floats over
  the whole shell.
- For clock signals, the preview overlays four ruler annotations
  (T, tH, tL, φ) directly on the trace, anchored to a fixed time
  window so phase offsets shift the trace against a stationary
  t=0 origin rather than dragging the whole timeline.
- Promote the necessary internal exports from `WaveformTimeline.tsx`
  (`ClockTrace`, `LineTrace`, `BusTrace`) to named exports so the
  preview can render real traces without duplicating logic. If the
  constraint-builder change has already landed this, skip — see
  `tasks.md` § 2.
- Add colocated unit tests for the new feature plus updated tests for
  the rewired ComponentLibrary handlers.
- No changes to `src/core/`, `src/types/`, or `src/data/`. No new
  runtime dependencies.

## Capabilities

### New Capabilities

- `signal-builder` — Modal authoring surface for new signals, including
  the form contract (Clock / Bus / Line), the transitions-editor
  contract, the live-preview contract (including clock rulers), and
  the open/close lifecycle the store exposes.

### Modified Capabilities

<!-- none — `app-shell-layout` already accommodates new features under
`src/components/features/`. This change adds a feature; no archived
requirement needs revision. -->

## Impact

- **Code**: New file `src/components/features/SignalBuilder.tsx`
  (target ≤ 800 LOC, broken into local subcomponents for the form
  sections and preview). Edits to
  `src/store/useTimingStore.ts` (state slice + two actions),
  `src/components/panels/ComponentLibrary.tsx` (rewire `handleAdd`
  + Clock/Bus/Line shortcut buttons), `src/app/page.tsx` (mount the
  modal), and (if not already done by the constraint-builder change)
  `src/components/canvas/WaveformTimeline.tsx` (promote three internal
  trace components to named exports).
- **Tests**: New
  `src/components/features/SignalBuilder.test.tsx` asserting initial
  render, form validation, the type-chip switching (CLOCK ↔ BUS ↔ LINE),
  the same-signal collapse for the transitions editor (rows reset on
  type switch), clock-ruler positioning under positive and negative
  phase, frequency-unit conversion (e.g., entering `2.5` and selecting
  `GHz` should produce `frequencyMHz = 2500`), duty-percent conversion
  (entering `60` should produce `dutyCycle = 0.6` on submit), and that
  submit dispatches `addSignal` with the right shape. Updates to
  `src/components/panels/ComponentLibrary.test.tsx` asserting that the
  Add Signal button now calls `openSignalBuilder` rather than
  `addSignal`, and that each Clock/Bus/Line button calls
  `openSignalBuilder({ mode: <X> })`.
- **APIs**: `useTimingStore`'s public surface grows by two actions
  (`openSignalBuilder`, `closeSignalBuilder`) and two state keys
  (`signalBuilderOpen`, `signalBuilderInitial`). `WaveformTimeline.tsx`
  may gain three new named exports (`ClockTrace`, `LineTrace`,
  `BusTrace`) if not already exported.
- **CI**: No workflow changes. Existing `lint` / `build` / `test`
  jobs cover the new files.
- **Risk**: Low. `addSignal` is untouched — only its trigger moves
  from the inspector button to the modal's submit. The live preview
  reuses the same `generateClockEdges` / `stateAt` paths the main
  canvas uses, so there's no risk of preview-vs-final drift.
