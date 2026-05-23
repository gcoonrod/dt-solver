## Why

The repo has zero installed test infrastructure today (CLAUDE.md flags this explicitly; ROADMAP promised "Jest/Vitest" without picking one). Meanwhile the `src/core/` purity boundary was *designed* to be unit-testable in pure node — and the recent `add-rise-fall-time-support` change made non-trivial floating-point math changes (worst-case endpoint selection per constraint type, slew-aware interval derivation) whose correctness today is verified only by hand-calculation in chat. The next time a similar change lands, "I worked the margins out on paper" is no longer good enough; we need executable evidence that takes <1 second to produce.

This change establishes the **logic path** of the testing strategy only — pure-TS tests that run in node, never load a browser shim, and cover `src/core/` + `src/store/` + any future browser/React-independent module. A separate, sibling change will follow for the **UI path** (colocated `*.test.tsx` against React components in jsdom).

## What Changes

- Install `vitest`, `@vitest/coverage-v8` (opt-in coverage), and `vite-tsconfig-paths` (resolves the `@/*` alias from `tsconfig.json` without duplicating it) as devDependencies.
- Add a single `vitest.config.ts` at the repo root using `test.projects: [...]` (the Vitest 3.x replacement for the deprecated `vitest.workspace.ts`). This change adds one project — `logic`, with `environment: 'node'` and `include: ['__tests__/**/*.test.ts']`. The future UI-path change adds a second project entry; nothing in the logic project needs to change.
- Add `pnpm test:logic` script that runs `vitest run --project logic`, plus a `test:logic:watch` for the dev loop. **No top-level `pnpm test` script** — that lands when the UI path arrives and we decide whether `test` runs both.
- Fill in the existing stub `__tests__/core/solver.test.ts` with tests covering `periodNs`, `generateClockEdges`, `stateAt`, `resolveReference`, and the worst-case endpoint logic in `evaluateConstraint` (one test per constraint type: SETUP, HOLD, PROP_DELAY).
- Fill in the existing stub `__tests__/store/timingStore.test.ts` with tests covering the re-solve cascade (mutating signals/constraints triggers a fresh solve) and viewport/zoom math.
- Add `__tests__/data/w65c02s-14mhz.test.ts` that **pins the demo story** — asserts the W65C02S profile produces exactly 5 PASS / 1 FAIL with `tADS` as the failure case. This locks the demo against accidental regressions in either the data or the solver.
- Add a one-line CLAUDE.md note replacing today's "No test runner is wired up yet" with the actual `pnpm test:logic` command, and an architectural note that **`src/core/` tests must never need jsdom** (the workspace separation enforces this physically).

## Capabilities

### New Capabilities

- `logic-path-tests`: Vitest-based unit-test infrastructure scoped to the pure-logic layers of the app (`src/core/`, `src/store/`, future browser-independent code). Defines the workspace config, file conventions (`__tests__/` mirror), package scripts, and the minimum baseline of solver/store/profile coverage that the workspace must include.

### Modified Capabilities

<!-- None yet — `openspec/specs/` only contains `signal-edge-slew` from the previous change, whose requirements are unaffected by adding tests. -->

## Impact

- **Dependencies**: `vitest` and `@vitest/coverage-v8` added to `devDependencies`. No production-dependency changes; no runtime impact.
- **Config files** (new): `vitest.config.ts` (single file; uses `test.projects` to host the future UI-path entry without rework).
- **Test files** (filled-in stubs): `__tests__/core/solver.test.ts`, `__tests__/store/timingStore.test.ts`. (New) `__tests__/data/w65c02s-14mhz.test.ts`.
- **Scripts**: `package.json` gains `test:logic`. No `test` umbrella script yet.
- **Docs**: small CLAUDE.md update so the next agent doesn't repeat "no test runner is wired up."
- **CI**: out of scope for this change. The scripts exist; wiring them to GitHub Actions / pre-push hooks is a follow-up.
- **Out of scope (explicitly deferred)**: jsdom, `@testing-library/react`, component tests, E2E / Playwright, coverage thresholds, mutation testing.
- **Forward-compat**: the UI-path follow-up change can land by adding a second workspace entry; nothing in this change needs to be rewritten when that happens.
