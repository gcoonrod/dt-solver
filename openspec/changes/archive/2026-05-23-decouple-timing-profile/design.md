## Context

The product is a client-side digital-circuit timing solver. The architecture (see `CLAUDE.md`) is layered: `src/types/` defines contracts → `src/core/` is the pure solver → `src/store/` is the Zustand store → `src/components/` is React + D3 presentation. Today, the `TimingProfile` *contract* — the shape that bundles signals, constraints, and a default viewport into one swappable bundle — lives inside `src/data/w65c02s-14mhz.ts` next to the seed value `W65C02S_14MHz`. That seed is then imported by name in:

- `src/store/useTimingStore.ts` — as the bootstrap state.
- Seven UI test files (page, canvas, four features, two panels) — as the fixture they reset the store to in `beforeEach` and as the source of truth for assertions (e.g. `expect(tMaxNs).toBe(W65C02S_14MHz.defaultWindowNs.tMaxNs)`).
- One logic test (`__tests__/data/w65c02s-14mhz.test.ts`) — as the system under test.

The user's near-term goal is profile switching from the UI (and later, a profile builder). The current shape blocks that on two axes: the *type* lives in a `data/` file, and the *active value* is not a piece of state but a hardcoded import that components can reach around the store.

This is structurally identical to the situation `page.tsx` was in before the recent decomposition (commit `4feb55c`): one symbol referenced from too many places. The pattern that worked there — pull the contract to its proper home, route every read through a single hook — applies here too.

## Goals / Non-Goals

**Goals:**

- Move `TimingProfile` to `src/types/profile.ts` so the contract sits in the types layer (where every other domain contract lives) and can be imported without dragging in a concrete profile.
- Make the *active* profile a piece of store state, not a module-scope constant: `useTimingStore` exposes `activeProfile: TimingProfile` and a transactional `setActiveProfile(profile)` action that swaps signals, constraints, viewport window, and re-solves in one set.
- Introduce a `useTimingProfile()` hook in `src/hooks/` returning `{ activeProfile, setActiveProfile }`. This gives the rest of the app one named seam for reading and changing the active profile.
- Keep `W65C02S_14MHz` as the bootstrap seed; the store seeds itself with it, but nothing else imports it by name.
- Refactor the seven UI tests to consume the active profile through the hook (or build a small inline `TimingProfile` fixture) so that swapping the bootstrap seed later does not silently break them.

**Non-Goals:**

- Building the profile-switcher UI itself, or any profile-builder UI. This change creates the seam; the UI features ride on top in a later change.
- Persisting the active profile to `localStorage`, URL state, or anywhere external. The active profile is in-memory only.
- Filling in the stub files `src/data/6502-profile.ts` and `src/data/62256-profile.ts`. Those become realistic by simply exporting a `TimingProfile` whose type is now reachable, but that work is part of a future change that surfaces the switcher.
- Touching the solver, the constraint/signal types, or any rendering code. `setActiveProfile` just hands fresh `signals`/`constraints` arrays into the existing store machinery.
- Changing the logic-side test `__tests__/data/w65c02s-14mhz.test.ts`. That test asserts properties of the seed itself and SHOULD continue to import `W65C02S_14MHz` directly.

## Decisions

### 1. `TimingProfile` lives in `src/types/profile.ts`

The contract goes to the types layer because that is where every other domain contract (`Signal`, `Constraint`, `TransitionEvent`) lives, and because `src/data/` should *consume* the type, not own it. `src/types/index.ts` gains `export * from "./profile"` so `import type { TimingProfile } from "@/types"` works.

The data file then becomes:

```ts
import type { TimingProfile } from "@/types/profile";
// ... signals + constraints arrays ...
export const W65C02S_14MHz: TimingProfile = { ... };
```

**Alternatives considered:**

- *Keep `TimingProfile` in `src/data/profile.ts`.* Rejected — `src/data/` is for concrete instances, not contracts; the layered architecture in `CLAUDE.md` puts contracts in `src/types/`.
- *Put `TimingProfile` in `src/store/`.* Rejected — the store *uses* the type but should not own it. UI tests that build a fixture without subscribing to the store would have to import from `@/store/`, which inverts the dependency.

