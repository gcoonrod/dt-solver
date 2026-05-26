# AGENTS.md — dt-solver

> Read this first. It is the contract for any AI assistant (Claude,
> Codex, etc.) working on this repo. Humans should read it too.

## Repo shape

- `src/` — Next.js + React + Zustand app. See `CLAUDE.md` for the
  per-tier purity rules (`core/`, `store/`, `components/ui/`,
  `components/panels/`, `components/features/`).
- `src/design/tokens.ts` — codified design tokens. **Import from here.
  Never hardcode colors, sizes, radii, spacing, or font sizes.**
- `src/design/tokens.css` — CSS-var mirror of the same tokens for raw
  CSS / Tailwind arbitrary values.
- `docs/design-system/tokens.md` — **source of truth** for every visual
  constant. If you need a value, find it here.
- `docs/design-system/index.html` — rendered visual catalog of the
  tokens. Browsable.
- `openspec/specs/` — capability specs (normative).
- `openspec/changes/` — in-flight proposals (`proposal.md`, `tasks.md`,
  optional `design.md`, `specs/<capability>/spec.md`).

## The design system contract

1. **Read `docs/design-system/tokens.md` before adding UI.** Find the
   token that names what you need. The HTML catalog at
   `docs/design-system/index.html` is the same content, rendered.
2. **Import tokens, don't restate them.** In code:
   `import { color, type, space, recipe } from '@/design/tokens'`.
   In raw CSS / arbitrary Tailwind: `var(--color-surface-bg-1)`.
3. **Reference tokens by name in specs.** OpenSpec proposals SHOULD
   say `uses pattern.modal-chrome` and `adds swatch.async`, not
   restate `#0d1117`. Names survive value changes; values don't.
4. **New tokens require an OpenSpec change.**
   - Add a row in `docs/design-system/tokens.md`.
   - Add the matching export in `tokens.ts` + var in `tokens.css`.
   - Open a change under `openspec/changes/` that:
     - touches the `design-system` capability spec, AND
     - explains why the existing palette could not express the need.
5. **Value changes are versioned.** Editing a token's value (not its
   name) requires the same OpenSpec change flow, plus a bumped
   changelog entry in `tokens.md`.
6. **Deleting a token** requires a `@deprecated <since>` note for one
   release before removal.

## When you're about to add UI

Quick checklist before writing JSX:

- [ ] Is there an existing `pattern.*` for this layout? (`tokens.md` § 7)
- [ ] Is there an existing `recipe.*` for this visual treatment? (§ 5)
- [ ] Am I using token names — not hex/px — for every constant?
- [ ] Are status indicators going through `recipe.status-pill`?
- [ ] Are constraint-type chips going through `recipe.swatch-bg`?
- [ ] Are signal indicators going through `recipe.signal-dot`?
- [ ] Are radii one of `radius.none`, `radius.sm`, `radius.full`?
- [ ] Is every numeric value rendered in `type.mono.*`?

If you tick all eight, you almost certainly don't need a new token. If
you can't tick all eight, **stop and propose tokens through OpenSpec
before writing the component**.

## OpenSpec hooks

The `design-system` capability spec
(`openspec/specs/design-system/spec.md`) is normative. UI changes that
violate its requirements MUST fail review.

When opening a change that touches UI:

```bash
openspec create my-change
# in openspec/changes/my-change/proposal.md, reference tokens by name
# if you add or change tokens, also create
#   openspec/changes/my-change/specs/design-system/spec.md
#   with ADDED / MODIFIED requirements
openspec validate my-change --strict
```

## What this isn't

This is not a brand book. It is a contract about how dt-solver looks
because dt-solver is a debugger and debuggers earn trust through
visual consistency. Diverging "for variety" makes timing diagrams
harder to read. Don't do it.


<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
