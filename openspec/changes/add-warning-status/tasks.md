## 1. `design-system` — add `color.status.warning`

- [ ] 1.1 Edit `docs/design-system/tokens.md` § 1.4: add a row for
  `color.status.warning` with hue `yellow`, classes
  `bg-yellow-500/10` / `border-yellow-500/30` / `text-yellow-300`, and
  dot hex `#facc15`.
- [ ] 1.2 Add an entry to the `tokens.md` changelog at the bottom:
  `0.2.0 · YYYY-MM-DD · adds color.status.warning, extends recipe.status-pill hues.`
- [ ] 1.3 Edit `src/design/tokens.ts`: add a `warning` entry under
  `color.status` matching the markdown row.
- [ ] 1.4 Edit `src/design/tokens.css`: add `--color-status-warning-dot: #facc15;`
  under the `1.4 — status` block.
- [ ] 1.5 Edit the HTML catalog `docs/design-system/index.html` § 02.4 to
  include a 4-up grid instead of 3-up, with the new yellow status card
  matching the visual spec of the existing three.
- [ ] 1.6 Run `pnpm build` and confirm no errors. `StatusKey`
  consumers will need updating in step 2 but `tokens.ts` itself is
  self-contained.

## 2. `solver-status` — extend the discriminator

- [ ] 2.1 Edit `src/types/constraint.ts`: widen `Status` from
  `'PASS' | 'FAIL' | 'UNRESOLVED'` to
  `'PASS' | 'WARNING' | 'FAIL' | 'UNRESOLVED'`.
- [ ] 2.2 Edit `src/core/solver.ts`: export a new constant
  `export const DEFAULT_WARNING_THRESHOLD_NS = 1` near the existing
  module-level constants.
- [ ] 2.3 In `evaluateConstraint`, after the existing PASS/FAIL
  comparison: if `slack >= 0 && slack < (constraint.warningThresholdNs ?? DEFAULT_WARNING_THRESHOLD_NS)`,
  emit `status: 'WARNING'` instead of `'PASS'`. The calculated value
  and slack themselves are unchanged.
- [ ] 2.4 Edit `src/types/constraint.ts`: add an optional
  `warningThresholdNs?: number` field to the `Constraint` interface.
- [ ] 2.5 Audit existing exhaustive switches: search
  `\bcase ['\"](PASS|FAIL|UNRESOLVED)['\"]` and any
  `Record<Status, …>` literal — each MUST grow a `WARNING` arm.
  Expected hits: `ConstraintInspector.tsx` aggregate-counter block,
  `ConstraintInspector.tsx` `ConstraintRow` slack tint, and
  `ConstraintBuilder.tsx` status pill.

## 3. UI — render the new tier via the existing recipe

- [ ] 3.1 In `src/components/panels/ConstraintInspector.tsx` add a
  `warningCount` aggregate alongside `passCount` / `failCount` /
  `unresolved`. Insert the indicator between pass and fail in the
  header counter row.
- [ ] 3.2 Update `ConstraintRow`'s calc/slack cell tint logic: when
  `c.status === 'WARNING'`, use `text-yellow-300` instead of
  `text-slate-100`. Row stripe behavior is unchanged.
- [ ] 3.3 Update the `StatusBadge` in `ConstraintInspector.tsx` to add
  a fourth case for `WARNING`: a 16×16 `recipe.swatchBg`-style square
  in yellow with a `!` glyph (`text-[10px] font-mono`).
- [ ] 3.4 Update the live status pill in `ConstraintBuilder.tsx`
  header: when the live evaluation returns `WARNING`, render
  `live · warning` via `recipe.statusPill('warning')`.

## 4. Tests

- [ ] 4.1 Add cases to `src/core/solver.test.ts`:
  - "slack above threshold returns PASS" (existing behavior, keep).
  - "slack of 0.5 ns with threshold 1 ns returns WARNING".
  - "slack of −0.1 ns returns FAIL" (existing behavior, keep).
  - "explicit per-constraint threshold overrides the default".
- [ ] 4.2 Extend `src/components/panels/ConstraintInspector.test.tsx`
  with a case: seed the store with one constraint whose computed
  margin lands 0.5 ns above its minimum; assert the row shows the
  yellow status badge and the calc cell uses `text-yellow-300`.
- [ ] 4.3 Extend `src/components/features/ConstraintBuilder.test.tsx`
  similarly: open the builder, set bounds to land in the warning
  region, assert the header pill text matches `/live · warning/i`.

## 5. Verification

- [ ] 5.1 `pnpm lint && pnpm test && pnpm build` — all green.
- [ ] 5.2 `openspec validate add-warning-status --strict` — clean.
- [ ] 5.3 Manual: boot `pnpm dev`, load W65C02S, edit the `tDSR — Data
  Read Setup` rule's `minNs` so that the calculated margin lands
  between 0 and 1 ns above it. Confirm the inspector row turns
  yellow, the live pill turns yellow, and the aggregate counts
  one warning.
- [ ] 5.4 Confirm the design-system HTML catalog renders the new
  yellow card alongside the existing three statuses.
