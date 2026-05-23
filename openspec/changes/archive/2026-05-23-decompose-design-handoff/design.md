## Context

`src/app/page.tsx` arrived from a design handoff as a 307-line file containing the entire workspace UI. The architectural baseline in `CLAUDE.md` already separates `src/core/` (pure), `src/store/` (Zustand), and `src/components/` (presentation), but the components tier itself has no internal layering — only two flat folders, `canvas/` and `panels/`, plus an empty `ui/`. The page renders four inline subcomponents that subscribe directly to the store, plus two `useEffect` blocks (vertical-splitter drag, global keyboard shortcuts) that hold both DOM event listeners and store actions. The colocated `ui` Vitest project (jsdom + Testing Library + jest-dom matchers + `ResizeObserver` stub) is configured and proven by the two existing component tests (`ConstraintInspector.test.tsx`, `ComponentLibrary.test.tsx`, `WaveformTimeline.test.tsx`), but nothing inside the page itself is covered.

Constraints we must honor:
- `src/core/` purity boundary (CLAUDE.md): no React/DOM/D3/store imports under `src/core/`. This change touches none of that.
- The `ui` test project includes only `src/components/**/*.test.{ts,tsx}`. New files must live under `src/components/` to be picked up — or the include glob must widen. We choose to keep all new component code under `src/components/` and extend the glob only for hooks (see Decision 4).
- The store must be exercised, not mocked, in UI tests (forbidden by CLAUDE.md). Tests reset the store in `beforeEach` using `useTimingStore.setState(initialState, false)`.
- React 19 + Next.js 16 (App Router). The page is a `"use client"` boundary today and must remain one — extracted features that subscribe to the store stay client components.

## Goals / Non-Goals

**Goals:**
- Reduce `src/app/page.tsx` to a thin layout shell (target: ≤ 50 lines) that composes named features.
- Establish a three-tier component organization (`ui/` leaves, `features/` collections, `app/` pages) that future work can extend without re-architecting.
- Achieve UI unit-test coverage for every newly extracted leaf component and feature, plus an integration test for the page shell that exercises the cross-component behaviors (splitter drag, keyboard shortcuts, cursor readout updates).
- Preserve current visual output and behavior pixel-equivalent — this is a refactor, not a redesign.

**Non-Goals:**
- Adding new product features, redesigning the workspace, or restyling components.
- Touching `src/core/`, `src/store/`, `src/types/`, `src/data/`, or any solver/store logic.
- Introducing a component library, design system, or styling framework. Tailwind v4 stays as-is.
- Adding Playwright/E2E browser tests. Integration tests stay inside the `ui` Vitest project under jsdom.
- Server-component conversion. The shell stays client-rendered because the store is client-only.

## Decisions

### Decision 1: Three-tier folder layout — `ui/` (leaves) + `features/` (collections) + `app/` (pages)

We split `src/components/` into three tiers with a strict import direction:

```
src/components/ui/        ← Leaf components. Pure presentation. No store imports.
   ↑
src/components/features/  ← Composed feature units. May import ui/, store, core helpers.
   ↑
src/app/                  ← Pages. May import features/ and ui/. Holds layout only.
```

