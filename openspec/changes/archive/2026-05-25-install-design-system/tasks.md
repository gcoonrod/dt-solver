## 1. Install Capability Spec

- [x] 1.1 Copy `design-handoff/design-system/openspec/specs/design-system/spec.md` to `openspec/specs/design-system/spec.md` — normalize `## ADDED Requirements` headers to standard `### Requirement:` format
- [x] 1.2 Copy `design-handoff/design-system/openspec/changes/add-warning-status/` to `openspec/changes/add-warning-status/` as a worked example reference

## 2. Wire CSS Custom Properties

- [x] 2.1 Add `import "@/design/tokens.css"` to `src/app/layout.tsx` alongside the existing `globals.css` import

## 3. Verify Installation

- [x] 3.1 Verify `@/design/tokens` resolves — add a smoke import in a test or check TypeScript compilation
- [x] 3.2 Verify `tokens.css` custom properties are loaded — run dev server and confirm CSS vars exist on `:root`
- [x] 3.3 Run `pnpm lint` — no new errors
- [x] 3.4 Run `pnpm build` — production build compiles cleanly
- [x] 3.5 Run `pnpm test` — all existing tests still pass

## 4. Validate Consistency

- [x] 4.1 Spot-check that `tokens.ts` exports match the token names in `docs/design-system/tokens.md` (color, swatch, type, space, radius, stroke, elevation, recipe, size, motion sections)
- [x] 4.2 Spot-check that `tokens.css` custom properties correspond to the same tokens
- [x] 4.3 Verify the installed spec at `openspec/specs/design-system/spec.md` references token names that exist in `tokens.md`
