## Why

The codebase has accumulated inline hex colors, pixel values, and ad-hoc styling across components built during rapid prototyping. A design system handoff bundle has been delivered (`design-handoff/design-system/`) containing codified tokens, a capability spec, and documentation. The docs and token source files (`docs/design-system/`, `src/design/`) are already copied into the repo but not yet wired up — the CSS variables aren't loaded, the capability spec isn't installed, and existing components still use hardcoded values. Completing the installation establishes a single source of truth for every visual constant so future UI work can reference tokens by name rather than restating values.

## What Changes

- Install the `design-system` capability spec at `openspec/specs/design-system/spec.md`.
- Copy the `add-warning-status` worked example to `openspec/changes/` as a reference for future design-system changes.
- Wire `src/design/tokens.css` into the root layout so CSS custom properties are available globally.
- Merge the design-system contract from the handoff `AGENTS.md` into the existing repo `AGENTS.md` (which already contains the Next.js agent rules block).
- Verify `@/design/tokens` import path resolves correctly via the existing `@/*` → `./src/*` alias.
- Validate that the installed spec, tokens, and docs are consistent.

## Capabilities

### New Capabilities

- `design-system`: Codified design tokens (color, type, spacing, radii, elevation, recipes, patterns, motion) with normative rules enforcing token usage over inline values across all UI code.

### Modified Capabilities

<!-- none — this is a pure installation, no existing spec requirements change -->

## Impact

- **Code**: `src/app/layout.tsx` gains a `tokens.css` import. `AGENTS.md` is updated with design-system contract sections. No component code changes in this change — migration of inline values is out of scope and will follow in subsequent PRs.
- **Specs**: New `openspec/specs/design-system/spec.md` becomes normative for all future UI reviews.
- **Docs**: `docs/design-system/` already in place (tokens.md, index.html, README).
- **Dependencies**: None — tokens.ts and tokens.css are pure TS/CSS with no external deps.
- **Risk**: Zero runtime risk — adding CSS variables and a spec file cannot break existing behavior. Component migration to use tokens is explicitly out of scope.
