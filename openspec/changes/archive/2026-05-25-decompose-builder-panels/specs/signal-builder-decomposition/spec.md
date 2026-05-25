## ADDED Requirements

### Requirement: SignalBuilder is decomposed into a sub-directory structure

The SignalBuilder implementation SHALL be organized as a directory at `src/components/features/signal-builder/` with focused sub-modules, exposed via a barrel export.

- `src/components/features/signal-builder/index.ts` SHALL exist and SHALL export the root `SignalBuilder` component as a default export.
- `src/components/features/SignalBuilder.tsx` SHALL remain as a thin re-export shell: `export { default } from './signal-builder'`.
- The following sub-modules SHALL exist within the directory:
  - `BuilderShell.tsx` — owns all form state and composes sub-components
  - `SBHeader.tsx` — modal header with type badge and live summary pill
  - `SBFormType.tsx` — signal type chip selector (CLOCK, BUS, LINE)
  - `SBClockParams.tsx` — frequency, duty cycle, phase offset controls
  - `SBDataParams.tsx` — base state, width, and transitions section
  - `SBTransitionsEditor.tsx` — add/remove/edit transition events table
  - `SBPreviewWaveform.tsx` — D3-based waveform preview with rulers
  - `SBAppearanceRow.tsx` — color picker and description field
  - `constants.ts` — TYPE_DEFS, SWATCH_SB, frequency helpers, color palette

#### Scenario: Barrel export provides default SignalBuilder

- **WHEN** `src/components/features/signal-builder/index.ts` is imported
- **THEN** its default export SHALL be a valid React component
- **AND** that component SHALL behave identically to the current monolithic SignalBuilder

#### Scenario: Root file is a thin re-export

- **WHEN** `src/components/features/SignalBuilder.tsx` is inspected
- **THEN** it SHALL contain a single re-export statement and no component logic
- **AND** its default export SHALL be the same component as the barrel's default export

#### Scenario: All sub-module files exist

- **WHEN** the filesystem at `src/components/features/signal-builder/` is inspected
- **THEN** files `index.ts`, `BuilderShell.tsx`, `SBHeader.tsx`, `SBFormType.tsx`, `SBClockParams.tsx`, `SBDataParams.tsx`, `SBTransitionsEditor.tsx`, `SBPreviewWaveform.tsx`, `SBAppearanceRow.tsx`, and `constants.ts` SHALL all exist

### Requirement: BuilderShell owns form state and composes sub-components

The `BuilderShell` component SHALL be the single owner of all signal builder form state and SHALL compose extracted sub-components via props.

- BuilderShell SHALL manage state for: `typeId`, `nameValue`/`nameTouched`, `description`, `color`, `riseTimeNs`/`fallTimeNs`/`slewLinked`, clock params (`frequencyValue`/`frequencyUnit`/`dutyHighPct`/`phaseOffsetNs`), and data params (`widthBits`/`baseState`/`transitions`).
- BuilderShell SHALL compute derived values: `autoName`, `displayName`, `draft`, `validity`, `livePill`.
- BuilderShell SHALL import and render: `SBHeader`, `SBFormType`, `FormSection` (shared ui), `SBClockParams`, `SBDataParams`, `SBPreviewWaveform`, `SBAppearanceRow`, and `KeyboardShortcuts` (shared ui).
- BuilderShell SHALL receive `initial` and `onClose` as props from the root component.

#### Scenario: BuilderShell renders clock params when typeId is CLOCK

- **WHEN** BuilderShell is rendered with typeId="CLOCK"
- **THEN** frequency, duty cycle, and phase offset inputs SHALL be visible
- **AND** transitions editor SHALL NOT be visible

#### Scenario: BuilderShell renders data params when typeId is BUS or LINE

- **WHEN** BuilderShell is rendered with typeId="BUS"
- **THEN** base state, width, and transitions editor SHALL be visible
- **AND** frequency/duty/phase inputs SHALL NOT be visible

### Requirement: SBHeader displays type badge and live summary pill

The `SBHeader` component SHALL render the signal builder's top bar with the signal type badge and a live summary pill.

- It SHALL accept props: `def: SBTypeDef`, `livePill: string`, `onClose: () => void`.
- It SHALL display the type's symbol in a colored badge using the swatch.
- It SHALL render the `livePill` string as a status indicator.
- It SHALL render a close button that invokes `onClose`.

#### Scenario: Header shows type label and symbol

- **WHEN** rendered with a CLOCK type definition
- **THEN** "Clock" and "clk" SHALL be visible in the header

#### Scenario: Header shows live pill content

- **WHEN** rendered with `livePill="10.0 ns @ 100 MHz"`
- **THEN** the text "10.0 ns @ 100 MHz" SHALL be visible

### Requirement: SBClockParams provides frequency, duty, and phase controls

The `SBClockParams` component SHALL render the clock-specific parameter inputs.

- It SHALL accept props for: `frequencyValue`, `setFrequencyValue`, `frequencyUnit`, `setFrequencyUnit`, `dutyHighPct`, `setDutyHighPct`, `phaseOffsetNs`, `setPhaseOffsetNs`, plus slew props (`riseTimeNs`, `setRiseTimeNs`, `fallTimeNs`, `setFallTimeNs`, `slewLinked`, `setSlewLinked`).
- It SHALL render a frequency input with unit selector (Hz, kHz, MHz, GHz).
- It SHALL render a duty cycle input (percentage).
- It SHALL render a phase offset input (ns).
- It SHALL render slew rate controls (via the shared `SlewControls` component).

