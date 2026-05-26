# dt-solver design tokens — canonical source

> This file is the **source of truth** for every visual constant in
> dt-solver. The HTML catalog (`./index.html`), the codified tokens
> (`src/design/tokens.ts`, `src/design/tokens.css`), and any OpenSpec
> change that touches UI MUST reference token names defined here.
>
> When this file and the prototype disagree, **this file wins** —
> update the prototype to match, then update consumers in `src/`.
>
> **Naming rule.** Tokens use dotted lowercase: `color.surface.bg-1`,
> `type.title.lg`, `swatch.setup`, `recipe.status-pill`. The name is
> the contract; the value is an implementation detail.

---

## 0 · How to use this file

| If you are… | Do this |
|---|---|
| Adding UI in code | Import from `src/design/tokens.ts`. Never hardcode hex, px, or radii. |
| Writing an OpenSpec proposal | Reference tokens by name (`uses pattern.modal-chrome`, `adds swatch.async`). Don't restate values. |
| Adding a **new** token | (1) Add a row in this file. (2) Add a matching export in `tokens.ts` + var in `tokens.css`. (3) Open an OpenSpec change. |
| Changing a token's **value** | (1) Edit the row here. (2) Re-export. (3) Open an OpenSpec change with rationale — token values are versioned. |
| Killing a token | Mark it `@deprecated <since>` here for one release before removing. |

---

## 1 · Color

### 1.1 Surfaces — `color.surface.*`

| Token | Value | Use |
|---|---|---|
| `color.surface.bg-0` | `#0a0e14` | Canvas / waveform field / outermost background |
| `color.surface.bg-1` | `#0d1117` | Panels, sidebar, inspector, modal body |
| `color.surface.bg-2` | `#11161e` | Toolbars, modal header, logo tile |

### 1.2 Lines — `color.line.*`

| Token | Value | Use |
|---|---|---|
| `color.line.strong` | `rgba(30, 41, 59, 0.8)` | Primary hairlines (`border-slate-800/80`) |
| `color.line.med` | `rgba(30, 41, 59, 0.6)` | Section dividers, table rules |
| `color.line.weak` | `rgba(30, 41, 59, 0.4)` | Row separators in tables |

### 1.3 Text — `color.text.*`

| Token | Value | Use |
|---|---|---|
| `color.text.primary` | `#f1f5f9` | Titles, headline numeric values |
| `color.text.body` | `#cbd5e1` | Body, signal-row names |
| `color.text.secondary` | `#94a3b8` | Required column, less-emphasized prose |
| `color.text.caption` | `#64748b` | Uppercase captions, axis ticks, mono captions |
| `color.text.disabled` | `#475569` | Disabled controls, kbd hint glyphs |
| `color.text.placeholder` | `#334155` | Input placeholders |

### 1.4 Status hues — `color.status.*`

Each status is rendered via `recipe.status-pill` (§ 5.1). Hue is the only
variable. Hex listed for canonical reference but consumers should use the
Tailwind classes named below.

| Token | Hue | Fill cls | Border cls | Text cls | Dot hex |
|---|---|---|---|---|---|
| `color.status.pass` | emerald | `bg-emerald-500/10` | `border-emerald-500/30` | `text-emerald-300` | `#34d399` |
| `color.status.fail` | rose | `bg-rose-500/10` | `border-rose-500/30` | `text-rose-300` | `#f87171` |
| `color.status.unresolved` | amber | `bg-amber-500/10` | `border-amber-500/30` | `text-amber-300` | `#fbbf24` |

### 1.5 Role accents — `color.role.*`

Used on the constraint builder's anchor/target controls and on event
needles in the waveform preview.

| Token | Value | Use |
|---|---|---|
| `color.role.anchor` | `#fde047` | Anchor edge toggles, anchor needles, anchor row wash |
| `color.role.target` | `#22d3ee` | Target edge toggles, target needles, target row wash |
| `color.role.anchor-wash` | `rgba(253, 224, 71, 0.02)` | Anchor row background in preview |
| `color.role.target-wash` | `rgba(34, 211, 238, 0.02)` | Target row background in preview |

