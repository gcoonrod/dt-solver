## 1. Types

- [x] 1.1 Add optional `riseTimeNs?: number` and `fallTimeNs?: number` to `BaseSignal` in `src/types/signal.ts`
- [x] 1.2 Add JSDoc on both fields explaining 10-90% semantics and that `undefined`/`0` preserves instantaneous-edge behavior
- [x] 1.3 Export an `EdgeInterval` type `{ startNs: number; midNs: number; endNs: number; direction: EdgeDirection }` from `src/types/signal.ts` (consumed by solver and renderer)
- [x] 1.4 Confirm `pnpm lint` still passes with the new type surface

## 2. Solver

- [x] 2.1 Update `ClockEdge` in `src/core/solver.ts` to be an `EdgeInterval` (drop bare `timeNs`; add `startNs`, `midNs`, `endNs`)
- [x] 2.2 Update `generateClockEdges` to compute `start`/`end` as `mid ∓ (rise|fall)/2`, defaulting slew to `0` when missing
- [x] 2.3 Update `ResolvedEvent` to extend `EdgeInterval`; keep `timeNs` as a derived alias of `midNs` (so the renderer's hover/cursor reads keep working) or migrate call sites to `midNs` — pick one and apply consistently
- [x] 2.4 Update `resolveReference` data-signal branch to build intervals from `DataSignal.riseTimeNs`/`fallTimeNs` keyed off `tr.direction`
- [x] 2.5 Rewrite `evaluateConstraint` worst-case selection per the per-type endpoint rules in `signal-edge-slew` spec (SETUP: anchor `start`, target `end`; HOLD: anchor `end`, target `start`; PROP_DELAY: anchor `end`, target `end`)
- [x] 2.6 Set `worstWindow.anchorTimeNs` / `worstWindow.targetTimeNs` to the chosen endpoints (not midpoints) so the UI highlight band aligns with the conservative margin
- [x] 2.7 Verify the `src/core/` purity rule: grep the file for `react`, `d3`, `next`, store imports — none of these should appear

## 3. Data / Profiles

- [x] 3.1 Update `src/data/w65c02s-14mhz.ts`: add `riseTimeNs` / `fallTimeNs` to PHI2 (e.g., 2 ns / 2 ns), ADDR/RW/DATA/CS (typical 3-5 ns based on WDC datasheet)
- [x] 3.2 Retune the demo's transition times so exactly one constraint still fails after the math change — match the existing story (e.g., the data-read setup margin remains the failure case)
- [x] 3.3 Update the file-header ASCII diagram and prose to mention slew if needed; otherwise leave a one-line note that edges are now slewed
- [x] 3.4 Leave `6502-profile.ts` and `62256-profile.ts` as `// stub` (open question resolved per design.md)

## 4. Renderer (canvas)

- [x] 4.1 In `src/components/canvas/WaveformTimeline.tsx`, remove `EDGE_SLOPE` as a cosmetic constant; replace usage with the `startNs`/`endNs` returned by the solver
- [x] 4.2 Update `ClockTrace` to draw the rise/fall ramp from `tToX(edge.startNs)` to `tToX(edge.endNs)` instead of `tToX(time) ± EDGE_SLOPE`
- [x] 4.3 Update `LineTrace` analogously for single-bit data signals, looking up the per-transition slew from the signal's `riseTimeNs`/`fallTimeNs`
- [x] 4.4 Update `BusTrace` so the X-shaped transition marker widens to span the slew interval (replace `BUS_X_SLOPE` constant or make it derived)
- [x] 4.5 Add a zero-slew fallback: when `endNs - startNs === 0`, reintroduce a `±1 px` cosmetic offset so the edge isn't a perfectly vertical line (anti-aliasing)
- [x] 4.6 Confirm `ConstraintAnnotation` still aligns: its `xa`/`xb` already use `worstWindow.{anchor,target}TimeNs`, which the solver now sets to the conservative endpoints — visually verify alignment in `pnpm dev`

## 5. Panels

- [x] 5.1 In `src/components/panels/ComponentLibrary.tsx`, extend the `meta` string in `SignalRowCL` to include slew (e.g., `14M · 2/3ns` for clocks; `[15:0] · 3/3ns` for buses); fall back to today's format when both fields are undefined
- [x] 5.2 In `src/components/panels/ConstraintInspector.tsx`, no functional change required; visually confirm the hover highlight band still lands correctly given the new `worstWindow` endpoints
- [x] 5.3 (Optional, non-blocking) Mention slew in the constraint-row tooltip / status footer if there's a natural spot

## 6. Verification

- [x] 6.1 `pnpm lint` clean
- [x] 6.2 `pnpm build` clean (TS strict mode catches any missed `timeNs → midNs` renames)
- [x] 6.3 `pnpm dev` — server reaches HTTP 200; rendered HTML contains `tADS`, `PHI2`, `14M`, slew badge `3ns`, and exactly one `fail` / one `pass` token in the inspector header (matches the expected 5-pass / 1-fail story). **Visual confirmation by the user is still recommended** — Playwright in this environment expects a Chrome binary that isn't present on the host, so I could not screenshot the sloped edges or hover-band alignment.
- [x] 6.4 Add a one-paragraph entry to the ROADMAP referencing this change, marking the milestone done