#### Scenario: Frequency unit selector shows all options

- **WHEN** the unit selector is opened
- **THEN** options for Hz, kHz, MHz, and GHz SHALL be available

#### Scenario: Duty cycle accepts percentage value

- **WHEN** the user types "60" in the duty cycle input
- **THEN** `setDutyHighPct` SHALL be called with "60"

### Requirement: SBDataParams provides base state, width, and transitions section

The `SBDataParams` component SHALL render the data signal parameter inputs.

- It SHALL accept props for: `typeId`, `baseState`, `setBaseState`, `widthBits`, `setWidthBits`, `transitions`, `setTransitions`, plus slew props.
- It SHALL render a base-state selector with options appropriate to the signal type (HIGH/LOW for LINE, VALID/INVALID for BUS).
- For BUS type, it SHALL render a width input (bits).
- It SHALL render the `SBTransitionsEditor` sub-component for editing the transition event list.
- It SHALL render slew rate controls (via the shared `SlewControls` component).

#### Scenario: BUS type shows width input

- **WHEN** rendered with typeId="BUS"
- **THEN** a width input field SHALL be visible

#### Scenario: LINE type hides width input

- **WHEN** rendered with typeId="LINE"
- **THEN** no width input field SHALL be visible

### Requirement: SBTransitionsEditor provides add/remove/edit for transitions

The `SBTransitionsEditor` component SHALL render an editable table of transition events with controls to add and remove entries.

- It SHALL accept props: `typeId: SignalTypeId`, `transitions: TransitionEvent[]`, `setTransitions: (t: TransitionEvent[]) => void`.
- It SHALL render one row per transition showing: time (ns), state, direction, and (for BUS type) value.
- It SHALL provide an "Add" button that appends a new transition with a default time.
- It SHALL provide a "Remove" button per row that removes that transition.
- Editing a field in a row SHALL update the corresponding transition in the array.

#### Scenario: Add button appends a transition

- **WHEN** the user clicks the "Add" button
- **THEN** a new transition row SHALL appear in the table
- **AND** the transitions array SHALL have one more entry

#### Scenario: Remove button removes the transition

- **WHEN** the user clicks the remove button on the second row
- **THEN** that row SHALL be removed from the table
- **AND** the transitions array SHALL have one fewer entry

#### Scenario: Editing time updates the transition

- **WHEN** the user changes the time value of the first transition to "30"
- **THEN** `transitions[0].timeNs` SHALL equal 30

### Requirement: SBPreviewWaveform renders signal preview with rulers

The `SBPreviewWaveform` component SHALL render the signal waveform preview with time axis and measurement rulers.

- It SHALL accept props: `draft: AnySignal`, `typeId: SignalTypeId`.
- It SHALL reuse `ClockTrace`, `LineTrace`, and `BusTrace` from `@/components/canvas/WaveformTimeline`.
- For CLOCK signals, it SHALL render period and duty-cycle measurement rulers.
- It SHALL compute appropriate time bounds from the draft signal's properties.
- It SHALL NOT define its own path-generation functions for trace rendering.

#### Scenario: Preview uses WaveformTimeline trace components

- **WHEN** the SBPreviewWaveform source is inspected
- **THEN** it SHALL import from `@/components/canvas/WaveformTimeline`

#### Scenario: Clock preview shows period ruler

- **WHEN** rendered with a clock draft signal
- **THEN** a period measurement ruler/bracket SHALL be visible

### Requirement: SBAppearanceRow provides color and description editing

The `SBAppearanceRow` component SHALL render the signal's visual customization controls.

- It SHALL accept props: `color: string`, `setColor: (c: string) => void`, `description: string`, `setDescription: (d: string) => void`, `signals: AnySignal[]`.
- It SHALL render a `ColorDotPicker` (shared ui) with the standard palette and used-color dimming derived from `signals`.
- It SHALL render a description text input.

#### Scenario: Color picker shows palette with current selection

- **WHEN** rendered with `color="#22d3ee"`
- **THEN** the color picker SHALL show the `#22d3ee` dot as selected

#### Scenario: Used colors from other signals are dimmed

- **WHEN** other signals use colors `#f59e0b` and `#a78bfa`
- **THEN** those dots SHALL appear dimmed in the picker

### Requirement: constants.ts centralizes signal type definitions and helpers

A `constants.ts` file SHALL exist in the signal-builder directory containing all type taxonomy definitions and utility functions.

- It SHALL export `TYPE_DEFS: SBTypeDef[]` with entries for CLOCK, BUS, LINE.
- It SHALL export `TYPE_DEF_BY_ID: Record<SignalTypeId, SBTypeDef>`.
- It SHALL export `SWATCH_SB: Record<SBSwatch, { active: string; icon: string }>`.
- It SHALL export `FREQ_UNITS`, `FREQ_TO_MHZ`, and `bestUnitForMHz`.
- It SHALL export `COLOR_PALETTE: string[]`.
- It SHALL export `defaultTransitions(typeId)` and `directionForState(state, typeId)`.
- It SHALL export the `SBTypeDef`, `SBSwatch`, and `FreqUnit` types.

#### Scenario: TYPE_DEFS contains all three signal types

- **WHEN** `TYPE_DEFS` is imported from constants
- **THEN** it SHALL have exactly 3 entries with ids: CLOCK, BUS, LINE

#### Scenario: bestUnitForMHz returns correct unit for large frequencies

- **WHEN** called with `mhz=2000`
- **THEN** it SHALL return `{ value: 2, unit: "GHz" }`
