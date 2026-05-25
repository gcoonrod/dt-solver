## Why

The ConstraintBuilder (1380 LOC) and SignalBuilder (1453 LOC) were delivered as monolithic single-file implementations from design handoffs. Both files contain numerous sub-components, utility functions, and repeated patterns (form sections, preview rendering, keyboard shortcuts) that should be extracted into reusable, testable pieces — exactly as was done for `page.tsx` (307→44 LOC) earlier.

## What Changes

- Extract shared builder primitives (modal backdrop, form sections, keyboard shortcuts, color swatch system, slew/number fields) into `src/components/ui/` as reusable atoms.
- Split ConstraintBuilder's internal components (header, form controls, preview waveform, preview footer, annotation system) into focused sub-modules under a `src/components/features/constraint-builder/` directory.
- Split SignalBuilder's internal components (header, type selector, clock params, data params, transitions editor, preview, appearance row) into focused sub-modules under a `src/components/features/signal-builder/` directory.
- Each builder's root export remains at its current path for backwards compatibility (re-exports from the decomposed directory).
- Colocate new unit tests with the extracted components.

## Capabilities

### New Capabilities
- `builder-shared-primitives`: Shared UI atoms extracted from both builders — modal backdrop, form section layout, keyboard shortcut handler, swatch/color system, number input fields, slew rate controls.
- `constraint-builder-decomposition`: ConstraintBuilder broken into focused sub-modules (header, type selector, signal refs, bounds form, preview system) with a barrel re-export.
- `signal-builder-decomposition`: SignalBuilder broken into focused sub-modules (header, type selector, clock params, data params, transitions editor, preview system, appearance row) with a barrel re-export.

### Modified Capabilities
- `constraint-builder`: The component's public API (default export, placement, behavior) is unchanged but internal structure moves to sub-modules.
- `signal-builder`: The component's public API (default export, placement, behavior) is unchanged but internal structure moves to sub-modules.

## Impact

- **Code**: `src/components/features/ConstraintBuilder.tsx` and `src/components/features/SignalBuilder.tsx` become thin re-export shells; real logic moves to sub-directories.
- **New shared UI**: `src/components/ui/` gains ~5-7 new atom components (FormSection, ModalBackdrop, KeyboardShortcuts, NumberField, SlewControls, ColorPicker, TypeChip).
- **Tests**: Existing tests continue to pass against the re-exported roots; new colocated tests added for each extracted component.
- **Dependencies**: No new external dependencies — purely internal restructuring.
- **Risk**: Low — all existing specs remain valid since external behavior is unchanged.
