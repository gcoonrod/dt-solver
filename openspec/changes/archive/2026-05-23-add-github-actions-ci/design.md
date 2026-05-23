## Context

The repo today has three working `pnpm` scripts (`lint`, `build`, `test`) but no automation runs them. `package.json` pins `pnpm@11.2.2` via `packageManager`; the `logic-path-tests` capability requires Node `>= 20`. There is no `.github/` directory at the time of this change. The project is a single Next.js 16 / React 19 app, no monorepo, no platform-specific build steps. Tests already split into `logic` (node) and `ui` (jsdom) Vitest projects; both are deterministic and don't touch the network.

The goal of this change is the smallest workflow that gives signal on every push/PR. Anything past that — required-checks gating, multi-Node matrices, coverage uploads, deploy jobs — should be its own change with its own justification.

## Goals / Non-Goals

**Goals:**

- One YAML file. One workflow. Three parallel jobs that mirror the three local commands.
- Reuse the existing `packageManager` pin in `package.json` rather than restating the pnpm version inside the workflow (single source of truth).
- Warm CI runs (cache hit) finish all three jobs in under ~2 minutes; cold runs (no cache) under ~5.
- Workflow file is short enough that a maintainer can read all of it on one screen and understand what runs.

**Non-Goals:**

- **Matrix builds.** No Node 20 + Node 22 fan-out, no Linux + macOS, no Windows. The product runs in the browser; the CI environment only needs to mirror "what `pnpm install && pnpm <script>` does on a Linux dev box."
- **Required status checks.** That is a GitHub branch-protection setting set in the repo UI by an admin, not in the workflow file.
- **Coverage reporting.** `@vitest/coverage-v8` is installed but there's no `coverage` script today; introducing CI-side reporting is its own change.
- **Deploy / release jobs.** Out of scope. This workflow is purely a quality gate.
- **Caching `.next/cache`, `node_modules`, or the build output.** Only the pnpm store gets cached. The build job re-builds from source every run (correct), and tests/lint don't write durable artifacts worth caching.
- **Custom composite actions** for the shared `checkout → install` prelude. The duplication is ~6 lines × 3 jobs; extracting it into `.github/actions/setup/action.yml` would be premature DRY for a 3-job workflow.

## Decisions

### D1. Three independent jobs, NOT a fan-out from a shared `install` job

- **Choice**: Each of `lint`, `build`, `test` is a standalone job that does its own checkout + install. They share nothing at the GitHub Actions level.
- **Why**: The naive alternative ("install once, upload `node_modules`, three downstream jobs `needs: install`") looks DRY but is slower in practice — uploading and downloading a ~600 MB `node_modules` artifact across jobs takes longer than re-running `pnpm install` against a warm pnpm-store cache. Cache hits on the pnpm store make each job's install ~5–15 s on warm runs. The DAG also serializes the prelude: parallel jobs can start in the same scheduling slot, while a downstream-fan-out workflow waits for one job to finish before the others can begin.
- **Trade-off**: 3× the install bookkeeping (3 cache lookups, 3 setup-node calls). Worth it for parallelism + simplicity.

### D2. Pin Node to the current latest LTS (Node 24)

- **Choice**: `node-version: '24'` in `actions/setup-node`.
- **Why**: Node 24 is the active LTS at change time. CI runs the version most contributors will pull locally via `nvm install --lts` or fresh package-manager defaults, so failures in CI map cleanly to what a contributor reproduces on their machine. The `logic-path-tests` capability sets `>= 20` as the floor — Node 24 comfortably satisfies that — but the floor is not enforced by CI today; that's an explicit follow-up (see "Open Questions").
- **Trade-off**: pinning to the latest LTS rather than the floor means a contributor still on Node 20 could land code that uses a Node-22-or-newer-only API (e.g., the built-in `node:sqlite` module) without CI catching it. Acceptable for now because the project has no contributors on the floor and the application code is browser-targeted (the Node version primarily affects build/test tooling, which already requires recent Node features).
- **Alternative considered**: pin to `'20'` (the floor) — would catch new-API regressions earlier but mismatches what contributors actually run. Rejected.
- **Alternative considered**: matrix `[20, 22, 24]` — rejected for this initial workflow (see Non-Goals); we can add it as a follow-up change if a Node-version-dependent bug surfaces.
- **Future**: if the project grows a `.nvmrc` or `engines.node` field, the workflow should read from that single source instead of a hard-coded `'24'`. Not worth the indirection today.

### D3. Use `pnpm/action-setup@v6` with no `version` argument; let it read `packageManager` from `package.json`

- **Choice**: no `with:` block at all — no version pin in the workflow YAML, no explicit `run_install`.
- **Why**: `package.json`'s `packageManager: "pnpm@11.2.2+sha512..."` field is the single source of truth for pnpm version. `pnpm/action-setup` honors it automatically. Restating the version in YAML risks drift on the next pnpm bump.
- **Why v6 specifically**: `pnpm/action-setup@v6.0.0` (April 2026) is the release that added first-class support for pnpm v11. Since our `packageManager` pin targets `pnpm@11.2.2`, v6 is the version of the action that bootstraps pnpm 11 directly rather than installing an older bootstrap and self-updating.
- **Order matters**: `pnpm/action-setup` must run *before* `actions/setup-node` when using `setup-node`'s built-in `cache: 'pnpm'` — `setup-node` needs to be able to find the `pnpm` binary to compute the lockfile hash and store path. Documented gotcha; we preserve this order explicitly.

