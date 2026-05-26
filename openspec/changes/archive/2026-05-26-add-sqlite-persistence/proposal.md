## Why

dt-solver is an in-memory demo — every edit is lost on page refresh. There is no persistence layer, no database, and the only IC profile (W65C02S) is hardcoded in TypeScript. Before the app can support a user-curated IC library, composable timing profiles, or session continuity, it needs a storage backend. SQLite is the right fit: single-file, zero external dependencies, embeddable in both Next.js (via `better-sqlite3`) and a future Electron wrapper.

This change is phase 1 of a 4-phase roadmap (`add-sqlite-persistence` → `add-ic-library-model` → `add-profile-persistence` → `add-profile-builder`). It installs the database infrastructure and CRUD API without touching the existing UI or Zustand store — those integrations come in phases 2–3.

## What Changes

- Add `better-sqlite3` (and `@types/better-sqlite3`) as dependencies.
- Create a `src/db/` module with:
  - `schema.sql` — two-table document store (`ic_definitions`, `profiles`) with JSON `data` columns.
  - `connection.ts` — singleton that opens/creates `dt-solver.db` at a configurable path (env var `DT_SOLVER_DB_PATH`, defaulting to `./data/dt-solver.db`).
  - `seed.ts` — transforms the existing `W65C02S_14MHz` TypeScript profile into the `ic_definitions` + `profiles` table format and inserts it. Invokable via `pnpm db:seed`.
- Add Next.js API routes:
  - `GET/POST /api/ics` — list / create IC definitions.
  - `GET/PUT/DELETE /api/ics/[id]` — read / update / delete a single IC.
  - `GET/POST /api/profiles` — list / create profiles.
  - `GET/PUT/DELETE /api/profiles/[id]` — read / update / delete a single profile.
- Add npm scripts: `pnpm db:seed` (run seed), `pnpm db:reset` (drop + recreate + seed).
- Add `data/` to `.gitignore` (the database file is local state, not source).
- Validate with integration tests against an in-memory SQLite instance.

## Capabilities

### New Capabilities

- `sqlite-persistence`: Database schema, connection management, seed infrastructure, and CRUD API routes for IC definitions and timing profiles.

### Modified Capabilities

<!-- none — this change adds infrastructure without modifying existing UI or solver behavior -->

## Impact

- **Code**: New `src/db/` module (~4 files), new `src/app/api/` route handlers (~6 route files). Zero changes to existing `src/core/`, `src/store/`, or `src/components/`.
- **Dependencies**: `better-sqlite3` (native addon, ~2 MB) + `@types/better-sqlite3`. Requires Node.js native compilation support — already satisfied by the Node 24 + pnpm setup.
- **Scripts**: New `db:seed` and `db:reset` in `package.json`.
- **CI**: The `.db` file is ephemeral; tests use `:memory:` SQLite. CI needs no database service. `better-sqlite3` compiles from source in CI (no prebuilt binaries needed for Linux + Node 24).
- **Risk**: Low. This is additive infrastructure — no existing behavior changes. The native addon compilation is the only integration risk; `better-sqlite3` is one of the most widely used native Node modules.
