## ADDED Requirements

### Requirement: ICDefinition type models an IC as a library entry

`src/types/ic.ts` SHALL export an `ICDefinition` interface that represents an IC in the library with metadata, signal templates, and constraint templates.

- `ICDefinition` SHALL contain: `id: string`, `name: string`, `manufacturer: string`, `description: string`, `speedGrades?: string[]`, `signals: SignalTemplate[]`, `constraints: ConstraintTemplate[]`.
- `ICDefinition` SHALL NOT import from `src/components/`, `src/store/`, or any browser module.

#### Scenario: ICDefinition type is importable

- **WHEN** `src/types/ic.ts` is imported
- **THEN** the `ICDefinition` type SHALL be available
- **AND** it SHALL require `id`, `name`, `manufacturer`, `description`, `signals`, and `constraints`

### Requirement: SignalTemplate extends signal types with stable template identity

`src/types/ic.ts` SHALL export a `SignalTemplate` type that extends the existing signal types with a `templateId` for stable cross-reference.

- `SignalTemplate` SHALL be a union of the existing signal shapes (`ClockSignal`, `BusSignal`, `LineSignal`) intersected with `{ templateId: string; pin?: string }`.
- `templateId` SHALL be unique within an `ICDefinition`.
- The `id` field from `BaseSignal` MAY be set to the same value as `templateId` in seed data, but they are semantically distinct (template identity vs runtime instance identity).

#### Scenario: SignalTemplate carries templateId

- **GIVEN** a `SignalTemplate` value
- **WHEN** its fields are inspected
- **THEN** `templateId` SHALL be a non-empty string
- **AND** all fields from the underlying signal type (e.g., `frequencyMHz` for CLOCK) SHALL be present

### Requirement: ConstraintTemplate references signals by templateId

`src/types/ic.ts` SHALL export a `ConstraintTemplate` interface that defines a timing constraint in terms of signal template IDs rather than runtime signal IDs.

- `ConstraintTemplate` SHALL contain: `templateId: string`, `name: string`, `type: ConstraintType`, `anchorTemplateId: string`, `anchorEdge: EdgeDirection`, `targetTemplateId: string`, `targetEdge: EdgeDirection`, optional `minNs?: number`, optional `maxNs?: number`.
- `anchorTemplateId` and `targetTemplateId` SHALL reference `SignalTemplate.templateId` values within the same `ICDefinition`.

#### Scenario: ConstraintTemplate references valid signal templates

- **GIVEN** the W65C02S `ICDefinition`
- **WHEN** each `ConstraintTemplate` is inspected
- **THEN** `anchorTemplateId` SHALL match a `templateId` in the same IC's `signals` array
- **AND** `targetTemplateId` SHALL match a `templateId` in the same IC's `signals` array

### Requirement: Provenance type tracks signal and constraint origin

`src/types/profile.ts` SHALL export a `Provenance` type for tracking where a signal or constraint in a profile originated.

- `Provenance` SHALL contain: `icId: string`, `templateId: string`, `importedAt: string` (ISO 8601 timestamp).
- A `null` provenance SHALL indicate an ad-hoc (user-created) signal or constraint.

#### Scenario: Provenance type is defined

- **WHEN** `src/types/profile.ts` is imported
- **THEN** the `Provenance` type SHALL be available with `icId`, `templateId`, and `importedAt` fields

### Requirement: W65C02S seed data conforms to ICDefinition

The existing W65C02S seed data SHALL be refactored to export an `ICDefinition` alongside the existing `TimingProfile`.

- The `ICDefinition` SHALL have `manufacturer: "WDC"` and include all existing signals as `SignalTemplate[]` with `templateId` fields.
- The `ICDefinition` SHALL include all existing constraints as `ConstraintTemplate[]` with anchor/target referencing template IDs.
- The existing `TimingProfile` export SHALL remain unchanged for backwards compatibility with the solver and store.

#### Scenario: W65C02S exports both ICDefinition and TimingProfile

- **GIVEN** `src/data/w65c02s-14mhz.ts`
- **WHEN** the module is imported
- **THEN** it SHALL export both `W65C02S_14MHz` (TimingProfile) and `W65C02S_14MHz_IC` (ICDefinition)

### Requirement: 62256 SRAM IC definition exists

A second IC definition SHALL exist at `src/data/62256-sram.ts` modeling a 32Kx8 static RAM.

- The IC SHALL include at minimum: address bus (A[14:0]), data bus (D[7:0]), output enable (OE), write enable (WE), and chip select (CS) signals.
- The IC SHALL include at minimum two timing constraints from the SRAM datasheet (e.g., address access time tAA, output enable access time tOE).
- All signals SHALL have `templateId` fields.
- All constraints SHALL reference signal templates by `templateId`.

#### Scenario: 62256 SRAM is a valid ICDefinition

- **GIVEN** `src/data/62256-sram.ts`
- **WHEN** the module is imported
- **THEN** it SHALL export an `ICDefinition` with `manufacturer` set and at least 5 signals and 2 constraints

### Requirement: Seed script populates both ICs

The seed script SHALL insert both the W65C02S and 62256 SRAM IC definitions into the `ic_definitions` table.

- The default profile SHALL combine signals from both ICs into a single timing scenario.
- Running `pnpm db:seed` SHALL insert 2 IC definitions and 1 profile.

#### Scenario: Seed creates two IC definitions

- **WHEN** `pnpm db:seed` is run against an empty database
- **THEN** `GET /api/ics` SHALL return 2 IC definitions
- **AND** one SHALL have name containing "W65C02S"
- **AND** one SHALL have name containing "62256"

#### Scenario: Default profile contains signals from both ICs

- **WHEN** `pnpm db:seed` is run against an empty database
- **THEN** `GET /api/profiles` SHALL return 1 profile
- **AND** the profile's data SHALL contain signals originating from both ICs
