## Why

`TimingProfile` is currently defined inside `src/data/w65c02s-14mhz.ts`, and the concrete `W65C02S_14MHz` constant is imported directly by the store and by eight UI tests. This is the same coupling that motivated the recent `page.tsx` decomposition: a single seed value is named at every layer, so the app cannot host a second profile, the store cannot expose the "currently active" profile as data, and tests cannot exercise alternate profiles without monkey-patching the seed. The next planned feature — letting the user switch profiles (and later build them) through the UI — requires the active profile to be a piece of state read through a hook, not a module-scope constant referenced by name across the tree.

## What Changes

- Move `TimingProfile` out of `src/data/w65c02s-14mhz.ts` into `src/types/profile.ts` and re-export it from `src/types/index.ts`. The data file imports the type and continues to export `W65C02S_14MHz` (the seed value), but no longer owns the contract.
- Promote the active profile to first-class store state: `useTimingStore` SHALL expose `activeProfile: TimingProfile` and `setActiveProfile(profile: TimingProfile): void`. `setActiveProfile` replaces `signals`, `constraints`, the viewport window, and re-solves — i.e., it is the single transactional way to swap profiles.
- Introduce a `useTimingProfile()` hook in `src/hooks/` returning `{ activeProfile, setActiveProfile }` so feature components consume the profile through one named seam instead of pulling `W65C02S_14MHz` from `@/data/`.
- The store's seed remains `W65C02S_14MHz`, but it is referenced exactly once in `src/store/useTimingStore.ts`. **BREAKING** for tests and components: direct imports of `W65C02S_14MHz` from outside `src/store/` and `src/data/` SHALL be removed. UI tests SHALL read the seed through the hook (after the standard `useTimingStore.setState` reset in `beforeEach`) or construct a deterministic local `TimingProfile` fixture.

## Capabilities

### New Capabilities
- `timing-profile`: The contract for the `TimingProfile` type, the store's `activeProfile` slot and `setActiveProfile` action, and the `useTimingProfile` hook. Defines the single seam through which the rest of the app reads and swaps the active profile, in preparation for UI-driven profile switching.

### Modified Capabilities
- `app-shell-layout`: Extend the tier rules to forbid direct imports of concrete profile constants (`@/data/*-profile` / `@/data/w65c02s-14mhz`) anywhere outside `src/store/useTimingStore.ts` and `src/data/`. Features and UI components SHALL reach the active profile only through `useTimingStore` selectors or `useTimingProfile`.
- `ui-path-tests`: Allow (and require) UI tests to read the active profile via the hook or build a local `TimingProfile` fixture rather than importing `W65C02S_14MHz` by name, so a test never asserts against a moving target when the default seed is later swapped.

## Impact

- **Code**: `src/types/profile.ts` (new), `src/types/index.ts`, `src/data/w65c02s-14mhz.ts`, `src/store/useTimingStore.ts`, `src/hooks/useTimingProfile.ts` (new).
- **Tests**: Eight tests currently import `W65C02S_14MHz` directly — `src/app/page.test.tsx`, `src/components/canvas/WaveformTimeline.test.tsx`, `src/components/features/ChannelLabels.test.tsx`, `src/components/features/WaveformToolbar.test.tsx`, `src/components/features/WaveformWorkspace.test.tsx`, `src/components/panels/ComponentLibrary.test.tsx`, `src/components/panels/ConstraintInspector.test.tsx`, and the logic-side `__tests__/data/w65c02s-14mhz.test.ts`. The logic-side test stays as-is (it tests the seed itself); the seven UI tests are refactored to use the hook or a local fixture.
- **APIs**: No public API surface; everything is internal to the app bundle.
- **Dependencies**: None added or removed.
- **Backwards compatibility**: This is pre-release; no shim is needed. Old `import { TimingProfile } from "@/data/w65c02s-14mhz"` callsites are rewritten in the same PR.
