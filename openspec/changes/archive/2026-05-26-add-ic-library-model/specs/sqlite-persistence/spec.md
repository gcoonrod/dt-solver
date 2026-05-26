## MODIFIED Requirements

### Requirement: Seed script populates database from W65C02S profile

A seed script SHALL exist at `src/db/seed.ts`, executable via `pnpm db:seed`, that populates the database with IC definitions and a default timing profile.

- The seed SHALL import IC definitions from `src/data/w65c02s-14mhz.ts` and `src/data/62256-sram.ts`.
- The seed SHALL insert two rows into `ic_definitions`: one for W65C02S and one for 62256 SRAM, using the `ICDefinition` type shape.
- The seed SHALL insert one row into `profiles` with a combined timing profile containing signals from both ICs.
- The seed SHALL be idempotent — running it multiple times SHALL NOT create duplicate rows (use INSERT OR REPLACE).
- `pnpm db:reset` SHALL drop all tables and re-run the seed.

#### Scenario: Seed creates IC definitions and profile

- **WHEN** `pnpm db:seed` is run against an empty database
- **THEN** `GET /api/ics` SHALL return 2 IC definitions
- **AND** `GET /api/profiles` SHALL return one profile

#### Scenario: Seed is idempotent

- **WHEN** `pnpm db:seed` is run twice
- **THEN** `GET /api/ics` SHALL still return exactly 2 IC definitions
- **AND** `GET /api/profiles` SHALL still return exactly one profile
