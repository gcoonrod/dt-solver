## ADDED Requirements

### Requirement: Store tracks persistence state

`useTimingStore` SHALL expose persistence-related state and actions for profile lifecycle management.

- The store SHALL contain `profileId: string | null` (the ID of the currently loaded profile).
- The store SHALL contain `isDirty: boolean` indicating unsaved changes exist.
- The store SHALL contain `isSaving: boolean` indicating a save is in progress.
- The store SHALL contain `isLoading: boolean` indicating a profile is being fetched.
- The store SHALL contain `profileList: { id: string; name: string; updated_at: string }[]` for the profile switcher.
- The store SHALL expose `loadProfile(id: string): Promise<void>` that fetches a profile from the API and calls `setActiveProfile`.
- The store SHALL expose `saveProfile(): Promise<void>` that PUTs the current signals/constraints/viewport to the API.
- The store SHALL expose `createProfile(name: string): Promise<string>` that POSTs a new profile and returns its ID.
- The store SHALL expose `deleteProfile(id: string): Promise<void>` that DELETEs a profile.
- The store SHALL expose `fetchProfileList(): Promise<void>` that GETs the profile list.

#### Scenario: Store initializes with no profile loaded

- **WHEN** the store is created
- **THEN** `profileId` SHALL be `null`
- **AND** `isLoading` SHALL be `true`
- **AND** `isDirty` SHALL be `false`

#### Scenario: loadProfile populates the store

- **WHEN** `loadProfile("w65c02s-62256-demo")` is called
- **THEN** `profileId` SHALL equal `"w65c02s-62256-demo"`
- **AND** `signals` SHALL contain the profile's signals
- **AND** `isLoading` SHALL be `false`

### Requirement: Domain mutations mark the store as dirty

Every action that modifies `signals` or `constraints` SHALL set `isDirty` to `true`.

- `addSignal`, `removeSignal`, `addConstraint`, `removeConstraint` SHALL each set `isDirty` to `true` after their state update.
- `loadProfile` and `saveProfile` SHALL set `isDirty` to `false`.

#### Scenario: Adding a signal marks dirty

- **GIVEN** a loaded profile with `isDirty === false`
- **WHEN** `addSignal(...)` is called
- **THEN** `isDirty` SHALL be `true`

#### Scenario: Saving clears dirty

- **GIVEN** a dirty store
- **WHEN** `saveProfile()` completes
- **THEN** `isDirty` SHALL be `false`

### Requirement: usePersistence hook manages auto-save lifecycle

A `usePersistence` hook SHALL exist at `src/hooks/usePersistence.ts` that wires the store to the API with debounced auto-save.

- The hook SHALL fetch the profile list on mount and load the most recently updated profile.
- The hook SHALL subscribe to store changes and trigger a save 2 seconds after the last mutation that sets `isDirty`.
- The hook SHALL expose a `saveNow()` function that cancels any pending debounce and saves immediately.
- The hook SHALL clean up its subscription and timers on unmount.

#### Scenario: Auto-save fires after 2 seconds of inactivity

- **GIVEN** a loaded profile
- **WHEN** `addSignal(...)` is called and 2 seconds pass with no further mutations
- **THEN** `saveProfile()` SHALL have been called exactly once

#### Scenario: Rapid mutations debounce to a single save

- **GIVEN** a loaded profile
- **WHEN** `addSignal(...)` is called 5 times within 1 second
- **THEN** after the debounce period, `saveProfile()` SHALL have been called exactly once

#### Scenario: saveNow flushes immediately

- **GIVEN** a dirty store with a pending debounce
- **WHEN** `saveNow()` is called
- **THEN** `saveProfile()` SHALL be called immediately
- **AND** the debounce timer SHALL be cancelled

### Requirement: Profile bar UI displays profile state and controls

A `ProfileBar` component SHALL exist in `src/components/features/` that renders profile management controls.

- The bar SHALL display the current profile name.
- The bar SHALL show a dirty indicator (dot or icon) when `isDirty` is true.
- The bar SHALL include a save button that calls `saveNow()`.
- The bar SHALL include a profile switcher (dropdown or menu) showing all profiles from `profileList`.
- The bar SHALL include a "New Profile" action that calls `createProfile`.
- The bar SHALL include a "Delete" action that calls `deleteProfile` (with confirmation).
- Switching profiles SHALL call `loadProfile(id)`.
- The save button SHALL be disabled when `isDirty` is false or `isSaving` is true.

#### Scenario: Save button reflects dirty state

- **WHEN** the store is not dirty
- **THEN** the save button SHALL be disabled

#### Scenario: Profile switcher lists all profiles

- **WHEN** the profile bar is rendered with a `profileList` of 3 items
- **THEN** the switcher SHALL display 3 selectable profile entries

### Requirement: App shows loading state while profile fetches

The page SHALL display a loading indicator while `isLoading` is true, rather than rendering an empty workspace.

#### Scenario: Loading state on initial render

- **WHEN** the app first renders before any profile is loaded
- **THEN** a loading indicator SHALL be visible
- **AND** the waveform workspace SHALL NOT render with empty data
