## Context

Two real ecosystems exist in this repo today:

- **npm-via-pnpm** — `package.json` + `pnpm-lock.yaml` at the root, pinned to `pnpm@11.2.2`. Dependabot has shipped first-class pnpm lockfile support since 2024, so this works out of the box without any pnpm-version override or custom shim.
- **github-actions** — three actions referenced from `.github/workflows/ci.yml` (`actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v6`). These already moved 2 majors during the `add-github-actions-ci` change; weekly auto-bumps will keep them current.

There are no other ecosystems present today: no `Dockerfile`, no `requirements.txt`, no `Cargo.toml`, no git submodules.

The user's prompt asked for vulnerability checking "on PRs as well as on a weekly cadence". Those are two distinct Dependabot features and the YAML only controls one of them:

| Feature | What it does | Where it's configured |
|---|---|---|
| **Dependabot alerts** | Scans new commits + PRs for newly-introduced vulnerable deps; surfaces a finding in the Security tab. | Repo Settings → Code security → Dependabot alerts (toggle) |
| **Dependabot security updates** | Opens a PR to patch a vulnerable dep when an alert fires, regardless of `dependabot.yml`'s `schedule`. | Repo Settings → Code security → Dependabot security updates (toggle); PR formatting inherits from `dependabot.yml` if present |
| **Dependabot version updates** | Opens scheduled PRs for non-security version bumps. | `.github/dependabot.yml` entirely |

This change ships the YAML for *version* updates and documents the two repo-setting toggles the maintainer must flip for *security* coverage. The two work together: security updates fire on CVE disclosure (could be any day), version updates fire on schedule (Monday). Both inherit labels/grouping from this YAML when defined.

## Goals / Non-Goals

**Goals:**

- One YAML file. Two ecosystem entries. Readable on a single screen.
- Open PRs only for **non-breaking** updates (minor + patch) on `npm`, so we don't get a weekly React 19 → 20 PR until we're ready.
- Allow GitHub Actions majors through because they're typically Node-runtime / actions-API minor changes dressed as majors (`actions/setup-node@v4 → v6` only required us to verify `cache: pnpm` still works — both verified by reading release notes during the `add-github-actions-ci` change).
- **Batch** updates into ~1 PR per ecosystem per week via `groups:`. This is the user's explicit request and the right default — reviewing one PR with five small bumps beats reviewing five PRs.
- Surface a clear labeling convention (`dependencies`, `ecosystem:<name>`) so existing PR filters keep working.

**Non-Goals:**

- **Auto-merge.** Even with branch protection, Dependabot auto-merge needs a `dependabot.yml`-side hint plus a workflow that calls `gh pr merge --auto`. That's a separate change with its own risk discussion (especially around major-bump security updates that might break tests).
- **Reviewers / assignees.** Premature — we don't have a designated dep-update owner.
- **Renovate.** A capable alternative, but it's a third-party app that needs install + configuration; Dependabot is GitHub-native and integrates with the advisory database without extra setup. The two are nearly equivalent for this repo's needs.
- **Ignoring specific packages.** No package is too brittle to even propose; the maintainer can close PRs they don't want.
- **Per-package version constraints (`allow` / `ignore` blocks for individual packages).** Premature optimization. Add only when a specific dep proves troublesome.
- **Watching `Docker` / `pip` / `cargo` / `gitsubmodule`.** No such files exist.
- **Custom commit messages or PR titles.** Defaults (`build(deps):` for npm, `ci:` for github-actions) match Conventional Commits, which the project uses (per `openspec/config.yaml`).
- **`vendor` directory or any monorepo-style multi-package setup.** Single `package.json` at root.

## Decisions

### D1. Two ecosystem entries: `npm` (root) and `github-actions` (root)

- **Choice**:
  ```yaml
  updates:
    - package-ecosystem: npm
      directory: "/"
      ...
    - package-ecosystem: github-actions
      directory: "/"
      ...
  ```
- **Why**: These are the two file types Dependabot can act on in this repo today. Adding empty entries for other ecosystems would only generate "no manifest found" warnings.
- **`directory: "/"` for github-actions**: Dependabot scans `/.github/workflows/` relative to the configured directory; root is conventional and matches GitHub's own examples.

### D2. `schedule.interval: weekly`, `schedule.day: monday`, `schedule.time: "06:00"`, `schedule.timezone: "America/Los_Angeles"`

- **Choice**: weekly Monday 06:00 PT (= 13:00 / 14:00 UTC depending on DST).
- **Why weekly, not daily**: daily generates noise; for a project this size, weekly is the sweet spot between "stay current" and "don't drown the inbox". The user's prompt called this out explicitly.
- **Why Monday morning PT**: hits the user's working hours just as the week starts; PRs are ready for review during the natural triage window. (Project uses Greg's commits — `git config user` resolved earlier in this session.) If the maintainer prefers UTC or a different timezone, this is a one-line change with no architectural implications.
- **Alternative considered**: `interval: daily` — rejected (noise) unless the project later adds production-traffic features where same-day patches matter.

### D3. `ignore: { dependency-name: "*", update-types: ["version-update:semver-major"] }` on `npm` only

