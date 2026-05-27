## ADDED Requirements

### Requirement: `color.status.warning` token

A fourth solver-status hue SHALL be defined for constraints whose slack
is positive but below a configurable threshold.

- The token `color.status.warning` SHALL be defined with hue `yellow`,
  Tailwind classes `bg-yellow-500/10` / `border-yellow-500/30` /
  `text-yellow-300`, and dot hex `#facc15`.
- The token SHALL appear as a row in `docs/design-system/tokens.md`
  § 1.4 in the same change that adds it to `tokens.ts` / `tokens.css`.
- The token MUST NOT be used outside `recipe.status-pill`,
  `recipe.tabular-cell`, and the inspector's `StatusBadge` square.

#### Scenario: Token is exported from `tokens.ts`

- **GIVEN** the file `src/design/tokens.ts`
- **WHEN** the export `color.status` is read
- **THEN** it SHALL contain a `warning` entry with hue `'yellow'` and
  dot `'#facc15'`

#### Scenario: HTML catalog renders the new status card

- **GIVEN** the file `docs/design-system/index.html`
- **WHEN** § 02.4 (solver status) is rendered
- **THEN** the grid SHALL contain four cards (pass / warning / fail /
  unresolved) in that order

## MODIFIED Requirements

### Requirement: Solver status renders via `recipe.status-pill`

Every UI element communicating a solver result (`PASS`, `WARNING`,
`FAIL`, `UNRESOLVED`) SHALL be rendered with `recipe.status-pill` as
defined in `tokens.md` § 5.1.

- Allowed hues SHALL be exactly `color.status.pass`,
  `color.status.warning`, `color.status.fail`, and
  `color.status.unresolved`.
- The pill SHALL include the `live · {status}` text format, uppercased
  via CSS, in `type.mono.caption`.
- The pill SHALL include the 4×4 colored dot prefix.

#### Scenario: A new status indicator follows the recipe

- **GIVEN** a new component that surfaces a solver verdict
- **WHEN** its DOM is inspected
- **THEN** the element class list SHALL include the recipe's container
  class, the hue-tinted fill class, the hue-tinted border class, and
  the hue-tinted text class as listed in `tokens.md` § 5.1

#### Scenario: WARNING uses the recipe with the new hue

- **GIVEN** a constraint whose evaluated status is `'WARNING'`
- **WHEN** the inspector row's status badge is inspected
- **THEN** the badge SHALL apply `bg-yellow-500/10`,
  `border-yellow-500/30`, and `text-yellow-300`

### Requirement: Numeric values use a `type.mono.*` token

Any displayed number that is intended for top-to-bottom comparison
SHALL be rendered in a `type.mono.*` token (Geist Mono).

Categories that MUST be mono:

- Time values (`ns`, `ms`)
- Slack values
- Signal names (mnemonics like `PHI2`, `ADDR[15:0]`)
- Hex literals (`0xA9`)
- Axis ticks
- Keyboard hints
- Solver meta (`iter`, `last solve`)

The `Calculated` and `Slack` columns in the constraint inspector SHALL
tint their text according to status:

| Status | `Calculated` tint | `Slack` tint |
|---|---|---|
| PASS | `color.text.primary` | `text-emerald-400` |
| WARNING | `text-yellow-300` | `text-yellow-300` |
| FAIL | `text-rose-400` (semibold) | `text-rose-400` |
| UNRESOLVED | `color.text.disabled` | `color.text.disabled` |

Prose, button labels, and headings MUST use Geist Sans.

#### Scenario: WARNING row tints both columns yellow

- **GIVEN** a constraint row rendered with `c.status === 'WARNING'`
- **WHEN** the `Calculated` and `Slack` cells are inspected
- **THEN** both cells' computed color SHALL include `text-yellow-300`
