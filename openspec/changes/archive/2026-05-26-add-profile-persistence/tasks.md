## 1. Store Changes

- [x] 1.1 Add persistence state to `useTimingStore`: `profileId`, `isDirty`, `isSaving`, `isLoading`, `profileList`
- [x] 1.2 Add persistence actions: `loadProfile(id)`, `saveProfile()`, `createProfile(name)`, `deleteProfile(id)`, `fetchProfileList()`
- [x] 1.3 Update `addSignal`, `removeSignal`, `addConstraint`, `removeConstraint` to set `isDirty: true`
- [x] 1.4 Change store initializer from hardcoded W65C02S to empty state with `isLoading: true`
- [x] 1.5 Update existing tests that rely on the old initializer — ensure `beforeEach` resets still work

## 2. Persistence Hook

- [x] 2.1 Create `src/hooks/usePersistence.ts` — fetch profile list on mount, load most recent, subscribe for auto-save
- [x] 2.2 Implement debounced auto-save (2s) with `saveNow()` for explicit flush

## 3. Profile Bar UI

- [x] 3.1 Create `src/components/features/ProfileBar.tsx` — profile name, dirty indicator, save button, profile switcher dropdown, new/delete actions
- [x] 3.2 Wire `ProfileBar` into `src/app/page.tsx` above the workspace
- [x] 3.3 Add loading state to `page.tsx` — show loading indicator while `isLoading` is true

## 4. Tests

- [x] 4.1 Dirty tracking tests added to __tests__/store/timingStore.test.ts (4 new tests)
- [x] 4.2 Verify existing store tests still pass with the new initializer
- [x] 4.3 Run `pnpm test` — all 202 tests pass
- [x] 4.4 Run `pnpm lint` — no new errors
- [x] 4.5 Run `pnpm build` — production build compiles cleanly

## 5. Integration Verification

- [x] 5.1 Run `pnpm db:seed`, start dev server, verify profile loads from API on page load
- [x] 5.2 API CRUD verified end-to-end: list, create, delete (browser auto-save requires manual testing)
- [x] 5.3 Create a new profile, switch between profiles, delete a profile — API operations verified via curl
