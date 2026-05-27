# dependency-updates Specification

## Purpose
TBD - created by archiving change add-dependabot-config. Update Purpose after archive.
## Requirements
### Requirement: Single Dependabot config file at `.github/dependabot.yml`

There SHALL be exactly one Dependabot configuration file in this change at `.github/dependabot.yml`. The file SHALL declare `version: 2` at the top (the only version Dependabot currently supports). It SHALL be valid YAML and SHALL parse without errors when checked by Dependabot's own validator (visible in the repo's Insights → Dependency graph → Dependabot tab after first push).

#### Scenario: Config file exists at the expected path

- **WHEN** a fresh contributor clones the repo
- **THEN** the file SHALL exist at exactly `.github/dependabot.yml`
- **AND** its first non-comment line SHALL be `version: 2`

#### Scenario: Dependabot accepts the config on push

- **WHEN** the file is pushed to `main`
- **THEN** the repo's Insights → Dependency graph → Dependabot tab SHALL list both watched ecosystems
- **AND** SHALL NOT show a configuration error banner

### Requirement: Watch the `npm` ecosystem at the repo root

The config SHALL include a `package-ecosystem: npm` entry with `directory: "/"`. Dependabot SHALL detect `pnpm-lock.yaml` automatically via its built-in pnpm support (no `package-manager: pnpm` override is required or supported — Dependabot infers it from the lockfile).

#### Scenario: pnpm lockfile is recognized

- **GIVEN** the repo root contains `pnpm-lock.yaml`
- **WHEN** Dependabot runs the npm ecosystem
- **THEN** it SHALL parse `pnpm-lock.yaml` (not `package-lock.json`)
- **AND** SHALL open PRs that update `pnpm-lock.yaml` alongside `package.json` when relevant

### Requirement: Watch the `github-actions` ecosystem at the repo root

The config SHALL include a `package-ecosystem: github-actions` entry with `directory: "/"`. This SHALL cause Dependabot to scan every workflow file under `.github/workflows/` and propose version bumps for actions referenced by `uses:` lines.

#### Scenario: CI workflow actions are watched

- **GIVEN** `.github/workflows/ci.yml` references `actions/checkout@vN`, `actions/setup-node@vN`, and `pnpm/action-setup@vN`
- **WHEN** any of those actions publishes a new minor, patch, or major version
- **THEN** Dependabot SHALL open (or include in the next grouped PR) a bump for the affected reference

### Requirement: Weekly scheduled runs for both ecosystems

Both ecosystem entries SHALL declare `schedule.interval: weekly`. They SHOULD declare a specific `schedule.day` and `schedule.time` (and optionally `schedule.timezone`) for predictability. The schedule SHALL NOT be `daily` or `monthly` in this change.

#### Scenario: PRs open on the configured day

- **WHEN** the configured day-of-week arrives
- **THEN** Dependabot SHALL evaluate both ecosystems
- **AND** SHALL open at most one grouped PR per ecosystem (subject to the grouping requirement and the open-PR limit)

#### Scenario: No daily runs

- **WHEN** any day that is NOT the configured day arrives
- **THEN** Dependabot SHALL NOT open scheduled version-update PRs
- **AND** SHALL still open security-update PRs immediately on CVE disclosure (independent of `schedule`; see "Boundary with repo-level security updates" requirement)

### Requirement: Skip major-version bumps for `npm`, allow them for `github-actions`

The `npm` ecosystem entry SHALL declare `ignore: [{ dependency-name: "*", update-types: ["version-update:semver-major"] }]` so that no scheduled npm PR proposes a major-version bump. The `github-actions` ecosystem entry SHALL NOT include this `ignore` rule (major action bumps are typically Node-runtime or internal refactors, not API breaks). Security-driven updates (CVE-bound) SHALL bypass the `ignore` rule per Dependabot's documented behavior — this is correct, not a bug to fix.

#### Scenario: No scheduled major npm PR

- **GIVEN** an npm package has a new major version available with no associated CVE
- **WHEN** the weekly schedule runs
- **THEN** Dependabot SHALL NOT include that major bump in the grouped PR

#### Scenario: Security-driven major npm PR DOES open

