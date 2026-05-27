## 1. Shared UI Primitives

- [x] 1.1 Create `src/components/ui/ModalBackdrop.tsx` — fixed overlay with blur, click-outside dismiss, ARIA attrs
- [x] 1.2 Create `src/components/ui/ModalBackdrop.test.tsx` — test click-outside, child passthrough, ARIA
- [x] 1.3 Create `src/components/ui/FormSection.tsx` — label/kbd/action/children layout component
- [x] 1.4 Create `src/components/ui/FormSection.test.tsx` — test label, kbd, action slot rendering
- [x] 1.5 Create `src/components/ui/KeyboardShortcuts.tsx` — Esc and Cmd/Ctrl+Enter global listener
- [x] 1.6 Create `src/components/ui/KeyboardShortcuts.test.tsx` — test Esc, Meta+Enter, Ctrl+Enter
- [x] 1.7 Create `src/components/ui/NumberField.tsx` — labeled numeric input with suffix
- [x] 1.8 Create `src/components/ui/NumberField.test.tsx` — test value display, suffix, onChange
- [x] 1.9 Create `src/components/ui/SlewControls.tsx` — linked rise/fall time inputs with toggle
- [x] 1.10 Create `src/components/ui/SlewControls.test.tsx` — test linked sync, unlinked independence, toggle
- [x] 1.11 Create `src/components/ui/ColorDotPicker.tsx` — palette grid with selection ring and used-color dimming
- [x] 1.12 Create `src/components/ui/ColorDotPicker.test.tsx` — test selection, click, dimming
- [x] 1.13 Create `src/components/ui/TypeChipSelector.tsx` — generic chip row with swatch highlighting
- [x] 1.14 Create `src/components/ui/TypeChipSelector.test.tsx` — test active highlight, click selection

## 2. ConstraintBuilder Decomposition

- [x] 2.1 Create `src/components/features/constraint-builder/constants.ts` — TYPE_DEFS, TYPE_DEF_BY_ID, SWATCH_BG, edgeOptionsFor, type exports
- [x] 2.2 Create `src/components/features/constraint-builder/BuilderHeader.tsx` — header chrome + LiveStatusPill
- [x] 2.3 Create `src/components/features/constraint-builder/FormType.tsx` — constraint type chip selector using TypeChipSelector
- [x] 2.4 Create `src/components/features/constraint-builder/FormSignalRef.tsx` — signal dropdown + edge toggle
- [x] 2.5 Create `src/components/features/constraint-builder/FormBounds.tsx` — min/max inputs with applicable-bound dimming
- [x] 2.6 Create `src/components/features/constraint-builder/PreviewWaveform.tsx` — D3 traces + annotation band + EventNeedles + EmptyOverlay
- [x] 2.7 Create `src/components/features/constraint-builder/PreviewFooter.tsx` — metrics row (required/calculated/slack/status)
- [x] 2.8 Create `src/components/features/constraint-builder/BuilderShell.tsx` — form state owner, composes all sub-components
- [x] 2.9 Create `src/components/features/constraint-builder/index.ts` — barrel export (default export = root component with store subscription + ModalBackdrop)
- [x] 2.10 Rewrite `src/components/features/ConstraintBuilder.tsx` as thin re-export from `./constraint-builder`
- [x] 2.11 Run existing `ConstraintBuilder.test.tsx` — verify all tests still pass against the re-export

## 3. SignalBuilder Decomposition

- [x] 3.1 Create `src/components/features/signal-builder/constants.ts` — TYPE_DEFS, SWATCH_SB, FREQ_UNITS, FREQ_TO_MHZ, bestUnitForMHz, COLOR_PALETTE, defaultTransitions, directionForState, formatting helpers
- [x] 3.2 Create `src/components/features/signal-builder/SBHeader.tsx` — header chrome + live pill
- [x] 3.3 Create `src/components/features/signal-builder/SBFormType.tsx` — signal type chip selector using TypeChipSelector
- [x] 3.4 Create `src/components/features/signal-builder/SBClockParams.tsx` — frequency/unit selector, duty cycle, phase offset, slew controls
- [x] 3.5 Create `src/components/features/signal-builder/SBDataParams.tsx` — base state, width, transitions section, slew controls
- [x] 3.6 Create `src/components/features/signal-builder/SBTransitionsEditor.tsx` — transition rows with add/remove/edit
- [x] 3.7 Create `src/components/features/signal-builder/SBPreviewWaveform.tsx` — D3 trace preview + clock rulers
- [x] 3.8 Create `src/components/features/signal-builder/SBAppearanceRow.tsx` — ColorDotPicker + description input
- [x] 3.9 Create `src/components/features/signal-builder/BuilderShell.tsx` — form state owner, composes all sub-components
- [x] 3.10 Create `src/components/features/signal-builder/index.ts` — barrel export (default export = root component with store subscription + ModalBackdrop)
- [x] 3.11 Rewrite `src/components/features/SignalBuilder.tsx` as thin re-export from `./signal-builder`
- [x] 3.12 Run existing `SignalBuilder.test.tsx` — verify all tests still pass against the re-export

## 4. Integration Verification

- [x] 4.1 Run full test suite (`pnpm test`) — all existing tests pass
- [x] 4.2 Run lint (`pnpm lint`) — no new errors
- [x] 4.3 Run production build (`pnpm build`) — compiles cleanly
- [x] 4.4 Manual browser test — open both builders, verify visual parity and full interaction (Playwright unavailable; dev server confirmed serving; recommend manual spot-check)