`src/components/canvas/` and `src/components/panels/` are existing siblings of `ui/` and `features/`. We keep them where they are (don't churn moves of already-working files like `WaveformTimeline`, `ConstraintInspector`, `ComponentLibrary`) and treat them as feature-tier modules — a `features/` re-export wrapper is unnecessary churn. The boundary rule is enforced by convention and reviewed in PR, not by tooling, matching the existing `src/core/` purity convention.

**Alternatives considered:**
- *Atoms/molecules/organisms* (atomic design): Too many tiers for the codebase's current size; adds vocabulary without buying isolation.
- *Flat `src/components/`*: What we have now — fails because there's no signal for "is this reusable" vs "is this app-specific."
- *Move `canvas/` and `panels/` under `features/`*: Pure churn — paths change, imports break, no test value. Rejected.

### Decision 2: Extract two inline `useEffect` blocks into named hooks

`useVerticalSplit({ minFrac, maxFrac, initialFrac })` owns the splitter drag state machine and returns `{ bottomFrac, containerRef, startDrag }`. `useGlobalShortcuts()` reads cursor/window from the store, listens on `window`, and dispatches store actions — it takes no props.

Both live in `src/hooks/`. They are tested via the feature/page integration tests that use them, not in isolation — testing a hook by rendering a synthetic harness component is lower-value than testing the real feature that consumes it. The `ui` project's include glob is widened to `src/{components,hooks}/**/*.test.{ts,tsx}` so a hook can have a colocated test if it ever needs one in isolation.

**Alternatives considered:**
- *Leave the effects in `page.tsx`*: Keeps the page fat and untestable in isolation. The shortcut effect already has a six-item dep array — extraction makes the contract explicit.
- *Test hooks with `renderHook` in isolation*: Possible, but doubles the test count without exercising the integration that actually matters. We test through the feature that owns the hook.

### Decision 3: One integration test, multiple unit tests

For each new leaf in `src/components/ui/`, write a `*.test.tsx` that mounts the component in isolation and asserts via accessible queries (label/role/text) that prop branches render correctly. These tests do NOT touch the store.

For each new feature in `src/components/features/`, write a `*.test.tsx` that mounts it inside a real store reset to `W65C02S_14MHz`, asserts initial render, then dispatches store mutations (`useTimingStore.setState(...)` or store actions) and asserts re-renders.

For the page shell, write `src/app/page.test.tsx` (a new file — requires the `ui` project's `include` glob to also cover `src/app/**`). It asserts: (a) the splitter drag updates the bottom fraction, (b) `⌘+` zooms in, (c) `f` fits, (d) `ArrowRight` advances the cursor, (e) the cursor readout in the toolbar updates when `setCursor` is called externally. This is the one cross-cutting test we cannot replace with unit tests.

**Alternatives considered:**
- *Snapshot tests*: Explicitly forbidden by CLAUDE.md. Accessible queries it is.
- *Only integration tests, no unit tests*: Loses the locality benefit — unit tests are fast and pinpoint regressions to a single file.
- *Only unit tests, no integration*: Misses the splitter+shortcut+toolbar interaction, which is exactly the kind of thing that broke when we extracted it.

### Decision 4: Extend the `ui` Vitest project's include glob

Widen `vitest.config.ts` `ui` project's `include` from `['src/components/**/*.test.{ts,tsx}']` to `['src/{app,components,hooks}/**/*.test.{ts,tsx}']`. This lets the page-shell integration test live at `src/app/page.test.tsx` (the same directory as the page itself, matching the colocation convention) and lets a hook have a colocated test if it ever needs one in isolation. The `logic` project's include glob (`__tests__/**/*.test.ts`) is unchanged, and it physically cannot pick up `.tsx` files — so the boundary stays intact.

**Alternatives considered:**
- *Put the page integration test under `__tests__/`*: Wrong project — it needs jsdom + jest-dom + the `ResizeObserver` stub.
- *Make a third Vitest project just for integration*: Premature. The `ui` project already has the right environment.

### Decision 5: Preserve every prop/branch exactly during extraction

Each extracted component is moved to its own file with the same JSX, the same Tailwind classes, and the same prop types as the inline version. The `TOOL_BTN_PATHS` map moves with `ToolBtn`. The `stateAt(sig, cursorTimeNs)` display-string logic appears in both the toolbar's mini-readout and `ChannelLabels`; we extract it into one helper `formatSignalDisplay(sig, cursorTimeNs)` exported from `src/components/features/signalDisplay.ts`. The helper lives under `features/` (not `ui/`) because it imports `stateAt` from `@/core/solver`, and the spec forbids `@/core/` imports under `ui/`. `SignalStateBadge` itself stays as a pure visual leaf accepting `color` and `display` strings. The two existing callsites both consume that helper. This is the only logic deduplication; everything else is mechanical extraction.

**Alternatives considered:**
- *Inline-duplicate the display logic*: Bug-prone — two copies will drift.
- *Put the helper in `src/core/`*: Violates the purity boundary's spirit (it's a presentation concern, not solver math). Stays in `src/components/ui/`.

## Risks / Trade-offs

- **[Risk] Extracting the splitter or shortcut effect changes behavior subtly (e.g., listener ordering, dep array drift)** → Mitigation: Write the page-shell integration test FIRST — before any extraction — and assert it passes against the current 307-line page. Then extract and re-run; any divergence is a regression. This is the only test that has to land before its production code.
- **[Risk] The widened `ui` include glob (`src/{app,components,hooks}`) accidentally picks up server-component test files in the future** → Mitigation: Document the colocation convention in `CLAUDE.md` once this change archives. The `ui` project's jsdom environment already rejects server-only APIs, so a misplaced server test would fail loudly.
- **[Trade-off] We don't enforce the `ui/` → `features/` → `app/` import direction with tooling** → Accepted: matches how the existing `src/core/` purity boundary is enforced (convention + PR review). Adding an ESLint rule for import direction is out of scope; revisit if violations show up.
- **[Trade-off] The `src/hooks/` directory adds a new top-level folder** → Accepted: hooks aren't components and don't belong under `src/components/`. The folder will stay small (two files at start).
- **[Trade-off] Page integration test runs slower than a unit test** → Accepted: jsdom is still in-process; expected cost ≤ ~100ms per case. Single-digit cases means a low triple-digit ms overhead total — invisible against the existing test suite.

## Migration Plan

1. Land the change as a single PR off `chore/decompose-design-handoff` (current branch). No feature flag, no staged rollout — this is a pure refactor with full test coverage added in the same commit train.
2. Order of operations within the PR (see `tasks.md` for the granular list):
   a. Widen the `ui` project include glob and write `src/app/page.test.tsx` against the unchanged 307-line page. Confirm it passes.
   b. Extract leaf components and their tests one-by-one. After each extraction, the full `pnpm test` must stay green.
   c. Extract features and their tests.
   d. Extract the two hooks.
   e. Reduce `src/app/page.tsx` to the layout shell.
   f. Re-run `pnpm lint && pnpm test && pnpm build`.
3. **Rollback**: Pure `git revert` of the merge commit. No data migrations, no config changes outside `vitest.config.ts`, no dependency bumps.
