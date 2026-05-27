## Context

The codebase has zero installed test infrastructure today; CLAUDE.md explicitly warns of this. The `__tests__/` directory contains two `// stub` placeholders (`core/solver.test.ts`, `store/timingStore.test.ts`) — evidence someone pre-committed to a `__tests__/` mirror layout for the pure layers but never picked a runner.

The architectural backdrop matters. `src/core/` carries a hard purity rule (no React, DOM, D3, or store imports — enforced by code review and now visibly testable: anything that needs jsdom shouldn't be there). `src/store/` is Zustand, which is testable in node without any browser shim by calling `useTimingStore.getState()` / `.setState()` directly. Everything in `src/components/` is React + D3 + SVG and is **deliberately out of scope** for this change — it lands in a sibling "UI path" change.

The recent `add-rise-fall-time-support` work made the cost of *not* having tests concrete: the worst-case endpoint math (SETUP → anchor.start ↔ target.end; HOLD → opposite; PROP_DELAY → both .end) was validated entirely by mental arithmetic in chat. A half-page of solver tests would have made that verification one-shell-command, and pinned the W65C02S demo story (5 PASS / 1 FAIL with `tADS` as the failure) against future regressions in either the data or the math.

## Goals / Non-Goals

**Goals:**

- Land Vitest 3.x with a single `vitest.config.ts` shaped so the future UI-path change is strictly additive (add one project entry; no edits to logic config).
- Cover the math layer's worst-case selection logic with explicit unit tests per constraint type, so future arithmetic changes have automated evidence in <1s.
- Pin the W65C02S demo story as a regression fixture, decoupled from first-principles solver tests.
- Cover the store's re-solve cascade and viewport math.
- Preserve `src/core/` purity at the *test* level too — logic-path tests must run in `environment: 'node'`, never jsdom.

**Non-Goals:**

- Component tests. The `src/components/` tree is out of scope until the UI-path change.
- jsdom, happy-dom, `@testing-library/*`. None installed by this change.
- E2E / Playwright. Deferred (the prior change already learned this environment can't run Playwright anyway).
- CI wiring (GitHub Actions, pre-push hooks). The scripts will exist; wiring is a follow-up so the test suite can stabilize first.
- Coverage thresholds. `@vitest/coverage-v8` is installed for ad-hoc use; no enforced floor.
- Mutation testing, property-based testing, snapshot testing. Plain `expect()` only for now.
- Touching `src/core/solver.ts` or `src/store/useTimingStore.ts` for testability — the existing API is already pure-function-friendly; if we discover it isn't, that's a future refactor.

## Decisions

### Decision 1: Single `vitest.config.ts` with `test.projects`, not a workspace file

Vitest 3.x deprecated the standalone `vitest.workspace.ts` file in favor of an inline `test.projects: [...]` array inside `vitest.config.ts`. This change uses the new API directly.

Shape:

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      {
        test: {
          name: { label: "logic", color: "green" },
          environment: "node",
          include: ["__tests__/**/*.test.ts"],
          // No setup files for the logic path — keep it minimal.
        },
      },
      // ← UI-path change appends a second entry here
    ],
  },
});
```

**Alternatives considered:**

- *`vitest.workspace.ts` (the deprecated pattern).* Rejected — locks the project into a removed API.
- *Single config, no `projects`, route by `environmentMatchGlobs`.* Also deprecated in 3.x; the docs explicitly say "use projects instead."
- *Two separate config files (`vitest.logic.config.ts` and `vitest.ui.config.ts`) with no projects array.* More files, more scripts, no real upside.

### Decision 2: `vite-tsconfig-paths` plugin over hand-rolled `resolve.alias`

The plugin reads `paths` from `tsconfig.json` so `@/*` resolves identically in tests and in the Next build. Hand-rolling `resolve.alias: { "@": path.resolve(...) }` works but creates a second source of truth that drifts the first time `tsconfig.json` adds a new alias.

### Decision 3: `__tests__/` mirror layout (not co-located) for the logic path

The two existing stubs already imply this layout. Co-located `solver.test.ts` next to `solver.ts` would also work, but:

- The logic-path/UI-path split *physically corresponds* to the test-location split. `__tests__/` for node-only logic, co-located `.test.tsx` for components (per the user's plan). The directory itself becomes a load-bearing signal: "if your test file is under `__tests__/`, it must not import React or anything browser-dependent."
- The existing stubs mirror `src/` paths exactly (`__tests__/core/solver.test.ts` ↔ `src/core/solver.ts`). Keeping the mirror keeps navigation obvious.

### Decision 4: Test scope is `evaluateConstraint` worst-case logic + edge generation + a demo-pinning test

The solver module has many exports, but the failure modes cluster:

| Function | Why test | Test style |
|---|---|---|
| `periodNs` | Trivial, but tests serve as documentation | One sanity case |
| `generateClockEdges` | Off-by-one risk at window boundaries; interval derivation from rise/fall | A few small cases including zero-slew and asymmetric slew |
| `stateAt` | State machine over transitions list | A handful of cases incl. before-first-transition, between, after-last |
| `resolveReference` | Filtering by edge direction; occurrence index | One per axis |
| `evaluateConstraint` | **The high-value target.** Worst-case endpoint selection differs per type. | One test *per constraint type* with a hand-picked margin and known answer |
| `solve` | Trivial map | Smoke test only |

The demo-pinning test (`__tests__/data/w65c02s-14mhz.test.ts`) is separate from solver tests on purpose: solver tests assert *math*, the demo test asserts *the story stays the same*. A failure in the demo test should send the reader to "did we change the profile data?" or "did we accidentally change solver semantics?" — both worth knowing.

### Decision 5: Store tests use `setState` / `getState`, no React renderer

Zustand stores are *callable* from node without React. The re-solve cascade can be tested as: `useTimingStore.setState({ signals: [...] })`, then read `useTimingStore.getState().solved` and assert. Skipping React entirely keeps the logic path free of any RTL/jsdom temptation.

Caveat: the store currently constructs its initial state by calling `solve(profile.signals, profile.constraints, 1000)` at module-load time. Tests that mutate the store don't need to reload the module — `setState` is fine.

### Decision 6: No top-level `test` script yet

`pnpm test:logic` and `pnpm test:logic:watch` only. The umbrella `test` script is deferred to the UI-path change, where the design question "should `pnpm test` run logic + ui sequentially? in parallel? error if either fails?" is naturally answered.

This avoids two failure modes:

- Adding `"test": "pnpm test:logic"` now and silently un-changing it later when the UI path lands (some dev's local `test` would suddenly start running jsdom tests).
- Adding `"test": "echo no umbrella yet"` placeholder, which is just noise.

### Decision 7: Coverage is available but not enforced

Install `@vitest/coverage-v8` so `pnpm test:logic --coverage` works on demand. No `--coverage` in the default script; no minimum thresholds. Once the test suite stabilizes and a CI step exists, we can argue about thresholds with data.

## Risks / Trade-offs

- **[Risk]** First-principles solver tests will encode my recent retune math (e.g., "tADS margin = 18.21 ns") and could prevent future legitimate retunes. **Mitigation:** the demo-pinning test asserts *statuses and which constraint fails*, not exact margins. The first-principles tests use *constructed minimal inputs* (a 2-signal scenario with hand-picked numbers), not the W65C02S profile. The two layers test different things.
- **[Risk]** Floating-point assertions can be flaky. `35.7143 - 23.5 = 11.2143…` is exact enough in IEEE 754 for these inputs, but a future change might drift it. **Mitigation:** use `expect(margin).toBeCloseTo(11.21, 2)` (`toBeCloseTo` second argument is digits after the decimal), not strict equality, for any computed margin.
- **[Risk]** Vitest 3.x → 4.x is in active rollout (docs list both as available). Pinning to 3.x risks an upgrade churn within a few months. **Mitigation:** allow either via `^3.0.0` for now; revisit when 4.x is the documented default and the `projects` API has settled.
- **[Risk]** The `vite-tsconfig-paths` plugin is an extra dep that could break on a TS config change. **Mitigation:** small surface area; if it ever flakes, swap to hand-rolled `resolve.alias` — it's a one-file fix.
- **[Trade-off]** Choosing `__tests__/` mirror over co-located means tests are slightly less discoverable from a single file. Accepted because the layout becomes a load-bearing architectural signal (see Decision 3).

## Migration Plan

In-tree only — no deploy artifacts, no DB. Sequence:

1. Land vitest install + config + `package.json` scripts in one commit (infra only; no tests yet).
2. Land filled-in solver, store, and demo-pinning tests in a second commit.
3. Update CLAUDE.md note about test runner in either commit.

Rollback: `git revert`. The store/solver code is unchanged by this work, so there is no functional risk to user-facing behavior.

## Open Questions

- Should the demo-pinning test assert exact margins (e.g., `expect(solved[0].calculatedMarginNs).toBeCloseTo(18.21, 2)`) or only statuses? Leaning *statuses + which constraint fails*, since exact margins are tested in solver-level tests with constructed inputs. Will resolve during implementation; either is cheap to change.
- When should `vitest --coverage` run? Punted until CI exists.
- Will the UI-path change reuse `vite-tsconfig-paths` from this install, or pick a different alias strategy? Expected: reuse — that's why it lives in the root config, not a project-local one.
