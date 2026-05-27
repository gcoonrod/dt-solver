## MODIFIED Requirements

### Requirement: Colocated `*.test.tsx` convention under `src/components/`

UI test files SHALL live next to the source file they exercise, named `<ComponentName>.test.tsx`. They SHALL NOT live under `__tests__/`. They MAY import from `react`, `react-dom`, `d3`, `@/store/*`, `@/core/*`, `@/hooks/*`, `@/types/*`, and `@/components/*`. They SHALL NOT import concrete profile constants from `@/data/*` (e.g. `W65C02S_14MHz`); the active profile SHALL be reached through `useTimingStore` selectors or `useTimingProfile()`, matching how a feature component reaches it at runtime. The author of a UI test SHALL NOT add a top-level `pnpm test` ignore-pattern to skip such files.

#### Scenario: Colocated tests are excluded from the production bundle

- **WHEN** `pnpm build` runs
- **THEN** no `*.test.tsx` file SHALL appear in the Next.js build output
- **AND** the build SHALL succeed without errors about test imports leaking into application code

#### Scenario: Adding a test does NOT require touching `vitest.config.ts`

- **GIVEN** a new component `src/components/foo/Foo.tsx`
- **WHEN** a contributor adds `src/components/foo/Foo.test.tsx`
- **THEN** `pnpm test:ui` SHALL pick it up on the next run without any config change

#### Scenario: UI tests do not import concrete profile constants

- **GIVEN** any file matching `src/{app,components,hooks}/**/*.test.{ts,tsx}`
- **WHEN** the file is inspected
- **THEN** it SHALL contain no `import ... from "@/data/w65c02s-14mhz"`
- **AND** it SHALL contain no `import ... from "@/data/*-profile"`

### Requirement: Initial render-and-store coverage for the three implemented components

The change SHALL add at least one test file per currently implemented component:

- `src/components/canvas/WaveformTimeline.test.tsx`
- `src/components/panels/ComponentLibrary.test.tsx`
- `src/components/panels/ConstraintInspector.test.tsx`

Each test file SHALL include at least one render-smoke test that mounts the component inside the default `@testing-library/react` `render()` and asserts at least one accessible query (`getByRole`, `getByText`, `findByText`, etc.) succeeds against the bootstrap state of `useTimingStore` (which seeds itself from the canonical demo profile under `src/data/`). Each test file SHALL include a `beforeEach` that resets `useTimingStore` to a known state via `useTimingStore.setState(initialState, true)` before the next test runs. Assertions that need to reference profile-derived values (signal names, default window bounds, etc.) SHALL read them from `useTimingStore.getState().activeProfile`, NOT by importing a profile constant from `@/data/`. UI tests SHALL NOT mock `useTimingStore`, `@/core/solver`, or anything the components import from the data layer; they SHALL exercise the real store + solver.

#### Scenario: `WaveformTimeline` smoke render

- **GIVEN** the store seeded with its bootstrap state
- **WHEN** `WaveformTimeline` is rendered
- **THEN** the render SHALL complete without throwing
- **AND** at least one major time-axis label produced by `formatTime` from the seeded viewport SHALL be queryable from the resulting DOM (signal *names* themselves are rendered by the sibling `ComponentLibrary`, not by the timeline canvas)
- **AND** at least one seeded bus-value label (e.g., one of the `value` strings on the bootstrap profile's `DATA[7:0]` transitions, read via `useTimingStore.getState().activeProfile.signals`) SHALL be queryable, proving the seeded transition data drove the render

#### Scenario: `ComponentLibrary` reflects the seeded profile

- **GIVEN** the store seeded with its bootstrap state
- **WHEN** `ComponentLibrary` is rendered
- **THEN** every signal from `useTimingStore.getState().activeProfile.signals` SHALL be queryable by its display name

#### Scenario: `ConstraintInspector` reflects solved status

- **GIVEN** the store seeded with its bootstrap state (which has one FAIL after solve)
- **WHEN** `ConstraintInspector` is rendered
- **THEN** the constraint with `status === 'FAIL'` SHALL be visibly distinguished (e.g., a "FAIL" label / role / class is queryable)
- **AND** the PASS constraints SHALL also be queryable by their ids or labels

#### Scenario: Store reset isolates tests

- **GIVEN** a test mutates the store via an action method
- **WHEN** the next test in the same file begins
- **THEN** the store state SHALL be back to the value installed by `beforeEach`
- **AND** the second test's assertions SHALL NOT see leakage from the first
