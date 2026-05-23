## 1. Workflow file

- [x] 1.1 Create the directory `.github/workflows/` at the repo root.
- [x] 1.2 Create `.github/workflows/ci.yml` with:
  - `name: CI`
  - `on:` block with `push.branches: [main, develop]` and `pull_request.branches: [main, develop]`
  - top-level `concurrency:` block with `group: ci-${{ github.workflow }}-${{ github.ref }}` and `cancel-in-progress: true`
  - top-level `permissions: { contents: read }`
  - `jobs:` with three sibling entries: `lint`, `build`, `test`
- [x] 1.3 In each of the three jobs, declare:
  - `runs-on: ubuntu-latest`
  - steps in this order:
    1. `actions/checkout@v4`
    2. `pnpm/action-setup@v4` (no `version` argument — picks up `packageManager` from `package.json`)
    3. `actions/setup-node@v6` with `node-version: '24'` and `cache: 'pnpm'`
    4. `pnpm install --frozen-lockfile`
    5. the job's terminal script: `pnpm lint`, `pnpm build`, or `pnpm test` respectively
- [x] 1.4 Confirm no job has a `needs:` key (so all three run in parallel).

## 2. Local sanity check

- [x] 2.1 If `actionlint` is available locally (`actionlint --version`), run `actionlint .github/workflows/ci.yml` and confirm zero errors and zero warnings. If unavailable, document the skip; a remote validation will happen on the first push. _(actionlint not installed locally — exit 127. Deferred to remote validation on first push per the task's own escape hatch.)_
- [x] 2.2 Grep `grep -E "uses: [^@]+$" .github/workflows/ci.yml` to confirm every `uses:` line has an `@` pin. Expected: zero matches (all lines pinned).
- [x] 2.3 Grep `grep -E "@(main|master)\b" .github/workflows/ci.yml` to confirm no action is pinned to a branch. Expected: zero matches.
- [x] 2.4 Grep `grep -n "version:" .github/workflows/ci.yml` and confirm no line under `pnpm/action-setup@v4` sets an explicit pnpm version. _(The only `version:` matches are `node-version: "20"` under `actions/setup-node@v4`; `pnpm/action-setup@v4` has no `with:` block.)_

## 3. Trigger the workflow remotely

- [ ] 3.1 Push the branch and either open a PR (preferred — exercises the `pull_request` trigger) or wait for the eventual merge to `main` (exercises the `push` trigger). _(Human-in-the-loop: requires pushing to GitHub; cannot be done from this session.)_
- [ ] 3.2 In the Actions tab, confirm the three jobs `lint`, `build`, and `test` appear concurrently (not stacked) in the run view. _(Pending 3.1.)_
- [ ] 3.3 Confirm each job completes successfully:
  - `lint` exits 0 (pre-existing 1 warning in `.remember/tmp/last-ndc.ts` is acceptable; only errors fail the job)
  - `build` exits 0 with the `next build` static-export summary
  - `test` exits 0 with `Test Files  6 passed (6)` / `Tests  40 passed (40)` (current counts; will grow with new tests)
  _(Pending 3.1.)_
- [ ] 3.4 Confirm the run's overall status is `success` and Node 24 was the version that ran (visible in the setup-node step's log). _(Pending 3.1.)_

## 4. Concurrency verification

- [ ] 4.1 On the PR branch, push commit A; while CI is still running, push commit B. _(Human-in-the-loop: requires the workflow to be live on GitHub.)_
- [ ] 4.2 Confirm the run for commit A is cancelled and the run for commit B starts. _(Pending 4.1.)_

## 5. Documentation

- [x] 5.1 Add a one-line CI status note to `CLAUDE.md` under the existing Commands section (or a new "CI" subsection) pointing maintainers at `.github/workflows/ci.yml`. Keep it under 3 lines.
- [ ] 5.2 (Optional) Add a CI badge to `README.md` once the workflow has run successfully at least once on `main`. Defer to a follow-up if `README.md` is still the create-next-app boilerplate. _(Deferred: README is real content, but a badge needs (a) a successful first run on `main` and (b) the GitHub org/repo slug, which is not known in this session. Pick up after 3.x lands.)_
