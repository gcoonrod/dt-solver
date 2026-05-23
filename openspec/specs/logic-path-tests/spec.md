# logic-path-tests Specification

## Purpose

Defines the unit-test infrastructure and coverage for the project's "logic path" — the pure, browser-free modules under `src/core/`, `src/store/`, and `src/data/`. Establishes Vitest 3.x as the runner, the `vitest.config.ts` project layout, the `pnpm test:logic` scripts, and the minimum coverage requirements for the solver, the Zustand store, and the canonical demo profile.

## Requirements

### Requirement: Vitest 4.x is the unit-test runner

The repository SHALL adopt Vitest (`^4.0.0`) as the unit-test runner. The dev-dependency set SHALL include `vitest`, `@vitest/coverage-v8`, and `vite-tsconfig-paths`. `vitest` and `@vitest/coverage-v8` SHALL share the same major version. No other test-runner (Jest, mocha, `node:test`) SHALL be installed in parallel. The host SHALL run Node.js `>= 20.0.0` (Vitest 4 requirement).

#### Scenario: Installation produces a working 4.x runner

- **WHEN** a fresh contributor runs `pnpm install`
- **THEN** `pnpm exec vitest --version` SHALL print a 4.x version
- **AND** `@vitest/coverage-v8` SHALL resolve to a 4.x version (same major as `vitest`)
- **AND** no Jest or other runner config files SHALL exist at the repo root

#### Scenario: Node version meets the runtime floor

- **WHEN** the runner starts up
- **THEN** the process SHALL be on Node.js `>= 20`
- **AND** SHALL NOT print any "unsupported Node version" warnings from Vitest

### Requirement: Single `vitest.config.ts` with named projects

There SHALL be exactly one root-level Vitest config file: `vitest.config.ts`. It SHALL declare test projects via `test.projects: [...]`. This change SHALL register exactly one project named `logic` with `environment: 'node'` and `include: ['__tests__/**/*.test.ts']`. The deprecated `vitest.workspace.ts` file SHALL NOT exist. The deprecated `environmentMatchGlobs` option SHALL NOT be used. The TypeScript path alias `@/*` from `tsconfig.json` SHALL resolve in test files (configured via the `vite-tsconfig-paths` plugin in `vitest.config.ts`).

#### Scenario: `logic` project resolves the `@/*` alias

- **GIVEN** a test file that imports from `@/core/solver`
- **WHEN** `pnpm test:logic` is run
- **THEN** the import SHALL resolve to `src/core/solver.ts` without any `paths` override in `vitest.config.ts` itself

#### Scenario: Logic project does not load jsdom

- **WHEN** a logic-project test references `window` or `document`
- **THEN** the test SHALL fail with a ReferenceError (proving the node environment is in effect)

### Requirement: `test:logic` package script

`package.json` SHALL define exactly two test-related scripts in this change: `test:logic` (runs `vitest run --project logic`) and `test:logic:watch` (runs `vitest --project logic`). A top-level `test` script SHALL NOT be added in this change.

#### Scenario: `pnpm test:logic` runs only the logic project

- **WHEN** `pnpm test:logic` is invoked
- **THEN** Vitest SHALL execute every file under `__tests__/**/*.test.ts`
- **AND** SHALL NOT execute any file under `src/**/*.test.tsx`

#### Scenario: Top-level `pnpm test` is not yet defined

- **WHEN** `pnpm test` is invoked
- **THEN** the command SHALL fail (no such script), pending the UI-path change

### Requirement: Solver coverage — one test per constraint-type worst-case rule

`__tests__/core/solver.test.ts` SHALL contain unit tests that exercise `evaluateConstraint` for each of the implemented constraint types (`SETUP`, `HOLD`, `PROP_DELAY`) using minimal constructed inputs (not the W65C02S profile). Each test SHALL assert that the chosen anchor and target endpoints match the rule defined in the `signal-edge-slew` spec. `__tests__/core/solver.test.ts` SHALL additionally cover `periodNs`, `generateClockEdges` (including zero-slew and non-zero-slew cases), `stateAt`, and `resolveReference` filtering behavior.

#### Scenario: SETUP test uses anchor.start and target.end

