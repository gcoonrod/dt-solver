## ADDED Requirements

### Requirement: ConstraintBuilder is decomposed into a sub-directory structure

The ConstraintBuilder implementation SHALL be organized as a directory at `src/components/features/constraint-builder/` with focused sub-modules, exposed via a barrel export.

- `src/components/features/constraint-builder/index.ts` SHALL exist and SHALL export the root `ConstraintBuilder` component as a default export.
- `src/components/features/ConstraintBuilder.tsx` SHALL remain as a thin re-export shell: `export { default } from './constraint-builder'`.
- The following sub-modules SHALL exist within the directory:
  - `BuilderShell.tsx` — owns all form state and composes sub-components
  - `BuilderHeader.tsx` — modal header chrome with type badge and LiveStatusPill
  - `FormType.tsx` — constraint type chip selector (SETUP, HOLD, PROP_DELAY, MIN_PULSE, CYCLE_TIME)
  - `FormSignalRef.tsx` — signal + edge direction reference selector
  - `FormBounds.tsx` — min/max bound inputs with applicable-bound dimming
  - `PreviewWaveform.tsx` — D3-based waveform preview with annotation band
  - `PreviewFooter.tsx` — metrics row (required, calculated, slack, status)
  - `constants.ts` — TYPE_DEFS, TYPE_DEF_BY_ID, SWATCH_BG, edge helpers

#### Scenario: Barrel export provides default ConstraintBuilder

- **WHEN** `src/components/features/constraint-builder/index.ts` is imported
- **THEN** its default export SHALL be a valid React component
- **AND** that component SHALL behave identically to the current monolithic ConstraintBuilder

#### Scenario: Root file is a thin re-export

- **WHEN** `src/components/features/ConstraintBuilder.tsx` is inspected
- **THEN** it SHALL contain a single re-export statement and no component logic
- **AND** its default export SHALL be the same component as the barrel's default export

#### Scenario: All sub-module files exist

- **WHEN** the filesystem at `src/components/features/constraint-builder/` is inspected
- **THEN** files `index.ts`, `BuilderShell.tsx`, `BuilderHeader.tsx`, `FormType.tsx`, `FormSignalRef.tsx`, `FormBounds.tsx`, `PreviewWaveform.tsx`, `PreviewFooter.tsx`, and `constants.ts` SHALL all exist

### Requirement: BuilderShell owns form state and composes sub-components

The `BuilderShell` component SHALL be the single owner of all constraint builder form state and SHALL compose extracted sub-components via props.

- BuilderShell SHALL manage state for: `type`, `anchor`, `target`, `minNs`, `maxNs`, `userName`.
- BuilderShell SHALL compute derived values: `effectiveTarget`, `autoName`, `draft`, `solved`, `valid`.
- BuilderShell SHALL import and render: `BuilderHeader`, `FormType`, `FormName` (from shared ui), `FormSignalRef`, `FormBounds`, `PreviewWaveform`, `PreviewFooter`, and `KeyboardShortcuts` (from shared ui).
- BuilderShell SHALL NOT subscribe to the store directly — store values SHALL be passed in from the root component.

#### Scenario: BuilderShell renders all form sections

- **WHEN** BuilderShell is rendered with valid signals and no initial constraint
- **THEN** a type selector, name input, anchor selector, target selector, bounds input, and preview SHALL all be visible

#### Scenario: BuilderShell passes constraint draft to preview

- **WHEN** the user modifies the minNs input
- **THEN** the preview SHALL re-evaluate and update its status display

### Requirement: BuilderHeader displays type badge and live status

The `BuilderHeader` component SHALL render the modal's top bar with the constraint type badge and a live-status pill.

- It SHALL accept props: `def: TypeDef`, `solved: Constraint`, `onCancel: () => void`.
- It SHALL display the type's symbol in a colored badge using the type's swatch.
- It SHALL render a `LiveStatusPill` sub-component showing pass/fail/unresolved.
- It SHALL render a close button that invokes `onCancel`.

#### Scenario: Header shows type symbol and label

- **WHEN** rendered with a SETUP type definition
- **THEN** the text "tSU" SHALL be visible in a sky-colored badge
- **AND** the text "Setup" SHALL be visible

#### Scenario: Header shows live status pill

- **WHEN** rendered with a solved constraint having `status: "PASS"`
- **THEN** a pill containing text matching "pass" (case-insensitive) SHALL be visible

### Requirement: FormSignalRef provides signal and edge selection

