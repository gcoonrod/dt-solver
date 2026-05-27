## Why

Every edit in dt-solver vanishes on page refresh. The SQLite backend and API routes exist (phase 1), and the IC library model is in place (phase 2), but the Zustand store still bootstraps from a hardcoded TypeScript import and never writes back. Users cannot create, switch between, or save timing profiles. This change wires the store to the persistence layer so sessions survive reloads and users can manage multiple profiles.

## What Changes

- Add persistence-aware state to `useTimingStore`: `profileId`, `isDirty`, `isSaving`, `profileList`.
- Add store actions: `loadProfile(id)`, `saveProfile()`, `createProfile(name)`, `deleteProfile(id)`, `fetchProfileList()`.
- Add a `usePersistence` hook that:
  - Fetches the profile list on mount and loads the most recently updated profile.
  - Subscribes to domain mutations (signals, constraints) and sets `isDirty`.
  - Debounces auto-save (2 seconds after last mutation).
  - Exposes `saveNow()` for the explicit save button (cancels debounce, writes immediately).
- Add a profile management bar to the page UI: profile name display, dirty indicator, save button, profile switcher dropdown, new/delete actions.
- Remove the hardcoded `W65C02S_14MHz` import from the store initializer — the store starts empty and loads from the API.

## Capabilities

### New Capabilities

- `profile-persistence`: Store-to-API wiring with auto-save, profile CRUD lifecycle, and profile management UI.

### Modified Capabilities

<!-- none — the sqlite-persistence API routes are consumed as-is -->

## Impact

- **Store**: `useTimingStore` gains ~6 new state fields and ~5 new actions. The initializer changes from hardcoded profile to empty state pending API load.
- **Hooks**: New `src/hooks/usePersistence.ts` (~60 lines).
- **UI**: New profile bar component in the page layout. Existing components are unaffected — they read from the same `signals`/`constraints`/`solved` state.
- **Data flow**: On load: `fetchProfileList()` → `loadProfile(id)` → `setActiveProfile()` → solver runs. On edit: mutation → `isDirty = true` → debounce timer → `saveProfile()` → `PUT /api/profiles/:id` → `isDirty = false`.
- **Risk**: Medium. The store initializer change is the riskiest part — the app must handle the "no profile loaded yet" state gracefully. All existing tests that call `useTimingStore.setState(...)` in `beforeEach` will continue to work because they set state directly.