### 1.6 Signal palette — `color.signal.palette.*`

A 5-slot palette assigned per-signal at creation. Slots have no semantic
meaning — assign sequentially or by user choice. Always render the
signal swatch via `recipe.signal-dot` (§ 5.3).

| Token | Value | First assigned to |
|---|---|---|
| `color.signal.palette.cyan` | `#22d3ee` | Clocks (PHI2) |
| `color.signal.palette.amber` | `#f59e0b` | Address buses |
| `color.signal.palette.violet` | `#a78bfa` | Control lines |
| `color.signal.palette.pink` | `#f472b6` | Data buses |
| `color.signal.palette.lime` | `#a3e635` | Chip-select lines |

### 1.7 Constraint type swatches — `swatch.*`

Used by type chips (constraint builder) and inline chips (inspector
table). Recipe is `recipe.swatch-bg` (§ 5.2).

| Token | Hue | Constraint type | Symbol | Inequality |
|---|---|---|---|---|
| `swatch.setup` | sky | `SETUP` | `tSU` | `Δ ≥ tSU,min` |
| `swatch.hold` | violet | `HOLD` | `tH` | `Δ ≥ tH,min` |
| `swatch.prop-delay` | amber | `PROP_DELAY` | `tPD` | `Δ ≤ tPD,max` |
| `swatch.min-pulse` | emerald | `MIN_PULSE` | `tW` | `pw ≥ tW,min` |
| `swatch.cycle-time` | slate | `CYCLE_TIME` | `tC` | `T ≥ tC,min` |

---

## 2 · Type

Two families, eight scale steps. No other sizes or weights are permitted
in chrome — graphs and SVG annotations have their own scale (§ 6).

| Token | Family | Size · Weight | Letter-spacing | Use |
|---|---|---|---|---|
| `type.title.lg` | Geist | 20 · 500 | tight | Modal headers, page titles |
| `type.title.md` | Geist | 15 · 500 | tight | App-bar product name |
| `type.body.md` | Geist | 12.5 · 400 | normal | Panel-header titles, primary button text |
| `type.body.sm` | Geist | 11 · 400 | normal | Type chip labels, inline meta |
| `type.mono.value` | Geist Mono | 12 · 400 | normal | Numeric cells, signal names in tables |
| `type.mono.caption` | Geist Mono | 10.5 · 400 | normal | Axis ticks, status pills, mode captions |
| `type.caption.upper` | Geist Mono | 10 · 500 | `0.18em` | FormSection labels, panel section headers |
| `type.caption.kbd` | Geist Mono | 9.5 · 400 | tight | Keyboard hint labels |

**Font stack.** `--font-sans: 'Geist', system-ui, sans-serif;`
`--font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace;`

**Mono rule.** Anything you'd compare top-to-bottom in a table — times,
slack, signal IDs, hex literals, axis ticks — MUST use a `type.mono.*`
token. Geist Sans is for prose, labels, and titles.

---

## 3 · Spacing

| Token | px | Use |
|---|---|---|
| `space.0` | 0 | Reset |
| `space.2` | 2 | Hairline gaps, inner padding on dense chips |
| `space.6` | 6 | Type-chip grid gap, button-cluster gap |
| `space.8` | 8 | Row inner padding |
| `space.12` | 12 | Panel + table cell padding |
| `space.16` | 16 | FormSection vertical padding |
| `space.20` | 20 | Modal horizontal padding |
| `space.28` | 28 | Preview SVG horizontal padding (`PV.pad`) |

No other spacing values are permitted in chrome.

---

## 4 · Radii, strokes, elevation

### 4.1 Radii — `radius.*`