The `FormSignalRef` component SHALL render a signal selector dropdown and edge-direction toggle for configuring a `SignalReference`.

- It SHALL accept props: `label: string`, `kbd: string`, `value: SignalReference`, `onChange: (ref: SignalReference) => void`, `signals: AnySignal[]`, `disabled?: boolean`, `accent?: string`.
- The signal dropdown SHALL list all signals with their name and color dot.
- The edge toggle SHALL show options appropriate to the selected signal type (RISING/FALLING for clocks, TRANSITION/RISING/FALLING for data signals).
- When `disabled` is `true`, all controls SHALL be non-interactive.

#### Scenario: Signal dropdown shows all available signals

- **WHEN** rendered with 3 signals in the array
- **THEN** the dropdown SHALL contain 3 selectable options

#### Scenario: Changing signal resets edge to first valid option

- **WHEN** the user switches from a clock signal to a data signal
- **THEN** the edge direction SHALL reset to "TRANSITION"

#### Scenario: Disabled state prevents interaction

- **WHEN** rendered with `disabled={true}`
- **THEN** the signal dropdown and edge toggle SHALL be non-interactive

### Requirement: FormBounds provides min/max inputs with applicable-bound dimming

The `FormBounds` component SHALL render both min and max bound inputs, dimming the one not applicable to the active constraint type.

- It SHALL accept props: `def: TypeDef`, `minNs: string`, `maxNs: string`, `setMinNs: (v: string) => void`, `setMaxNs: (v: string) => void`.
- For types where `def.bounds === "min"`, the min input SHALL be fully interactive and the max input SHALL be visually dimmed.
- For types where `def.bounds === "max"`, the max input SHALL be fully interactive and the min input SHALL be visually dimmed.
- The component SHALL display the type's inequality formula.

#### Scenario: SETUP type activates min and dims max

- **WHEN** rendered with a SETUP type definition (bounds="min")
- **THEN** the min input SHALL be enabled and prominently styled
- **AND** the max input SHALL be visually dimmed

#### Scenario: PROP_DELAY type activates max and dims min

- **WHEN** rendered with a PROP_DELAY type definition (bounds="max")
- **THEN** the max input SHALL be enabled and prominently styled
- **AND** the min input SHALL be visually dimmed

### Requirement: PreviewWaveform renders D3 traces and constraint annotation

The `PreviewWaveform` component SHALL render the waveform preview with signal traces and the constraint annotation band.

- It SHALL accept props: `draft: Constraint`, `solved: Constraint`, `signals: AnySignal[]`, `def: TypeDef`.
- It SHALL reuse `ClockTrace`, `LineTrace`, and `BusTrace` from `@/components/canvas/WaveformTimeline`.
- It SHALL render an annotation band between anchor and target events colored green for PASS and red for FAIL.
- For same-signal types, it SHALL render only one waveform row.
- It SHALL NOT define its own path-generation functions for trace rendering.

#### Scenario: Preview uses WaveformTimeline trace components

- **WHEN** the PreviewWaveform source is inspected
- **THEN** it SHALL import from `@/components/canvas/WaveformTimeline`
- **AND** it SHALL NOT contain custom SVG path generators for waveforms

#### Scenario: Same-signal types render one row

- **WHEN** rendered with a MIN_PULSE constraint (sameSignal=true)
- **THEN** exactly one waveform trace row SHALL be visible

### Requirement: constants.ts centralizes type definitions and helpers

A `constants.ts` file SHALL exist in the constraint-builder directory containing all type taxonomy definitions and utility functions.

- It SHALL export `TYPE_DEFS: TypeDef[]` with entries for SETUP, HOLD, PROP_DELAY, MIN_PULSE, CYCLE_TIME.
- It SHALL export `TYPE_DEF_BY_ID: Record<ConstraintType, TypeDef>`.
- It SHALL export `SWATCH_BG: Record<Swatch, string>`.
- It SHALL export `edgeOptionsFor(sig: AnySignal | undefined): EdgeOption[]`.
- It SHALL export the `TypeDef`, `Swatch`, and `EdgeOption` interfaces.

#### Scenario: TYPE_DEFS contains all five constraint types

- **WHEN** `TYPE_DEFS` is imported from constants
- **THEN** it SHALL have exactly 5 entries with ids: SETUP, HOLD, PROP_DELAY, MIN_PULSE, CYCLE_TIME

#### Scenario: edgeOptionsFor returns correct options for clock signals

- **WHEN** called with a clock signal
- **THEN** it SHALL return options for RISING and FALLING only
