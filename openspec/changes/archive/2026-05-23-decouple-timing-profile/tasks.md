## 1. Extract the `TimingProfile` contract

- [x] 1.1 Create `src/types/profile.ts` exporting `interface TimingProfile` with fields `id: string`, `name: string`, `description: string`, `signals: AnySignal[]`, `constraints: Constraint[]`, `defaultWindowNs: { tMinNs: number; tMaxNs: number }`. Import `AnySignal` from `./signal` and `Constraint` from `./constraint`.
- [x] 1.2 Add `export * from "./profile";` to `src/types/index.ts`.
- [x] 1.3 In `src/data/w65c02s-14mhz.ts`, delete the local `export interface TimingProfile` block and replace it with `import type { TimingProfile } from "@/types/profile";` (or `from "@/types"`). Verify `W65C02S_14MHz: TimingProfile` still type-checks.
- [x] 1.4 Run `pnpm tsc --noEmit` (or equivalent) and confirm zero new type errors. Run `grep -rn "interface TimingProfile\|type TimingProfile" src/` and confirm the only match is in `src/types/profile.ts`.

## 2. Promote `activeProfile` to store state

- [x] 2.1 In `src/store/useTimingStore.ts`, add `activeProfile: TimingProfile;` to the `TimingState` interface and `setActiveProfile: (profile: TimingProfile) => void;` to its actions block. Import `TimingProfile` from `@/types/profile`.
- [x] 2.2 In the `create<TimingState>()` call, set the initial `activeProfile: profile` (where `profile = W65C02S_14MHz` is the existing local const).
- [x] 2.3 Implement `setActiveProfile(p)` to do one `set` that assigns `activeProfile: p`, `signals: p.signals`, `constraints: p.constraints`, `tMinNs: p.defaultWindowNs.tMinNs`, `tMaxNs: p.defaultWindowNs.tMaxNs`, and `solved: solve(p.signals, p.constraints, Math.max(p.defaultWindowNs.tMaxNs * 4, 1000))`. Do NOT touch `cursorTimeNs`, `hoveredConstraintId`, or `selectedSignalId`.
- [x] 2.4 Add a logic test in `__tests__/store/timingStore.test.ts` covering: (a) bootstrap `activeProfile === W65C02S_14MHz`, (b) `setActiveProfile(p2)` swaps the four data slots and re-solves, (c) `setActiveProfile` leaves cursor/hover/selection untouched.

## 3. Add the `useTimingProfile` hook

- [x] 3.1 Create `src/hooks/useTimingProfile.ts` exporting `function useTimingProfile()` that selects `activeProfile` and `setActiveProfile` from `useTimingStore` (two `useTimingStore(s => ...)` calls) and returns them as `{ activeProfile, setActiveProfile }`. No `useState`, no `useEffect`, no Context.
- [x] 3.2 Add `src/hooks/useTimingProfile.test.tsx` under the `ui` Vitest project covering: (a) the hook returns the live store value, (b) rendering re-runs after `setActiveProfile` is dispatched from outside the component. Use `renderHook` from `@testing-library/react`; reset the store in `beforeEach`.

## 4. Refactor UI tests off direct profile imports

- [x] 4.1 `src/app/page.test.tsx` — remove `import { W65C02S_14MHz } from "@/data/w65c02s-14mhz"`. Replace the two `W65C02S_14MHz.defaultWindowNs.*` reads (lines 148, 154–155) with `useTimingStore.getState().activeProfile.defaultWindowNs.*`. Keep the `beforeEach` reset behavior.
- [x] 4.2 `src/components/canvas/WaveformTimeline.test.tsx` — remove the direct import; if `profile` is only used to seed the store, replace it with `const profile = useTimingStore.getState().activeProfile` inside the relevant test bodies (after the reset). If the import is unused after the change, delete the assignment.
- [x] 4.3 `src/components/features/ChannelLabels.test.tsx` — remove the direct import. Replace `W65C02S_14MHz.signals` reads with `useTimingStore.getState().activeProfile.signals` (including the `find(s => s.id === "phi2")` lookup on line 49).
- [x] 4.4 `src/components/features/WaveformToolbar.test.tsx` — remove the direct import. Replace `W65C02S_14MHz.defaultWindowNs.*` reads (lines 75–76) with reads through `useTimingStore.getState().activeProfile`.
- [x] 4.5 `src/components/features/WaveformWorkspace.test.tsx` — remove the direct import. Replace `W65C02S_14MHz.signals[0].name` (line 42) with `useTimingStore.getState().activeProfile.signals[0].name`.
- [x] 4.6 `src/components/panels/ComponentLibrary.test.tsx` — remove the direct import. Replace `W65C02S_14MHz.signals` reads (lines 38, 47) with `useTimingStore.getState().activeProfile.signals`.
- [x] 4.7 `src/components/panels/ConstraintInspector.test.tsx` — remove the direct import. Replace `W65C02S_14MHz.constraints` reads (line 38) with `useTimingStore.getState().activeProfile.constraints`.
- [x] 4.8 Leave `__tests__/data/w65c02s-14mhz.test.ts` untouched — it tests the seed itself and the `timing-profile` capability explicitly permits its direct import.

## 5. Verification

- [x] 5.1 Run `grep -rn 'from "@/data/w65c02s-14mhz"\|from "@/data/.*-profile"' src/` and confirm the only match is in `src/store/useTimingStore.ts`. Zero matches under `src/components/`, `src/app/`, `src/hooks/`.
- [x] 5.2 Run `grep -rn 'from "@/data/' src/` (broader) and confirm the same result — no test file or feature reaches into the data layer for a profile.
- [x] 5.3 Run `pnpm lint`. Fix any new violations introduced by the refactor.
- [x] 5.4 Run `pnpm test:logic` and confirm all logic tests pass (including the new `setActiveProfile` cases from task 2.4 and the untouched `__tests__/data/w65c02s-14mhz.test.ts`).
- [x] 5.5 Run `pnpm test:ui` and confirm all 75 (or more, after task 3.2) UI tests pass.
- [x] 5.6 Run `pnpm build` and confirm the production build succeeds with no new warnings.
- [x] 5.7 Run `openspec validate decouple-timing-profile` and confirm it passes.
