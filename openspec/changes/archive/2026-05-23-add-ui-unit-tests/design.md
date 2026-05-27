## Context

The repo already runs Vitest 4 in a single-config, multi-project layout (`vitest.config.ts` with `test.projects: [...]`). The first slot — `logic` — is wired and stable: `environment: 'node'`, `include: ['__tests__/**/*.test.ts']`, alias resolution via `vite-tsconfig-paths`. A comment in the config explicitly reserves the second slot for the UI-path change.

`src/components/` contains three real components today:

- `canvas/WaveformTimeline.tsx` (555 LoC) — large D3 SVG renderer that subscribes to `useTimingStore` and calls `generateClockEdges` / `stateAt` from `@/core/solver`. Also exports the pure helper `formatTime(t)` and two layout constants (`ROW_H`, `HEADER_H`).
- `panels/ComponentLibrary.tsx` (280 LoC) — also exports an `IconCL` helper.
- `panels/ConstraintInspector.tsx` (349 LoC).

`canvas/useD3Timeline.ts` and the `ui/` directory are empty stubs and out of scope until they have implementations.

The store (`useTimingStore`) is a real, working Zustand store that re-solves on every mutation. Components use the **default exported hook**, so React Testing Library plus a fresh `useTimingStore.setState` per test gives us a real integration surface without mocking.

React 19 + Next.js 16 forces version-aware library choices: `@testing-library/react@^16` is the first release that officially supports React 19. `jest-dom` v6.6+ ships a `/vitest` entry that registers matchers via `expect.extend` without needing a separate matchers import.

## Goals / Non-Goals

**Goals:**

- Add the second Vitest project (`ui`) without disturbing the working `logic` project.
- Establish the colocated `*.test.tsx` convention (next to the source) so tests move with the code they exercise.
- Give each existing real component a smoke-level render test that touches the real store, proving the store→component wiring path is alive.
- Cover the only pure exported helper that already lives in a `.tsx` file (`formatTime`) with table-driven unit tests so we don't need a separate `formatters.ts` extraction yet.
- Introduce a top-level `pnpm test` that runs both projects, becoming the recommended entry point for contributors and future CI.

**Non-Goals:**

- Snapshot testing (brittle for D3 SVG; we assert by accessible queries instead).
- Visual regression / Playwright / any browser-driven test.
- Coverage thresholds for the `ui` project — premature until we have a baseline.
- CI gating or pre-commit enforcement of the purity boundary; the file-extension + environment split already gives a hard physical boundary.
- Refactoring `WaveformTimeline.tsx` to extract `formatTime` into a pure module. Tempting, but a 1-line export from a 555-line file is not blocking us.
- Testing `useD3Timeline.ts` (empty stub) or anything in `src/components/ui/` (empty dir).

## Decisions

### D1. React Testing Library + jsdom, not happy-dom or @testing-library/react-native

- **Choice**: `jsdom` as the Vitest environment for the `ui` project; `@testing-library/react@^16` + `@testing-library/user-event@^14` + `@testing-library/jest-dom@^6.6` for assertions.
- **Why**: jsdom is the canonical pairing for React component tests under Vitest, and `@testing-library/react@16` is the first major version that explicitly supports React 19's new `act` and concurrent rendering. happy-dom is faster but has known gaps around SVG (which is exactly what `WaveformTimeline` produces).
- **Alternatives considered**:
  - happy-dom — rejected for SVG/D3 fidelity concerns. We can revisit if test runtime becomes a problem.
  - Bare `@testing-library/dom` without `@testing-library/react` — rejected; we'd reimplement `render()` and `cleanup()` ourselves.

### D2. Append a second project to `vitest.config.ts`; do NOT split into `vitest.workspace.ts`

- **Choice**: Add a second object to the existing `test.projects: [...]` array. Keep one config file.
- **Why**: The `logic-path-tests` spec mandates exactly one root-level Vitest config file. `vitest.workspace.ts` is explicitly deprecated by that spec. Symmetry with the `logic` project keeps the file readable.
- **Glob**: `include: ['src/components/**/*.test.{ts,tsx}']`. Allowing `.ts` (not just `.tsx`) leaves room for tests against future hooks like `useD3Timeline.ts` without another config change.

### D3. Shared `vitest.setup.ts` at repo root, registered only on the `ui` project

