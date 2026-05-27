# design-system Specification

## Purpose

Normative rules for the dt-solver design system. UI changes that violate any requirement here MUST fail review. Values referenced by name (`color.surface.bg-1`, `swatch.setup`, `pattern.modal-chrome`, `recipe.status-pill`) are defined in `docs/design-system/tokens.md`.

## Requirements

### Requirement: Token names are the contract; values are versioned

UI code, OpenSpec proposals, and review threads SHALL reference design
constants by their token name from `docs/design-system/tokens.md`,
not by their literal value.

- Hex colors, pixel sizes, radii, font sizes, and font weights MUST NOT
  appear inline in `src/components/**` or `src/app/**` source. They MUST
  be imported from `@/design/tokens` (TS) or referenced via the CSS
  custom properties in `src/design/tokens.css`.
- The single permitted exception is `src/design/tokens.ts` itself, which
  declares the literal values, and `tokens.css`, which mirrors them.
- Adding a new token name MUST be accompanied by a row in
  `docs/design-system/tokens.md` in the same change.
- Changing a token's value (not its name) MUST add an entry to the
  `tokens.md` changelog in the same change.

#### Scenario: Component code uses tokens for color

- **GIVEN** any file under `src/components/` or `src/app/`
- **WHEN** the file is inspected for hex literals (`/#[0-9a-fA-F]{3,8}\b/`)
- **THEN** zero matches SHALL be found
- **EXCEPT** for files explicitly importing from `@/design/tokens`

#### Scenario: A new pattern requires a proposal that touches the design-system capability

- **GIVEN** an OpenSpec change under review that introduces a new
  `pattern.*` in component code
- **WHEN** the change is validated
- **THEN** the change SHALL include a delta under
  `specs/design-system/` that ADDs the new pattern name
- **AND** the change SHALL include a corresponding row in
  `docs/design-system/tokens.md` § 7

### Requirement: Surfaces ladder

Backgrounds in chrome SHALL be drawn from the three-step surface ladder.

- `color.surface.bg-0` SHALL be the outermost canvas color (waveform
  field, body background).
- `color.surface.bg-1` SHALL be used for panels, sidebars, inspectors,
  and modal bodies.
- `color.surface.bg-2` SHALL be used for toolbars, modal headers, and
  the logo tile.
- No other background color SHALL be used in chrome. Tinted backgrounds
  for statuses (`bg-{hue}-500/10`) are not chrome and are governed by
  `recipe.status-pill` / `recipe.swatch-bg`.

#### Scenario: Toolbar uses the elevated surface

- **GIVEN** any toolbar element (`.toolbar`, `WaveformToolbar`, modal
  header)
- **WHEN** its computed `background-color` is read
- **THEN** the value SHALL equal `color.surface.bg-2`

### Requirement: Radii are restricted to three values

Border-radius in chrome SHALL be one of `radius.none`, `radius.sm`, or
`radius.full`.

- `radius.none` (0) SHALL be used for SVG strokes, dashed verticals, and
  axis lines.
- `radius.sm` (2 px / Tailwind `rounded-sm`) SHALL be used for all
  cards, buttons, inputs, chips, panels, and modal shells.
- `radius.full` SHALL be used only for circular indicators (signal
  dots, status dots).

#### Scenario: Component uses an allowed radius

- **GIVEN** any chrome element under `src/components/`
- **WHEN** its computed `border-radius` is one of {0, 2px, 9999px}
- **THEN** the element conforms

### Requirement: Solver status renders via `recipe.status-pill`

Every UI element communicating a solver result (`PASS`, `FAIL`,
`UNRESOLVED`) SHALL be rendered with `recipe.status-pill` as defined in
`tokens.md` § 5.1.

- Allowed hues SHALL be exactly `color.status.pass`,
  `color.status.fail`, and `color.status.unresolved`.
- The pill SHALL include the `live · {status}` text format, uppercased
  via CSS, in `type.mono.caption`.
- The pill SHALL include the 4×4 colored dot prefix.

#### Scenario: A new status indicator follows the recipe

- **GIVEN** a new component that surfaces a solver verdict
- **WHEN** its DOM is inspected
- **THEN** the element class list SHALL include the recipe's container
  class, the hue-tinted fill class, the hue-tinted border class, and
  the hue-tinted text class as listed in `tokens.md` § 5.1

### Requirement: Constraint type indicators render via `recipe.swatch-bg`

The five constraint types (`SETUP`, `HOLD`, `PROP_DELAY`, `MIN_PULSE`,
`CYCLE_TIME`) SHALL each be rendered with their named swatch
(`swatch.setup` … `swatch.cycle-time`) wherever the type is exposed in
the UI.

- The type chip in the constraint builder modal SHALL use the full
  swatch (fill + border + text).
- The inline type chip in the constraint inspector table SHALL use the
  swatch with `/20` border opacity instead of `/30` and 9.5 px mono
  uppercase text.
- The type-symbol badge in the builder header SHALL be a 28×28
  square-radius badge using the swatch with the type's symbol
  (`tSU`, `tH`, `tPD`, `tW`, `tC`) in mono 10.5 px.

#### Scenario: All five swatches are wired up

- **GIVEN** the constraint builder modal open
- **WHEN** the user cycles through the five type chips
- **THEN** the active chip's container class SHALL equal
  `recipe.swatch-bg(<type>)` for that type
- **AND** the header badge SHALL show the matching symbol

### Requirement: Signals render via `recipe.signal-dot`

Every UI surface that names a signal (sidebar row, signal-reference
select, inspector anchor/target cells, waveform channel label, builder
preview) SHALL pair the name with a `recipe.signal-dot` whose background
is the signal's assigned `color.signal.palette.*` value.

- The dot SHALL be `radius.full` and 8–10 px depending on context.
- The dot SHALL include the glow `box-shadow: 0 0 6px {color}80`.
- The dot SHALL render to the left of the signal name with `space.6`
  gap.

#### Scenario: Inspector row shows a signal dot for anchor and target

- **GIVEN** a `ConstraintRow` rendered in the inspector
- **WHEN** the anchor and target cells are inspected
- **THEN** each cell SHALL contain a `recipe.signal-dot` styled with the
  referenced signal's color

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

Prose, button labels, and headings MUST use Geist Sans (`type.title.*`
or `type.body.*`).

#### Scenario: Inspector calculated column is mono

- **GIVEN** the constraint inspector rendered with W65C02S_14MHz
- **WHEN** the `Calculated` column cell is inspected
- **THEN** its computed `font-family` SHALL include `'Geist Mono'`

### Requirement: Drop shadows are reserved for modals

Box shadows SHALL only appear on modal shells (`pattern.modal-chrome`)
via `elevation.modal`. Toolbars, panels, cards, chips, and inputs
SHALL be flat.

#### Scenario: A panel has no box shadow

- **GIVEN** any sidebar, inspector, or toolbar element
- **WHEN** its computed `box-shadow` is read
- **THEN** the value SHALL be `none` (or the SVG glow on signal dots,
  which is a `box-shadow` but is part of `recipe.signal-dot`)

### Requirement: Motion budget is fixed

Chrome transitions SHALL use only the four durations in `motion.*`:
`none` (data), `tint` (120 ms · background), `reveal` (160 ms · opacity),
`rotate` (200 ms · transform). Modal mount/unmount SHALL NOT animate.

#### Scenario: Status changes do not animate

- **GIVEN** any element rendering a solver status pill
- **WHEN** the underlying status changes
- **THEN** the visual change SHALL be instantaneous (no `transition`
  declared on color or background)
