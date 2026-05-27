## 1. Types

- [x] 1.1 Create `src/types/ic.ts` with `ICDefinition`, `SignalTemplate`, and `ConstraintTemplate` types
- [x] 1.2 Add `Provenance` type to `src/types/profile.ts`

## 2. IC Data Files

- [x] 2.1 Refactor `src/data/w65c02s-14mhz.ts` to export `W65C02S_14MHz_IC: ICDefinition` alongside the existing `TimingProfile` — signals become `SignalTemplate[]` with `templateId`, constraints become `ConstraintTemplate[]`
- [x] 2.2 Create `src/data/62256-sram.ts` with `HM62256_IC: ICDefinition` — address bus, data bus, OE, WE, CS signals plus tAA, tOE, tWC, tDW constraints

## 3. Seed Update

- [x] 3.1 Update `src/db/seed.ts` to import both IC definitions and seed both into `ic_definitions`
- [x] 3.2 Update the default profile in the seed to combine signals from both ICs with a timing scenario that exercises cross-IC constraints
- [x] 3.3 Run `pnpm db:reset` and verify both ICs and the combined profile are created

## 4. Tests

- [x] 4.1 Create `__tests__/types/ic.test.ts` — validate ICDefinition structure: all constraint templates reference valid signal template IDs, no duplicate templateIds
- [x] 4.2 Create `__tests__/db/seed-ic-library.test.ts` — verify seed inserts 2 ICs and 1 profile, verify idempotency, verify IC data has correct shape
- [x] 4.3 Run `pnpm test` — all tests pass (existing + new)
- [x] 4.4 Run `pnpm lint` — no new errors
- [x] 4.5 Run `pnpm build` — production build compiles cleanly
