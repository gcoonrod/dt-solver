## 1. Baseline: widen test glob and write the page integration test first

- [x] 1.1 Widen the `ui` project's `include` in `vitest.config.ts` from `['src/components/**/*.test.{ts,tsx}']` to `['src/{app,components,hooks}/**/*.test.{ts,tsx}']`; leave the `logic` project's include glob unchanged.
- [x] 1.2 Run `pnpm test` and confirm all existing tests still pass under the new glob (no test files exist under `src/app/` or `src/hooks/` yet, so the count must be unchanged).
- [x] 1.3 Create `src/app/page.test.tsx` exercising the page-level behaviors against the UNCHANGED 307-line `page.tsx`: store reset in `beforeEach` to `W65C02S_14MHz`; assert (a) splitter drag updates the bottom fraction (use `fireEvent.mouseDown` on the splitter then `fireEvent.mouseMove` on `window`), (b) `⌘=` zooms in (`tMaxNs - tMinNs` strictly decreases), (c) `f` restores `defaultWindowNs`, (d) `ArrowRight` advances `cursorTimeNs` by 1, (e) shortcuts are ignored when the event target is an `<input>`. Snapshot matchers are forbidden — use accessible queries and store reads.
- [x] 1.4 Run `pnpm test:ui` and confirm `src/app/page.test.tsx` passes. This is the regression net for the rest of the change.

## 2. Extract leaf components into `src/components/ui/`

- [x] 2.1 Create `src/components/ui/ToolBtn.tsx` containing the `ToolBtn` component, its `ToolBtnIcon` type, and the `TOOL_BTN_PATHS` map moved verbatim from `page.tsx`. Export the component as the default export and the icon type as a named export.
- [x] 2.2 Create `src/components/ui/ToolBtn.test.tsx`: render with each `ToolBtnIcon` value; assert the rendered title attribute, the visible label, and that `onClick` fires via `userEvent.click`. No store imports.
- [x] 2.3 Create `src/components/ui/CornerLabel.tsx` containing the `CornerLabel` JSX moved verbatim. Default export.
- [x] 2.4 Create `src/components/ui/CornerLabel.test.tsx`: render and assert the visible text (`live · 1.0× / div`) via `getByText` and the dot indicator via accessible query.
- [x] 2.5 Create `src/components/ui/CursorReadout.tsx` accepting `{ timeNs: number }` and rendering the toolbar's cursor pill (label "cursor", value `T: {formatTime(timeNs)}`). Default export.
- [x] 2.6 Create `src/components/ui/CursorReadout.test.tsx`: render with `timeNs = 35.7` and assert the rendered text matches `T: ${formatTime(35.7)}` (import `formatTime` from `@/components/canvas/WaveformTimeline`).
- [x] 2.7 Create `src/components/ui/SignalStateBadge.tsx` as a pure visual leaf accepting `{ color: string; display: string }` and rendering the colored dot + text pill (default export). Separately, create `src/components/features/signalDisplay.ts` exporting `formatSignalDisplay(sig, cursorTimeNs)` — the helper that returns the display string used in both the toolbar mini-badge and `ChannelLabels`. The helper lives under `features/` (not `ui/`) because it depends on `@/core/solver`, and the spec forbids `@/core/` imports under `ui/`.
- [x] 2.8 Create `src/components/ui/SignalStateBadge.test.tsx` asserting the badge's text and the dot's `style.background`. Create `src/components/features/signalDisplay.test.ts` asserting `formatSignalDisplay` returns `"1"` for a HIGH clock, `"0"` for a LOW clock, `"Z"` for HIGH_Z data, and any explicit `s.value` for valid data states (drive these by constructing minimal `Signal` fixtures rather than going through the store).
- [x] 2.9 Create `src/components/ui/Splitter.tsx` accepting `{ orientation: "horizontal" | "vertical"; onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void }` and rendering the splitter bar with Tailwind classes that vary by orientation (current page uses horizontal — `h-[5px] cursor-row-resize border-t border-b`).
- [x] 2.10 Create `src/components/ui/Splitter.test.tsx`: render with `orientation="horizontal"`; assert `onMouseDown` fires when the user mouses down on the bar (use `fireEvent.mouseDown` and assert the spy was called); assert the `cursor-row-resize` class is present.
- [x] 2.11 Run `pnpm test` and confirm all new UI tests pass alongside the (still passing) page integration test.

## 3. Extract feature components into `src/components/features/`

