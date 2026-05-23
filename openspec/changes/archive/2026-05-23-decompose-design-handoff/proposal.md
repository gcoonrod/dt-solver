## Why

The design handoff produced a single 307-line `src/app/page.tsx` that bundles layout shell, four inline subcomponents (`WaveformToolbar`, `ToolBtn`, `ChannelLabels`, `CornerLabel`), two cross-cutting effects (vertical-splitter drag + global keyboard shortcuts), and direct Zustand subscriptions all in one file. Nothing under the page is independently testable, and the colocated `ui` Vitest project (already wired in `vitest.config.ts`) has no surface to cover. As more workspace zones land (e.g., timeline ruler, status bar, second inspector tab), the file will keep growing and the lack of unit-test coverage will compound. We need a structural baseline — components, features, page — before the next product phase from `ROADMAP.md` is wired in.

## What Changes

- Extract every inline subcomponent in `src/app/page.tsx` into its own file under a clear tier:
  - **Components** (`src/components/ui/`): leaf, reusable, presentational — `ToolBtn`, `CornerLabel`, `CursorReadout`, `SignalStateBadge`, `Splitter`.
  - **Features** (`src/components/features/`): composed component collections wired to the store — `WaveformToolbar`, `ChannelLabels`, `WaveformWorkspace` (toolbar + labels + timeline + corner overlay), `InspectorPanel` (re-export wrapper over the existing `ConstraintInspector`).
  - **Hooks** (`src/hooks/`): extract the two inline `useEffect` blocks into `useVerticalSplit` and `useGlobalShortcuts`.
- Reduce `src/app/page.tsx` to a thin **page** that composes `ComponentLibrary` + `WaveformWorkspace` + `InspectorPanel` with a vertical split, holding no business or interaction logic of its own.
- Add **colocated UI unit tests** (`*.test.tsx` under the `ui` Vitest project) for every new component in `src/components/ui/` and every new feature in `src/components/features/`. Unit tests assert rendered output and prop/store-driven branches via accessible queries.
- Add **integration tests** for `WaveformWorkspace` (the only multi-component feature) and for the `Page` shell, driving real store mutations (cursor move, zoom, fit) and asserting cross-component updates. Tests use the real `useTimingStore` reset to a known profile in `beforeEach`, matching the existing convention from `ConstraintInspector.test.tsx`.
- No changes to `src/core/`, `src/store/`, `src/types/`, or `src/data/`. No new runtime dependencies.

## Capabilities

### New Capabilities
- `app-shell-layout`: Structural contract for the application shell — the tiered component/feature/page boundary, the vertical-split + global-shortcut behavior the page provides, and the testing coverage that must accompany each tier.

### Modified Capabilities
<!-- none — this change does not alter requirements of any archived capability. The existing ui-path-tests capability already permits colocated tests; we simply add more of them. -->

## Impact

- **Code**: `src/app/page.tsx` shrinks to a layout shell. New files under `src/components/ui/`, `src/components/features/`, `src/hooks/`, plus a `.test.tsx` next to each new component/feature and an integration test for the page.
- **Tests**: `pnpm test:ui` gains ~8 new test files. `pnpm test:logic` is unaffected (no React, DOM, or store touched in `__tests__/`). `pnpm test` total runtime grows modestly but stays in a single Vitest invocation.
- **APIs**: `WaveformTimeline`'s exported `HEADER_H`, `ROW_H`, and `formatTime` move from being page-internal imports to feature-internal imports — no public-surface change. The store, solver, and type modules are untouched.
- **CI**: No workflow changes. The existing `lint` / `build` / `test` jobs cover the new files automatically.
- **Risk**: Low. The work is a behavior-preserving refactor; tests are added at the same time the code moves, so regressions surface immediately. The largest risk is breaking the splitter or shortcut effects during extraction — mitigated by adding an integration test that exercises both before any extraction lands.