- **Choice**: Create `vitest.setup.ts` containing `import "@testing-library/jest-dom/vitest";`. Wire it via `setupFiles: ['./vitest.setup.ts']` on the `ui` project only.
- **Why**: The `logic` project must not load DOM matchers — it would silently mask "this test is running in node but reaching for `toBeInTheDocument`" bugs. Per-project setupFiles preserves the physical boundary.
- **Alternative considered**: top-level `test.setupFiles` shared by both projects — rejected for the masking reason above.

### D4. Tests use the real Zustand store, reset via `setState` between tests

- **Choice**: Each test file installs a `beforeEach(() => { useTimingStore.setState(initialState, true); })` pattern (the `true` triggers a full replace) seeded from a known-good profile. No store mocking, no component-level prop drilling shim.
- **Why**: The store is the integration point. Mocking it would test our mock, not the wiring. The logic-path-tests spec already validates that the store re-solves correctly — UI tests piggyback on that guarantee and assert that the rendered output reflects the post-solve state.
- **Trade-off**: Tests share the singleton store, so parallelism within a file is constrained — Vitest's default per-file isolation handles this. `beforeEach` reset is mandatory; we'll document it once in the first test file and assume it as the convention.

### D5. Assert by accessible queries, not by `data-testid` or DOM structure

- **Choice**: Use `getByRole`, `getByText`, `findByText`. Reach for `data-testid` only when no accessible query works (D3-generated SVG nodes likely qualify; we'll add testids minimally and document each).
- **Why**: Accessible queries double as a (very weak) a11y smoke check and survive cosmetic refactors. Structural assertions on a 555-LoC D3 component would shatter on every layout tweak.

### D6. Top-level `pnpm test` runs both projects via `vitest run` (no `--project` flag)

- **Choice**: `"test": "vitest run"` — bare invocation, lets Vitest pick up every project.
- **Why**: Existing `test:logic` / `test:logic:watch` (and new `test:ui` / `test:ui:watch`) still work for targeted runs. Top-level `test` is the default contributor experience: "run all tests."

### D7. Initial coverage targets exactly the three implemented components

- **Choice**: `WaveformTimeline.test.tsx`, `ComponentLibrary.test.tsx`, `ConstraintInspector.test.tsx`. Each gets a smoke render plus 1–3 store-interaction assertions. `formatTime` gets its own `describe` block inside `WaveformTimeline.test.tsx` (lives in the same source file, so colocation rule keeps them together).
- **Why**: Matches the "initial set" framing in the proposal. Avoids the trap of writing exhaustive tests on first wire-up when the failure modes are still unknown — better to ship the scaffold, watch what actually breaks in dev, and add targeted tests then.

## Risks / Trade-offs

- **D3 + jsdom edge cases**: D3 sometimes reaches for browser APIs jsdom stubs poorly (e.g., `getBBox`, `getComputedTextLength`). → **Mitigation**: smoke tests only assert on store-driven text/role queries, not on layout math. If D3 throws inside `useEffect`, we add a targeted jsdom shim in `vitest.setup.ts` and document it inline.
- **React 19 act warnings**: `@testing-library/react@16` is new and its React 19 support is recent. → **Mitigation**: if act warnings appear, wrap interactions in `await user.click(...)` from `user-event@14` which awaits internally; do not silence warnings.
- **Test flakiness from shared store singleton**: forgetting `beforeEach(setState reset)` would leak state across tests. → **Mitigation**: write one helper `resetStore()` co-located in the first test file; copy-paste is fine for three files. If it grows past three files, extract into `src/components/__test-utils__/`.
- **`pnpm test` is slower than `pnpm test:logic`** because jsdom startup + React render dominate. → **Mitigation**: contributors who only touched solver code can still target `pnpm test:logic`; documenting both scripts keeps the fast loop available.
- **`logic-path-tests` spec has a scenario that will become false** ("Top-level `pnpm test` is not yet defined" → MUST FAIL). → **Mitigation**: this change ships a delta spec that removes that scenario, so the contract evolves with the code instead of silently drifting.

## Open Questions

- Should the top-level `pnpm test` script be `vitest run` or `vitest run --reporter=verbose`? Defaulting to `vitest run` (Vitest's default reporter); contributors who want detail can pass `--reporter=verbose` themselves. Revisit if signal-to-noise is poor.
- Do we need `@vitejs/plugin-react` for the `ui` project? Vitest auto-detects JSX through esbuild for `.tsx` files; the existing `vite-tsconfig-paths` plugin handles aliases. Plan to ship without it and add only if React-specific Fast Refresh or `displayName` behavior is needed (unlikely for unit tests).
