## Why

The repo now has a working CI gate (`ci-workflow` capability) but no automated way to keep dependencies current or to react to disclosed CVEs. Two real risks: (1) the React 19 / Next 16 / Vitest 4 / Tailwind 4 stack moves fast and we'll silently fall behind on patch releases that fix bugs in our hot path, and (2) any transitive vulnerability in our dep graph would sit indefinitely until a human noticed. Dependabot solves both with a single config file and zero new infrastructure.

## What Changes

- Add a single config file at `.github/dependabot.yml`.
- Configure two ecosystems:
  - **`npm`** at the repo root — Dependabot has first-class pnpm-lockfile support, so this catches everything in `package.json` / `pnpm-lock.yaml`.
  - **`github-actions`** at `/` (which scans `.github/workflows/`) — keeps `actions/checkout`, `actions/setup-node`, `pnpm/action-setup` etc. from rotting.
- Schedule: `weekly` on both ecosystems (Monday morning UTC), so a contributor coming back from a weekend sees a fresh batch.
- Open PRs for **non-breaking version updates only** — `ignore` `version-update:semver-major` on both ecosystems. Major bumps still get opened automatically for **security updates** (Dependabot overrides `ignore` for CVE-driven PRs), so we never miss a critical fix.
- **Batch into a single PR per ecosystem per week** using `groups:` — one PR for "npm minor + patch", one PR for "github-actions minor + patch + major" (we let major bumps through for GitHub Actions since they're typically small Node runtime / Node-version changes, not API breaks).
- Add labels (`dependencies`, `ecosystem:npm` or `ecosystem:github-actions`) so the existing GitHub issue/PR filters can pivot on them.
- Document the **one-time repo settings the maintainer must enable** in the proposal's Impact section (alerts + security updates are repo-toggles, not YAML).
- **NOT BREAKING**: no existing code paths change. Existing CI runs against any Dependabot PR exactly like a human-authored PR.

## Capabilities

### New Capabilities

- `dependency-updates`: Defines the Dependabot config file location, the two watched ecosystems (`npm` + `github-actions`), the weekly schedule, the grouping strategy, the non-breaking-by-default policy, the labeling convention, and the boundary with repo-level security-update settings (which are NOT in scope of the YAML file).

### Modified Capabilities

_(none — the existing `ci-workflow` capability is unaffected. CI runs on Dependabot PRs by default because the `pull_request` trigger covers them; no workflow change required.)_

## Impact

- **Code**: new `.github/dependabot.yml`. No source code changes.
- **Dependencies**: no new runtime or dev deps. Dependabot is a GitHub-hosted service consumed via the YAML config.
- **Repo settings (NOT in this YAML — maintainer-only, one-time)**:
  - **Settings → Code security → Dependency graph**: must be ON (default ON for public repos; verify for private).
  - **Settings → Code security → Dependabot alerts**: must be ON to scan PRs for newly-introduced vulnerable deps and to surface CVEs in the Security tab.
  - **Settings → Code security → Dependabot security updates**: must be ON so CVE-driven PRs are opened automatically (independent of this YAML's schedule).
  - **Settings → Code security → Dependabot on Actions runners**: optional; off by default; not needed for this change.
- **Contributor workflow**: every Monday morning the repo will receive ~1 PR per ecosystem with a grouped diff. CI runs on each (per the `ci-workflow` capability). Merging is a manual review step — no auto-merge in this change.
- **CI cost**: bounded by `open-pull-requests-limit` (default 5 per ecosystem); the grouping strategy keeps weekly noise to 1–2 PRs total. The CI minute spend is small relative to per-push CI from human contributors.
- **GitHub spend**: Dependabot is free; no metered cost beyond the CI runs each PR triggers.
- **Out of scope**: auto-merge of low-risk updates (deserves its own change with branch-protection alignment), Renovate (alternative tool, not chosen — Dependabot is GitHub-native and integrates with the security advisory database without extra setup), Docker / pip / cargo / submodules / git ecosystems (none present), reviewers/assignees on the PRs (can be added in a follow-up if specific maintainers want to be auto-tagged), customizing commit messages (defaults are good).
