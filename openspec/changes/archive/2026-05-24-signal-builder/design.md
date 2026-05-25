## Context

`ComponentLibrary` is the left-rail panel that arrived from the
`decompose-design-handoff` change (archived 2026-05-23). Its
`+ Add Signal` button and the three Clock / Bus / Line shortcut buttons
below are placeholders — the first inserts a hardcoded `DATA` signal
with three placeholder transitions, and the latter three are
non-functional `<button>` elements with no `onClick` (see
`src/components/panels/ComponentLibrary.tsx` on `develop`).

The signal type taxonomy already supports everything the builder
needs: `ClockSignal` carries frequency / duty / phase, `DataSignal`
carries baseState + transitions + optional widthBits, and both extend
`BaseSignal` with `riseTimeNs` / `fallTimeNs` for slew (added in the
slew-support change). The solver's `generateClockEdges(clock, tMin,
tMax)` and `stateAt(signal, t)` are pure exports from `@/core/solver`.
What's missing is the **authoring UI**.

This change drops in a modal companion to `ConstraintBuilder` (added
2026-05-23). Both modals follow the same vertical-stack layout, the
same open/close-via-store lifecycle, the same chrome and validation
patterns, and the same "live preview that re-runs the real domain
function on every keystroke" principle. The parallelism is
intentional — establishing one Builder pattern that future modals
(profile builder, edit-signal, edit-constraint) can clone.

Constraints to honor:

- `src/core/` purity boundary (`CLAUDE.md`): the modal MAY import
  from `@/core/solver` (it's a feature, not a leaf), and MUST NOT
  introduce any React/DOM dependency into `src/core/`.
- `ui/` purity rule from `app-shell-layout`: leaf components under
  `src/components/ui/` do not subscribe to the store. The builder
  subscribes to the store and calls the solver, so it lives under
  `src/components/features/`.
- UI test convention: tests reset `useTimingStore` to
  `W65C02S_14MHz` in `beforeEach`. Snapshots and store mocks are
  forbidden.
- React 19 + Next.js 16. The modal is a client component (local
  form state + Zustand subscription).

## Goals / Non-Goals

**Goals:**

- Replace the placeholder `+ Add Signal` action with a real
  authoring surface that lets the user pick the kind (Clock / Bus /
  Line) and configure all parameters, with a live waveform preview.
- Wire the three Clock / Bus / Line shortcut buttons to the builder
  with a pre-selected type chip — making the "shortcut" affordance
  do what its label promises.
- Reuse the existing solver primitives (`generateClockEdges`,
  `stateAt`) and the existing trace renderers
  (`ClockTrace` / `LineTrace` / `BusTrace`). The builder must look
  and feel identical to the main canvas even though it's a modal.
- Achieve UI test coverage for the new feature plus the rewired
  ComponentLibrary handlers, matching the testing density of prior
  shell changes.
- Provide ruler annotations on the clock preview (T, tH, tL, φ)
  so the user can read the parameters off the trace. This is the
  pedagogical layer the existing main-canvas waveform does not
  offer.

**Non-Goals:**

- Editing existing signals. The builder accepts an optional
  `initial` payload for the future "Edit" flow, but the row-level
  edit verb is a separate change.
- Designing a profile-authoring surface. The builder operates on a
  single signal at a time.
- Persisting signals to disk or to a URL.
- A free-form color picker. The palette is fixed at 8 swatches.
- Drag-to-reorder for transition rows.

## Decisions

### Decision 1: The builder is a single feature file, mirroring the constraint-builder layout

`SignalBuilder.tsx` defines several local subcomponents (`BuilderShell`,
`SBHeader`, `SBLivePill`, `SBFormSection`, `SBFormName`, `SBFormType`,
`SBPreviewHeader`, `SBPreviewWaveform`, `SBPreviewFooter`,
`SBClockParams`, `SBDataParams`, `SBTransitionsEditor`,
`SBTransitionRow`, `SBAppearanceRow`, `SBClockRulers`,
`SBRulerBracket`, `SBFreqField`, `SBDutyField`, `SBSlewField`,
`SBStateField`, `SBNumberField`) — **all in the same file**. None
get hoisted into `src/components/ui/` and none get a separate
`*.test.tsx`. The single-file layout is justified by tight coupling:
every subcomponent shares the same form state (`typeId`, `name`,
`description`, `color`, slew, plus type-specific fields), the same
draft-signal derivation, and the same store reference. Splitting
across files would require prop drilling or a local context.

A single colocated `SignalBuilder.test.tsx` exercises the surface;
the internal subcomponents are tested through it.

This is the same decision that `ConstraintBuilder` made; deliberately
maintained for symmetry.

**Alternatives considered:**

- *Hoist field primitives (`SBNumberField`, `SBStateField`, etc.)
  into `src/components/ui/`*: premature abstraction. None of these
  are reused outside the builder today.
- *Split into a `SignalBuilder/` folder with one file per
  subcomponent*: rejected — folder pattern is unused elsewhere and
  the file stays navigable.

### Decision 2: Modal state lives in the store, not in `Page`-local state

`useTimingStore` gains `signalBuilderOpen: boolean` and
`signalBuilderInitial: SignalBuilderInitial | null`, plus
`openSignalBuilder(initial?)` and `closeSignalBuilder()` actions.

`SignalBuilderInitial` is `AnySignal | { mode: 'CLOCK' | 'BUS' | 'LINE' }`.
The `{ mode }` shape is used by the three Clock / Bus / Line shortcut
buttons to pre-select the type chip without seeding any other fields;
a full `AnySignal` will be used by the future Edit affordance.

Same reasoning as the constraint-builder Decision 2: the trigger
(`ComponentLibrary`) and the mount point (`Page`) are in different
files. Prop drilling through `Page` is worse than a store action.

**Alternatives considered:**

- *React context*: rejected — Zustand is already the established
  cross-component channel.
- *URL parameter*: rejected — transient authoring state, not
  navigation.
- *Page-local `useState`*: rejected — requires `Page` to grow state
  it doesn't need.

### Decision 3: The live preview uses the real `generateClockEdges` / `stateAt`

For CLOCK signals, the preview calls `generateClockEdges(draft, tMin,
tMax)` directly — the same path the main canvas uses to render PHI2.
For DATA signals, the preview iterates the in-form transitions list
and uses `stateAt(draft, t)` for initial conditions.

The cost is a few function calls per keystroke; bounded by the
visible-window event count. Zero observable latency at the W65C02S
scale.

A stripped preview-only renderer would inevitably drift from
production. The whole point of the preview is to be ground-truth.

### Decision 4: Reuse `ClockTrace` / `LineTrace` / `BusTrace` from `WaveformTimeline.tsx`

Same Decision 4 as the constraint builder. These three components
contain the canonical SVG path generation for the three signal
shapes. Re-implementing in the builder would either drift or copy.

**Coordination with the constraint-builder change**: if both PRs are
in flight, only one needs to land the named-export promotion. The
signal-builder PR's Task 2.x can be deleted in that case. If the
constraint-builder PR is already merged, just import the exports.

### Decision 5: Clock preview uses a fixed time window, not phase-dependent

The first iteration shifted `tMin` / `tMax` with phase, which made
high phase values look like a frequency change (the entire timeline
appeared to shift, leaving the user uncertain whether they had
changed phase or period). The corrected behavior anchors the time
window at `[-T, 2T]` independent of phase, and shifts only the
trace within that window. A faint vertical line at t=0 with a tiny
`t₀` label provides the fixed origin.

For negative phase, the rulers respect the SIGN of the user's input:
phase=-10 draws the φ bracket from t=0 leftward to the rising edge
at t=-10 (which is visible thanks to the `tMin = -T` choice). The
label reads `φ = -10 ns`, not the positive modular equivalent. This
is required for the input to round-trip with the visual feedback.

### Decision 6: Frequency stored as MHz, edited in user's chosen unit

The `ClockSignal` type defines `frequencyMHz: number`. The builder
keeps that as the canonical form, but the form input is split into
a numeric value + a unit selector (Hz / kHz / MHz / GHz), with the
selected unit converted to MHz at submit time and at every preview
re-evaluation. Decoupling the input unit from the storage unit:

- avoids forcing the user to do scientific notation for 1 Hz or
  10 GHz signals;
- preserves the upstream type as-is (no migration to a `frequencyHz`
  field, no `unit?: 'MHz'|'kHz'|...` field on the signal);
- keeps the displayed period / tick labels in friendly units (the
  builder picks ns / µs / ms / s automatically based on magnitude).

The unit choice is **not** persisted on the signal — it only exists
inside the builder. If a saved signal at `frequencyMHz: 0.001` is
re-opened for editing, the builder seeds `frequencyUnit = 'kHz'` and
`frequencyValue = 1`.

### Decision 7: Duty cycle edited as HIGH percent, LOW derived

The `ClockSignal` type defines `dutyCycle: number` in the half-open
interval `[0, 1)`. The form input is in percent (0-100), labeled
HIGH, with a small "low XX%" caption next to the suffix. Submit
converts to 0-1.

Same motivation as the frequency-unit decision: the storage unit
is not the most legible form for editing.

### Decision 8: Transitions edited inline; no detail drawer

The transitions table is editable inline — each row exposes a time
input, a segmented state selector, an optional value input (bus
only), and a delete button. Submit sorts by time on the fly. Out-of-
order entry surfaces an amber "out of order" warning + a manual
"sort by time" link; the form does not auto-sort on every keystroke
because that would jump the row the user is currently editing.

**Alternatives considered:**

- *Open each row in a detail drawer*: rejected — the data is shallow
  enough that inline editing is faster and shows all rows at once.
- *Visual drag-from-the-trace creation*: nice future, out of scope.

### Decision 9: Validation gates submit; semantically-fishy combinations don't

The submit button disables when ANY of these are true:

- name empty (after trim),
- type === CLOCK and frequency ≤ 0 or duty outside (0, 100),
- type === BUS or LINE and zero transitions or any transition time
  is NaN.

A signal whose first transition is at t=0 with the same state as the
baseState (a no-op) is still submittable; the solver tolerates it.
Name collisions with an existing signal surface as an amber warning
caption in the footer but do NOT block submit — the store allows
duplicates today, and the warning makes the choice explicit.

## Risks / Trade-offs

- **[Risk] The frequency unit selector adds a new form-state
  dimension that doesn't exist on `ClockSignal`** → Mitigation: it's
  derived state, scoped to the builder only. The signal itself is
  always stored in MHz, matching upstream. On Edit, the builder
  picks the most legible unit from the saved value
  (Decision 6, paragraph 4).
- **[Risk] The clock-rulers component does its own edge math
  (`phaseMod`, target rise, target fall, next rise) rather than
  consuming `generateClockEdges` output directly** → Trade-off
  accepted: the rulers need exactly two adjacent rising edges plus
  the falling edge between them, and they need to pin to "the cycle
  containing the user's typed phase" regardless of where it falls in
  the visible window. The current math is purely arithmetic and
  faster than walking the edges array. Unit tested.
- **[Risk] Inline transitions table on a long bus signal grows
  vertically** → Mitigation: the transitions list scrolls vertically
  within the form section (`max-h-[180px] overflow-y-auto`). For
  W65C02S the longest signal has 5 transitions — well within the
  scrollable area. Revisit when signals reach ≥ 20 transitions.
- **[Trade-off] No auto-sort on transition entry** → Accepted per
  Decision 8.

## Migration Plan

1. Land off `feature/add-signal-builder`. No feature flag.
2. Order of operations within the PR (see `tasks.md`):
   a. Store slice + actions, with a unit test in
      `__tests__/store/timingStore.test.ts`.
   b. (If not already done by the constraint-builder change)
      Promote `WaveformTimeline`'s trace renderers to named exports.
   c. New `src/components/features/SignalBuilder.tsx` plus its
      colocated test.
   d. Rewire `ComponentLibrary.handleAdd` and the three shortcut
      buttons; update its test.
   e. Mount `<SignalBuilder />` from `Page` and update the page
      integration test.
   f. Run `pnpm lint && pnpm test && pnpm build`.
3. **Rollback**: pure `git revert`. No data migrations. The store's
   expanded shape is additive; existing readers tolerate the new
   keys defaulting to `false` / `null`.
