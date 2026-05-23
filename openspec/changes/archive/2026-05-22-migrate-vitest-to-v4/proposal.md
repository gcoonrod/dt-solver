## Why

Vitest 4.x has shipped (4.1.7 as of writing) and `pnpm install` of `vitest` now resolves to 4.x by default — pinning to `^3.0.0` forces a stale-version warning on every install and risks growing peer-dependency drift over the coming months (most notably with `@vitest/coverage-v8`, which already paired with 4.x on first install and had to be downgraded). The migration cost is unusually small for this repo: our `vitest.config.ts` already uses Vitest 4's required `test.projects` API; we don't use any of the removed config options (`environmentMatchGlobs`, `poolMatchGlobs`, `coverage.all`, `coverage.extensions`); we're on Node 24 (4.x requires ≥ 20); and the breaking changes to `vi.spyOn` / module-namespace sealing only affect browser-mode tests, which we don't have. The principal benefit is staying current and aligned with the package's upgrade cadence before the gap widens.

## What Changes

- Bump `vitest` from `^3.2.4` → `^4.1.0` in `package.json`.
- Bump `@vitest/coverage-v8` from `^3.2.4` → `^4.1.0` (must move in lockstep with the runner).
- Verify (no expected change) that `vite-tsconfig-paths` continues to work under the Vite 6+ that Vitest 4 brings transitively. Bump if needed.
- Verify `vitest.config.ts` continues to parse without changes (no removed APIs in use today).
- Re-run the full logic-path suite to confirm 22 tests still pass with no flakes.
- Update the `logic-path-tests` capability spec to widen its version constraint from "`^3.0.0`" to "`^4.0.0`". (This is a **MODIFIED** requirement, not new — the rest of the spec is unaffected.)

## Capabilities

### New Capabilities

<!-- None — this is a version bump on an existing capability. -->

### Modified Capabilities

- `logic-path-tests`: the Vitest version constraint requirement widens from `^3.0.0` to `^4.0.0`. All other requirements (single config with `test.projects`, `test:logic` script, solver/store/demo coverage baseline, `__tests__/` purity) remain unchanged.

## Impact

- **Dependencies**: `vitest` and `@vitest/coverage-v8` bumped major version; `vite-tsconfig-paths` possibly bumped (only if a Vite 6 peer mismatch surfaces). No production-dependency impact.
- **Config files**: `vitest.config.ts` is *expected* to require zero changes. If verification surfaces a Vite-6-transitive issue, scope expands to fix it (flag in tasks).
- **Test files**: zero changes expected. The Vitest API surface we use (`describe`, `it`, `expect`, `beforeEach`, `toBeCloseTo`) is identical across 3.x and 4.x.
- **Scripts**: zero changes. `pnpm test:logic` and `pnpm test:logic:watch` work unchanged.
- **CI**: still out of scope (no CI exists yet).
- **Risk surface**:
  - `@vitest/coverage-v8` peer with `vitest`: handled by matching majors.
  - Vite 6+ transitive: bounded to whether our test files load — they import only TypeScript + `@/*` aliases, nothing exotic.
  - Node version: ≥ 20 required; we're on 24. Fine.
  - **Out of scope (deliberately not migrated):** `vi.spyOn` / module-namespace changes don't affect us because we don't use mocks; we can revisit if/when mocking lands.
- **Forward-compat**: the future UI-path change that lands `jsdom` + `@testing-library/react` will install against Vitest 4 directly, avoiding the 3-to-4 transition entirely.