- **GIVEN** an npm package has a CVE that requires upgrading to a new major version
- **WHEN** Dependabot detects the CVE
- **THEN** it SHALL open a security update PR for that major bump immediately (NOT waiting for the weekly schedule)
- **AND** the `ignore` rule SHALL NOT suppress this PR

#### Scenario: github-actions majors flow through

- **GIVEN** an action referenced from `.github/workflows/ci.yml` publishes a new major version
- **WHEN** the weekly schedule runs
- **THEN** Dependabot SHALL include the major bump in the grouped github-actions PR

### Requirement: Batch updates into one PR per ecosystem per run via `groups:`

Each ecosystem entry SHALL declare a `groups:` block that gathers eligible updates into a single PR. The `npm` ecosystem's group SHALL be named (e.g., `npm-non-major`), SHALL include `patterns: ["*"]`, and SHALL include `update-types: ["minor", "patch"]`. The `github-actions` ecosystem's group SHALL include `patterns: ["*"]` and SHALL NOT restrict `update-types`. The result: at most one npm PR and one github-actions PR per scheduled run.

#### Scenario: Multiple npm minor/patch updates land in one PR

- **GIVEN** five npm packages publish patch releases in the same week
- **WHEN** the weekly schedule runs
- **THEN** Dependabot SHALL open ONE PR containing all five bumps (not five separate PRs)

#### Scenario: One bad bump in a group blocks only that group's PR

- **GIVEN** a grouped PR contains five bumps and one fails CI
- **WHEN** the PR's CI run completes
- **THEN** the PR SHALL be marked as failing
- **AND** the other ecosystem's grouped PR SHALL NOT be affected (independent CI runs, independent PRs)

### Requirement: PRs are labeled with `dependencies` and an ecosystem tag

Every Dependabot PR opened by this config SHALL carry the label `dependencies` and an ecosystem-specific label of the form `ecosystem:<name>` (e.g., `ecosystem:npm`, `ecosystem:github-actions`). The `dependencies` label MAY be applied implicitly by Dependabot's default behavior but SHALL also be listed explicitly under `labels:` in the YAML for documentation.

#### Scenario: Labels are queryable

- **GIVEN** a Dependabot PR has been opened
- **WHEN** a maintainer runs `gh pr list --label "ecosystem:npm"`
- **THEN** the PR SHALL appear in the result set
- **AND** the same PR SHALL also appear in `gh pr list --label dependencies`

### Requirement: Explicit `open-pull-requests-limit: 5` on each ecosystem

Each ecosystem entry SHALL declare `open-pull-requests-limit: 5` explicitly (the Dependabot default, but written into the YAML so the contract is visible). If the limit is reached (5 open PRs in the ecosystem), Dependabot SHALL pause opening new ones until the queue drains.

#### Scenario: Limit caps backlog growth

- **GIVEN** 5 grouped Dependabot PRs are already open for the `npm` ecosystem
- **WHEN** the next weekly schedule runs
- **THEN** Dependabot SHALL NOT open a 6th `npm` PR
- **AND** SHALL resume opening PRs once the backlog drops below 5

### Requirement: Boundary with repo-level security settings

The `dependabot.yml` file SHALL NOT attempt to configure Dependabot alerts, Dependabot security updates, or the dependency graph itself — these are repo-level toggles in GitHub's UI (Settings → Code security) and have no YAML equivalent. The file SHALL include a comment header listing the toggles a maintainer must enable in the GitHub UI for full vulnerability coverage. Failure to enable those toggles SHALL NOT cause `dependabot.yml` to error, but it SHALL leave the repo with version-update coverage only (no CVE-driven PRs).

#### Scenario: YAML lists no security-toggle fields

- **WHEN** the file is grepped for `security-updates`, `alerts`, `dependency-graph`
- **THEN** zero matches SHALL be returned (these are not valid YAML fields and listing them would be a bug)

#### Scenario: Comment header documents the toggles

- **WHEN** the file is opened
- **THEN** a comment block near the top SHALL enumerate at least:
  - "Dependabot alerts" (Settings → Code security)
  - "Dependabot security updates" (Settings → Code security)
- **AND** SHALL state that these are enabled in the GitHub UI, not in this file

