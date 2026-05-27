## 1. Dependencies and Configuration

- [x] 1.1 Install `better-sqlite3` and `@types/better-sqlite3` via pnpm
- [x] 1.2 Install `tsx` as a dev dependency (for running seed script directly)
- [x] 1.3 Add `data/` to `.gitignore`
- [x] 1.4 Add npm scripts to `package.json`: `db:seed` (`tsx src/db/seed.ts`) and `db:reset` (`tsx src/db/reset.ts`)
- [x] 1.5 Verify `pnpm build` still compiles (better-sqlite3 is server-only, must not break client bundle)

## 2. Database Module

- [x] 2.1 Create `src/db/schema.sql` with `ic_definitions` and `profiles` table DDL (IF NOT EXISTS)
- [x] 2.2 Create `src/db/connection.ts` — singleton `getDb()` that opens the database at `DT_SOLVER_DB_PATH` (default `./data/dt-solver.db`), creates the directory if needed, and applies the schema on first open
- [x] 2.3 Create `src/db/ics.ts` — data access functions: `listIcs()`, `getIc(id)`, `createIc(row)`, `updateIc(id, row)`, `deleteIc(id)`
- [x] 2.4 Create `src/db/profiles.ts` — data access functions: `listProfiles()`, `getProfile(id)`, `createProfile(row)`, `updateProfile(id, row)`, `deleteProfile(id)`

## 3. Seed and Reset Scripts

- [x] 3.1 Create `src/db/seed.ts` — imports W65C02S data, inserts IC definition + default profile using INSERT OR REPLACE
- [x] 3.2 Create `src/db/reset.ts` — drops both tables, re-applies schema, then runs seed logic
- [x] 3.3 Run `pnpm db:seed` and verify database file is created with expected rows

## 4. API Routes

- [x] 4.1 Create `src/app/api/ics/route.ts` — GET (list) and POST (create) handlers
- [x] 4.2 Create `src/app/api/ics/[id]/route.ts` — GET, PUT, DELETE handlers
- [x] 4.3 Create `src/app/api/profiles/route.ts` — GET (list) and POST (create) handlers
- [x] 4.4 Create `src/app/api/profiles/[id]/route.ts` — GET, PUT, DELETE handlers

## 5. Tests

- [x] 5.1 Create `__tests__/db/connection.test.ts` — test getDb() singleton behavior, schema creation, and in-memory database support
- [x] 5.2 Create `__tests__/db/ics.test.ts` — test CRUD operations for IC definitions against in-memory SQLite
- [x] 5.3 Create `__tests__/db/profiles.test.ts` — test CRUD operations for profiles against in-memory SQLite
- [x] 5.4 Create `__tests__/db/seed.test.ts` — test seed idempotency and data integrity

## 6. Verification

- [x] 6.1 Run `pnpm test` — all tests pass (existing + new)
- [x] 6.2 Run `pnpm lint` — no new errors
- [x] 6.3 Run `pnpm build` — production build compiles cleanly
- [x] 6.4 Run `pnpm db:seed` then manually curl API routes to verify end-to-end: list, get, create, update, delete for both ICs and profiles
