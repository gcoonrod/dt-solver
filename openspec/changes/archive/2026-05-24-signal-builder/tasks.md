## 1. Store: add modal-state slice and lifecycle actions

- [x] 1.1 Extend the `TimingState` interface in `src/store/useTimingStore.ts` with two new state keys (`signalBuilderOpen: boolean`, `signalBuilderInitial: SignalBuilderInitial | null`) and two new actions (`openSignalBuilder: (initial?: SignalBuilderInitial) => void`, `closeSignalBuilder: () => void`).
- [x] 1.2 Define the `SignalBuilderInitial` type either inline in `useTimingStore.ts` or in `src/types/signal.ts`: `type SignalBuilderInitial = AnySignal | { mode: 'CLOCK' | 'BUS' | 'LINE' };`. The `{ mode }` shape is used by the three Clock / Bus / Line shortcut buttons to pre-select the type chip without seeding any other fields.
- [x] 1.3 Initialize `signalBuilderOpen: false` and `signalBuilderInitial: null` in the store factory. Implement `openSignalBuilder` to `set({ signalBuilderOpen: true, signalBuilderInitial: initial ?? null })` and `closeSignalBuilder` to `set({ signalBuilderOpen: false, signalBuilderInitial: null })`. Do not touch `addSignal`, `removeSignal`, or any other existing action.
- [x] 1.4 Add a `describe('signal builder modal lifecycle', () => { ... })` block to `__tests__/store/timingStore.test.ts`: initial state has the builder closed; `openSignalBuilder()` opens it with `signalBuilderInitial: null`; `openSignalBuilder({ mode: 'CLOCK' })` seeds with the mode hint; `openSignalBuilder(someSignal)` seeds with the full signal; `closeSignalBuilder()` resets both keys; signals/constraints/solved are reference-equal across open + close.
- [x] 1.5 Run `pnpm test:logic` and confirm.

## 2. (Conditional) Expose trace renderers as named exports on `WaveformTimeline.tsx`

> **Skip this section if the `add-constraint-builder` change has already landed it.** Both changes need the same exports; only one of them needs to do the promotion.

- [x] 2.1 In `src/components/canvas/WaveformTimeline.tsx`, change the `function ClockTrace(...)`, `function LineTrace(...)`, and `function BusTrace(...)` declarations from file-internal to `export function`. Their prop types (`ClockTraceProps`, `LineTraceProps`, `BusTraceProps`) also get exported.
- [x] 2.2 Add a JSDoc one-liner above each newly-exported function: `/** Internal trace renderer; reused by signal/constraint builder previews. Not a stable external API. */`. The default export is unchanged.
- [x] 2.3 Run `pnpm test:ui` and confirm `WaveformTimeline.test.tsx` still passes (no behavior change).

## 3. Create `src/components/features/SignalBuilder.tsx`

- [x] 3.1 Create the file as a `"use client"` component. Mirror the prototype's structure: a top-level `SignalBuilder` exported as default that subscribes to `useTimingStore((s) => s.signalBuilderOpen)` and `useTimingStore((s) => s.signalBuilderInitial)`, returns `null` when closed, and otherwise renders a `<BuilderShell />` inside a full-viewport backdrop.
- [x] 3.2 Backdrop chrome — same as `ConstraintBuilder`: `fixed inset-0 z-50`, translucent dark backdrop, click-outside-closes via `e.target === e.currentTarget`, shell stops propagation.
- [x] 3.3 Use a `key={openSession}` trick on the shell so re-opens get fresh state. Increment `openSession` whenever `signalBuilderInitial` changes while `open === true` — the three Clock / Bus / Line shortcut buttons re-open with different `{ mode }` hints while the modal is already mounted, and the shell needs to re-seed.
- [x] 3.4 In `<BuilderShell />`, manage local form state:
   - `typeId: 'CLOCK' | 'BUS' | 'LINE'` — defaults from `initial?.mode`, or derived from `initial` if it's a full signal, otherwise `'LINE'`
   - `name`, `nameTouched`, `description`, `color`
   - `riseTimeNs`, `fallTimeNs`, `slewLinked`
   - Clock-only: `frequencyValue`, `frequencyUnit`, `dutyHighPct`, `phaseOffsetNs`
   - Data-only: `widthBits`, `baseState`, `transitions[]`
