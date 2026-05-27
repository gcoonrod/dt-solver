## Context

The persistence roadmap is 3/4 complete: SQLite backend (phase 1), IC library model with typed definitions (phase 2), and store-to-API persistence with auto-save (phase 3). The ComponentLibrary sidebar currently shows the active profile's signals and lets users add ad-hoc signals. The IC library exists in the database (W65C02S + 62256 SRAM) but has no UI surface.

Key existing code:
- `src/components/panels/ComponentLibrary.tsx` — 250-line sidebar with logo, signal list, add controls
- `src/types/ic.ts` — `ICDefinition`, `SignalTemplate`, `ConstraintTemplate` types
- `src/types/profile.ts` — `Provenance` type already defined
- `GET /api/ics` — returns IC summaries; `GET /api/ics/:id` — returns full IC with signals/constraints
- `src/store/useTimingStore.ts` — `addSignal`, `isDirty` tracking, persistence actions

## Goals / Non-Goals

**Goals:**
- IC library browser in the sidebar showing available ICs with expandable signal lists
- Import individual signals from ICs into the active profile with provenance
- Fresh runtime IDs for imported signals (avoid collisions between IC definitions and profile instances)
- Visual distinction between IC-sourced signals (show provenance badge) and ad-hoc signals in the signal list
- IC library fetched from API on mount, cached in store

**Non-Goals:**
- Automated constraint import when signals are added (deferred)
- IC definition CRUD from the UI (admin use case — use API directly)
- Drag-and-drop signal reordering
- Signal editing (modify imported signal parameters)
- IC search/filter (premature with 2 ICs)

## Decisions

### 1. Two-section sidebar, not a separate panel

**Choice:** Refactor ComponentLibrary into two collapsible sections within the same 300px sidebar: "IC Library" (top) and "Active Signals" (bottom). The logo header stays.

**Why:** Adding a second panel would complicate the page layout. The sidebar already has the signal list; adding the IC browser above it creates a natural workflow: browse ICs → select signals → see them appear in the active list below.

### 2. IC library state lives in the store

**Choice:** Add `icLibrary: ICDefinition[]` and `fetchICLibrary(): Promise<void>` to `useTimingStore`. Fetch on mount via `usePersistence`.

**Why:** The IC library is lightweight (few ICs, each with a handful of signals). Caching in the store avoids re-fetching on every sidebar render. The fetch can piggyback on the existing `usePersistence` mount sequence.

### 3. Import creates a fresh signal with provenance

**Choice:** `importSignalFromIC(icId, templateId, signalTemplate)` generates a new `id` (e.g., `import-${Date.now().toString(36)}`), copies all signal fields from the template, and attaches `provenance: { icId, templateId, importedAt }`. The imported signal is added via `addSignal` (which sets isDirty and triggers auto-save).

**Why:** Fresh IDs prevent collisions when the same IC signal is imported into multiple profiles or imported twice. Provenance is a breadcrumb — the signal is fully self-contained in the profile.

### 4. Provenance on signal, not in a separate map

**Choice:** Add `provenance?: Provenance | null` directly to `BaseSignal` in `src/types/signal.ts`.

**Why:** Keeping provenance on the signal object means it serializes/deserializes with the profile JSON. No separate lookup table needed. The solver ignores fields it doesn't use. The `?` makes it backwards-compatible with existing signals that don't have provenance.

### 5. IC entry is expandable with signal checkboxes

**Choice:** Each IC in the browser renders as a collapsible card. Expanding it shows the signal list with import buttons. Already-imported signals (matched by `icId + templateId` in the active profile) are shown as "imported" with a check icon.

**Why:** Simple interaction model. Users see what's available, what's already imported, and can import one signal at a time. No multi-select or batch import needed for 2 ICs with ~5 signals each.

## Risks / Trade-offs

- **[ComponentLibrary refactor]** — Splitting into two sections changes the existing component. Mitigated: existing tests for ComponentLibrary test the signal list behavior, which moves to the bottom section unchanged.
- **[Duplicate imports]** — Nothing prevents importing the same IC signal twice. Acceptable — the user might want two instances with different parameters. The "already imported" badge is a hint, not a block.
- **[No constraint import]** — Users must manually add constraints after importing signals. This is the explicitly deferred feature from the explore session. The UX is: import signals → open constraint builder → select anchor/target from the now-available signals.
