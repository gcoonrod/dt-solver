## ADDED Requirements

### Requirement: Single GitHub Actions workflow file at `.github/workflows/ci.yml`

There SHALL be exactly one CI workflow file in this change at `.github/workflows/ci.yml`. The file SHALL declare `name: CI`. No other workflow files SHALL be added by this change. The workflow file SHALL be valid YAML and SHALL parse without warnings when checked by `actionlint` or GitHub's workflow parser.

#### Scenario: Workflow file exists and parses

- **WHEN** a fresh contributor clones the repo and runs `actionlint .github/workflows/ci.yml` (or equivalent)
- **THEN** the linter SHALL report zero errors and zero warnings
- **AND** the file SHALL exist at exactly `.github/workflows/ci.yml`

#### Scenario: No other workflow files are introduced

- **WHEN** the change is archived
- **THEN** `.github/workflows/` SHALL contain exactly one file (`ci.yml`)

### Requirement: Workflow triggers on push to `main` or `develop` and on pull requests targeting `main` or `develop`

The workflow SHALL declare `on:` triggers for both `push` (restricted to `branches: [main, develop]`) and `pull_request` (restricted to `branches: [main, develop]`). It SHALL NOT trigger on push to any branch other than `main` or `develop`. It SHALL NOT use `pull_request_target`. It SHALL NOT use `workflow_dispatch` or any scheduled trigger in this change.

#### Scenario: Push to main triggers CI

- **WHEN** a commit lands on `main`
- **THEN** the CI workflow SHALL start

#### Scenario: Push to develop triggers CI

- **WHEN** a commit lands on `develop`
- **THEN** the CI workflow SHALL start

#### Scenario: PR against main triggers CI

- **WHEN** a pull request is opened, synchronized, or reopened against `main`
- **THEN** the CI workflow SHALL start exactly once per commit (no duplicate `push` + `pull_request` runs on the same PR-branch commit, because the workflow does not register `push` on feature branches)

#### Scenario: PR against develop triggers CI

- **WHEN** a pull request is opened, synchronized, or reopened against `develop`
- **THEN** the CI workflow SHALL start exactly once per commit (same de-duplication guarantee as PRs against `main`)

#### Scenario: Push to a feature branch (no PR) does NOT trigger CI

- **WHEN** a developer pushes commits to `feature/foo` with no open PR
- **THEN** the CI workflow SHALL NOT run

### Requirement: Three independent parallel jobs — `lint`, `build`, `test`

The workflow SHALL define exactly three jobs named `lint`, `build`, and `test`. None of the three SHALL declare a `needs:` dependency on another. All three SHALL run on `ubuntu-latest`. Each job SHALL execute exactly one project script (`pnpm lint`, `pnpm build`, `pnpm test` respectively) as its terminal step. The `test` job SHALL invoke `pnpm test` (no `--project` flag) so that BOTH the `logic` and `ui` Vitest projects run.

#### Scenario: Jobs start in parallel

- **GIVEN** a triggered workflow run
- **WHEN** GitHub Actions schedules the jobs
- **THEN** `lint`, `build`, and `test` SHALL appear as concurrent jobs in the run view (no waiting on `needs:`)

#### Scenario: `test` job covers both Vitest projects

- **GIVEN** a workflow run reaches the `test` job's run step
- **WHEN** that step executes
- **THEN** the command SHALL be exactly `pnpm test` (NOT `pnpm test:logic` or `pnpm test:ui`)
- **AND** both projects SHALL execute in that single Vitest invocation

#### Scenario: A single failing job marks the workflow run as failed

- **GIVEN** the `lint`, `build`, or `test` job exits non-zero
- **WHEN** the run completes
- **THEN** the overall workflow status SHALL be `failure`
- **AND** the other two jobs SHALL still be reported with their actual status (PASS or FAIL), not cancelled because of the sibling's failure

### Requirement: Node version pinned to `'24'` and pnpm version derived from `package.json`

Every job SHALL use `actions/setup-node@v6` with `node-version: '24'`. The Node version SHALL be specified as the literal string `'24'` (the current latest LTS at change time, and SHALL satisfy the `>= 20` floor defined by the `logic-path-tests` capability). The workflow SHALL NOT hard-code a `pnpm` version anywhere; `pnpm/action-setup@v6` SHALL be invoked without a `version` argument so that the `packageManager` field in `package.json` (currently `pnpm@11.2.2+sha512...`) is the single source of truth.

#### Scenario: Node 24 is installed in every job