### 2. `activeProfile` is a slot on `useTimingStore`, swapped transactionally by `setActiveProfile`

The store already owns the derived state (`signals`, `constraints`, `solved`, `tMinNs`, `tMaxNs`) that a profile defines. Adding `activeProfile: TimingProfile` next to those keeps the bootstrap atomic and gives consumers a single source of truth for "which profile am I looking at" (e.g. the title bar, the profile-switcher menu in a future change).

`setActiveProfile(profile)` does one `set` and one solve:

```ts
setActiveProfile(profile) {
  set({
    activeProfile: profile,
    signals: profile.signals,
    constraints: profile.constraints,
    tMinNs: profile.defaultWindowNs.tMinNs,
    tMaxNs: profile.defaultWindowNs.tMaxNs,
    solved: solve(profile.signals, profile.constraints, Math.max(profile.defaultWindowNs.tMaxNs * 4, 1000)),
  });
}
```

Cursor position, hover/selection state, and per-user UI state are **not** reset, matching how `fitView` only touches viewport bounds.

**Alternatives considered:**

- *Keep the store as-is and only add `activeProfile` as a derived read.* Rejected — without a setter, swapping profiles still requires individually mutating `signals`/`constraints`/`tMinNs`/`tMaxNs`, which is precisely the duplication this change is meant to eliminate.
- *Make `activeProfile` the only source of truth and derive `signals`/`constraints` from it on every read.* Rejected — `addSignal`/`removeSignal`/`addConstraint`/`removeConstraint` exist precisely so the user can edit the active arrays without forking a new profile. Treating `activeProfile` as the only truth would either freeze those actions or require us to mutate `activeProfile.signals` in place (mutating a value imported from `src/data/`).
- *Replace the existing array slots entirely with `activeProfile`.* Rejected for the same reason as above — `addSignal` etc. would need to clone `activeProfile` on every call, which is more disruptive than additive.

The chosen shape (active profile *and* mutable arrays side by side) means: `activeProfile` is the "as-loaded" snapshot you can show in the title bar or restore from; the arrays are the "currently editable" working copy. That mirrors how IDEs separate the file-on-disk from the buffer.

### 3. `useTimingProfile()` is a thin selector hook in `src/hooks/`

```ts
// src/hooks/useTimingProfile.ts
import { useTimingStore } from "@/store/useTimingStore";

export function useTimingProfile() {
  const activeProfile = useTimingStore((s) => s.activeProfile);
  const setActiveProfile = useTimingStore((s) => s.setActiveProfile);
  return { activeProfile, setActiveProfile };
}
```

This matches the existing hook style in `src/hooks/` (`useGlobalShortcuts`, `useVerticalSplit`) and gives feature components a stable import path even if the store internals are reshuffled later. Components that don't need the setter SHOULD call `useTimingStore(s => s.activeProfile)` directly; the hook is for consumers that want both halves.

**Alternatives considered:**

- *Skip the hook and have every consumer select from the store directly.* Rejected — naming the seam (`useTimingProfile`) makes the architectural intent grep-able and lets us later evolve the seam (e.g. add `availableProfiles`) without touching every callsite.
- *Make it a Context provider.* Rejected — Zustand already provides the shared singleton; adding Context on top would be ceremony without benefit.

### 4. Test refactor: hook-first, fixture-second

Each of the seven UI test files currently does:

```ts
import { W65C02S_14MHz } from "@/data/w65c02s-14mhz";
useTimingStore.setState({ /* arrays from W65C02S_14MHz */ });
expect(tMaxNs).toBe(W65C02S_14MHz.defaultWindowNs.tMaxNs);
```

After the refactor, the `beforeEach` resets are unchanged structurally (they still call `useTimingStore.setState` to a known profile), but the *assertions* read from `useTimingStore.getState().activeProfile` rather than the imported constant. The recommended pattern is:

```ts
beforeEach(() => {
  useTimingStore.setState(initialStoreState, false);
});

it("...", () => {
  const profile = useTimingStore.getState().activeProfile;
  expect(tMaxNs).toBe(profile.defaultWindowNs.tMaxNs);
});
```

