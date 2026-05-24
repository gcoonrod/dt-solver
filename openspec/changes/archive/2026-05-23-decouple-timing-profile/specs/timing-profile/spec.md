## ADDED Requirements

### Requirement: `TimingProfile` contract lives in `src/types/profile.ts`

The `TimingProfile` interface SHALL be exported from `src/types/profile.ts` and re-exported from `src/types/index.ts`. It SHALL bundle the four fields the store needs to bootstrap a profile: `id: string`, `name: string`, `description: string`, `signals: AnySignal[]`, `constraints: Constraint[]`, and `defaultWindowNs: { tMinNs: number; tMaxNs: number }`. No file outside `src/types/` SHALL `export interface TimingProfile` or `export type TimingProfile`.

#### Scenario: `TimingProfile` is importable from the types barrel

- **GIVEN** a file outside `src/types/` and `src/data/`
- **WHEN** it writes `import type { TimingProfile } from "@/types"`
- **THEN** the import SHALL resolve and the type SHALL match the shape defined in `src/types/profile.ts`

#### Scenario: No duplicate `TimingProfile` definition lives in `src/data/`

- **GIVEN** the repository
- **WHEN** `grep -rn "interface TimingProfile\|type TimingProfile" src/` is run
- **THEN** the only match SHALL be inside `src/types/profile.ts`

### Requirement: `useTimingStore` exposes the active profile as state

`useTimingStore` SHALL declare an `activeProfile: TimingProfile` slot and a `setActiveProfile(profile: TimingProfile): void` action. The store SHALL seed `activeProfile` with `W65C02S_14MHz` at bootstrap (the same value used to seed `signals`, `constraints`, and the viewport). `setActiveProfile` SHALL perform a single transactional `set` that replaces `activeProfile`, `signals`, `constraints`, `tMinNs`, `tMaxNs`, and `solved` (with a fresh solve over the new `signals`/`constraints`) — and SHALL NOT modify `cursorTimeNs`, `hoveredConstraintId`, or `selectedSignalId`.

#### Scenario: Default bootstrap exposes the seed profile

- **GIVEN** a freshly imported `useTimingStore` (no actions dispatched)
- **WHEN** `useTimingStore.getState().activeProfile` is read
- **THEN** it SHALL equal the `W65C02S_14MHz` value imported from `@/data/w65c02s-14mhz`

#### Scenario: `setActiveProfile` swaps signals, constraints, viewport, and solved in one set

- **GIVEN** a `TimingProfile` value `p2` whose `signals` and `constraints` differ from the bootstrap seed and whose `defaultWindowNs` is `{ tMinNs: 0, tMaxNs: 999 }`
- **WHEN** `useTimingStore.getState().setActiveProfile(p2)` is called
- **THEN** `useTimingStore.getState().activeProfile` SHALL equal `p2`
- **AND** `useTimingStore.getState().signals` SHALL equal `p2.signals`
- **AND** `useTimingStore.getState().constraints` SHALL equal `p2.constraints`
- **AND** `useTimingStore.getState().tMinNs` SHALL equal `0`
- **AND** `useTimingStore.getState().tMaxNs` SHALL equal `999`
- **AND** `useTimingStore.getState().solved` SHALL be the result of `solve(p2.signals, p2.constraints, ...)` (a fresh array, not the previous `solved`)

#### Scenario: `setActiveProfile` leaves cursor and selection state untouched

- **GIVEN** the store with `cursorTimeNs = 42`, `hoveredConstraintId = "tads"`, and `selectedSignalId = "phi2"`
- **WHEN** `setActiveProfile(p2)` is called with any profile
- **THEN** `cursorTimeNs` SHALL remain `42`
- **AND** `hoveredConstraintId` SHALL remain `"tads"`
- **AND** `selectedSignalId` SHALL remain `"phi2"`

### Requirement: `useTimingProfile` hook is the canonical seam for reading and swapping the active profile

A hook `useTimingProfile()` SHALL be exported from `src/hooks/useTimingProfile.ts` and SHALL return `{ activeProfile, setActiveProfile }` by selecting both values from `useTimingStore`. It SHALL NOT introduce a React Context, SHALL NOT cache or clone the profile, and SHALL NOT add any state of its own. Components that need *only* the active profile MAY call `useTimingStore(s => s.activeProfile)` directly; the hook exists for consumers that want both halves of the seam.

#### Scenario: Hook returns the live store value

- **GIVEN** a component that calls `useTimingProfile()`
- **WHEN** the component renders against the default store
- **THEN** `activeProfile` SHALL be referentially equal to `useTimingStore.getState().activeProfile`
- **AND** `setActiveProfile` SHALL be referentially equal to `useTimingStore.getState().setActiveProfile`

#### Scenario: Hook re-renders consumers on profile swap

- **GIVEN** a component rendered against the default store that calls `useTimingProfile()` and displays `activeProfile.name`
- **WHEN** `useTimingStore.getState().setActiveProfile(p2)` is dispatched from outside the component
- **THEN** the component SHALL re-render
- **AND** the displayed name SHALL be `p2.name`

### Requirement: No file outside the store and the data folder imports a concrete profile constant

The concrete profile constants exported from `src/data/*` (currently `W65C02S_14MHz`, and any future `W65C02S_8MHz`, `M6502_2MHz`, etc.) SHALL be imported only by `src/store/useTimingStore.ts` (for the bootstrap seed) and by files inside `src/data/` itself (for cross-profile composition). All other consumers SHALL reach the active profile through `useTimingStore` or `useTimingProfile`. Logic-side tests under `__tests__/data/` MAY import the constant they directly test (e.g. `__tests__/data/w65c02s-14mhz.test.ts` MAY import `W65C02S_14MHz_signals` and `W65C02S_14MHz_constraints`), because those tests *are* the contract for that specific profile.

#### Scenario: No UI test imports `W65C02S_14MHz` by name

- **GIVEN** the repository after this change is applied
- **WHEN** `grep -rn 'from "@/data/w65c02s-14mhz"' src/` is run
- **THEN** the only matches SHALL be in `src/store/useTimingStore.ts`
- **AND** zero matches SHALL appear under `src/components/`, `src/app/`, or `src/hooks/`

#### Scenario: Logic test for the seed still imports it directly

- **GIVEN** `__tests__/data/w65c02s-14mhz.test.ts`
- **WHEN** the file is inspected
- **THEN** it SHALL still import `W65C02S_14MHz_signals` and `W65C02S_14MHz_constraints` from `@/data/w65c02s-14mhz`
- **AND** this SHALL NOT be flagged as a violation, because the file's purpose is to test that specific profile