| Token | px | Use |
|---|---|---|
| `radius.none` | 0 | SVG strokes, dashed verticals, axis lines |
| `radius.sm` | 2 | **All** cards, buttons, inputs, chips (Tailwind `rounded-sm`) |
| `radius.full` | 9999 | Signal dots, status indicator dots |

No other radii are permitted.

### 4.2 Strokes — `stroke.*`

| Token | Value | Use |
|---|---|---|
| `stroke.hairline` | `1px solid ${color.line.strong}` | Default border on cards, inputs, panels |
| `stroke.divider` | `1px solid ${color.line.med}` | Inner section dividers |
| `stroke.row` | `1px solid ${color.line.weak}` | Table row separators |
| `stroke.trace` | `1.6` (no unit) | SVG waveform trace stroke-width |
| `stroke.icon` | `1.75` (no unit) | Lucide-style icon stroke-width |

### 4.3 Elevation — `elevation.*`

| Token | Value | Use |
|---|---|---|
| `elevation.flat` | none | Default — surfaces stack via `bg-{0,1,2}`, not shadow |
| `elevation.modal` | `0 30px 90px -20px rgba(0, 0, 0, 0.8)` | **Only** for modal shells |
| `elevation.backdrop` | `rgba(2, 6, 12, 0.66)` + `backdropFilter: blur(4px)` | Modal backdrop |

Drop shadows on toolbars, panels, or cards are forbidden.

---

## 5 · Recipes (composite tokens)

Recipes are named compositions of primitive tokens. They are the
preferred reference in OpenSpec proposals: "uses `recipe.status-pill`"
is unambiguous, where "10% fill + 30% border" is not.

### 5.1 `recipe.status-pill`

Tinted pill used wherever a solver status is communicated.

| Layer | Value |
|---|---|
| Container | `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm` |
| Background | `bg-{hue}-500/10` |
| Border | `1px solid {hue}-500/30` |
| Text | `text-{hue}-300`, `type.mono.caption`, uppercase, `tracking-widest` |
| Dot prefix | 4×4 `rounded-full bg-{hue}-400` |
| Content | `live · {status}` (e.g. `live · pass`) |

Allowed hues: `color.status.pass`, `color.status.fail`,
`color.status.unresolved`.

### 5.2 `recipe.swatch-bg`

Tinted chip used for constraint type indicators (badges and chips).

| Layer | Value |
|---|---|
| Background | `bg-{hue}-500/10` |
| Border | `1px solid {hue}-500/30` (slate uses `/40`) |
| Text | `text-{hue}-300` |
| Symbol | Mono 10–10.5 px, child of badge |

Allowed hues: those defined in § 1.7.

### 5.3 `recipe.signal-dot`

Per-signal indicator dot. Always paired with the signal's name.

| Layer | Value |
|---|---|
| Shape | `rounded-full`, 8–10 px depending on context |
| Background | The signal's assigned `color.signal.palette.*` value |
| Glow | `box-shadow: 0 0 6px {color}80` |

### 5.4 `recipe.tabular-cell`

For any numeric value that appears in a column or grid.

| Layer | Value |
|---|---|
| Family | `type.mono.value` |
| Alignment | Right when comparable across rows, otherwise left |
| Color | `color.text.primary` on PASS, `color.status.fail` (text-rose-400) on FAIL, `color.text.disabled` on UNRESOLVED |

---

## 6 · Chrome dimensions

| Token | px | Use |
|---|---|---|
| `size.toolbar` | 40 (`h-10`) | App toolbars, panel headers |
| `size.modal-bar` | 56 (`h-14`) | Modal header & footer |
| `size.footer.status` | 28 (`h-7`) | Status footer strip |
| `size.row.inspector` | ~40 (py-2.5) | Constraint inspector table row |
| `size.row.waveform` | 70 | Waveform per-signal row (`PV.rowH`) |
| `size.row.waveform-trace` | 28 | Signal trace within row (`PV.sigH`) |
| `size.row.waveform-header` | 38 | Tick + axis strip (`PV.headerH`) |
| `size.sidebar.w` | 300 | Left sidebar (ComponentLibrary) |
| `size.modal.w` | 1140 | Constraint builder default width |
| `size.modal.h` | 860 | Constraint builder default height (cap 92vh) |
| `size.preview.h.min` | 320 | Floor for preview block on short viewports |

