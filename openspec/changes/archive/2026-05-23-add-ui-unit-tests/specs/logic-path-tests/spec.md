# logic-path-tests Specification Delta

## MODIFIED Requirements

### Requirement: `test:logic` package script

`package.json` SHALL define the two logic-related test scripts: `test:logic` (runs `vitest run --project logic`) and `test:logic:watch` (runs `vitest --project logic`). With the introduction of the `ui-path-tests` capability, a top-level `pnpm test` script SHALL also exist (defined and constrained by the `ui-path-tests` capability) and SHALL execute every registered Vitest project. The previous "no top-level `pnpm test` script" prohibition no longer applies and SHALL NOT be reintroduced.

#### Scenario: `pnpm test:logic` runs only the logic project

- **WHEN** `pnpm test:logic` is invoked
- **THEN** Vitest SHALL execute every file under `__tests__/**/*.test.ts`
- **AND** SHALL NOT execute any file under `src/**/*.test.tsx`

#### Scenario: `pnpm test` runs the logic project as part of the full run

- **WHEN** `pnpm test` is invoked
- **THEN** Vitest SHALL execute the `logic` project (in addition to any other registered projects)
- **AND** SHALL exit with a non-zero status if any logic-project test fails
