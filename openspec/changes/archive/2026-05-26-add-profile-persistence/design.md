## Context

The Zustand store (`useTimingStore`) currently initializes from a hardcoded `W65C02S_14MHz` import and never persists. Phase 1 added SQLite + API routes for CRUD; phase 2 added typed IC definitions. The missing link is wiring the store to the API so edits persist and users can manage multiple profiles.

Key constraints:
- The solver re-runs on every mutation (via `resolve()` calls in `addSignal`, `removeSignal`, etc.). Auto-save must not block or interfere with the solve cycle.
- Existing UI tests reset the store via `useTimingStore.setState(initialState, false)` in `beforeEach`. This pattern must continue to work.
- The app is single-user — no conflict resolution needed.

## Goals / Non-Goals

**Goals:**
- Profile survives page refresh (load from API on mount, save on edit)
- Debounced auto-save (2s) with explicit save button
- Profile list, switch, create, delete in the UI
- Dirty indicator showing unsaved changes
- Graceful loading state while profile fetches

**Non-Goals:**
- Undo/redo (future)
- Offline-first / service worker caching
- Real-time collaboration
- Profile export to JSON/SVG (future, low priority)

## Decisions

### 1. Persistence lives in a hook, not in the store

**Choice:** A `usePersistence` hook mounted once in `page.tsx` handles the API calls, debounce timer, and dirty tracking. The store itself gets thin actions (`loadProfile`, `saveProfile`) but no `fetch` calls or timers.

**Why:** Keeps the store pure (synchronous state + solver). Side effects (fetch, timers) live in React lifecycle where they're naturally cleaned up. The hook subscribes to the store via `useTimingStore.subscribe()` to detect mutations.

### 2. Store starts with a loading state, not hardcoded data

**Choice:** The store initializes with `profileId: null`, empty `signals`/`constraints`, and a `isLoading: true` flag. The `usePersistence` hook fetches the profile list and loads the most recent profile on mount.

**Why:** The hardcoded import creates a tight coupling to `W65C02S_14MHz` and means the first render always shows stale data that gets replaced. Starting empty with a loading state is honest about the async dependency.

**Migration:** Existing tests that call `useTimingStore.setState(profile, false)` in `beforeEach` bypass the loading state entirely — they set signals/constraints directly, which is exactly what `loadProfile` does internally.

### 3. Dirty tracking via a generation counter, not deep comparison

**Choice:** The store tracks a `generation` number that increments on every domain mutation (addSignal, removeSignal, addConstraint, removeConstraint). A separate `savedGeneration` records the generation at last save. `isDirty = generation !== savedGeneration`.

**Why:** Deep-comparing signal/constraint arrays on every mutation is expensive and fragile. A counter is O(1) and never produces false negatives. False positives (dirty after a no-op edit) are acceptable — the save is cheap.

### 4. Debounce in the hook, not middleware

**Choice:** `usePersistence` sets up a `subscribe` listener that starts/resets a 2-second `setTimeout` on every state change where `isDirty` becomes true. The explicit save button calls `saveNow()` which clears the timer and writes immediately.

**Why:** Zustand middleware (like `persist`) is designed for localStorage, not API calls. A hook-based debounce is simpler, testable, and doesn't fight the middleware chain.

### 5. Profile bar is a new component, not integrated into existing panels

**Choice:** A `ProfileBar` component renders above the workspace, showing: profile name (editable), dirty dot, save button, profile switcher dropdown, new/delete actions.

**Why:** The profile management concern is orthogonal to the waveform/inspector panels. A dedicated bar keeps it out of the existing component tree and makes it easy to position.

### 6. API shape matches what exists

**Choice:** Use the existing `GET/PUT/POST/DELETE /api/profiles` routes unchanged. The `data` JSON column stores `{ signals, constraints, viewport }`. On save, serialize the current store state into this shape. On load, deserialize and call `setActiveProfile`.

**Why:** No API changes needed — the phase 1 routes are sufficient. The profile's `name` and `description` are stored as top-level columns, not in the JSON blob, which is what the profile bar edits.

## Risks / Trade-offs

- **[Loading flash]** — The app starts empty and loads asynchronously. Users may see a brief empty state. Mitigated: show a loading skeleton/spinner. The fetch is local (SQLite), so latency is typically <50ms.
- **[Auto-save on rapid edits]** — Fast signal/constraint additions could queue many saves. Mitigated: debounce ensures at most one save per 2-second quiet period.
- **[Lost edits on crash]** — If the browser crashes during the debounce window, up to 2 seconds of edits are lost. Acceptable for a single-user local tool.
- **[Store initializer change]** — Starting empty instead of from W65C02S changes the initial render. Mitigated: existing tests set state directly and are unaffected.
