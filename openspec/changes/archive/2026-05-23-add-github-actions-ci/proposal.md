## Why

The repo has zero automated CI. `pnpm lint`, `pnpm build`, and `pnpm test` all work locally, but nothing catches a regression in a PR before a human reviews it — and now that the UI-path tests are wired up (`ui-path-tests` capability) we have a meaningful test suite to run on every push. A minimal GitHub Actions workflow that runs the three existing scripts in parallel closes the gap without inventing new abstractions.

## What Changes

- Add a single workflow file at `.github/workflows/ci.yml`.
- Triggers: `push` to `main` or `develop`, and any `pull_request` targeting `main` or `develop`.
- Three independent jobs, all running on `ubuntu-latest` in parallel:
  - **lint** — `pnpm lint`
  - **build** — `pnpm build`
  - **test** — `pnpm test` (runs both Vitest projects: `logic` and `ui`)
- Every job does the same `checkout → setup pnpm → setup node (with pnpm store cache) → install → run script` sequence.
- pnpm version pinned via `packageManager` in `package.json` (already `pnpm@11.2.2`); Node version pinned to `20` (the minimum required by the `logic-path-tests` capability — pick the floor so CI matches the lowest supported environment, not the highest).
- Concurrency: cancel in-progress runs for the same branch when a newer commit arrives.
- **BREAKING** for repo maintainers: any open PR will start running CI immediately; CI failure does not block merge yet (no required status checks; that's a repo-admin decision out of scope here).

## Capabilities

### New Capabilities

- `ci-workflow`: Defines the GitHub Actions workflow file, its triggers, the three parallel jobs (lint/build/test), the Node and pnpm version sources, the pnpm-store caching strategy, and the concurrency policy.

### Modified Capabilities

_(none — neither `logic-path-tests`, `ui-path-tests`, nor `signal-edge-slew` capabilities change. CI consumes those package scripts but does not redefine them.)_

## Impact

- **Code**: new `.github/workflows/ci.yml`. No source code changes.
- **Dependencies**: no new runtime or dev dependencies. GitHub Actions uses published actions (`actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v6` — the current latest majors at change time) pinned by major.
- **Maintainer workflow**: every push and PR triggers ~3 parallel jobs; cold install + lint/build/test currently runs in ~2–5 min each. Caching pnpm's store shaves repeat installs to under a minute on warm runs.
- **GitHub spend**: ubuntu-latest minutes are free for public repos and within the free tier for the existing private-repo allotment. No matrix expansion (single Node version, single OS) keeps the burn rate low.
- **Out of scope**: required status checks (a repo-admin setting), Dependabot/Renovate, coverage reporting, deploy/release jobs, matrix builds across Node versions or OSes, OS-specific CI, e2e tests, Lighthouse, semgrep gating, or signing/provenance. Each of those is its own change.
