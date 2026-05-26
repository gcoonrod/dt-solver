## Why

The solver currently labels every constraint as `PASS`, `FAIL`, or
`UNRESOLVED` (see `src/types/constraint.ts` and the `Status` discriminator
in `src/core/solver.ts`). In practice, our W65C02S demo profile has
several rules whose calculated margin sits within ~1 ns of the bound —
they pass today but are one process corner away from failing tomorrow.
The status pill renders them indistinguishably from a rule with 30 ns of
slack, so the inspector view is misleading about which constraints
deserve attention.

This is the first case where we need to extend the **design system**'s
status palette, not just add a feature. The current `recipe.status-pill`
allows three hues (`emerald` / `rose` / `amber`) and the `tokens.md`
spec is explicit that those are exhaustive (§ 5.1). Adding a fourth
status without going through the design-system capability would
silently invalidate the rule and create the exact "drift" the system
exists to prevent.

## What Changes

Two coupled deltas, intentionally separated so the design-system
change can be reviewed independently of the feature.

### 1. `design-system` capability — new status

- Add `color.status.warning` (hue `yellow`, dot `#facc15`) to
  `docs/design-system/tokens.md` § 1.4 and to
  `src/design/tokens.ts` / `tokens.css`.
- Modify the `recipe.status-pill` requirement to permit the new hue.
- Modify the `recipe.tabular-cell` requirement so the `Calculated`
  column tints `text-yellow-300` when the row's status is `WARNING`.
- Bump the `tokens.md` changelog to 0.2.0.

### 2. `solver-status` capability — new tier

- Extend the `Status` discriminated union in `src/types/constraint.ts`
  from `'PASS' | 'FAIL' | 'UNRESOLVED'` to add `'WARNING'`.
- Extend `evaluateConstraint` in `src/core/solver.ts`: when the
  computed slack is positive but less than `warningThresholdNs` (a new
  configurable constant defaulting to 1 ns), emit `'WARNING'` instead
  of `'PASS'`. The threshold is exposed on the constraint type so
  per-rule overrides remain possible.
- Update `ConstraintInspector`'s aggregate counter strip to include a
  warning count between pass and fail.
- Update the inspector row, builder status pill, and footer aggregate
  to render `WARNING` via the same `recipe.status-pill` mechanism with
  the new hue.

## Capabilities

### Modified Capabilities

- `design-system` — adds `color.status.warning`; modifies the
  `recipe.status-pill` enumeration and `recipe.tabular-cell` tinting
  rule.
- `solver-status` — extends `Status` and `evaluateConstraint`. (If this
  capability does not yet exist as a standalone spec, it is created as
  part of this change.)

### New Capabilities

<!-- none -->

## Impact

- **Code**: New literal `WARNING` in the `Status` union; new branch in
  `evaluateConstraint`; new `warningThresholdNs` const exported from
  `solver.ts`. New row in `tokens.ts` (`color.status.warning`) and
  `tokens.css`. UI updates limited to `ConstraintInspector.tsx` and
  `ConstraintBuilder.tsx`.
- **Tests**: New solver unit test covering the three slack regions
  (≥ threshold → PASS; 0 < slack < threshold → WARNING; slack < 0 →
  FAIL). New UI test asserting the inspector renders the yellow pill
  for a WARNING row. Existing PASS/FAIL/UNRESOLVED tests are
  unaffected.
- **APIs**: `Status` union widens (additive). Any consumer that
  exhaustively switches on `Status` MUST add a `WARNING` arm —
  TypeScript will flag this at build time. No runtime breakage for
  non-exhaustive consumers.
- **Tokens**: Adds one token. Modifies one recipe enumeration. No
  existing token's value changes. `tokens.md` bumps 0.1.0 → 0.2.0.
- **Risk**: Low. The new tier only fires on rules previously labeled
  PASS, so no rule loses pass-status because of this change; a
  yellow row was previously a green row. The threshold default (1 ns)
  is conservative for the W65C02S demo (no current rule sits between
  0 and 1 ns of slack), so the demo scene is unchanged on landing.

## Out of scope

- Per-profile threshold overrides via the UI. The threshold lives in
  the constraint type for now; a future change can add a `Threshold`
  panel in the inspector.
- Warning-only "what-if" view that lists every rule below `5 × threshold`
  ns of slack. Tempting, but not the system's job — the inspector
  table with a sort-by-slack column does this fine.