- **WHEN** any of the three jobs runs
- **THEN** `node --version` SHALL print a version starting with `v24.`
- **AND** the version SHALL satisfy the `>= 20` floor required by the `logic-path-tests` capability

#### Scenario: pnpm version comes from package.json

- **WHEN** any of the three jobs runs
- **THEN** the version of `pnpm` installed SHALL exactly match the version pinned by the `packageManager` field in `package.json` at HEAD
- **AND** the workflow YAML SHALL contain no `version: <pnpm-version>` argument under `pnpm/action-setup@v4`

### Requirement: pnpm store cache via `actions/setup-node@v4`'s built-in `cache: 'pnpm'`

Every job SHALL pass `cache: 'pnpm'` to `actions/setup-node@v4`. The workflow SHALL NOT use a hand-rolled `actions/cache@v4` step for `node_modules` or for the pnpm store. The workflow SHALL NOT cache `.next/cache` or any build artifact in this change. Each job's pnpm cache SHALL be keyed (via the default `setup-node` behavior) on the OS and the hash of `pnpm-lock.yaml`.

#### Scenario: Setup order is correct (pnpm before setup-node)

- **WHEN** the workflow's step sequence is inspected
- **THEN** `pnpm/action-setup@v4` SHALL appear BEFORE `actions/setup-node@v4` in every job (a `setup-node` requirement when using `cache: 'pnpm'`)

#### Scenario: Warm cache short-circuits install

- **GIVEN** a previous run on the same `pnpm-lock.yaml`
- **WHEN** a new run starts on the same OS
- **THEN** the cache SHALL be restored
- **AND** `pnpm install --frozen-lockfile` SHALL finish in well under one minute (typically 5–15 s)

### Requirement: Frozen-lockfile installs

Every job SHALL run `pnpm install --frozen-lockfile` (NOT plain `pnpm install`). A run SHALL fail if `pnpm-lock.yaml` is out of date with `package.json`.

#### Scenario: Mismatched lockfile fails CI

- **GIVEN** a PR that updates `package.json` but forgets to commit the new `pnpm-lock.yaml`
- **WHEN** any job runs `pnpm install --frozen-lockfile`
- **THEN** the install SHALL fail with a non-zero exit code
- **AND** the corresponding job SHALL be marked as `failure`

### Requirement: Concurrency — cancel in-progress runs for the same workflow + ref

The workflow SHALL declare a top-level `concurrency` group keyed on workflow name and `github.ref`. `cancel-in-progress` SHALL be `true`. The concurrency group SHALL distinguish between branches, so a push to `main` SHALL NOT cancel a running PR build (different `github.ref`).

#### Scenario: Newer commit on the same PR cancels older run

- **GIVEN** PR #N is running CI for commit A
- **WHEN** the author force-pushes commit B to the same branch
- **THEN** the run for commit A SHALL be cancelled
- **AND** a new run SHALL start for commit B

#### Scenario: Main push does not cancel an in-flight PR run

- **GIVEN** PR #N is running CI
- **WHEN** an unrelated commit lands on `main` and triggers its own CI
- **THEN** the PR's run SHALL NOT be cancelled

### Requirement: Minimum-necessary `permissions` block

The workflow SHALL declare a top-level `permissions:` block setting `contents: read` and SHALL NOT grant any other permission. No job SHALL override this with broader scopes. The default `GITHUB_TOKEN` SHALL therefore be read-only for the duration of every run in this workflow.

#### Scenario: Workflow cannot write to the repo

- **WHEN** any job in the workflow attempts a write operation (e.g., `git push`, a comment post via the GitHub API)
- **THEN** the operation SHALL fail with `403 Forbidden` from the GitHub API
- **AND** this failure SHALL be considered correct behavior (defense-in-depth)

### Requirement: Third-party actions pinned by major version

Every third-party action reference in the workflow SHALL be pinned by major-version tag (e.g., `actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v6` — the latest majors at change time). No action SHALL be referenced by `@main`, by a branch name, or unpinned. SHA-pinning is RECOMMENDED but NOT required by this change. The choice to track the latest major (rather than a stale one) is a maintenance posture: future major bumps SHALL be handled as a dedicated change with its own design review of breaking changes.

#### Scenario: No floating references

- **WHEN** the workflow YAML is grepped for `uses:` lines
- **THEN** every match SHALL include an `@<version>` tag of the form `@v<major>` or `@<full-sha>`
- **AND** zero matches SHALL be unpinned or pinned to `main`/`master`/a branch name
