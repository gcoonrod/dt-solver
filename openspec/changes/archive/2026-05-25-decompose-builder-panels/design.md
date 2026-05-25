## Context

The ConstraintBuilder (1380 LOC) and SignalBuilder (1453 LOC) in `src/components/features/` were imported as single-file monoliths from design handoff prototypes. Each contains 15-20+ internal function components, utility functions, type definitions, and constants. The page.tsx decomposition (307→44 LOC across 8 extracted components) established the pattern: extract atoms to `ui/`, features to `features/`, and hooks to `hooks/`.

Both builders share significant structural DNA:
- Modal backdrop + keyboard handling
- Header with status pill
- Form section layout component (label, kbd hint, action slot)
- Type-selector chip row with swatch color system
- Live preview with D3 waveform traces
- Footer with keyboard hints + submit button
- Number/field input pattern

## Goals / Non-Goals

**Goals:**
- Reduce each builder's root file to ≤100 LOC (thin shell + composition)
- Extract 5-7 shared primitives into `src/components/ui/` usable by both builders (and future panels)
- Each extracted sub-component is independently testable with colocated tests
- Existing tests continue to pass without modification (public API unchanged)
- Follow the same decomposition pattern as page.tsx: directory-per-feature with barrel `index.ts`

**Non-Goals:**
- Changing any external behavior or API of either builder
- Refactoring the Zustand store interface
- Adding new features (edit mode, templates, etc.)
- Extracting shared business logic to `src/core/` — this is purely a UI decomposition
- Changing test infrastructure or vitest configuration

## Decisions

### 1. Directory structure: sub-directory per builder + shared primitives

```
src/components/
├── ui/
│   ├── ModalBackdrop.tsx        ← shared: fixed overlay + blur + click-outside
│   ├── FormSection.tsx          ← shared: label/kbd/action/children layout
│   ├── TypeChipSelector.tsx     ← shared: generic chip row (any TypeDef[])
│   ├── NumberField.tsx          ← shared: labeled number input w/ suffix
│   ├── SlewControls.tsx         ← shared: rise/fall linked inputs
│   ├── ColorDotPicker.tsx       ← shared: palette grid with active indicator
│   └── KeyboardShortcuts.tsx    ← shared: global keydown listener (esc/cmd+enter)
├── features/
│   ├── ConstraintBuilder.tsx    ← thin re-export shell (default export)
│   ├── constraint-builder/
│   │   ├── index.ts             ← barrel
│   │   ├── BuilderShell.tsx     ← form state + layout composition
│   │   ├── BuilderHeader.tsx    ← header chrome + LiveStatusPill
│   │   ├── FormType.tsx         ← constraint type chip selector
│   │   ├── FormSignalRef.tsx    ← signal/edge reference selector
│   │   ├── FormBounds.tsx       ← min/max bound inputs with dimming
│   │   ├── PreviewWaveform.tsx  ← D3 trace preview + annotation
│   │   ├── PreviewFooter.tsx    ← metrics row (required/calc/slack/status)
│   │   └── constants.ts         ← TYPE_DEFS, SWATCH_BG, edge helpers
│   ├── SignalBuilder.tsx         ← thin re-export shell (default export)
│   └── signal-builder/
│       ├── index.ts             ← barrel
│       ├── BuilderShell.tsx     ← form state + layout composition
│       ├── SBHeader.tsx         ← header chrome + live pill
│       ├── SBFormType.tsx       ← signal type chip selector
│       ├── SBClockParams.tsx    ← frequency/duty/phase controls
│       ├── SBDataParams.tsx     ← base state + transitions editor
│       ├── SBTransitionsEditor.tsx ← add/remove/reorder transitions
│       ├── SBPreviewWaveform.tsx ← D3 trace preview + rulers
│       ├── SBAppearanceRow.tsx  ← color + description
│       └── constants.ts         ← TYPE_DEFS, SWATCH_SB, freq helpers
```

**Rationale**: Mirrors the flat `ui/` + nested `features/<name>/` pattern already established. Keeping each builder's sub-components namespaced avoids collision (both have a "BuilderHeader" and "PreviewWaveform"). The `SB` prefix on SignalBuilder sub-components matches what's already in the source.

**Alternative considered**: A single shared `builder-primitives/` directory. Rejected because it creates an unclear ownership boundary — the `ui/` directory already serves this role for truly reusable atoms.

### 2. Thin root files remain at existing paths

The root `ConstraintBuilder.tsx` and `SignalBuilder.tsx` become:
```tsx
export { default } from './constraint-builder';
```

**Rationale**: Avoids changing any import in `page.tsx`, store, or tests. The barrel pattern makes the refactor invisible to consumers.

### 3. Shared primitives are generic (props-driven, no store coupling)

Each shared `ui/` component accepts props and renders — no store subscriptions, no domain types. For example, `TypeChipSelector` receives a generic `TypeDef[]` and `value`/`onChange`, not `ConstraintType` specifically.

**Rationale**: Keeps `ui/` atoms reusable across future panels (e.g., a Profile builder).

**Alternative considered**: Co-locating shared primitives in one builder and importing cross-feature. Rejected — cross-feature imports between siblings are a code smell.

### 4. Constants/type-defs stay in each builder's `constants.ts`

The domain-specific type taxonomies (`TYPE_DEFS`, swatches, edge helpers) are NOT shared — they go in each builder's own `constants.ts`. Only truly generic utilities (formatting, color palette) promote to `ui/`.

**Rationale**: The constraint and signal type systems are semantically different despite structural similarity. Forcing them into a shared abstraction would over-couple.

### 5. Test strategy: existing tests stay, new colocated tests added

Existing `ConstraintBuilder.test.tsx` and `SignalBuilder.test.tsx` continue testing the full modal integration at the root export level. New tests for extracted sub-components are colocated (`FormSection.test.tsx` next to `FormSection.tsx`).

**Rationale**: Integration tests verify no regression; unit tests on atoms verify isolation.

## Risks / Trade-offs

- **Shallow modules risk**: Some extracted files may be <30 LOC. This is acceptable — clarity of responsibility matters more than file size. → Mitigation: Only extract when the component has a clear, nameable responsibility.
- **Import depth**: Sub-components now have 2-3 levels of relative imports. → Mitigation: The `@/` path alias eliminates deep relative paths; all `ui/` imports use `@/components/ui/X`.
- **Prop threading**: Breaking a monolith into pieces surfaces prop-passing that was previously closure-captured. → Mitigation: The BuilderShell still owns all form state and threads props down — no new context providers needed for this decomposition.
- **Test brittleness during refactor**: Moving code may temporarily break imports in test files. → Mitigation: Keep root re-exports stable from the start; run tests after each extraction step.
