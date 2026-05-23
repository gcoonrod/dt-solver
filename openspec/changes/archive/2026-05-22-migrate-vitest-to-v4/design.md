## Context

Vitest 4.x is the current major; the prior change `add-logic-path-unit-tests` (archived 2026-05-22) installed Vitest at `^3.2.4` because that was the latest 3-line release and because 4.x had only just shipped. pnpm now flags every `pnpm install` with "(4.1.7 is available)" for the runner, and the initial install of `@vitest/coverage-v8` resolved to 4.x against vitest 3.x — proving that peer drift is already happening on greenfield clones.

Vitest 4's published breaking changes (per the upstream migration guide):

1. **Removed deprecated config**: `environmentMatchGlobs`, `poolMatchGlobs`, `coverage.all`, `coverage.extensions`. Replacement is `projects` (already what we use) and `coverage.include` / `coverage.exclude`.
2. **Workspace API renamed**: `vitest.workspace.{js,ts}` → `test.projects` inline. Already adopted.
3. **Node 20+ required**. We run Node 24.
4. **Vite 6+ required**. Brought in transitively; we don't import Vite directly.
5. **Browser-mode mocking changes** (`vi.spyOn` on module namespaces, sealed ESM). We have zero mocks.

None of these touch us. The migration is effectively a `package.json` version bump plus a verification run.

## Goals / Non-Goals

**Goals:**

- Have `pnpm install` of a fresh clone produce Vitest 4 without `(N.N.N is available)` chatter.
- Keep `@vitest/coverage-v8` and `vitest` on matching major versions (avoid the lockstep regression that bit the prior install).
- Confirm the existing 22-test suite passes unchanged on 4.x.
- Update the `logic-path-tests` spec to widen the version constraint (no other requirement changes).

**Non-Goals:**

- Adopt any new Vitest 4 features (browser mode, typecheck, in-source testing, experimental `vi.mock` shapes). The change is *just* the version bump.
- Add mocking to the suite. Out of scope.
- Touch the UI-path planning. The future UI-path change installs against whatever Vitest is current at *its* time.
- Re-evaluate `vite-tsconfig-paths` vs. inline `resolve.alias`. Re-affirmed in the prior change; nothing here changes that calculus.

## Decisions

### Decision 1: Bump majors in lockstep, not piecemeal

`vitest` and `@vitest/coverage-v8` must share the same major. The initial install of the prior change resolved coverage to 4.x while vitest stayed at 3.x and we manually downgraded coverage. This time we drive the upgrade explicitly: a single command that names both, ensuring they install together.

```sh
pnpm add -D vitest@^4 @vitest/coverage-v8@^4
```

**Alternative:** bump only `vitest` and let pnpm's peer resolution drag coverage along. Rejected — gives less control and produced the wrong-direction drift last time.

### Decision 2: Don't touch `vitest.config.ts` unless verification fails

The config we shipped in the prior change is already 4.x-compatible by construction (the workspace API was deprecated in 3.x, we used `projects`). The verification step (`pnpm test:logic`) is the truth oracle — if it passes, no edit. If a Vite-6-transitive issue surfaces (e.g., a plugin needs bumping), we patch only what's broken.

This keeps the change minimal and reversible. A pure-bump rollback is `git revert` on one commit.

### Decision 3: `vite-tsconfig-paths` is reviewed but not preemptively bumped

`vite-tsconfig-paths@6.1.1` declares peer-compat with Vite 5 and 6. Vitest 4 brings Vite 6. The plugin should keep working. If a peer warning appears during install, we bump to whatever satisfies; otherwise we leave the version alone.

### Decision 4: Spec change is MODIFIED, not ADDED + REMOVED

The `logic-path-tests` capability stays the same capability — only the version constraint inside Requirement 1 shifts. Using MODIFIED preserves the connection (and ensures the archive history reads as "requirement evolved" rather than "feature was deleted and re-added").

### Decision 5: The verification bar is "22 tests pass three times in a row, with parity timing"

The prior change measured ~264 ms × 3 runs as the "no flakes" gate. We re-use that bar: if 4.x runs noticeably slower (say > 2× the 3.x median), we investigate before declaring success. Cold-start can be slower on 4.x — only the warm-run timing matters.

## Risks / Trade-offs

- **[Risk]** Vite 6 module-resolution changes might silently change how `@/*` imports are handled. **Mitigation:** the test suite is the canary — if any import breaks, we'll know in milliseconds, not in production.
- **[Risk]** `@vitest/coverage-v8` 4.x might emit a slightly different report shape (e.g., new untested-files default). **Mitigation:** we don't enforce thresholds; a shape change is cosmetic. Inspect once during verification, note any surprises.
- **[Risk]** `vite-tsconfig-paths` could lag Vite 6 support. **Mitigation:** the prior change's design.md already flagged "swap to hand-rolled `resolve.alias` — it's a one-file fix." Same fallback available here.
- **[Trade-off]** Bumping now vs. waiting for 4.2 or 4.3. Waiting is cheap in terms of risk but accrues install-time drift indefinitely. The marginal stability gained is small (4.0 → 4.1 already shipped without major regressions per the changelog overview).
- **[Trade-off]** Not adopting new 4.x features. Could justify a follow-up change ("evaluate Vitest 4 features for this repo"); not bundling them here keeps the scope of *this* change to "version bump only," which makes the rollback story trivial.

## Migration Plan

In-tree only, single change:

1. Single command: `pnpm add -D vitest@^4 @vitest/coverage-v8@^4` (and `vite-tsconfig-paths` only if a peer mismatch is reported).
2. `pnpm test:logic` — expect 22/22 pass.
3. Three consecutive `pnpm test:logic` runs — confirm no flakes and timing is in the same ballpark.
4. `pnpm test:logic --coverage` — confirm report still emits.
5. `pnpm lint`, `pnpm build` — confirm no incidental fallout.
6. Commit. Rollback strategy: `git revert`.

## Open Questions

- Is the warm-run timing change worth measuring formally, or just eyeballing? Leaning *eyeball* — the suite is small enough that even a 3× slowdown would be 800 ms, still trivial. Will pause if it's actually 10×.
- Should we also bump `@types/node` from `^20` to `^22`? The Vitest engines declaration is `^20 || ^22 || >=24`. The current `^20` works on Node 24 at runtime (Node ≥ 20 satisfies the runtime), but `@types/node@20` may lack some Node 22+ stdlib type entries. Punted — orthogonal to this change.
