## Why

The logic-path tests (`__tests__/**/*.test.ts`) cover the solver, the store, and the demo profile, but the React + D3 layer under `src/components/` has zero automated coverage. `vitest.config.ts` already reserves a slot for a second project ("The UI-path change appends a second project entry here.") and CLAUDE.md documents the intent ("The UI path … is not wired up yet; there is no top-level `pnpm test` script for that reason"). This change closes that gap so component regressions — broken renders, lost props, stale store wiring — are caught before they reach `pnpm dev`.

## What Changes

- Add `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`, and `@testing-library/user-event` as devDependencies.
- Append a second project entry to `vitest.config.ts` named `ui` with `environment: 'jsdom'`, `include: ['src/components/**/*.test.{ts,tsx}']`, and a `setupFiles` entry that installs jest-dom matchers.
- Create `vitest.setup.ts` at the repo root that imports `@testing-library/jest-dom/vitest`.
- Add `package.json` scripts: `test:ui`, `test:ui:watch`, and a top-level `test` that runs both projects (`vitest run`). The existing `test:logic` / `test:logic:watch` scripts are unchanged.
- Colocate three initial component test files:
  - `src/components/canvas/WaveformTimeline.test.tsx` — smoke render against a seeded store + pure-function tests for the exported `formatTime` helper.
  - `src/components/panels/ComponentLibrary.test.tsx` — renders the panel, asserts the seeded signals from the default profile appear, exercises the add/remove buttons through the real store.
  - `src/components/panels/ConstraintInspector.test.tsx` — renders the panel, asserts seeded constraints render with PASS/FAIL status, exercises an edit through the real store and confirms re-solve.
- **BREAKING** for contributor muscle memory: `pnpm test` now exists and runs both projects; CI / scripts that previously hard-coded `pnpm test:logic` continue to work but the new top-level script is the recommended entry point.

## Capabilities

### New Capabilities

- `ui-path-tests`: Defines the jsdom-backed test project, the colocated `*.test.tsx` file convention under `src/components/`, the required testing-library toolchain, the initial coverage requirements for `WaveformTimeline`, `ComponentLibrary`, and `ConstraintInspector`, and the top-level `pnpm test` script that fans out to both projects.

### Modified Capabilities

- `logic-path-tests`: The "Top-level `pnpm test` is not yet defined" scenario becomes obsolete — this change introduces a top-level `pnpm test` script. The `logic` project itself (its name, environment, include glob, and `test:logic*` scripts) is unchanged; only the cross-cutting "no top-level test script exists" assertion needs to move.

## Impact

- **Code**: `vitest.config.ts` (append project entry), `package.json` (add devDeps + scripts), new `vitest.setup.ts`, new colocated `*.test.tsx` files under `src/components/`.
- **Dependencies**: adds `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/user-event` to `devDependencies`. All must be compatible with React 19 (testing-library `^16` for React, jest-dom `^6.6`).
- **Contributor workflow**: `pnpm test` becomes the default entry point. Pre-commit / CI configs that exist today only reference `test:logic` and continue to function, but any new automation should target the top-level script.
- **Documentation**: CLAUDE.md's "UI path … is not wired up yet" paragraph will need an update when this change archives (handled by the spec deltas; not a code change in this proposal).
- **Out of scope**: snapshot testing, visual regression, Playwright/E2E, coverage thresholds for the UI project, CI enforcement of the purity boundary (already enforced physically by file extension + environment).
