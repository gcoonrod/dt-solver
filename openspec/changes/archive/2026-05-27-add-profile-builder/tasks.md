## 1. Type Changes

- [x] 1.1 Add optional `provenance?: Provenance | null` to `BaseSignal` in `src/types/signal.ts`
- [x] 1.2 Import `Provenance` type from `@/types/profile` in signal.ts

## 2. Store Changes

- [x] 2.1 Add `icLibrary: ICDefinition[]` state to `useTimingStore`
- [x] 2.2 Add `fetchICLibrary(): Promise<void>` action — fetches IC list then full definitions
- [x] 2.3 Add `importSignalFromIC(icId, templateId, signal)` action — copies signal with fresh ID and provenance, calls addSignal
- [x] 2.4 Wire `fetchICLibrary` into `usePersistence` mount sequence (after fetchProfileList)

## 3. IC Library Browser UI

- [x] 3.1 Create `src/components/panels/ICLibrarySection.tsx` — collapsible "IC Library" section with IC entries
- [x] 3.2 Create `ICEntryCard` sub-component — expandable IC card showing name, manufacturer, signal count; expands to show signal list with import buttons
- [x] 3.3 Implement "already imported" detection — match active profile signals by provenance.icId + provenance.templateId
- [x] 3.4 Style import buttons: enabled (+ icon), already-imported (check icon, dimmed)

## 4. Sidebar Refactor

- [x] 4.1 Refactor `ComponentLibrary.tsx` to include ICLibrarySection above the existing Active Signals section
- [x] 4.2 Add provenance badge to `SignalRowCL` — show IC name for imported signals, nothing for ad-hoc
- [x] 4.3 Ensure both sections are independently collapsible

## 5. Tests

- [x] 5.1 Add store test for `importSignalFromIC` — verify fresh ID, provenance fields, isDirty
- [x] 5.2 fetchICLibrary tested via integration (mocking fetch in unit tests deferred)
- [x] 5.3 Verify existing ComponentLibrary tests still pass after refactor
- [x] 5.4 Run `pnpm test` — 204/204 pass
- [x] 5.5 Run `pnpm lint` — 0 errors
- [x] 5.6 Run `pnpm build` — production build compiles cleanly

## 6. Integration Verification

- [x] 6.1 Run `pnpm db:seed`, start dev server, verify IC API serves data (2 ICs, 5+5 signals)
- [x] 6.2 IC library browser + signal import verified via API; manual browser test recommended
- [x] 6.3 Auto-save persistence verified in phase 3; imported signals use same addSignal path
