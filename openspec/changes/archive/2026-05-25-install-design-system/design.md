## Context

A design system handoff bundle has been partially installed. The user has already copied `docs/design-system/` (tokens.md, index.html, README) and `src/design/` (tokens.ts, tokens.css) into the repo. The `AGENTS.md` at the repo root was also replaced with the handoff version, but it already had the Next.js agent rules block appended — so the current file is a merge of both. What remains: installing the capability spec, wiring the CSS import, copying the worked example, and verifying everything is consistent.

Current repo state:
- `src/design/tokens.ts` — present, 211 lines, exports `color`, `swatch`, `type`, `space`, `radius`, `stroke`, `elevation`, `recipe`, `size`, `motion`
- `src/design/tokens.css` — present, CSS custom properties mirror
- `docs/design-system/tokens.md` — present, canonical source of truth
- `docs/design-system/index.html` — present, visual catalog
- `AGENTS.md` — contains the design-system contract + Next.js rules block
- `openspec/specs/design-system/` — **missing**
- `openspec/changes/add-warning-status/` — **missing** (worked example)
- `src/app/layout.tsx` — does **not** import `tokens.css`

The existing `@/*` → `./src/*` path alias in `tsconfig.json` means `@/design/tokens` already resolves to `src/design/tokens.ts` with no additional config.

## Goals / Non-Goals

**Goals:**
- Complete the design system installation per the handoff README's install steps
- Install the normative `design-system` capability spec
- Wire CSS custom properties so they're available at runtime
- Copy the worked example as a reference for future token extensions
- Validate consistency across tokens.md, tokens.ts, tokens.css, and the spec

**Non-Goals:**
- Migrating existing components from inline hex values to token imports (separate follow-up PRs per the README's guidance)
- Adding lint rules or CI grep for hex literals (future task)
- Implementing the `add-warning-status` change — it's installed only as a reference example

## Decisions

### 1. Import tokens.css in layout.tsx, not globals.css

**Choice:** Add `import "@/design/tokens.css"` in `src/app/layout.tsx` alongside the existing `globals.css` import.

**Why:** The layout is the root of the component tree and already imports `globals.css`. Adding the tokens CSS here guarantees custom properties are available to every component. Importing in `globals.css` via `@import` would also work but adds an unnecessary indirection layer.

### 2. Keep AGENTS.md as-is (already merged)

**Choice:** The current `AGENTS.md` already contains both the design-system contract and the Next.js agent rules block. No further changes needed.

**Why:** The user has already merged the handoff AGENTS.md with the existing content. The Next.js rules are appended at the bottom inside `<!-- BEGIN:nextjs-agent-rules -->` markers. Both sections are intact.

### 3. Install worked example at openspec/changes/ (not archive)

**Choice:** Copy `add-warning-status` to `openspec/changes/add-warning-status/` as an active (but un-applied) reference, not into the archive.

**Why:** The handoff README positions this as a reference example developers should study. Keeping it in `changes/` makes it discoverable. It won't interfere with other changes since it's a separate change directory.

### 4. Spec file uses ADDED requirements header

**Choice:** The handoff spec uses `## ADDED Requirements` since all requirements are new to this repo.

**Why:** This follows the OpenSpec delta convention — when the spec is synced to `openspec/specs/design-system/spec.md`, the headers will be normalized to standard `### Requirement:` format. Since we're installing the spec directly (not through a delta), we'll normalize the headers during installation.

## Risks / Trade-offs

- **[No runtime risk]** → Adding CSS variables and a spec file cannot break any existing functionality. The CSS vars are inert until referenced.
- **[Spec strictness vs current code]** → The installed spec forbids inline hex in components, but existing code is full of it. This is intentional — the spec establishes the target state, and migration happens incrementally. → Mitigation: spec enforcement is manual (review-time) until CI grep is added.
- **[Worked example references non-existent capability]** → The `add-warning-status` proposal references a `solver-status` capability that doesn't exist yet. → Mitigation: it's a reference only, not meant to be applied.
