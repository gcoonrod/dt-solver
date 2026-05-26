## Context

Phase 1 (`add-sqlite-persistence`) installed a SQLite backend with `ic_definitions` and `profiles` tables using JSON `data` columns. The IC data is currently untyped — `data` contains `{ signals: AnySignal[], constraints: Constraint[] }` which is the same shape the solver consumes at runtime. This works for storage but doesn't model an IC as a catalog entry with metadata, signal templates, or constraint templates.

Phase 4 (`add-profile-builder`) will need to let users browse an IC library, select individual signals, and have relevant constraints follow. That UX requires a typed model where signals and constraints have stable template IDs that survive the import-into-profile operation.

## Goals / Non-Goals

**Goals:**
- Define `ICDefinition`, `SignalTemplate`, and `ConstraintTemplate` types
- Define `Provenance` type for tracking signal/constraint origin in profiles
- Refactor W65C02S seed to use the new types
- Add 62256 SRAM as a second IC to validate multi-IC scenarios
- Update the seed script to populate both ICs and a combined profile

**Non-Goals:**
- UI for browsing the IC library (phase 4)
- Automated constraint-follows-signal import logic (deferred)
- Full datasheet coverage for any IC (start with timing-critical signals only)
- Modifying the solver or store (they continue to consume `AnySignal[]` / `Constraint[]`)

## Decisions

### 1. SignalTemplate extends signal types with templateId and pin metadata

**Choice:** `SignalTemplate` wraps the existing `AnySignal` discriminated union with additional fields: `templateId` (stable identifier within the IC), `pin` (physical pin name/number), and `description`.

```
SignalTemplate = AnySignal & {
  templateId: string;   // e.g., "phi2", "addr-bus"
  pin?: string;         // e.g., "37", "A0-A15"
}
```

**Why:** The `templateId` is the key that connects a signal in a profile back to its IC definition. The signal's `id` field gets a fresh UUID when imported into a profile, but `templateId` stays the same across all profiles that use this IC's signals.

### 2. ConstraintTemplate references signals by templateId, not signal id

**Choice:** `ConstraintTemplate` uses `anchorTemplateId` and `targetTemplateId` instead of `SignalReference.signalId`.

```
ConstraintTemplate = {
  templateId: string;         // e.g., "tADS"
  name: string;
  type: ConstraintType;
  anchorTemplateId: string;   // references a SignalTemplate.templateId
  anchorEdge: EdgeDirection;
  targetTemplateId: string;
  targetEdge: EdgeDirection;
  minNs?: number;
  maxNs?: number;
}
```

**Why:** When signals are imported into a profile, they get new IDs. The constraint template needs to reference the signal template, not the runtime signal — the import logic (phase 4) will resolve template IDs to the profile's actual signal IDs.

### 3. ICDefinition is a flat structure with metadata

**Choice:**
```
ICDefinition = {
  id: string;
  name: string;
  manufacturer: string;
  description: string;
  speedGrades?: string[];
  signals: SignalTemplate[];
  constraints: ConstraintTemplate[];
}
```

**Why:** Flat and simple. Speed grades are optional metadata for display — they don't affect the timing values (those are baked into the signal/constraint parameters for each IC variant). A future iteration could support multiple speed grade variants per IC, but that's overengineering for now.

### 4. Provenance is a simple breadcrumb, not a live link

**Choice:**
```
Provenance = {
  icId: string;
  templateId: string;
  importedAt: string;  // ISO timestamp
} | null
```

Added to profile signals and constraints as an optional field. `null` means ad-hoc (user-created).

**Why:** Snapshot-on-import was decided in the explore session. The provenance is a breadcrumb for future "refresh from library" features, not a live dependency.

### 5. 62256 SRAM as the second IC

**Choice:** Model the HM62256 (or compatible 32Kx8 SRAM) with signals: A[14:0] (address bus), D[7:0] (data bus), OE (output enable), WE (write enable), CS (chip select). Constraints: tAA (address access time), tOE (OE access time), tWC (write cycle time), tDW (data write setup).

**Why:** The 6502 + SRAM is the canonical retro computing timing scenario. It validates multi-IC composition because SRAM constraints reference SRAM signals that need to be correlated with CPU signals in a profile.

## Risks / Trade-offs

- **[Breaking seed data shape]** — The `ic_definitions.data` JSON changes structure. Existing databases need re-seeding. Mitigated: `pnpm db:reset` handles this, and there are no production deployments.
- **[ConstraintTemplate resolution complexity]** — Mapping `anchorTemplateId` to actual `signalId` in a profile happens in phase 4, not here. For now the template IDs are just metadata.
- **[Incomplete IC definitions]** — Neither IC will be a complete datasheet representation. Mitigated: the types support future expansion, and the seed data covers enough signals to exercise the solver meaningfully.
