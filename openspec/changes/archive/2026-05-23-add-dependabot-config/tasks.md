## 1. Author the config file

- [x] 1.1 Create `.github/dependabot.yml` with:
  - A comment header block (~5–10 lines) explaining that this file controls **version updates only** and listing the two GitHub-UI toggles the maintainer must enable for vulnerability coverage: Settings → Code security → "Dependabot alerts" and "Dependabot security updates".
  - `version: 2` as the first non-comment line.
  - An `updates:` block with two ecosystem entries.
- [x] 1.2 Add the `npm` ecosystem entry with:
  - `package-ecosystem: "npm"`
  - `directory: "/"`
  - `schedule: { interval: "weekly", day: "monday", time: "06:00", timezone: "America/Los_Angeles" }`
  - `open-pull-requests-limit: 5`
  - `labels: ["dependencies", "ecosystem:npm"]`
  - `ignore: [{ dependency-name: "*", update-types: ["version-update:semver-major"] }]`
  - `groups: { npm-non-major: { patterns: ["*"], update-types: ["minor", "patch"] } }`
- [x] 1.3 Add the `github-actions` ecosystem entry with:
  - `package-ecosystem: "github-actions"`
  - `directory: "/"`
  - `schedule: { interval: "weekly", day: "monday", time: "06:00", timezone: "America/Los_Angeles" }`
  - `open-pull-requests-limit: 5`
  - `labels: ["dependencies", "ecosystem:github-actions"]`
  - NO `ignore` block (let majors through)
  - `groups: { github-actions: { patterns: ["*"] } }`

## 2. Local sanity checks

- [x] 2.1 Run `python3 -c "import yaml; yaml.safe_load(open('.github/dependabot.yml'))"` to confirm the file is valid YAML. _(PyYAML not installed locally; used `pnpx --quiet yaml valid < .github/dependabot.yml` instead — exit 0. Followed by a programmatic node assertion verifying every spec requirement against the parsed structure.)_
- [x] 2.2 Grep `grep -E "security-updates|alerts:|dependency-graph" .github/dependabot.yml` (excluding the comment header) to confirm no invalid security-toggle field has been added. Expected: zero matches outside the comment block. _(grep -v excluding comments returned 0 matches.)_
- [x] 2.3 Grep `grep -E "^\s*package-ecosystem:" .github/dependabot.yml` and confirm exactly two matches: `npm` and `github-actions`. _(2 matches: npm at line 17, github-actions at line 36.)_
- [x] 2.4 Grep `grep -E "^\s*interval:" .github/dependabot.yml` and confirm both matches are `weekly`. _(Both `interval: "weekly"` at lines 20 and 39.)_

## 3. Trigger Dependabot remotely

- [ ] 3.1 Push the branch and merge (or push directly) to a branch Dependabot watches. (Dependabot reads the config from the default branch — `main` — so the file only takes effect after merge.) _(Human-in-the-loop: requires pushing to GitHub.)_
- [ ] 3.2 Navigate to **Insights → Dependency graph → Dependabot** in the GitHub UI and confirm both ecosystems appear without a configuration-error banner. _(Pending 3.1.)_
- [ ] 3.3 Flip the two repo-level toggles in **Settings → Code security**:
  - "Dependabot alerts" → ON
  - "Dependabot security updates" → ON
  Confirm the Security tab populates within a few minutes. _(Maintainer-only — these toggles cannot be set from this session and are deliberately not in the YAML per design D7.)_
- [ ] 3.4 Wait for the first scheduled Monday run (or use **Insights → Dependency graph → Dependabot → "Check for updates"** to trigger an ad-hoc run) and confirm:
  - At most one `npm` PR is opened, with `dependencies` + `ecosystem:npm` labels.
  - At most one `github-actions` PR is opened, with `dependencies` + `ecosystem:github-actions` labels.
  - Neither PR proposes a major-version bump on npm packages (unless it is a security update).
  _(Pending 3.1 + 3.3.)_

## 4. Documentation

- [x] 4.1 Add a short note to `CLAUDE.md` (under the existing "CI" section or a new "Dependencies" section) explaining:
  - Weekly Dependabot bumps land as grouped PRs.
  - Major npm bumps are intentionally not auto-PR'd — they need their own coordinated change.
  - Security updates fire independently of the schedule and may include majors.
  - The two repo-UI toggles must stay enabled.
  Keep it under 5 lines.