- [x] 3.5 Define `TYPE_DEFS` taxonomy locally: three entries `{ id, label, sym, icon, swatch, blurb }` for CLOCK / BUS / LINE. Mirror the prototype contents. CLOCK → 'sky', BUS → 'amber', LINE → 'violet'.
- [x] 3.6 Define `FREQ_UNITS = ['Hz', 'kHz', 'MHz', 'GHz']` and `FREQ_TO_MHZ = { Hz: 1e-6, kHz: 1e-3, MHz: 1, GHz: 1e3 }`. The `frequencyMHz` field of the draft signal is computed as `Number(frequencyValue) * FREQ_TO_MHZ[frequencyUnit]`.
- [x] 3.7 Auto-derive the `name` field from `typeId` + signal count (e.g. `CLK6`, `BUS6[7:0]`, `SIG6`) and re-derive on every change unless `nameTouched === true`. A small "reset" affordance toggles `nameTouched` back to `false`.
- [x] 3.8 For BUS / LINE, switching `typeId` re-seeds `baseState` (BUS → `INVALID`, LINE → `LOW`), `widthBits` (BUS → 8, LINE → 1), and the `transitions[]` array with sensible defaults (3 rows for either kind). Use a `useEffect` that depends only on `typeId`.
- [x] 3.9 Build a `draft: AnySignal` via `useMemo`. For CLOCK, `{ type: 'CLOCK', frequencyMHz: frequencyValue * FREQ_TO_MHZ[unit], dutyCycle: dutyHighPct / 100, phaseOffsetNs, ... }`. For DATA, `{ type: 'DATA', baseState, transitions: [...transitions].sort(byTime), widthBits?, ... }`. Always include `riseTimeNs` / `fallTimeNs` on the result.
- [x] 3.10 Render the modal body as a vertical stack: (a) Name | Type row at top (2-col grid 1fr / 2fr), (b) `flex: '1 0 auto'`, `minHeight: 300px` preview block with 16px gutters above and below, (c) the type-conditional config rows beneath.
- [x] 3.11 Form-section chrome (`SBFormSection` helper): label / kbd-hint / optional action — same chrome as `ConstraintBuilder`'s `FormSection`. Single-line via `whitespace-nowrap`.
- [x] 3.12 Type chips: 3-column grid, format `<icon> Clock clk` / `<icon> Bus [n:0]` / `<icon> Line 1b`. Active chip uses `SWATCH_SB[def.swatch].active` (background tint, border tint, inset shadow, font-medium). Inactive uses slate border on dark bg.
- [x] 3.13 `<SBHeader />` shows the type icon in a 28×28 badge using `SWATCH_SB[def.swatch].icon`, a "New Signal / <Type>" title, and a live readout pill on the right (period @ freq for clocks, valid-window count for buses, edge count for lines).
- [x] 3.14 Footer with kbd shortcuts (esc / ⌘↩), validity caption (red for blocking errors, amber for name-collision warning), Cancel + Add signal buttons.
- [x] 3.15 Validation: see Decision 9 in `design.md`. `validity = { ok: boolean, reason?: string }`. Add a `explainValidity(reason)` helper that returns user-facing copy.

## 4. Clock parameters section

