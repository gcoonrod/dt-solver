# ui-path-tests Specification

## Purpose
TBD - created by archiving change add-ui-unit-tests. Update Purpose after archive.
## Requirements
### Requirement: jsdom-backed `ui` Vitest project

The single root-level `vitest.config.ts` SHALL declare a second project in `test.projects: [...]` named `ui`. The `ui` project SHALL set `environment: 'jsdom'`, SHALL set `include: ['src/components/**/*.test.{ts,tsx}']`, and SHALL register `setupFiles: ['./vitest.setup.ts']`. The `ui` project SHALL apply the `vite-tsconfig-paths` plugin so the `@/*` alias resolves in test files. A second `vitest.config.ts` or any `vitest.workspace.ts` SHALL NOT be introduced.

#### Scenario: `ui` project resolves the `@/*` alias

- **GIVEN** a test file under `src/components/` that imports from `@/store/useTimingStore`
- **WHEN** `pnpm test:ui` runs
- **THEN** the import SHALL resolve to `src/store/useTimingStore.ts` without any `paths` override in `vitest.config.ts` itself

#### Scenario: `ui` project loads jsdom

- **GIVEN** a UI-project test that references `document` or `window`
- **WHEN** the test runs under `pnpm test:ui`
- **THEN** the references SHALL resolve (no ReferenceError), proving the jsdom environment is in effect

#### Scenario: `ui` project picks up colocated tests

- **GIVEN** a file `src/components/panels/Foo.test.tsx`
- **WHEN** `pnpm test:ui` runs
- **THEN** Vitest SHALL execute it
- **AND** SHALL NOT execute any file under `__tests__/**/*.test.ts`

### Requirement: jsdom matchers registered exclusively for the UI project

A `vitest.setup.ts` file SHALL exist at the repository root and SHALL import `@testing-library/jest-dom/vitest` (the entry that auto-registers matchers via `expect.extend`). This file SHALL be referenced ONLY by the `ui` project's `setupFiles`. The `logic` project SHALL NOT include `vitest.setup.ts` (or any other DOM-matcher setup) in its `setupFiles`.

#### Scenario: jest-dom matchers are available in UI tests

- **GIVEN** a UI test that calls `expect(element).toBeInTheDocument()`
- **WHEN** `pnpm test:ui` runs
- **THEN** the matcher SHALL execute without "is not a function" errors

#### Scenario: jest-dom matchers are NOT available in logic tests

- **GIVEN** a logic-project test that attempts to call `expect(x).toBeInTheDocument()`
- **WHEN** `pnpm test:logic` runs
- **THEN** the test SHALL fail (matcher not registered), proving the setup file did not leak across projects

### Requirement: React 19-compatible testing library toolchain

`package.json` `devDependencies` SHALL include `jsdom`, `@testing-library/react` (`^16.0.0` or newer — the first major version supporting React 19), `@testing-library/dom`, `@testing-library/jest-dom` (`^6.6.0` or newer), and `@testing-library/user-event` (`^14.0.0` or newer). No additional React renderer (e.g., `react-test-renderer`) SHALL be installed.

#### Scenario: Toolchain installs cleanly under pnpm

- **WHEN** a fresh contributor runs `pnpm install`
- **THEN** the install SHALL succeed without peer-dependency errors against React 19

#### Scenario: `@testing-library/react` is at version 16 or newer

- **WHEN** `pnpm list @testing-library/react --json` is inspected
- **THEN** the resolved version SHALL satisfy `^16.0.0`

### Requirement: `test:ui`, `test:ui:watch`, and top-level `test` package scripts

`package.json` SHALL define `test:ui` as `vitest run --project ui`, `test:ui:watch` as `vitest --project ui`, and a top-level `test` script as `vitest run` (no `--project` flag, so it executes every registered project). The existing `test:logic` and `test:logic:watch` scripts SHALL remain unchanged.

#### Scenario: `pnpm test:ui` runs only the UI project

- **WHEN** `pnpm test:ui` is invoked
- **THEN** Vitest SHALL execute every file matching `src/components/**/*.test.{ts,tsx}`
- **AND** SHALL NOT execute any file under `__tests__/**/*.test.ts`

#### Scenario: `pnpm test` runs both projects

- **WHEN** `pnpm test` is invoked
- **THEN** Vitest SHALL execute the `logic` project AND the `ui` project
- **AND** SHALL exit with a non-zero status if either project has a failing test

### Requirement: Colocated `*.test.tsx` convention under `src/components/`

UI test files SHALL live next to the source file they exercise, named `<ComponentName>.test.tsx`. They SHALL NOT live under `__tests__/`. They MAY import from `react`, `react-dom`, `d3`, `@/store/*`, `@/core/*`, `@/data/*`, `@/types/*`, and `@/components/*`. The author of a UI test SHALL NOT add a top-level `pnpm test` ignore-pattern to skip such files.

