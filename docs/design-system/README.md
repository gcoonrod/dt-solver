# Design system

This folder is the **single source of truth** for dt-solver's visual
language. Three files, in priority order:

| File | Role | Audience |
|---|---|---|
| `tokens.md` | Canonical token table. Names + values. | **AI agents, OpenSpec proposals, humans.** Read this first. |
| `index.html` | Rendered visual catalog of the same tokens. | Humans browsing. |
| `../../src/design/tokens.ts` + `tokens.css` | Codified tokens for import. | Component code. |

## Workflow

### "I want to add UI."
1. Find the token in `tokens.md` for what you need.
2. Import from `@/design/tokens` in TS, or `var(--…)` in CSS.
3. Never hardcode hex, px, radii, or font sizes. The lint will catch
   you; the design system spec under `openspec/specs/design-system/`
   will fail the change at validation.

### "I need a new token / pattern / recipe."
1. Open an OpenSpec change: `openspec create my-change`.
2. Add a row to `tokens.md` describing the new token.
3. Add the matching export to `tokens.ts` + `tokens.css`.
4. Add a delta under `openspec/changes/my-change/specs/design-system/`
   that ADDs the new requirement (and MODIFIES any rule the token
   relaxes — see `openspec/changes/add-warning-status/` for a worked
   example).
5. `openspec validate my-change --strict`.

### "I want to change a token's value."
Same as above, plus bump the `tokens.md` changelog. Token values are
versioned — anything that imports them gets the new value automatically,
which means a value change is a behavior change.

## Why this exists

dt-solver is a debugger. Debuggers earn trust through visual
consistency. A status pill that's emerald in one corner and
mint-green in another isn't a creative choice — it's a bug.

The design system is here to make consistency the path of least
resistance. Following it is faster than inventing.
