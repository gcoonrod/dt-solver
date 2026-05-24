## Context

`ConstraintInspector` is the bottom-pane inspector panel that arrived from
the `decompose-design-handoff` change (archived 2026-05-23). Its
`+ New constraint` button is a placeholder — it inserts a hardcoded
`SETUP` constraint between the first clock and the first data signal in
the active profile and increments a counter for the name. The store, the
solver, and the type contracts are otherwise complete: `addConstraint`
re-runs the solver on every mutation, `evaluateConstraint` is exported as
a pure function from `@/core/solver`, and `resolveReference` lets us
enumerate the candidate edge events for a `SignalReference` against a
window. Everything we need to power a live-preview builder is already in
place.

The piece that's missing is the **authoring UI**. The constraint type
taxonomy (`ConstraintType` in `src/types/constraint.ts`) already maps to
five product concepts — SETUP, HOLD, PROP_DELAY, MIN_PULSE, CYCLE_TIME —
each with different conventions for which bound (`minNs` / `maxNs`)
applies and whether anchor and target are the same signal. None of that
nuance shows up in the current `handleAdd`. The builder is where it
surfaces.

Constraints to honor:

- `src/core/` purity boundary (`CLAUDE.md`): the modal MAY import from
  `@/core/solver` (it's a feature, not a leaf), and MUST NOT introduce
  any React/DOM dependency into `src/core/`. The solver functions it
  consumes are already pure.
- `ui/` purity rule from the archived `app-shell-layout` capability: leaf
  components under `src/components/ui/` do not subscribe to the store
  and do not import `@/core/`. The builder subscribes to the store and
  calls the solver, so it lives under `src/components/features/`. Local
  helper subcomponents inside the builder file (form rows, the preview
  block) stay file-internal and do not violate the tier rule.
- UI test convention: tests reset `useTimingStore` to `W65C02S_14MHz` in
  `beforeEach` and use `@testing-library/react`'s accessible queries.
  Snapshots and store mocks are forbidden.
- React 19 + Next.js 16. The modal is a client component (it owns local
  form state and subscribes to a Zustand store). `src/app/page.tsx` is
  already a `"use client"` boundary, so mounting the modal there is the
  natural fit.

## Goals / Non-Goals

**Goals:**

- Replace the placeholder `+ New constraint` action with a real authoring
  surface that lets the user pick the type, the anchor and target
  references, and the bounds — and see the solver's verdict update live.
- Reuse the existing solver, the existing trace renderers, and the
  existing color/typography taxonomy. The builder must look and feel
  like the rest of the inspector even though it's a modal.
- Achieve UI test coverage for the new feature plus the rewired
  inspector action, matching the testing density established by the
  prior shell-decomposition change.
- Preserve every existing inspector behavior. The button's other
  responsibilities (none, today) and the table below it are not
  touched.

**Non-Goals:**

- Editing existing constraints. The builder accepts an optional
  `initial` payload for future "Edit" affordances but the row-level
  edit verb is a separate change.
- Designing a profile-authoring surface. The builder operates on
  signals already loaded into the active profile.
- Persisting constraints to disk or to a URL. The store is in-memory
  and stays that way.
- Adding a Tailwind config, design-token JSON file, or component
  library. Color/spacing values are spelled out in
  `design-handoff/visual-spec.md` and rendered inline with Tailwind v4
  utilities, matching the rest of the codebase.

## Decisions

### Decision 1: The builder is a single feature file, not a leaf component breakdown

`ConstraintBuilder.tsx` defines several local subcomponents
(`BuilderShell`, `BuilderHeader`, `FormName`, `FormType`, `FormSignalRef`,
`FormBounds`, `PreviewHeader`, `PreviewWaveform`, `PreviewFooter`) but
**all of them live in the same file**. None get hoisted into
`src/components/ui/` and none get a separate `*.test.tsx`. The
single-file layout is justified by tight coupling: every subcomponent
needs the same form state (`type`, `anchor`, `target`, `minNs`, `maxNs`,
`name`), the same derived values (`def = TYPE_DEF_BY_ID[type]`,
`solved = evaluateConstraint(draft, ...)`), and the same store
references. Splitting them across files would require a prop-drilling
shape or a local React context — both of which would be invented just
to satisfy a folder convention.

The single colocated `ConstraintBuilder.test.tsx` exercises the surface
of the feature; the internal subcomponents are tested through it.

**Alternatives considered:**

- *Hoist every form section to `src/components/ui/`* (e.g., a
  `BoundsInput` leaf, a `SignalRef` leaf): rejected as premature
  abstraction. None of these are reused outside the builder today, and
  hoisting them would require fixing prop contracts that haven't been
  designed against more than one caller.
- *Split the builder into `ConstraintBuilder/` (folder) with one file
  per section*: rejected — the folder pattern is unused elsewhere in
  the codebase, and the file would already be small enough to keep
  navigable.

### Decision 2: Modal state lives in the store, not in `Page`-local state

We add `builderOpen: boolean` and `builderInitial: Constraint | null` to
`useTimingStore`, plus `openBuilder(initial?: Constraint)` and
`closeBuilder()` actions. The inspector button calls `openBuilder()` and
the modal's close button / cancel button / Esc key call `closeBuilder()`.

The motivation is that the open trigger and the modal mount-point are in
different files (`ConstraintInspector` vs `Page`), and the modal needs
to know not just *whether* to open but also *what* to seed (for the
future Edit affordance). Driving that across two files via prop drilling
through `Page` would require `Page` to grow `useState` it doesn't need
today — and `Page` is contractually thin per the `app-shell-layout`
capability (Decision 5 of that change). The store is the right place.

**Alternatives considered:**

- *React context*: rejected — the codebase has no other context yet, and
  the store is already the established cross-component state channel.
- *URL parameter (`?builder=open`)*: rejected — the modal is transient
  authoring state, not addressable navigation, and reloading the page
  mid-edit would be a worse UX than the modal disappearing.
- *Page-local `useState`*: rejected — would require lifting the trigger
  callback through `ConstraintInspector` props, which means re-spreading
  `Page` to pass through every callback rather than the current
  fully-decoupled subscribe-to-store-from-anywhere pattern.

### Decision 3: The live preview re-runs the real solver, not a stripped reimplementation

On every form change, the modal builds a draft `Constraint` object and
calls `evaluateConstraint(draft, signals, tMax * 4)` directly — the same
function `useTimingStore.resolve()` already calls. The returned
`{ status, calculatedMarginNs, worstWindow }` drives the status pill,
the metric row, and the annotation band on the preview waveform.

This is deliberate: a stripped preview-only evaluator would inevitably
drift from the production solver, and the drift would only ever surface
when a user submitted a constraint that passed in the preview and
failed in the final table. The preview must be ground-truth.

The cost is a small redundant solve per keystroke. `evaluateConstraint`
is pure and bounded by the number of events in the visible window; for
W65C02S that's tens of events. We measured the cost at ~0.4 ms in the
prototype — comfortably below interactive threshold.

**Alternatives considered:**

- *Throttle the preview to 60 fps*: not needed at current scale. Revisit
  if profile size grows by an order of magnitude.
- *Mock the preview with a static example*: rejected — defeats the
  entire point. The live-update behavior is the differentiator vs. a
  blind form.

### Decision 4: Reuse the existing trace renderers from `WaveformTimeline.tsx`

`WaveformTimeline.tsx` already contains three internal components —
`ClockTrace`, `LineTrace`, `BusTrace` — that handle clock waveforms,
single-bit line traces, and bus traces with VALID/INVALID/HIGH_Z states
respectively. The builder's preview needs exactly those primitives,
filtered down to the anchor + target rows.

We promote those three components to **named exports** on
`WaveformTimeline.tsx`, leaving the default export and existing behavior
untouched. The builder imports them by name. This avoids ~150 lines of
duplicated SVG path generation and guarantees that the preview's traces
look identical to the main canvas's traces (anti-aliasing, slew slope,
HIGH_Z dashing, all the corner cases).