- [x] 4.1 Render in a 4-column grid: Frequency | Duty | Phase | Slew.
- [x] 4.2 `<SBFreqField />`: 3-part input — label `FREQ`, numeric input, unit dropdown. Unit dropdown uses a native `<select>` styled to look like a suffix label. Min-width 56px so the longest unit ("MHz" → "MHZ" with uppercase tracking) doesn't clip. Options: Hz / kHz / MHz / GHz.
- [x] 4.3 `<SBDutyField />`: 3-part input — label `HIGH`, numeric input (0-100), right caption "% / low XX%". The low percentage is derived as `100 - Number(value)` and shown live.
- [x] 4.4 `<SBNumberField />` for phase — label `PHASE`, numeric input (any sign), suffix `ns`. Note: negative phase is intentional, do not clamp.
- [x] 4.5 `<SBSlewField />`: two numeric inputs (rise, fall) with a link/unlink toggle between them. When linked, editing one updates the other. Suffix `ns`.

## 5. Clock preview waveform with rulers

- [x] 5.1 In `<SBPreviewWaveform />`, branch on `typeId`. For CLOCK, set `tMin = -T`, `tMax = 2*T` where `T = 1000 / draft.frequencyMHz`. **This is a fixed window — do not let phase shift it.**
- [x] 5.2 For CLOCK, set `rowH = 140` (extra vertical room for rulers above + below the trace). For BUS / LINE, keep `rowH = 80`.
- [x] 5.3 Render the trace via the imported `ClockTrace` from `@/components/canvas/WaveformTimeline`.
- [x] 5.4 Draw a bold t=0 reference line over the whole row when `tMin < 0 < tMax`. Place a tiny `t₀` label at the top of the line. Stroke: `rgba(180,200,220,0.45)`, width 1.2.
- [x] 5.5 Format tick labels via a `sbFormatTickWithStep(t, niceStep)` helper that picks the unit ONCE from the niceStep magnitude. Without this, the zero tick may render as `0 ns` while neighbours read `100 ps` — a regression filed and fixed during design review.
- [x] 5.6 Add `<defs>` with `sbArrL` / `sbArrR` arrow markers (left-pointing and right-pointing triangles, 6×6 viewport, `fill="currentColor"`).
- [x] 5.7 Add `<SBClockRulers />` component rendered AFTER the trace so labels sit on top. See § 6.

## 6. SBClockRulers — overlay annotations

- [x] 6.1 Compute the rising/falling edges to anchor on:
   - `T = 1000 / frequencyMHz`
   - `highDur = dutyCycle * T`
   - `phaseMod = ((phase % T) + T) % T`
   - `targetRise = phase >= 0 || phaseMod === 0 ? phaseMod : phaseMod - T`  // [-T, T)
   - `firstFall = targetRise + highDur`
   - `nextRise = targetRise + T`
   The `phase >= 0` branch is load-bearing — without it, `phase = -10` modulo-normalizes to +61.43 and the rulers anchor on the wrong cycle.
