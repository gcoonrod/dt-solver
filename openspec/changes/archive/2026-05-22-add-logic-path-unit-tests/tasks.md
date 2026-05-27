## 1. Infrastructure

- [x] 1.1 `pnpm add -D vitest@^3 @vitest/coverage-v8 vite-tsconfig-paths`
- [x] 1.2 Create `vitest.config.ts` at repo root with `plugins: [tsconfigPaths()]` and a single `test.projects` entry named `logic` (env `node`, glob `__tests__/**/*.test.ts`)
- [x] 1.3 Add `package.json` scripts: `test:logic` → `vitest run --project logic`; `test:logic:watch` → `vitest --project logic`
- [x] 1.4 Verify `pnpm exec vitest --version` prints a 3.x version; `pnpm test:logic` exits 0 with "no tests found" (stubs still empty)
- [x] 1.5 Update CLAUDE.md: replace the "No test runner is wired up yet" paragraph with the actual `pnpm test:logic` invocation and a one-line rule "tests under `__tests__/` must not import React, the DOM, D3, or anything in `src/components/` — the `logic` Vitest project enforces this via `environment: 'node'`"

## 2. Solver tests (`__tests__/core/solver.test.ts`)

- [x] 2.1 Replace the `// stub` placeholder with a Vitest test file scaffold (`import { describe, it, expect } from 'vitest'`)
- [x] 2.2 Test `periodNs`: one case at 14 MHz, one at 1 MHz
- [x] 2.3 Test `generateClockEdges` with zero slew (legacy behavior): edges are intervals where `startNs === endNs === midNs`
- [x] 2.4 Test `generateClockEdges` with non-zero asymmetric slew (rise=2, fall=4): rising edges span 2 ns, falling edges span 4 ns; emitted in chronological order
- [x] 2.5 Test `stateAt` for a clock (HIGH during first half of period) and a data signal (state walks the transition list)
- [x] 2.6 Test `resolveReference` filtering: `edgeDirection: 'RISING'` filters out falling; `occurrenceIndex: 1` returns at most one event
- [x] 2.7 Test `evaluateConstraint` SETUP with constructed inputs (clock falling mid `100`, fall `2`; data VALID mid `90`, rise `4`; min `8`) — assert margin `≈ 7`, status FAIL, worstWindow `{ 99, 92 }`
- [x] 2.8 Test `evaluateConstraint` HOLD with symmetric inputs — assert endpoints are anchor.end / target.start, margin matches hand calc
- [x] 2.9 Test `evaluateConstraint` PROP_DELAY — assert endpoints both `.end`, worst-case is the LARGEST margin, status reflects `maxNs` bound
- [x] 2.10 Use `toBeCloseTo(x, 2)` for every computed-margin assertion (not strict equality)

## 3. Store tests (`__tests__/store/timingStore.test.ts`)

- [x] 3.1 Replace `// stub` with Vitest scaffold. Reset store state in `beforeEach` so tests don't bleed
- [x] 3.2 Test `addConstraint` re-solves: after `getState().addConstraint(c)`, `getState().solved` contains an entry for `c.id`
- [x] 3.3 Test `removeSignal` cascades: after `getState().removeSignal('phi2')`, no constraint references `phi2`, and `solved` is re-computed
- [x] 3.4 Test `addSignal` re-solves
- [x] 3.5 Test `zoomAt(50, 0.5)` keeps `(tMinNs + tMaxNs) / 2` at ~50 within rounding
- [x] 3.6 Test `fitView` resets to the profile's `defaultWindowNs`

## 4. Demo-pinning test (`__tests__/data/w65c02s-14mhz.test.ts`)

- [x] 4.1 New file. Import `W65C02S_14MHz_signals`, `W65C02S_14MHz_constraints` from `@/data/w65c02s-14mhz` and `solve` from `@/core/solver`
- [x] 4.2 Assert: exactly one solved constraint has `status === 'FAIL'`
- [x] 4.3 Assert: that failing constraint's `id` is `'tads'`
- [x] 4.4 Assert: the other five constraints all have `status === 'PASS'` (UNRESOLVED counts as a failure of this test — we want every constraint accounted for)

## 5. Purity sanity check

- [x] 5.1 Run `pnpm test:logic` once more — all suites green
- [x] 5.2 Manually `grep -rE "from ['\"]react|from ['\"]@/components|@testing-library" __tests__/` and confirm zero matches
- [x] 5.3 Sanity: create a throwaway `__tests__/should_skip.test.tsx` that does `import React from 'react'`, run `pnpm test:logic`, confirm the file is NOT picked up by the `logic` project (because the glob excludes `.tsx`). Delete the throwaway after verifying.

## 6. Verification

- [x] 6.1 `pnpm lint` clean (the new config and tests pass ESLint)
- [x] 6.2 `pnpm build` clean (Vitest config and test files don't break the Next build — they shouldn't, but confirm)
- [x] 6.3 `pnpm test:logic` clean — all tests pass on first run, no flakes across three consecutive invocations
- [x] 6.4 `pnpm test:logic --coverage` runs and emits a report (does not need to pass any threshold)
- [x] 6.5 Update CLAUDE.md changes from task 1.5 are accurate after the suite is in place