---

## 7 · Patterns

Named compositions of recipes + tokens. Each `pattern.*` is implemented
exactly once in `src/components/` and SHOULD NOT be reinvented.

| Token | Implementation | Composes |
|---|---|---|
| `pattern.modal-chrome` | `ConstraintBuilder.tsx`, `SignalBuilder.tsx` | `size.modal.{w,h}` · `elevation.modal` · `elevation.backdrop` · `size.modal-bar` header + footer |
| `pattern.form-section` | `<FormSection>` in builders | `type.caption.upper` label · `type.caption.kbd` kbd hint · `stroke.divider` bottom |
| `pattern.panel-header` | `ConstraintInspector.tsx` § header, `ComponentLibrary.tsx` § app-header | `size.toolbar` · left meta cluster · right action cluster · `recipe.status-pill` counts |
| `pattern.status-footer` | `ConstraintInspector.tsx` § footer | `size.footer.status` · `type.mono.caption` · mid-dot separators · solver meta |
| `pattern.constraint-row` | `ConstraintInspector.tsx` § ConstraintRow | status badge + name + inline `recipe.swatch-bg` chip + anchor/target with `recipe.signal-dot` + `recipe.tabular-cell` columns |
| `pattern.signal-row` | `ComponentLibrary.tsx` § SignalRowCL | `recipe.signal-dot` + icon + name + meta tag, three states: default · hover · selected |
| `pattern.waveform-annotation` | `ConstraintBuilder.tsx` § preview | Status-tinted band + dashed verticals + Δ arrow + center pill + event needles in role-accent colors |

---

## 8 · Motion budget

| Token | Duration · property | Use |
|---|---|---|
| `motion.none` | 0 ms | Status changes, numeric updates — data shouldn't ease |
| `motion.tint` | 120 ms · background-color | Row hover, button hover |
| `motion.reveal` | 160 ms · opacity | Trash icon on row hover |
| `motion.rotate` | 200 ms · transform | Collapsible section chevron |

Modals appear without slide-in. Snappy chrome reads as a tool, not an app.

---

## 9 · Voice & copy conventions

| Form | Example | Rule |
|---|---|---|
| Live status | `live · pass`, `live · unresolved` | Lowercase + middot, uppercase via CSS, mono. Never "Pass!" |
| Aggregate | `1 constraint violated`, `all constraints satisfied` | Count → noun → verb. Lowercase. |
| Bound | `≥ 30 ns`, `≤ tPD,max` | Inequality + value + unit. Never round. |
| Hint | `> falling edges of PHI2 @ 14 MHz` | Mono, italic, leading `>` like a REPL. |
| Diagnostic | `try a different edge direction` | Instructive, no apology. |
| Solver meta | `solver: cycle-accurate · iter 1 / 1 · last solve: 0.42 ms` | Debugger status-bar tone. |

---

## 10 · Keyboard model

| Shortcut | Action |
|---|---|
| `[N]` | Focus name field (modal open) |
| `[1–5]` | Cycle constraint type |
| `[Esc]` | Close modal |
| `[⌘ ⏎]` / `[Ctrl ⏎]` | Primary commit |
| `[⌘ +]` / `[Ctrl +]` | Zoom in (waveform) |
| `[⌘ −]` / `[Ctrl −]` | Zoom out |
| `[F]` | Fit view |
| `[← →]` | Nudge cursor ±1 ns |
| `[⌫]` | Delete selected |

Every modal SHOULD surface its primary commit + cancel shortcuts in the
footer using `type.caption.kbd`.

---

## Changelog

| Version | Date | Note |
|---|---|---|
| 0.1.0 | 2026-05-24 | Initial extraction from prototype source. |
