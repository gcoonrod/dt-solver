## Why

The `ic_definitions` table currently stores raw `AnySignal[]` and `Constraint[]` arrays — the same runtime types used by the solver. This works for persistence but provides no structure for treating an IC as a reusable catalog entry with metadata (manufacturer, speed grades, package info), signal templates (pin descriptions, default parameters), or constraint templates (datasheet specifications tied to signal pairs). Without a typed IC model, the phase 4 profile builder has no vocabulary for "pull PHI2 from the W65C02S" — it can only copy untyped JSON blobs.

This change introduces `ICDefinition`, `SignalTemplate`, and `ConstraintTemplate` types that sit between the raw datasheet and the solver's runtime types. It also seeds a second IC (62256 SRAM) to validate that the model works for multi-IC composition scenarios.

## What Changes

- Add `src/types/ic.ts` with `ICDefinition`, `SignalTemplate`, and `ConstraintTemplate` types. These are the typed shape of what lives in the `ic_definitions.data` JSON column.
- Add a `Provenance` type for tracking where signals and constraints in a profile originated.
- Refactor the W65C02S seed data to conform to the new `ICDefinition` shape (signals become `SignalTemplate[]` with `templateId` fields, constraints become `ConstraintTemplate[]` with anchor/target referencing template IDs).
- Add a second IC definition: 62256 SRAM (32K x 8 static RAM) with address bus, data bus, OE, WE, CS signals and relevant timing constraints.
- Update `src/db/seed.ts` to seed both ICs and a default profile that combines signals from both.
- Add unit tests validating the type contracts and seed data integrity.

## Capabilities

### New Capabilities

- `ic-library-model`: Typed IC definition structure with signal templates, constraint templates, speed grades, and provenance tracking for profile composition.

### Modified Capabilities

- `sqlite-persistence`: The `ic_definitions.data` JSON shape changes from `{ signals: AnySignal[], constraints: Constraint[] }` to the new `ICDefinition` structure. The seed script and API responses reflect the new shape.

## Impact

- **Types**: New `src/types/ic.ts` (~80 lines). New `Provenance` type added to `src/types/profile.ts`.
- **Data**: `src/data/w65c02s-14mhz.ts` refactored to export `ICDefinition` alongside the existing `TimingProfile`. New `src/data/62256-sram.ts` with a second IC.
- **Seed**: `src/db/seed.ts` updated to seed both ICs and a combined default profile.
- **API**: No route changes — the existing CRUD routes return whatever is in the `data` column, which will now be the new typed shape.
- **Solver/Store/UI**: Zero changes. The solver still consumes `AnySignal[]` and `Constraint[]` at runtime — the IC library model is a layer above that.
- **Risk**: Low. The `ICDefinition` type is consumed only by the seed and API layer. The solver and UI are unaffected.
