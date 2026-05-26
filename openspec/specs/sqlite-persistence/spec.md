## ADDED Requirements

### Requirement: SQLite database with document-store schema

The application SHALL persist data in a SQLite database using `better-sqlite3`. The schema SHALL use a document-store pattern with JSON `data` columns.

- The database SHALL contain a table `ic_definitions` with columns: `id TEXT PRIMARY KEY`, `name TEXT NOT NULL`, `manufacturer TEXT`, `data TEXT NOT NULL`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`.
- The database SHALL contain a table `profiles` with columns: `id TEXT PRIMARY KEY`, `name TEXT NOT NULL`, `description TEXT`, `data TEXT NOT NULL`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`.
- The `data` column in `ic_definitions` SHALL contain a JSON object with at minimum `signals` (array) and `constraints` (array) fields.
- The `data` column in `profiles` SHALL contain a JSON object with at minimum `signals` (array), `constraints` (array), and `viewport` (object with `tMinNs` and `tMaxNs`) fields.
- Tables SHALL be created with `IF NOT EXISTS` guards so the schema is self-healing on connection open.

#### Scenario: Database tables exist after connection

- **WHEN** `getDb()` is called for the first time
- **THEN** the returned database SHALL contain both `ic_definitions` and `profiles` tables

#### Scenario: Schema is idempotent

- **WHEN** `getDb()` is called multiple times
- **THEN** no error SHALL occur and the tables SHALL not be duplicated or reset

### Requirement: Configurable database file path

The database file location SHALL be configurable via the `DT_SOLVER_DB_PATH` environment variable, defaulting to `./data/dt-solver.db`.

- If the directory for the database file does not exist, it SHALL be created automatically.
- The `data/` directory SHALL be listed in `.gitignore`.

#### Scenario: Default database path

- **WHEN** `DT_SOLVER_DB_PATH` is not set
- **THEN** the database file SHALL be created at `./data/dt-solver.db`

#### Scenario: Custom database path via environment variable

- **WHEN** `DT_SOLVER_DB_PATH` is set to `/tmp/test.db`
- **THEN** the database file SHALL be created at `/tmp/test.db`

### Requirement: Singleton database connection

`src/db/connection.ts` SHALL export a `getDb()` function that returns a cached `better-sqlite3` database instance.

- The first call SHALL open the database and apply the schema.
- Subsequent calls SHALL return the same instance without reopening.

#### Scenario: Connection is reused across calls

- **WHEN** `getDb()` is called twice
- **THEN** both calls SHALL return the same database instance (referential equality)

### Requirement: IC definitions CRUD via API routes

The application SHALL expose REST API routes for managing IC definitions.

- `GET /api/ics` SHALL return a JSON array of IC definition summaries (`id`, `name`, `manufacturer`, `updated_at`).
- `POST /api/ics` SHALL accept a JSON body with `id`, `name`, optional `manufacturer`, and `data`, and SHALL insert a new row. It SHALL return 201 on success.
- `GET /api/ics/[id]` SHALL return the full IC definition row including the `data` JSON. It SHALL return 404 if the ID does not exist.
- `PUT /api/ics/[id]` SHALL update an existing IC definition. It SHALL update the `updated_at` timestamp. It SHALL return 404 if the ID does not exist.
- `DELETE /api/ics/[id]` SHALL delete an IC definition. It SHALL return 404 if the ID does not exist.

#### Scenario: List IC definitions

- **WHEN** a GET request is made to `/api/ics`
- **THEN** the response SHALL be a JSON array
- **AND** each element SHALL contain `id`, `name`, `manufacturer`, and `updated_at`
- **AND** the `data` field SHALL NOT be included in list responses

#### Scenario: Create an IC definition

- **WHEN** a POST request is made to `/api/ics` with a valid JSON body
- **THEN** the response status SHALL be 201
- **AND** the IC definition SHALL be retrievable via `GET /api/ics/[id]`

#### Scenario: Get a non-existent IC definition

- **WHEN** a GET request is made to `/api/ics/nonexistent`
- **THEN** the response status SHALL be 404

### Requirement: Profiles CRUD via API routes

The application SHALL expose REST API routes for managing timing profiles.

- `GET /api/profiles` SHALL return a JSON array of profile summaries (`id`, `name`, `description`, `updated_at`).
- `POST /api/profiles` SHALL accept a JSON body with `id`, `name`, optional `description`, and `data`, and SHALL insert a new row. It SHALL return 201 on success.
- `GET /api/profiles/[id]` SHALL return the full profile row including the `data` JSON. It SHALL return 404 if the ID does not exist.
- `PUT /api/profiles/[id]` SHALL update an existing profile. It SHALL update the `updated_at` timestamp. It SHALL return 404 if the ID does not exist.
- `DELETE /api/profiles/[id]` SHALL delete a profile. It SHALL return 404 if the ID does not exist.

#### Scenario: List profiles

- **WHEN** a GET request is made to `/api/profiles`
- **THEN** the response SHALL be a JSON array
- **AND** each element SHALL contain `id`, `name`, `description`, and `updated_at`
- **AND** the `data` field SHALL NOT be included in list responses

#### Scenario: Create a profile

- **WHEN** a POST request is made to `/api/profiles` with a valid JSON body
- **THEN** the response status SHALL be 201
- **AND** the profile SHALL be retrievable via `GET /api/profiles/[id]`

#### Scenario: Update a profile

- **WHEN** a PUT request is made to `/api/profiles/[id]` with an updated `data` payload
- **THEN** the `updated_at` timestamp SHALL be newer than before the update
- **AND** `GET /api/profiles/[id]` SHALL return the updated data

#### Scenario: Delete a profile

- **WHEN** a DELETE request is made to `/api/profiles/[id]`
- **THEN** a subsequent `GET /api/profiles/[id]` SHALL return 404

### Requirement: Seed script populates database from W65C02S profile

A seed script SHALL exist at `src/db/seed.ts`, executable via `pnpm db:seed`, that populates the database with the W65C02S IC definition and a default timing profile.

- The seed SHALL import the existing `W65C02S_14MHz` data from `src/data/w65c02s-14mhz.ts`.
- The seed SHALL insert one row into `ic_definitions` with the W65C02S signals and constraints.
- The seed SHALL insert one row into `profiles` with the full W65C02S timing profile (signals, constraints, viewport).
- The seed SHALL be idempotent — running it multiple times SHALL NOT create duplicate rows (use INSERT OR REPLACE).
- `pnpm db:reset` SHALL drop all tables and re-run the seed.

#### Scenario: Seed creates IC definition and profile

- **WHEN** `pnpm db:seed` is run against an empty database
- **THEN** `GET /api/ics` SHALL return one IC definition named "W65C02S"
- **AND** `GET /api/profiles` SHALL return one profile

#### Scenario: Seed is idempotent

- **WHEN** `pnpm db:seed` is run twice
- **THEN** `GET /api/ics` SHALL still return exactly one IC definition
- **AND** `GET /api/profiles` SHALL still return exactly one profile

### Requirement: Database module respects the core purity boundary

Nothing in `src/db/` SHALL import from `src/components/`, `src/store/`, or any browser-only module. The database module SHALL only import from `src/types/`, `src/data/`, and Node.js built-in modules.

#### Scenario: Database module has no browser dependencies

- **GIVEN** any file under `src/db/`
- **WHEN** the file is inspected for imports
- **THEN** no import SHALL reference `src/components/`, `src/store/`, `react`, `d3`, or any browser global