- [x] 3.1 Create `src/components/features/WaveformToolbar.tsx`: move the existing `WaveformToolbar` function from `page.tsx`, replace its inline `ToolBtn` usages with imports from `@/components/ui/ToolBtn`, replace the inline cursor-pill JSX with `<CursorReadout />`, and replace the inline per-signal mini-badges with `<SignalStateBadge color={sig.color} display={formatSignalDisplay(sig, cursorTimeNs)} />`. Keep the store subscriptions and the `signals.slice(0, 4)` cap exactly as today.
- [x] 3.2 Create `src/components/features/WaveformToolbar.test.tsx`: reset the store to `W65C02S_14MHz` in `beforeEach`; assert the cursor pill renders the current `cursorTimeNs`; call `useTimingStore.getState().setCursor(50)` and re-assert the readout updated; click the zoom-in button and assert `tMaxNs - tMinNs` strictly decreased.
- [x] 3.3 Create `src/components/features/ChannelLabels.tsx`: move the existing `ChannelLabels` function from `page.tsx` and replace the inline display-string logic with `formatSignalDisplay(sig, cursorTimeNs)`. The channel-row value pill (colored text, no dot) is visually distinct from the toolbar mini-badge (`SignalStateBadge`) and stays inline — reusing the badge here would change the visual. Import `HEADER_H` and `ROW_H` from `@/components/canvas/WaveformTimeline`.
- [x] 3.4 Create `src/components/features/ChannelLabels.test.tsx`: reset the store to `W65C02S_14MHz` in `beforeEach`; assert every signal name from `W65C02S_14MHz.signals` is present; call `useTimingStore.getState().setCursor(80)` and assert at least one badge's text changes from its pre-mutation value.
- [x] 3.5 Create `src/components/features/WaveformWorkspace.tsx`: composes `<WaveformToolbar />` above a flex row of `<ChannelLabels />` + `<WaveformTimeline />` + `<CornerLabel />`, using the exact Tailwind classes the current page uses for that zone (`flex-1 flex overflow-hidden`, etc.). No store subscriptions of its own — the children own those.
- [x] 3.6 Create `src/components/features/WaveformWorkspace.test.tsx`: reset the store to `W65C02S_14MHz` in `beforeEach`; assert the workspace renders elements from all four children (toolbar button, a channel-label name, the timeline's SVG, the corner label's text). Use accessible queries; no snapshots.
- [x] 3.7 Run `pnpm test` and confirm all feature tests pass alongside the (still passing) leaf and page tests.

## 4. Extract behavior hooks into `src/hooks/`

- [x] 4.1 Create `src/hooks/useVerticalSplit.ts` exporting `useVerticalSplit({ initialFrac, minFrac, maxFrac }: { initialFrac: number; minFrac: number; maxFrac: number })` returning `{ bottomFrac, containerRef, startDrag }`. Port the drag state machine from `page.tsx` (the `useState`, the `useRef`, the `useEffect` registering `mousemove`/`mouseup`, the `startDrag` callback) one-for-one. Clamp using the provided `minFrac` / `maxFrac` (current page hardcodes `0.15` / `0.7`).
- [x] 4.2 Create `src/hooks/useGlobalShortcuts.ts` exporting `useGlobalShortcuts()` (no args). Port the keydown effect from `page.tsx`, reading `cursorTimeNs`, `tMinNs`, `tMaxNs` from the store and calling `zoomAt`, `fitView`, `setCursor`. Preserve the existing input-target guard (`target.tagName === "INPUT" || target.tagName === "TEXTAREA"`).
- [x] 4.3 The hooks are tested indirectly via the page integration test from step 1.3 plus the `WaveformWorkspace` test. No standalone hook tests required (per design Decision 2); add them later only if a hook gains independent complexity.

## 5. Reduce `src/app/page.tsx` to a layout shell

- [x] 5.1 Rewrite `src/app/page.tsx` as a thin client component: import `ComponentLibrary`, `WaveformWorkspace`, `InspectorPanel` (re-export from `ConstraintInspector` if needed, or import `ConstraintInspector` directly), `Splitter`, `useVerticalSplit`, `useGlobalShortcuts`. Call both hooks. Render the existing three-zone layout (left sidebar / right column with workspace on top, splitter, inspector on bottom). No inline subcomponents. No `useEffect`. No `useState`. No `window.addEventListener`. Target ≤ 50 lines.
- [x] 5.2 Delete the now-orphaned inline `WaveformToolbar`, `ToolBtn`, `TOOL_BTN_PATHS`, `ToolBtnIcon`, `ChannelLabels`, `CornerLabel` definitions from `page.tsx`.
- [x] 5.3 Re-run `pnpm test:ui` and confirm `src/app/page.test.tsx` from step 1.3 still passes against the new thin shell — this is the proof that no behavior regressed.
- [x] 5.4 Run `pnpm lint && pnpm test && pnpm build`. All three must pass with zero new warnings.

## 6. Verify the spec scenarios end-to-end

- [x] 6.1 Manually verify each scenario in `specs/app-shell-layout/spec.md` is exercised by at least one test or is structurally true of the codebase (file-existence scenarios). Fill in any missing test cases before declaring the change complete.
- [x] 6.2 Boot `pnpm dev` once, click around the workspace, drag the splitter, hit each keyboard shortcut, and confirm the UI behaves identically to pre-change. (This is the human-loop check that complements the integration test.)
- [x] 6.3 Run `openspec validate decompose-design-handoff --strict` and resolve any reported issues.
