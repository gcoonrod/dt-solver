## 1. Toolchain & dependencies

- [x] 1.1 Add `jsdom`, `@testing-library/react@^16`, `@testing-library/dom`, `@testing-library/jest-dom@^6.6`, and `@testing-library/user-event@^14` to `devDependencies` in `package.json`.
- [x] 1.2 Run `pnpm install` and verify no peer-dep warnings against React 19; commit the updated `pnpm-lock.yaml`.
- [x] 1.3 Verify `pnpm list @testing-library/react --json` reports a resolved version matching `^16.0.0`.

## 2. Vitest project wiring

- [x] 2.1 Create `vitest.setup.ts` at the repo root containing a single import: `import "@testing-library/jest-dom/vitest";`.
- [x] 2.2 Append a second project entry to `test.projects` in `vitest.config.ts`: `name: { label: 'ui', color: 'cyan' }` (or similar), `environment: 'jsdom'`, `include: ['src/components/**/*.test.{ts,tsx}']`, `setupFiles: ['./vitest.setup.ts']`, with the `vite-tsconfig-paths` plugin.
- [x] 2.3 Remove the placeholder comment "// The UI-path change appends a second project entry here." in `vitest.config.ts`.
- [x] 2.4 Confirm the `logic` project's config block is unchanged and does NOT reference `vitest.setup.ts`.

## 3. Package scripts

- [x] 3.1 Add `"test:ui": "vitest run --project ui"` to `package.json` scripts.
- [x] 3.2 Add `"test:ui:watch": "vitest --project ui"` to `package.json` scripts.
- [x] 3.3 Add `"test": "vitest run"` (top-level, no `--project` flag) to `package.json` scripts.
- [x] 3.4 Run `pnpm test:ui` to prove the new project loads cleanly (it should pass with zero tests until step 4). _(Deferred to 5.1 since Vitest 4 exits non-zero on zero matched files without `--passWithNoTests`; verifying with real tests instead.)_
- [x] 3.5 Run `pnpm test:logic` to confirm the existing logic suite still passes.

## 4. Colocated component tests

- [x] 4.1 Create `src/components/canvas/WaveformTimeline.test.tsx`:
  - `beforeEach` resets `useTimingStore` to the canonical demo profile from `src/data/`.
  - Smoke render test asserting the SVG mounts and a seed-derived time-axis label (`"0 ns"`) plus a seeded bus value (`"0xA9"`) are queryable. _(Signal names themselves render in the sibling `ComponentLibrary`, not the timeline canvas — spec scenario updated to match.)_
  - `describe('formatTime', ...)` block with a table-driven `it.each` covering the four documented branches (sub-ps, µs, ns-whole, ns-decimal) and one negative-magnitude case.
- [x] 4.2 Create `src/components/panels/ComponentLibrary.test.tsx`:
  - Same `beforeEach` reset pattern.
  - Smoke render asserting every signal from the seeded profile is queryable by its display name.
  - One interaction test that adds or removes a signal via the component's UI and asserts the store updated.
- [x] 4.3 Create `src/components/panels/ConstraintInspector.test.tsx`:
  - Same `beforeEach` reset pattern.
  - Smoke render asserting PASS constraints are queryable.
  - Assertion that the seeded FAIL constraint (the `tads` constraint per `__tests__/data/w65c02s-14mhz.test.ts`) is visibly distinguished.
  - One interaction test that edits a constraint via the component and asserts the store re-solved. _(Edit is realized as "add a constraint via the New constraint button" since the component exposes add + delete only.)_

## 5. Verification

- [x] 5.1 Run `pnpm test:ui` and confirm all three new test files pass.
- [x] 5.2 Run `pnpm test:logic` and confirm the existing logic suite still passes unchanged.
- [x] 5.3 Run `pnpm test` and confirm both projects execute and the overall run is green.
- [x] 5.4 Run `pnpm build` and confirm no `*.test.tsx` file appears in the Next.js build output and the build succeeds.
- [x] 5.5 Run `pnpm lint` to confirm new files pass the ESLint flat-config rules.
- [x] 5.6 Grep `grep -r "toMatchSnapshot\\|toMatchInlineSnapshot\\|toMatchFileSnapshot" src/components/` and confirm zero matches.

## 6. Documentation

- [x] 6.1 Update `CLAUDE.md` to reflect that the UI path is now wired up: replace the "The UI path … is not wired up yet; there is no top-level `pnpm test` script for that reason." paragraph with the new state (two-project layout, colocated `*.test.tsx`, jsdom env, `pnpm test` runs both).
- [x] 6.2 Verify the Commands table in `CLAUDE.md` lists `pnpm test`, `pnpm test:ui`, and `pnpm test:ui:watch` alongside the existing logic-path entries.