Tests that need a *different* profile (none today, but `WaveformWorkspace.test.tsx` is a candidate) MAY build a local `TimingProfile` literal and call `useTimingStore.getState().setActiveProfile(localProfile)` in their own `beforeEach`.

**Alternatives considered:**

- *Leave the tests importing `W65C02S_14MHz` directly.* Rejected — it bakes the seed name into seven files, so the next contributor who renames the seed (or adds a second one) breaks them silently. The whole point of this change is to make the active profile the seam.
- *Extract a `makeTestProfile()` helper.* Rejected as premature — tests don't need it yet; the active-profile hook plus the existing reset pattern is enough. We can introduce a helper later if a real second profile in tests demands it.

## Risks / Trade-offs

- **[Risk]** Reading from `useTimingStore.getState().activeProfile` inside test bodies (instead of an imported constant) makes assertions slightly less greppable from outside the test file. → **Mitigation:** the alternative — keeping the direct import — keeps the coupling we're trying to remove. Tests gain a single intentional indirection but no real readability loss; the profile fields used in assertions (`defaultWindowNs`, `signals`, `constraints`) are still spelled out plainly at the callsite.
- **[Risk]** `activeProfile` and the mutable `signals`/`constraints` arrays can drift after `addSignal`/`removeSignal` runs — i.e., `activeProfile.signals !== state.signals` once the user edits. → **Mitigation:** this is the desired semantic (see decision 2 — `activeProfile` is the as-loaded snapshot). We document it on the store type, and `setActiveProfile` is the only path that re-syncs them. The store does **not** mutate `activeProfile.signals` in place.
- **[Risk]** Components that today reach into `W65C02S_14MHz.signals` for one-off lookups (e.g. `ChannelLabels.test.tsx`'s `find(s => s.id === "phi2")`) shift to going through the store, which couples them to the store's reset state. → **Mitigation:** they were already coupled — the test's whole point is that the store is seeded from the canonical profile. After the refactor the dependency is just named explicitly instead of imported around the store.
- **[Trade-off]** This change adds a second slot (`activeProfile`) without removing the existing slots (`signals`, `constraints`, etc.). Strictly, the store grows. The alternative (a single `activeProfile` slot) was rejected in decision 2 because it breaks the per-signal/per-constraint mutation actions. We accept the redundancy as the cost of keeping those actions atomic.

## Migration Plan

This is pre-release; there are no external consumers and no live data to migrate. The full refactor lands in one PR:

1. Add `src/types/profile.ts` and re-export from `src/types/index.ts`. The old `export interface TimingProfile` in `src/data/w65c02s-14mhz.ts` is deleted; the data file now `import type`s it from `@/types/profile`.
2. Extend `useTimingStore` with `activeProfile` + `setActiveProfile`, seeded from `W65C02S_14MHz`. Keep all other slots and actions.
3. Add `src/hooks/useTimingProfile.ts`.
4. Refactor the seven UI tests to read assertions from `useTimingStore.getState().activeProfile` instead of `W65C02S_14MHz`. Drop the `import { W65C02S_14MHz } from "@/data/w65c02s-14mhz"` line in each.
5. Keep `__tests__/data/w65c02s-14mhz.test.ts` untouched.
6. Run `pnpm lint && pnpm test && pnpm build` and verify zero remaining matches for `from "@/data/w65c02s-14mhz"` outside `src/store/useTimingStore.ts`, `src/data/w65c02s-14mhz.ts`, and `__tests__/data/w65c02s-14mhz.test.ts`.

No rollback strategy needed — if the refactor breaks something, revert the PR.

## Open Questions

- Should `setActiveProfile` reset `cursorTimeNs` to the new profile's `defaultWindowNs.tMinNs`, or leave the cursor where the user had it? Current decision: **leave it**, matching `fitView`'s "only touch viewport" precedent. If the cursor ends up outside the new window, that's the user's problem — they can press `f`. Revisit if usability testing of the future switcher says otherwise.
- Should the `activeProfile` field be a deep clone of the input, to insulate the store from outside mutation? Current decision: **no clone**. Profile values are expected to be immutable plain data; cloning hides bugs where someone mutates them and adds nontrivial cost. Revisit if the future profile-builder UI starts editing profiles in place.