- **GIVEN** a clock with `fallTimeNs = 2` whose falling edge mid is at `100 ns`
- **AND** a data signal with `riseTimeNs = 4` and a `VALID` transition mid at `90 ns`
- **AND** a `SETUP` constraint with `minNs = 8`
- **WHEN** `evaluateConstraint` runs
- **THEN** `calculatedMarginNs` SHALL be approximately `7.0` (anchor.start `= 99`, target.end `= 92`)
- **AND** `status` SHALL be `FAIL`
- **AND** `worstWindow.anchorTimeNs` SHALL equal `99`
- **AND** `worstWindow.targetTimeNs` SHALL equal `92`

#### Scenario: HOLD test uses anchor.end and target.start

- **GIVEN** the symmetric inputs for HOLD
- **WHEN** `evaluateConstraint` runs
- **THEN** the chosen endpoints SHALL be anchor.end and target.start
- **AND** the resulting margin SHALL match the hand-calculated value

#### Scenario: PROP_DELAY test uses anchor.end and target.end

- **GIVEN** the inputs for PROP_DELAY
- **WHEN** `evaluateConstraint` runs
- **THEN** the chosen endpoints SHALL both be `.end`
- **AND** the worst-case selection SHALL prefer the LARGEST margin (not smallest, as PROP_DELAY is a max-bound constraint)

#### Scenario: Floating-point margins use `toBeCloseTo`

- **WHEN** a solver test asserts a computed margin
- **THEN** it SHALL use `expect(margin).toBeCloseTo(expected, 2)` or stricter, not `toBe` / strict equality

### Requirement: Store coverage — re-solve cascade and viewport math

`__tests__/store/timingStore.test.ts` SHALL contain tests that mutate the store via `useTimingStore.setState(...)` (or via the store's action methods) and assert that `solved` is recomputed. The tests SHALL also cover `zoomAt` viewport math and `fitView` reset behavior. Tests SHALL operate on the store imported directly from `@/store/useTimingStore` — they SHALL NOT render any React component.

#### Scenario: Adding a constraint triggers re-solve

- **GIVEN** the default profile loaded
- **WHEN** `useTimingStore.getState().addConstraint(c)` is called for some new constraint `c`
- **THEN** `useTimingStore.getState().solved` SHALL include a result for `c`'s `id`

#### Scenario: Removing a signal removes its constraints and re-solves

- **GIVEN** the default profile loaded with constraints referencing signal `phi2`
- **WHEN** `useTimingStore.getState().removeSignal('phi2')` is called
- **THEN** `useTimingStore.getState().constraints` SHALL contain no entries that reference `phi2`
- **AND** `useTimingStore.getState().solved` SHALL be re-computed from the new signal set

#### Scenario: `zoomAt` keeps the focal point fixed

- **GIVEN** `tMinNs = 0`, `tMaxNs = 100`
- **WHEN** `zoomAt(50, 0.5)` is called
- **THEN** `(tMinNs + tMaxNs) / 2` SHALL still be approximately `50` (within rounding)

### Requirement: W65C02S demo-pinning test

A new test file `__tests__/data/w65c02s-14mhz.test.ts` SHALL pin the demo story by asserting the count and identity of failing constraints when the canonical W65C02S profile is fed through the solver. It SHALL NOT assert exact margin values — those belong in solver-level tests.

#### Scenario: Demo produces exactly one failure and it is tADS

- **WHEN** `solve(W65C02S_14MHz_signals, W65C02S_14MHz_constraints, 1000)` runs
- **THEN** exactly one returned constraint SHALL have `status === 'FAIL'`
- **AND** that constraint's `id` SHALL be `'tads'`
- **AND** the other five SHALL have `status === 'PASS'`

### Requirement: `src/core/` test purity

Every test file under `__tests__/` SHALL run successfully in `environment: 'node'`. No test file SHALL import from `react`, `react-dom`, `d3`, `@/components/*`, or any module that transitively imports browser globals. CI / pre-commit enforcement of this rule is out of scope for this change, but the `vitest.config.ts` project glob SHALL prevent any `.test.tsx` file from being picked up by the `logic` project.

#### Scenario: A React import in a logic test is excluded by file extension

- **WHEN** a file `__tests__/foo.test.tsx` is created
- **THEN** the `logic` project's `include: ['__tests__/**/*.test.ts']` glob SHALL NOT match it (only `.ts`, not `.tsx`)
