## Context

dt-solver currently stores all state in a Zustand store initialized from a hardcoded TypeScript module (`src/data/w65c02s-14mhz.ts`). There is no persistence — edits vanish on refresh. The app needs a lightweight storage backend that works in Next.js today and in Electron later. This change introduces SQLite via `better-sqlite3`, a document-store schema, Next.js API routes for CRUD, and a seed script.

Existing relevant code:
- `src/types/profile.ts` — `TimingProfile { id, name, description, signals: AnySignal[], constraints: Constraint[], defaultWindowNs }`
- `src/types/signal.ts` — `AnySignal = ClockSignal | BusSignal | LineSignal`
- `src/types/constraint.ts` — `Constraint` with 5 types, margin, status
- `src/data/w65c02s-14mhz.ts` — fully-defined profile used as bootstrap data
- `src/store/useTimingStore.ts` — Zustand store that imports W65C02S and solves on init

No `src/app/api/` directory exists yet. Next.js 16 API routes use the App Router pattern (`src/app/api/<path>/route.ts`).

## Goals / Non-Goals

**Goals:**
- Persist IC definitions and timing profiles in a local SQLite database
- Expose CRUD operations via Next.js API routes
- Provide `pnpm db:seed` to populate the database from the existing W65C02S profile
- Keep the database portable (single file, no external services)
- Design for future Electron compatibility (no server-only assumptions beyond API routes)

**Non-Goals:**
- Wiring the Zustand store to the API (phase 3: `add-profile-persistence`)
- UI for browsing/creating profiles (phase 3-4)
- IC library browsing UI (phase 4: `add-profile-builder`)
- Auto-save / debounced persistence (phase 3)
- Multi-user, auth, or remote database support

## Decisions

### 1. better-sqlite3 over alternatives

**Choice:** `better-sqlite3` as the SQLite driver.

**Alternatives considered:**
- `sql.js` (Emscripten-compiled, runs in browser) — good for pure client-side, but we need server-side API routes and it is slower for writes.
- `drizzle-orm` + `better-sqlite3` — ORM overhead is not justified for a document store with two tables and no joins.
- `prisma` — heavy, generates client, schema-migration system is overkill for JSON blobs.

**Why:** `better-sqlite3` is synchronous (no async ceremony for simple reads), the most widely used native SQLite binding for Node, and works identically in Next.js server and Electron main process.

### 2. Document store schema (JSON blobs) over relational tables

**Choice:** Two tables, each with an `id`, metadata columns, and a `data TEXT` column holding the full JSON payload.

**Why:** The domain types (`AnySignal`, `Constraint`) are discriminated unions that evolve rapidly (DATA to BUS/LINE happened recently). Relational tables would require schema migrations on every type change. JSON blobs let the TypeScript types be the schema — `JSON.parse(row.data)` produces the exact object the solver consumes. SQLite json_extract is available if structured queries are ever needed.

### 3. Database file location

**Choice:** Default to `./data/dt-solver.db` (project root, git-ignored). Override via `DT_SOLVER_DB_PATH` environment variable.

**Why:** `./data/` is conventional for local dev data. The env var enables Electron to point at `app.getPath('userData')` without code changes. The directory is created on first access if it does not exist.

### 4. Connection as a singleton module

**Choice:** `src/db/connection.ts` exports a `getDb()` function that lazily opens the database on first call and returns the cached instance thereafter. The schema is applied via `db.exec(schema)` on open using `IF NOT EXISTS` guards.

**Why:** `better-sqlite3` connections are lightweight and long-lived. A singleton avoids repeated file opens across API route invocations. The `IF NOT EXISTS` pattern means the schema is self-healing — no separate migration step.

### 5. Seed script as a standalone entry point

**Choice:** `src/db/seed.ts` is a script runnable via `pnpm db:seed` (using `tsx` to execute TypeScript directly). It imports the W65C02S data, splits it into an IC definition row and a profile row, and inserts/upserts into the database.

**Why:** Decoupling seed from app startup means the database can be populated independently. `tsx` is already available in the dev dependency chain (Next.js uses it internally), so no new dependency is needed. The seed is idempotent (upsert pattern).

### 6. API route structure

**Choice:** Next.js App Router convention with routes at `src/app/api/ics/route.ts`, `src/app/api/ics/[id]/route.ts`, `src/app/api/profiles/route.ts`, and `src/app/api/profiles/[id]/route.ts`.

**Why:** Standard REST layout. Each route handler is thin — validate input, call into `src/db/` functions, return JSON. No business logic in routes.

### 7. Input validation at API boundary

**Choice:** Validate incoming JSON at the API route level using runtime checks (type guards). No schema validation library for now.

**Why:** Adding Zod or similar for two endpoints is premature. TypeScript types plus basic runtime checks (is `data` present? is `name` a non-empty string?) are sufficient for a single-user app. Can add Zod later if the API surface grows.

## Risks / Trade-offs

- **[Native addon compilation]** — `better-sqlite3` requires native compilation. Mitigated: it is one of the most battle-tested native modules, CI uses Node 24 on Linux which compiles cleanly, and pnpm handles the build automatically.
- **[JSON blob size]** — A profile with many signals/constraints could produce large JSON. Mitigated: even a 50-signal profile with 100 constraints would be roughly 50 KB of JSON — well within SQLite comfort zone.
- **[No migrations framework]** — Schema changes require manual ALTER TABLE or recreate. Mitigated: two-table document store is unlikely to need schema changes since the JSON payload absorbs type evolution.
- **[Sync between W65C02S source file and seed]** — The TypeScript module remains the source of truth; the seed transforms it into database rows. If the source changes, re-running `pnpm db:seed` updates the database. No automatic sync.