- **Choice**: tell Dependabot to skip major-version bumps for every npm package; do NOT apply this rule to `github-actions`.
- **Why on npm**: major bumps in React, Next, Vitest, Tailwind, etc. routinely have breaking changes; we want to opt in to those deliberately as their own coordinated changes (we've already done this for `migrate-vitest-to-v4` and would do the same for "migrate to React 20" when the time comes). Auto-PRs for majors would either get closed (waste of CI minutes) or sneak through review.
- **Why NOT on github-actions**: action majors are usually Node-runtime bumps or internal refactors, not API breaks. We let them through and rely on CI to catch any regression — the `setup-node@v4 → v6` jump in our recent CI change validated this approach.
- **Critical exception (Dependabot built-in behavior)**: `ignore` is **bypassed for security updates**. If a vulnerability requires a major bump, Dependabot opens that PR regardless of this rule. The user's "react to vulnerabilities" requirement is preserved by Dependabot's own design — we don't need to do anything extra.
- **Alternative considered**: `allow` instead of `ignore` — equivalent expressive power, but `ignore` is more readable here ("ignore majors" vs "allow non-majors").

### D4. Group everything into one PR per ecosystem per week

- **Choice**:
  ```yaml
  groups:
    npm-non-major:
      patterns: ["*"]
      update-types: ["minor", "patch"]
    github-actions:
      patterns: ["*"]
  ```
- **Why**: explicit user requirement ("batch into a single PR when possible"). Without `groups`, Dependabot opens one PR per dep, which would mean a flood every Monday for a stack this active.
- **One group vs split (e.g., `dev` vs `prod`)**: split groups have value when prod-dep updates need stricter review than dev-dep updates. For this project the line is fuzzy (Next/React are runtime; Vitest/Testing-Library are devDeps but ship in CI; Tailwind crosses both) and the maintainer already reviews every PR. One group keeps the YAML short.
- **`update-types` on npm**: filters within the group — only minor + patch get grouped. (Majors are excluded entirely by D3, so this is belt-and-suspenders for clarity.)
- **No `update-types` filter on github-actions**: lets majors join the same weekly PR alongside minors/patches.
- **Trade-off**: if one update in the group is broken (test fails), the whole batch is blocked until the maintainer either fixes the bad bump or removes it from the PR. Acceptable — we'd rather see a blocked batch than miss a small fix because we ignored the noise.

### D5. Labels: `dependencies` + `ecosystem:<name>`

- **Choice**:
  ```yaml
  labels:
    - dependencies
    - "ecosystem:npm"      # or "ecosystem:github-actions"
  ```
- **Why**: `dependencies` is the GitHub convention and matches Dependabot's default behavior (so even removing `labels:` would still get this label — but listing it explicitly documents intent). `ecosystem:<name>` lets PR filters and search queries distinguish at a glance which kind of bump is in flight.
- **Why not `auto-merge` or `risk:low` labels**: out of scope (no auto-merge in this change).

### D6. `open-pull-requests-limit: 5` (default) — explicit, not relied-upon

- **Choice**: leave at the Dependabot default of 5 per ecosystem, but write the value into the YAML for clarity.
- **Why**: with grouping (D4), we typically generate 1 PR per ecosystem per week, so 5 is a comfortable ceiling. If a backlog builds (PRs stay open), the limit prevents new PRs from being opened until the queue drains — useful pressure-release valve.

### D7. Document — but do NOT configure — repo-level security toggles

- **Choice**: the YAML file says nothing about Dependabot alerts or security updates; those are repo settings the maintainer flips in the GitHub UI. The proposal's Impact section and a comment header at the top of `dependabot.yml` enumerate the toggles.
- **Why**: GitHub deliberately splits config-as-code (this YAML) from repo-level security posture (UI toggles) so that org-level policies can enforce them. There is no YAML-level equivalent and pretending there is would mislead future readers.

## Risks / Trade-offs

- **Grouped PR blocked by one bad bump** → maintainer either fixes locally or edits the PR's lockfile to drop the bad dep. Documented in D4; no mitigation in the YAML.
- **Weekly PR sits stale because the maintainer is on vacation** → `open-pull-requests-limit: 5` means at most 5 weeks of staleness before Dependabot pauses new PRs. After resuming, the maintainer reviews the oldest open PR (which Dependabot has been keeping rebased against `main`).
- **Security update arrives on a Sunday night** → Dependabot opens the PR immediately (security updates are NOT bound by the weekly schedule); the maintainer sees it Monday morning alongside the regular batch.
- **Major bump for a critical security fix** → Dependabot opens it despite D3's `ignore` rule (built-in override). The PR title makes the security context explicit. Maintainer reviews carefully.
- **Pin mismatch: `packageManager` field changes after a pnpm bump** → Dependabot opens a PR for `pnpm-lock.yaml`-only changes; should pass CI because `pnpm install --frozen-lockfile` accepts any version pnpm self-installs from the bootstrap. If pnpm itself changes major, that's a manual handoff.
- **Dependabot's "rebase on conflicts" behavior** can spam force-pushes, retriggering CI several times per PR → Acceptable cost; the alternative is stale PRs that drift from `main`.

## Open Questions

- Should we add `reviewers:` once a dep-update owner is named? Defer until someone volunteers.
- Should we add a `cooldown:` field (Dependabot beta as of mid-2025) to suppress PRs for very-recently-released versions? Tempting (skips the "1.2.3 released Monday morning, 1.2.4 released Monday afternoon" double-PR) but adds another knob. Defer; revisit if we see the pattern.
- Are there packages with a known broken `n+1` release we should hard-`ignore`? None known today.
- Should the github-actions ecosystem also ignore majors? Counter to D3's reasoning. Defer; revisit if a major action bump breaks CI silently.