#### Scenario: Colocated tests are excluded from the production bundle

- **WHEN** `pnpm build` runs
- **THEN** no `*.test.tsx` file SHALL appear in the Next.js build output
- **AND** the build SHALL succeed without errors about test imports leaking into application code

#### Scenario: Adding a test does NOT require touching `vitest.config.ts`

- **GIVEN** a new component `src/components/foo/Foo.tsx`
- **WHEN** a contributor adds `src/components/foo/Foo.test.tsx`
- **THEN** `pnpm test:ui` SHALL pick it up on the next run without any config change

### Requirement: Initial render-and-store coverage for the three implemented components

The change SHALL add at least one test file per currently implemented component:

- `src/components/canvas/WaveformTimeline.test.tsx`
- `src/components/panels/ComponentLibrary.test.tsx`
- `src/components/panels/ConstraintInspector.test.tsx`

Each test file SHALL include at least one render-smoke test that mounts the component inside the default `@testing-library/react` `render()` and asserts at least one accessible query (`getByRole`, `getByText`, `findByText`, etc.) succeeds against state seeded from the canonical demo profile in `src/data/`. Each test file SHALL include a `beforeEach` that resets `useTimingStore` to a known state via `useTimingStore.setState(initialState, true)` before the next test runs. UI tests SHALL NOT mock `useTimingStore`, `@/core/solver`, or anything the components import from the data layer; they SHALL exercise the real store + solver.

#### Scenario: `WaveformTimeline` smoke render

- **GIVEN** the store seeded with the canonical demo profile
- **WHEN** `WaveformTimeline` is rendered
- **THEN** the render SHALL complete without throwing
- **AND** at least one major time-axis label produced by `formatTime` from the seeded viewport SHALL be queryable from the resulting DOM (signal *names* themselves are rendered by the sibling `ComponentLibrary`, not by the timeline canvas)
- **AND** at least one seeded bus-value label (e.g., one of the `value` strings on the demo profile's `DATA[7:0]` transitions) SHALL be queryable, proving the seeded transition data drove the render

#### Scenario: `ComponentLibrary` reflects the seeded profile

- **GIVEN** the store seeded with the canonical demo profile
- **WHEN** `ComponentLibrary` is rendered
- **THEN** every signal from the seeded profile SHALL be queryable by its display name

#### Scenario: `ConstraintInspector` reflects solved status

- **GIVEN** the store seeded with the canonical demo profile (which has one FAIL after solve)
- **WHEN** `ConstraintInspector` is rendered
- **THEN** the constraint with `status === 'FAIL'` SHALL be visibly distinguished (e.g., a "FAIL" label / role / class is queryable)
- **AND** the PASS constraints SHALL also be queryable by their ids or labels

#### Scenario: Store reset isolates tests

- **GIVEN** a test mutates the store via an action method
- **WHEN** the next test in the same file begins
- **THEN** the store state SHALL be back to the value installed by `beforeEach`
- **AND** the second test's assertions SHALL NOT see leakage from the first

### Requirement: `formatTime` helper covered by table-driven tests

The exported pure function `formatTime` from `src/components/canvas/WaveformTimeline.tsx` SHALL be covered by table-driven unit tests inside `src/components/canvas/WaveformTimeline.test.tsx` (a separate `describe('formatTime', ...)` block is sufficient — extraction to a separate module is NOT required by this change). Tests SHALL exercise at least the four documented branches: sub-ps (`< 0.0005`), µs (`>= 1000`), ns whole-number (`>= 10`), and ns one-decimal (`>= 1` and `< 10`).

#### Scenario: All four formatting branches are asserted

- **WHEN** `formatTime(0)`, `formatTime(5000)`, `formatTime(50)`, and `formatTime(5)` are called
- **THEN** the results SHALL be `'0 ns'`, `'5.00 µs'`, `'50 ns'`, and `'5.0 ns'` respectively

#### Scenario: Negative magnitudes are handled symmetrically

- **WHEN** `formatTime(-50)` is called
- **THEN** the result SHALL be a non-empty string with a leading minus sign
- **AND** the absolute-value branch selection SHALL match the positive case

### Requirement: UI tests SHALL NOT use snapshot assertions

UI tests in this change SHALL NOT use `toMatchSnapshot()`, `toMatchInlineSnapshot()`, or `toMatchFileSnapshot()`. Assertions SHALL be made via accessible queries against rendered content or via direct property checks on store-derived values.

#### Scenario: Grep finds no snapshot calls in UI tests

- **WHEN** `grep -r "toMatchSnapshot\|toMatchInlineSnapshot\|toMatchFileSnapshot" src/components/` runs
- **THEN** zero matches SHALL be returned