### D4. Use `actions/setup-node@v6` with `cache: 'pnpm'` for the pnpm-store cache

- **Choice**: `with: { node-version: '20', cache: 'pnpm' }`.
- **Why**: `setup-node`'s built-in pnpm cache hashes `pnpm-lock.yaml` and caches the right directory automatically. It is one line versus ~12 lines of hand-rolled `actions/cache` config and produces identical behavior for our use case.
- **Why v6 specifically**: `setup-node@v6.0.0` (October 2025) introduced a breaking change — "automatic" caching is now limited to npm. That change does NOT affect us because we set `cache: 'pnpm'` *explicitly*; the v6 release notes call this out as the supported path for pnpm/yarn users (`cache: 'pnpm'` continues to enable caching exactly as on v4/v5). Pinning to v6 also picks up the Node 24 action runtime — orthogonal to our `node-version: '20'` choice, which controls the Node *we* run, not the Node the action itself uses.
- **Alternative considered**: explicit `actions/cache@v4` with `${{ steps.pnpm-store.outputs.STORE_PATH }}` — rejected as more code for no benefit on a single-OS, single-Node workflow.

### D5. Concurrency: cancel-in-progress for the same branch

- **Choice**:
  ```yaml
  concurrency:
    group: ci-${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: true
  ```
- **Why**: A developer pushing three commits in a row to a feature branch shouldn't burn 3× CI minutes; only the latest matters. Push-to-main never cancels itself because `github.ref` differs from a branch ref.
- **Trade-off**: a force-push that quickly reverts ("oops, push the fix") may cancel the original run before its logs finish streaming. Acceptable; logs remain in the cancelled run's view.

### D6. Triggers: `push` to `main` or `develop` AND `pull_request` against `main` or `develop` (default activity types)

- **Choice**:
  ```yaml
  on:
    push:
      branches: [main, develop]
    pull_request:
      branches: [main, develop]
  ```
- **Why**: This repo uses git-flow (`develop` is the long-lived integration branch; `main` is the release branch — see `openspec/config.yaml` context). CI must guard both. Run on `main`/`develop` pushes to catch drift caused by merges. Run on PRs targeting either to gate human review. Don't trigger on push-to-feature-branch — that's already covered by the PR trigger once a PR exists, and avoids duplicate runs on PR branches (a known GitHub Actions trap: `push` + `pull_request` both fire for the same PR commit).
- **Interaction with D5 (concurrency)**: the concurrency group is keyed on `github.ref`, so a push to `main` and a push to `develop` are in different groups and do not cancel each other. Correct behavior.
- **Alternative considered**: `pull_request_target` — rejected; that runs with secrets in the base repo context and is the wrong choice unless we're specifically running code from forks against secrets (we aren't).
- **Alternative considered**: a wildcard like `branches: ['**']` to run on every push — rejected; PR-branch pushes would double-trigger (once for `push`, once for `pull_request`), wasting CI minutes and producing two status check entries per commit.

### D7. Minimal `permissions` block: read-only `contents`

- **Choice**: top-level `permissions: { contents: read }`.
- **Why**: Principle of least privilege. None of the three jobs writes to the repo, comments on PRs, or pushes packages. Explicitly setting read-only prevents a future careless step (e.g., one that posts a comment) from inheriting the default broad `GITHUB_TOKEN` scope.

## Risks / Trade-offs

- **Cache poisoning**: GitHub Actions caches are scoped to branch + key, but a malicious PR could theoretically write a cache that main later restores. → **Mitigation**: `setup-node`'s pnpm cache keys on lockfile hash + OS, so a PR with a modified lockfile gets its own cache. Even so, this is the standard industry trade-off; pinning third-party actions by major version (`@v4`) is the practical defense.
- **Flaky tests**: the new UI-path tests rely on jsdom + RTL; first runs on GitHub's runners may surface timing differences from local. → **Mitigation**: tests don't use `setTimeout`/fake timers and `user-event@14` awaits internally. If flake emerges, the fix belongs in the test code, not in CI retry logic.
- **`pnpm install` failing on transient registry errors** → **Mitigation**: `pnpm/action-setup` and `setup-node` both retry on network errors by default. Not worth adding explicit retry logic.
- **Long workflow file drift** as features get added (deploy jobs, matrix builds, etc.) → **Mitigation**: enforce at review time that each addition is a separate change/PR with its own design rationale. This change deliberately ships the minimum.
- **The `packageManager` SHA pin in `package.json` changes on pnpm upgrade**, which would invalidate the cache key. → That's correct behavior; cache invalidation on a pnpm bump is desired.

## Open Questions

- Should `build` also run `pnpm test:logic` as a sanity check before `pnpm build` (since Next.js's TypeScript pass overlaps with vitest's import resolution)? Defaulting to no — `build` runs `next build` only, and `test` runs separately. If type errors slip through that `next build` would catch but `tsc --noEmit` wouldn't, that's a real signal worth keeping isolated.
- Path filtering (skip CI on docs-only PRs)? Out of scope today; the workflow is fast enough that we don't need to invent skip rules yet.
