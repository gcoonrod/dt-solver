## Why

`ConstraintInspector`'s `+ New constraint` button currently calls a
hardcoded `handleAdd` that inserts a `SETUP` constraint between the first
clock and the first data signal with `minNs = 20` and a generated name like
`Custom rule 4` (see `src/components/panels/ConstraintInspector.tsx:21-36`
on `develop`). That works as a smoke-test of `addConstraint`, but it
isn't a usable authoring affordance — every real constraint requires
follow-up edits the UI doesn't yet expose, the type is locked to `SETUP`,
and there's no visual feedback that the new rule does what the author
intended.

The next product phase needs a real authoring surface: pick the
constraint type, pick the anchor and target signal-edge references, pick
the bounds, and see the constraint evaluated against the active profile
**while typing** so that a mis-pick (wrong edge direction, swapped anchor
and target, an unreachable target) is caught before submit.

This is the surface gap; the solver and store are already ready for it
(`evaluateConstraint` and `resolveReference` are exported pure functions
from `@/core/solver`, and `addConstraint` already re-runs the solver on
mutation).

## What Changes

- Extend `useTimingStore` with a small modal-state slice — `builderOpen`,
  `builderInitial` — plus two actions, `openBuilder(initial?)` and
  `closeBuilder()`. `addConstraint` and the rest of the store are
  unchanged.
- Rewire `ConstraintInspector.handleAdd` from "insert default constraint"
  to "open the builder modal". The current default-construction code is
  deleted.
- Add a new feature component at
  `src/components/features/ConstraintBuilder.tsx` that mounts when
  `builderOpen` is `true` and renders the modal: vertical stack with a
  `Name | Type` row, a live waveform preview in the middle, and an
  `Anchor | Target` row plus a `Bounds` row beneath. The preview calls
  `evaluateConstraint` on every state change and displays the resulting
  status / margin / slack in real time.
- Mount `<ConstraintBuilder />` from `src/app/page.tsx` so it floats over
  the whole shell.
- Promote the necessary internal exports from `WaveformTimeline.tsx`
  (`ClockTrace`, `LineTrace`, `BusTrace`) to named exports so the
  preview can render real traces without duplicating logic.
- Add colocated unit tests for the new feature plus an integration test
  that the inspector's button opens (not directly adds), the modal's
  submit dispatches `addConstraint`, and the live preview re-runs the
  solver on form mutations.
- No changes to `src/core/`, `src/types/`, or `src/data/`. No new runtime
  dependencies.

## Capabilities

### New Capabilities

- `constraint-builder` — Modal authoring surface for new constraints,
  including the form contract, the live-preview contract, and the
  open/close lifecycle the store exposes.

### Modified Capabilities

<!-- none — `app-shell-layout` already accommodates new features under
`src/components/features/` and new hooks under `src/hooks/`. This change
adds a feature; no archived requirement needs revision. -->

## Impact

- **Code**: New file `src/components/features/ConstraintBuilder.tsx`
  (target ≤ 600 LOC, broken into local subcomponents for the form
  sections and the preview block). Edits to
  `src/store/useTimingStore.ts` (state slice + two actions),
  `src/components/panels/ConstraintInspector.tsx` (rewire `handleAdd`),
  `src/components/canvas/WaveformTimeline.tsx` (promote three internal
  trace components to named exports), and `src/app/page.tsx` (mount the
  modal).
- **Tests**: New `src/components/features/ConstraintBuilder.test.tsx`
  asserting initial render, form validation, the same-signal collapse
  for `MIN_PULSE` / `CYCLE_TIME`, live status changes when bounds are
  bumped past the calculated margin, and that submit dispatches
  `addConstraint` with the right shape. New cases added to the existing
  `src/components/panels/ConstraintInspector.test.tsx` asserting the
  `+ New constraint` button now calls `openBuilder` rather than
  `addConstraint`. A new case in `src/app/page.test.tsx` asserting the
  modal mounts on `openBuilder` and unmounts on `closeBuilder`.
- **APIs**: `useTimingStore`'s public surface grows by two actions
  (`openBuilder`, `closeBuilder`) and two state keys (`builderOpen`,
  `builderInitial`). `WaveformTimeline.tsx` exports three new named
  components (`ClockTrace`, `LineTrace`, `BusTrace`); the default export
  is unchanged.
- **CI**: No workflow changes. Existing `lint` / `build` / `test` jobs
  cover the new files.
- **Risk**: Low. The store mutation that actually inserts the constraint
  (`addConstraint`) is untouched — only its trigger moves from the
  inspector button to the modal's submit. The live preview reuses the
  solver code path the inspector already uses, so there's no risk of
  preview-vs-final drift.
