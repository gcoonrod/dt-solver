## Why

Users can now create, save, and switch between timing profiles (phase 3), but there's no way to compose a profile from the IC library. The ComponentLibrary sidebar only shows signals already in the active profile and lets users add ad-hoc signals via the signal builder. There's no way to browse the IC catalog, preview an IC's signals and constraints, or pull selected signals into the profile with provenance tracking.

This is the final phase of the persistence roadmap: a profile builder UI that lets users compose timing scenarios from reusable IC definitions plus ad-hoc signals.

## What Changes

- Add an **IC Library Browser** panel that fetches IC definitions from `/api/ics`, displays them as expandable entries with signal lists, and lets users select individual signals to import.
- When a signal is imported from an IC, it is **snapshot-copied** into the profile with a `provenance` breadcrumb (`{ icId, templateId, importedAt }`). The signal gets a fresh runtime `id` while preserving its parameters.
- Refactor `ComponentLibrary` into two sections: "IC Library" (browse + import) at the top and "Active Signals" (the existing signal list) at the bottom.
- Add a store action `importSignalFromIC(icId, templateId, signal)` that adds the signal with provenance to the active profile.
- Constraint import is **manual** — users add constraints via the existing constraint builder after importing signals. Automated constraint-follows-signal is deferred.

## Capabilities

### New Capabilities

- `profile-builder`: IC library browser, signal import with provenance, compositional profile building UI.

### Modified Capabilities

<!-- none — existing signal/constraint builders and persistence are consumed as-is -->

## Impact

- **UI**: `ComponentLibrary` refactored into two sections. New IC library panel components in `src/components/panels/`. Existing signal builder and constraint builder are unmodified.
- **Store**: New `importSignalFromIC` action. New `icLibrary: ICDefinition[]` state field. New `fetchICLibrary()` action.
- **Types**: `AnySignal` gains an optional `provenance: Provenance | null` field for signals imported from the IC library.
- **API**: Consumes existing `GET /api/ics` and `GET /api/ics/:id` — no new routes.
- **Risk**: Medium. The ComponentLibrary refactor touches existing UI layout. The provenance field on signals is additive — the solver ignores it.
