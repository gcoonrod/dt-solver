## 1. Store: add modal-state slice and lifecycle actions

- [x] 1.1 Extend the `TimingState` interface in `src/store/useTimingStore.ts` with two new state keys (`builderOpen: boolean`, `builderInitial: Constraint | null`) and two new actions (`openBuilder: (initial?: Constraint) => void`, `closeBuilder: () => void`).
- [x] 1.2 Initialize `builderOpen: false` and `builderInitial: null` in the store factory. Implement `openBuilder` to `set({ builderOpen: true, builderInitial: initial ?? null })` and `closeBuilder` to `set({ builderOpen: false, builderInitial: null })`. Do not touch `addConstraint`, `removeConstraint`, or any other existing action.
- [x] 1.3 Add a Vitest case to `__tests__/store/timingStore.test.ts` (the existing logic-path test file): assert the initial state has `builderOpen === false`; call `openBuilder()` and assert `builderOpen === true` and `builderInitial === null`; call `openBuilder(someConstraint)` and assert `builderInitial` is the passed value; call `closeBuilder()` and assert both keys reset to their initial values.
- [x] 1.4 Run `pnpm test:logic` and confirm the new case passes alongside every existing case.

## 2. Expose trace renderers as named exports on `WaveformTimeline.tsx`

- [x] 2.1 In `src/components/canvas/WaveformTimeline.tsx`, change the `function ClockTrace(...)`, `function LineTrace(...)`, and `function BusTrace(...)` declarations from file-internal to `export function`. Their prop types (`ClockTraceProps`, `LineTraceProps`, `BusTraceProps`) also get exported.
- [x] 2.2 Add a JSDoc one-liner above each newly-exported function: `/** Internal trace renderer; reused by ConstraintBuilder's preview. Not a stable external API. */`. The default export is unchanged.
- [x] 2.3 Run `pnpm test:ui` and confirm `src/components/canvas/WaveformTimeline.test.tsx` still passes (no behavior change).

## 3. Create `src/components/features/ConstraintBuilder.tsx`