- [x] 6.2 Period ruler above the trace at `y = yTop - 11`, neutral slate color, label `T = <sbFormatTime(T)>`, between `targetRise` and `nextRise`.
- [x] 6.3 High-duration ruler below the trace at `y = yTop + sigH + 12`, color = the signal's `color`, label `tH = <sbFormatTime(highDur)>`, between `targetRise` and `firstFall`.
- [x] 6.4 Low-duration ruler at the same `y` as tH, neutral slate, label `tL = <sbFormatTime(T - highDur)>`, between `firstFall` and `nextRise`.
- [x] 6.5 Phase ruler at `y = yBelow + 18`, yellow (`#fde047`), dashed line, label `φ = <sbFormatTime(phase)>` (the user's typed value, not the modular equivalent). Show only when `|phase| > 1e-9`. Endpoints: `t = 0` and `t = targetRise` (so negative phase points left, positive points right).
- [x] 6.6 `<SBRulerBracket />`: end-tick lines at x1 and x2 (4px tall), horizontal line between them with `sbArrL` / `sbArrR` markers, optional dashed stroke for phase ruler, centered label with a small dark-rect backdrop so it reads over the trace. Hide the label when the bracket is too narrow (`< 22px`) to render legibly.

## 7. BUS / LINE parameters section

- [x] 7.1 First row — Initial State: a 2-col (LINE) or 3-col (BUS) grid containing `<SBStateField />` (segmented state selector with options `LOW`/`HIGH`/`HIGH_Z` for LINE, `VALID`/`INVALID`/`HIGH_Z` for BUS), optional `<SBNumberField label="width" suffix="bits" min={2} />` for BUS, and `<SBSlewField />`.
- [x] 7.2 Transitions editor: a `<SBTransitionsEditor />` with header (label `Transitions`, count, "out of order" warning + "sort by time" action when applicable, "+ add row" action). Rows are `<SBTransitionRow />` instances in a `flex flex-col gap-1 max-h-[180px] overflow-y-auto pr-1` container. Empty state: a dashed-border placeholder card prompting `+ add row`.
- [x] 7.3 Each `<SBTransitionRow />` is a `grid items-stretch gap-1.5` with columns:
   - 24px ordinal (`1.`, `2.`, …)
   - time input (`<input type="number">` + `ns` suffix)
   - segmented state selector (states from § 7.1)
   - (BUS only) value text input — disabled when state !== VALID
   - 28px trash button
- [x] 7.4 Adding a row inserts at the end with `timeNs = lastTime + 25`, an alternating state, a generated id, and (for BUS with VALID state) a default value like `0x00`.
- [x] 7.5 Removing a row filters by id.
- [x] 7.6 Editing state implicitly updates `direction` — `HIGH` → `RISING`, `LOW` → `FALLING`, else `TRANSITION`. The form does not expose the `direction` field directly.

## 8. Appearance row (shared)

- [x] 8.1 `<SBAppearanceRow />`: a `grid grid-cols-[auto_1fr] gap-3 items-stretch` row with the color palette on the left and the description input on the right.
- [x] 8.2 Color palette: 8 swatches from `COLOR_PALETTE = ['#22d3ee', '#f59e0b', '#a78bfa', '#f472b6', '#a3e635', '#fb7185', '#38bdf8', '#34d399']`. Active swatch has a 2px ring. Colors already in use by other signals render dim with a diagonal slash overlay; clicking still works (the store allows duplicates).
- [x] 8.3 Description: a single-line text input with placeholder text.

## 9. Submit and keyboard shortcuts

- [x] 9.1 On submit (`Add signal` button or `⌘/Ctrl + Enter`): assemble the final `AnySignal` shape with a fresh id (`sig-${Date.now().toString(36)}`), call `useTimingStore.getState().addSignal(signal)`, then call `closeSignalBuilder()`.
- [x] 9.2 `Esc` closes the modal without dispatching `addSignal`.
- [x] 9.3 Register the keydown listener with `useEffect`; clean up on unmount.

## 10. Test the new feature

- [x] 10.1 Create `src/components/features/SignalBuilder.test.tsx`. Reset `useTimingStore` to `W65C02S_14MHz` in `beforeEach`. Imports as `ConstraintBuilder.test.tsx`.
- [x] 10.2 Case: "does not render when signalBuilderOpen is false" — no element with the modal heading.
- [x] 10.3 Case: "renders when openSignalBuilder() is dispatched" — modal appears, default type is LINE.
- [x] 10.4 Case: "openSignalBuilder({ mode: 'CLOCK' }) pre-selects the Clock chip" — Clock chip has the active class, clock-params section is rendered.
- [x] 10.5 Case: "switching type chips re-seeds the form" — switch from Clock to Bus, assert the transitions editor is now rendered and the Clock params section is gone.
- [x] 10.6 Case: "frequency unit conversion" — set frequency value to `2.5` and unit to `GHz`, click Add, assert the new signal has `frequencyMHz === 2500`.
- [x] 10.7 Case: "duty percent conversion" — set duty to `60`, click Add, assert `dutyCycle === 0.6`.
- [x] 10.8 Case: "low duty caption derives live" — set duty to `40`, assert the caption next to the input reads `low 60%`.
- [x] 10.9 Case: "negative phase renders the phi ruler on the left of t=0" — open clock builder, set phase to `-10`, query the φ ruler bracket, assert it lies to the LEFT of the t=0 vertical reference line. (Use bounding rect comparisons.)
- [x] 10.10 Case: "transitions editor add row" — open in BUS mode, click "+ add row", assert the rows count grew by 1 and the new row has a time ≥ the previous row's time.
- [x] 10.11 Case: "transitions editor remove row" — open in LINE mode (which seeds 3 rows), click the trash on the middle row, assert 2 rows remain.
- [x] 10.12 Case: "sort by time appears when out of order" — open in LINE mode, edit row 2's time to a value less than row 1's, assert the "out of order" warning shows; click "sort by time", assert ordering normalizes and warning disappears.
- [x] 10.13 Case: "submit dispatches addSignal and closes the modal" — open, fill in valid clock fields, click Add, assert `signalBuilderOpen === false` and the signals array length grew by 1 with the expected shape (`type: 'CLOCK'`, the right name/color/freq/duty/phase/slew).
- [x] 10.14 Case: "Esc closes without dispatching" — open, fire keydown Escape, assert `signalBuilderOpen === false` and `signals.length` is unchanged.
- [x] 10.15 Case: "Cmd+Enter submits when valid" — open with valid form, fire keydown Enter with metaKey: true, assert the signal was added.

## 11. Rewire ComponentLibrary to open the modal

- [x] 11.1 In `src/components/panels/ComponentLibrary.tsx`, replace the body of `handleAdd` with `useTimingStore.getState().openSignalBuilder()`. Delete the existing default-signal-construction code (palette / used-set / `addSignal({...})` block).
- [x] 11.2 Add a sibling `handleAddOfType(mode)` that calls `useTimingStore.getState().openSignalBuilder({ mode })`.
- [x] 11.3 Wire each of the three Clock / Bus / Line shortcut buttons in the `[{ label: 'Clock', icon: 'square-wave' }, ...]` array to call `handleAddOfType('CLOCK' | 'BUS' | 'LINE')`. Also add a hover state — `hover:text-slate-200` — so the buttons read as interactive.
- [x] 11.4 The `addSignal` selector at the top of the component (`const addSignal = useTimingStore((s) => s.addSignal);`) is no longer used; remove it.
- [x] 11.5 Update `src/components/panels/ComponentLibrary.test.tsx`:
   - Existing case asserting "clicking Add Signal adds a constraint" must change to assert "clicking Add Signal calls openSignalBuilder()".
   - Add three new cases — one per shortcut button — asserting each calls `openSignalBuilder({ mode: <X> })`.
   - Add an assertion that clicking these buttons does NOT directly insert into `signals`.

## 12. Mount the modal from Page and update its integration test

- [x] 12.1 In `src/app/page.tsx`, import `SignalBuilder` and render it as a sibling of the existing layout, alongside `ConstraintBuilder`. Pattern: place after both panels so source order matches the visual stack order.
- [x] 12.2 Add a case to `src/app/page.test.tsx`: render the page; assert no modal heading; dispatch `openSignalBuilder()`; assert the modal heading is present; dispatch `closeSignalBuilder()`; assert it's gone again.

## 13. Final verification

- [x] 13.1 Run `pnpm lint`, `pnpm test`, and `pnpm build`. All three must pass with zero new warnings.
- [ ] 13.2 Boot `pnpm dev` and run the manual smoke list from `design-handoff/signal-builder/visual-spec.md` § Acceptance — open the modal from `+ Add Signal`; switch through all three type chips; for CLOCK, change frequency unit / duty / phase (including negative) and confirm the rulers update; for BUS, add/remove transition rows and edit values; submit and confirm a row appears in `ComponentLibrary`.
- [ ] 13.3 Run `openspec validate add-signal-builder --strict` and resolve any reported issues.
- [ ] 13.4 Archive the change once merged: `openspec archive add-signal-builder`.