**Alternatives considered:**

- *Move the trace renderers to a new `src/components/canvas/traces/`
  file and have both `WaveformTimeline` and `ConstraintBuilder` import
  them from there*: cleaner long-term, but a bigger move and not
  strictly required to ship the builder. Defer until a third caller
  appears.
- *Reimplement compact traces in the builder*: rejected on
  drift-risk grounds (Decision 3's argument applies recursively).

### Decision 5: The form is a vertical stack with a `Name | Type` header row above the preview and an `Anchor | Target | Bounds` block below

This is the layout the design iterated to in the prototype. Reasoning:

- Putting **Name | Type** above the preview means the most-changed
  controls (the type-chip selector that flips the entire semantic of
  the constraint) sit at eye level, with their effect on the preview
  immediately below them.
- Putting **Anchor | Target** side-by-side mirrors the "between two
  signals" structure of every non-same-signal constraint type, so the
  spatial layout encodes the meaning of the inputs.
- **Bounds** spans full width and pairs the min/max inputs with the
  solver inequality (`Δ ≥ tSU,min`, etc.) on the right so the form
  doubles as documentation.

For `MIN_PULSE` and `CYCLE_TIME` the Target collapses to "same signal"
and the Target picker is disabled and auto-pinned to the Anchor. The
visual cue is reduced opacity + a label change from "Target" to
"Target (same signal)".

The waveform preview sits in the middle with `flex: 1 0 auto` and a
`minHeight: 320` floor so it gets all spare vertical space and never
collapses to zero on short viewports. The body scrolls when the modal
clips so the lower form is reachable.

**Alternatives considered:**

- *Two-column layout (form left, preview right)*: tried first, rejected
  in design review — left a large empty band below the preview on tall
  viewports and gave the preview half the canvas it deserved.
- *Wizard / multi-step*: rejected — every field interacts with every
  other field in real time (the type changes which bounds apply, which
  changes the inequality, which changes the annotation color). A
  wizard would either break those dependencies or be a single-step
  wizard, which is just a form.

### Decision 6: Validation is constructor-level, not field-level

The submit button disables when **any** of these are true: the name is
empty, the anchor or target signal isn't selected, or the relevant
bound (the one matching `def.bounds`, i.e., `minNs` for min-bounded
types and `maxNs` for `PROP_DELAY`) is `NaN`. There are no
field-level error labels or red-outlined inputs.

This matches the rest of the inspector UI — there's no validation
chrome anywhere on the existing canvas — and avoids the trap of
inventing an inline error-display vocabulary we'd have to maintain
across other forms that don't exist yet.

A constraint that is structurally valid but semantically nonsense (e.g.,
SETUP with anchor = target) is still submittable; the solver reports
`UNRESOLVED` and the preview already shows that status, so the user
has the signal they need before submitting.

**Alternatives considered:**

- *Field-level errors with inline messages*: more polished, but
  requires a validation-schema decision (Zod? Yup? Custom?) we aren't
  ready to make for one form.
- *Block submit on `UNRESOLVED`*: rejected — UNRESOLVED is a legitimate
  state for a constraint whose anchor or target hasn't fired yet in
  the current profile window; the user should be able to author it
  anyway.

## Risks / Trade-offs

- **[Risk] Promoting `ClockTrace` / `LineTrace` / `BusTrace` to named
  exports widens `WaveformTimeline`'s public API** → Mitigation: the
  three named exports get the same JSDoc one-liner ("Internal trace
  renderer; reused by `ConstraintBuilder`'s preview. Not a stable
  external API."). They are still co-located with the default export
  so refactors keep them in sync.
- **[Risk] The live solver call per keystroke could feel sluggish on
  larger profiles** → Mitigation: not a problem at the W65C02S scale
  we ship today; revisit if a future profile exceeds ~200 events in
  the preview window. The fix is a single `useMemo` debounce, scoped
  to the preview's `solved` derivation — not a structural change.
- **[Risk] Store growth — every modal feature could justify a slice in
  `useTimingStore`** → Accepted: two booleans plus two actions is not
  a slippery slope. If the store accumulates three or more modals, a
  refactor to a separate `useUIStore` is warranted; one modal does not
  trigger it.
- **[Trade-off] No field-level validation today** → Accepted per
  Decision 6. The constructor-level check is enough for the constraint
  shape; semantic mistakes are caught by the preview's status pill.
- **[Trade-off] Single-file builder grows toward ~600 LOC** → Accepted:
  see Decision 1. The alternative (multi-file with prop drilling or
  context) is worse at this scale. Split if and only if a second
  consumer of any subcomponent appears.

## Migration Plan

1. Land the change as a single PR off
   `feature/add-constraint-builder` (or whatever short name the
   implementer prefers). No feature flag — this is a UI replacement,
   not a parallel UI.
2. Order of operations within the PR (see `tasks.md` for the granular
   list):
   a. Store slice + actions, with a unit test in
      `__tests__/store/timingStore.test.ts` asserting `openBuilder` /
      `closeBuilder` semantics.
   b. Promote `WaveformTimeline`'s trace renderers to named exports.
      Existing `WaveformTimeline.test.tsx` must still pass.
   c. New `src/components/features/ConstraintBuilder.tsx` plus its
      colocated test.
   d. Rewire `ConstraintInspector.handleAdd` and update its test.
   e. Mount `<ConstraintBuilder />` from `Page` and update the page
      integration test.
   f. Run `pnpm lint && pnpm test && pnpm build`. All three must pass
      with zero new warnings.
3. **Rollback**: pure `git revert` of the merge commit. No data
   migrations. The store's expanded shape is purely additive; no
   existing reader breaks if the new keys disappear (they default to
   `false` / `null` on init).