- [x] 3.1 Create the file as a `"use client"` component. Mirror the prototype's structure: a top-level `ConstraintBuilder` exported as default that subscribes to `useTimingStore((s) => s.builderOpen)` and `useTimingStore((s) => s.builderInitial)`, returns `null` when closed, and otherwise renders a `<BuilderShell />` inside a full-viewport backdrop.
- [x] 3.2 The backdrop is a fixed-position overlay (`fixed inset-0 z-50`) with a translucent dark background. Clicking the backdrop (`e.target === e.currentTarget`) closes the modal. The shell itself stops propagation on `onMouseDown` so clicks inside don't leak to the backdrop.
- [x] 3.3 Inside `<BuilderShell />`, manage local form state: `name`, `nameTouched`, `type` (defaults to `'SETUP'` or `initial?.type`), `anchor` (default: first clock + `'FALLING'`), `target` (default: first data + `'TRANSITION'`), `minNs` (default: `20` or `initial?.minNs`), `maxNs` (default: `30` or `initial?.maxNs`). Use the `key={openSession}` trick from the prototype so the form resets on every fresh open.
- [x] 3.4 Define the constraint type taxonomy locally (constant `TYPE_DEFS` array of five entries, one per `ConstraintType`, each with `{ id, label, sym, blurb, inequality, bounds: 'min' | 'max', sameSignal: boolean, swatch: keyof typeof SWATCH_BG, accent: string }`). Mirror the prototype's content. Build a `TYPE_DEF_BY_ID` lookup for cheap access.
- [x] 3.5 Auto-derive the `name` field from `type` + `target.signalId` (e.g., `tSU — addr setup`) and re-derive on every change unless `nameTouched === true`. A small "reset" affordance toggles `nameTouched` back to `false`.
- [x] 3.6 For `MIN_PULSE` and `CYCLE_TIME` (`def.sameSignal === true`), force `target.signalId === anchor.signalId` and disable the target signal/edge controls. Use a `useEffect` to keep the target synced when the user changes anchor while a same-signal type is active.
- [x] 3.7 On every form change, build a draft `Constraint` and pass it to `evaluateConstraint(draft, signals, 200)` imported from `@/core/solver`. Memoize via `useMemo` keyed on `[name, type, anchor, target, minNs, maxNs, signals]`. Catch and downgrade evaluator errors to `status: 'UNRESOLVED'`.
- [x] 3.8 Render the modal body as a vertical stack inside `<div className="flex flex-col">`: (a) the `Name | Type` row (2-column grid, ~1:2 width ratio), (b) a `flex: '1 0 auto', minHeight: 320` preview block with 16px gutters above and below, (c) the `Anchor | Target` row (2-column grid, equal width), (d) the full-width `Bounds` row.
- [x] 3.9 Form-section chrome (`FormSection` helper): every row has a `label` (uppercase 10px slate-500), an optional `kbd` (mono 9.5px slate-600), and an optional `action` (right-aligned, e.g., the name's "reset" link). The chrome is single-line via `whitespace-nowrap` on the label container — see the visual spec for tokens.
- [x] 3.10 Type chips render as a 5-column grid of single-line inline labels formatted as `tSU · Setup`, `tH · Hold`, etc. The active chip uses the `SWATCH_BG[def.swatch]` class plus `font-medium`; inactive chips use slate borders. Whole-chip `title={def.blurb}` provides the hover tooltip.
- [x] 3.11 Signal-reference picker renders as a 2-column row: signal-name `<select>` on the left (with a colored dot indicator using the signal's `color`), an edge-direction toggle group on the right. Clocks expose `RISING` / `FALLING`; data signals expose `TRANSITION` / `RISING` / `FALLING`. The accent color on the active edge button differs between anchor (`#fde047` yellow) and target (`#22d3ee` cyan) to match the prototype's preview annotations.
- [x] 3.12 Bounds row renders both `min` and `max` inputs at a fixed combined width (~440px) on the left and dims (`opacity-40` + `disabled`) whichever the active type doesn't use. The right side shows the inequality (`Δ ≥ tSU,min` for SETUP, etc.) plus a one-line notation hint ("Δ measured between anchor & target events" vs. "pulse / period measured on anchor signal"). The wide row visually balances rather than feeling hollow.
- [x] 3.13 The preview block renders `<PreviewHeader />` (live indicator + solver-mode caption), the `<PreviewWaveform />` (compact 1- or 2-row waveform with the constraint annotation overlay), and `<PreviewFooter />` (4 metrics: required / calculated / slack / status — color-shifted on FAIL).
- [x] 3.14 `<PreviewWaveform />` reuses the imported `ClockTrace` / `LineTrace` / `BusTrace` from `@/components/canvas/WaveformTimeline` for the per-signal trace rendering. It picks the time window dynamically: center on `(solved.worstWindow.anchorTimeNs + solved.worstWindow.targetTimeNs) / 2` if defined, otherwise center on 50ns; `reach = max(40, |aT - tT| * 3 + 20)`.
- [x] 3.15 The constraint-annotation overlay draws a colored band between the anchor and target events (green on PASS, red on FAIL), dashed verticals at each event, a horizontal Δ arrow with double-ended markers, and a centered pill displaying `Δ {value} ns` over `req ≥ X ns · slack ±Y ns`. The label color follows status. Place the band's `yTop` 20px below the time-axis line so anchor/target labels don't overlap the tick text.
- [x] 3.16 Event-needle markers (small hollow circles) render at every candidate event in the window — anchor edges in yellow, target edges in cyan — so the user can see what the solver considered.
- [x] 3.17 Status pill in the header: `live · pass` (emerald), `live · fail` (rose), or `live · unresolved` (amber). Footer of the modal contains a `Cancel` text button and an `Add constraint` primary button (slate-100 fill); the primary disables when form is invalid (see Decision 6 in `design.md`).
- [x] 3.18 Keyboard shortcuts: `Esc` closes the modal, `Cmd/Ctrl+Enter` submits when valid. Register the listener with `useEffect` and clean up on unmount.
- [x] 3.19 Submit: build the final `Constraint` shape (assign a fresh id, `c-${Date.now().toString(36)}`), call `useTimingStore.getState().addConstraint(c)`, then call `closeBuilder()`.

## 4. Test the new feature

- [x] 4.1 Create `src/components/features/ConstraintBuilder.test.tsx`. Reset `useTimingStore` to `W65C02S_14MHz` in `beforeEach`. The test file imports `render`, `screen`, `within`, `fireEvent`, and `userEvent` from `@testing-library/react` / `@testing-library/user-event`.
- [x] 4.2 Case: "does not render when builderOpen is false" — initial render with default state must produce no element with `role="dialog"` (or whatever the modal's outermost element conveys). The modal must not be in the DOM at all.
- [x] 4.3 Case: "renders the modal when openBuilder is dispatched" — call `useTimingStore.getState().openBuilder()`, re-query, and assert the modal is present and the default `Name` input has a non-empty value (the auto-derived one).
- [x] 4.4 Case: "type chip selection updates the inequality hint" — open the modal, click the `tPD · Prop Delay` chip, assert the bounds row now shows the `Δ ≤ tPD,max` inequality. Then click `tSU · Setup` and assert it shows `Δ ≥ tSU,min`.
- [x] 4.5 Case: "MIN_PULSE collapses target to same signal" — open the modal, click the `Min Pulse` chip, assert the target signal `<select>` is disabled and its current value equals the anchor signal's id. Change the anchor and assert the target follows.
- [x] 4.6 Case: "live preview reports PASS for a permissive bound" — open, pick SETUP between the W65C02S clock (FALLING) and ADDR (TRANSITION), set min to a small value (e.g., 1 ns). Assert the status pill text matches `/live · pass/i` and the slack readout is positive.
- [x] 4.7 Case: "live preview reports FAIL when bound is bumped past the calculated margin" — same as 4.6 but set min to a value comfortably above the actual margin (e.g., 200 ns). Assert the status pill matches `/live · fail/i`.
- [x] 4.8 Case: "submit dispatches addConstraint and closes the modal" — open, fill in valid values, click `Add constraint`, assert `useTimingStore.getState().builderOpen === false` and that the constraints array length grew by 1 with the right name/type/anchor/target/bounds.
- [x] 4.9 Case: "Esc closes the modal without dispatching addConstraint" — open the modal, fire `keydown` with `key: 'Escape'`, assert `builderOpen === false` and the constraints array length is unchanged.
- [x] 4.10 Case: "Cmd+Enter submits when valid" — open the modal, fill in valid values, fire `keydown` with `key: 'Enter'` and `metaKey: true`, assert the constraint was added and the modal closed.

## 5. Rewire `ConstraintInspector` to open the modal

- [x] 5.1 In `src/components/panels/ConstraintInspector.tsx`, replace the body of `handleAdd` with a single call `useTimingStore.getState().openBuilder()`. Delete the existing default-constraint-construction code (the `clock`, `data`, `n`, and `addConstraint({ ... })` block).
- [x] 5.2 Update `src/components/panels/ConstraintInspector.test.tsx`: existing case asserting the click adds a constraint must change to assert the click opens the builder. Specifically: render the inspector, click the `+ New constraint` button, assert `useTimingStore.getState().builderOpen === true`. Add a second case asserting `addConstraint` is NOT called when the button is clicked (the modal owns that responsibility now).

## 6. Mount the modal from `Page` and update its integration test

- [x] 6.1 In `src/app/page.tsx`, import `ConstraintBuilder` and render it as a sibling of the existing layout (placement is irrelevant — it's `position: fixed`). Pattern: place it after the bottom inspector pane so the source order matches the visual stack order.
- [x] 6.2 Add a case to `src/app/page.test.tsx`: render the page, dispatch `openBuilder()` from outside the page, assert the modal becomes present in the DOM; dispatch `closeBuilder()`, assert it becomes absent.

## 7. Final verification

- [x] 7.1 Run `pnpm lint`, `pnpm test`, and `pnpm build`. All three must pass with zero new warnings.
- [ ] 7.2 Boot `pnpm dev` and run the manual smoke list from `design-handoff/visual-spec.md` § Acceptance — open the modal, exercise each constraint type, confirm the preview animates with form changes, confirm Esc / backdrop click / Cancel button all close, confirm submit adds a row to the inspector table.
- [x] 7.3 Run `openspec validate add-constraint-builder --strict` and resolve any reported issues.
- [ ] 7.4 Archive the change once merged: `openspec archive add-constraint-builder` (matches the project convention from `.claude/commands/opsx/archive.md`).
