# profile-builder Specification

## Purpose

The contract for compositional profile building from the IC library. Covers store-level IC library caching and fetch lifecycle, signal import with snapshot-on-import semantics and provenance tracking (fresh runtime IDs, `Provenance` breadcrumb), the `BaseSignal` provenance field, the IC Library Browser UI section in the sidebar, and the provenance badge on active signals.

## Requirements

### Requirement: Store caches IC library from API

`useTimingStore` SHALL expose state and an action for the IC library.

- The store SHALL contain `icLibrary: ICDefinition[]` initialized to an empty array.
- The store SHALL expose `fetchICLibrary(): Promise<void>` that fetches all IC definitions from `GET /api/ics/:id` for each IC in the list and stores the full definitions.
- `fetchICLibrary` SHALL be called during the `usePersistence` mount sequence.

#### Scenario: IC library is populated on mount

- **WHEN** the app loads and `usePersistence` completes initialization
- **THEN** `icLibrary` SHALL contain at least the seeded IC definitions (W65C02S, HM62256)

### Requirement: Import signal from IC with provenance

The store SHALL expose an `importSignalFromIC` action that copies a signal template from an IC definition into the active profile with provenance tracking.

- `importSignalFromIC(icId: string, templateId: string, signal: SignalTemplate)` SHALL generate a fresh `id` for the signal to avoid collisions.
- The imported signal SHALL include `provenance: { icId, templateId, importedAt }` where `importedAt` is the current ISO timestamp.
- The signal SHALL be added to the profile via `addSignal` (triggering `isDirty` and auto-save).
- All other signal fields (type, name, color, parameters) SHALL be copied from the template unchanged.

#### Scenario: Importing a signal from W65C02S

- **GIVEN** the W65C02S IC is in the library
- **WHEN** `importSignalFromIC("w65c02s-14mhz", "phi2", phi2Template)` is called
- **THEN** a new signal SHALL appear in `signals` with a fresh `id` (not "phi2")
- **AND** the signal's `provenance.icId` SHALL equal "w65c02s-14mhz"
- **AND** the signal's `provenance.templateId` SHALL equal "phi2"
- **AND** `isDirty` SHALL be `true`

### Requirement: BaseSignal supports optional provenance field

`BaseSignal` in `src/types/signal.ts` SHALL include an optional `provenance` field.

- `provenance` SHALL be typed as `Provenance | null` and SHALL be optional (undefined for legacy signals).
- The solver SHALL ignore the `provenance` field — it has no effect on timing calculations.

#### Scenario: Existing signals without provenance continue to work

- **GIVEN** a signal without a `provenance` field
- **WHEN** the solver evaluates it
- **THEN** it SHALL produce the same results as before (no regression)

### Requirement: IC Library Browser section in sidebar

The ComponentLibrary sidebar SHALL include an "IC Library" section above the "Active Signals" section.

- The IC Library section SHALL display each IC from `icLibrary` as a collapsible entry showing the IC name, manufacturer, and signal count.
- Expanding an IC entry SHALL show its signal templates with import buttons.
- Signals already imported into the active profile (matched by `icId + templateId` in any signal's provenance) SHALL be visually distinguished (e.g., check icon, dimmed import button).
- Clicking the import button SHALL call `importSignalFromIC` for that signal.

#### Scenario: IC entry shows signal list when expanded

- **WHEN** the user expands the W65C02S entry in the IC library
- **THEN** the entry SHALL list all signal templates (PHI2, ADDR, R/W, DATA, CS)
- **AND** each signal SHALL have an import button

#### Scenario: Already-imported signal shows visual indicator

- **GIVEN** PHI2 from W65C02S is already in the active profile (with matching provenance)
- **WHEN** the IC library is displayed
- **THEN** the PHI2 row SHALL show a visual indicator that it is already imported

### Requirement: Active Signals section shows provenance badge

In the "Active Signals" section of the sidebar, signals with provenance SHALL display a badge or label indicating their IC origin.

- The badge SHALL show the IC name (e.g., "W65C02S") to distinguish IC-sourced signals from ad-hoc signals.
- Ad-hoc signals (null or undefined provenance) SHALL NOT show a badge.

#### Scenario: Imported signal shows IC origin badge

- **GIVEN** a signal imported from the W65C02S IC
- **WHEN** it appears in the Active Signals list
- **THEN** it SHALL display a badge or label indicating "W65C02S" origin
