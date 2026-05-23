@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The line above imports `AGENTS.md`, which contains a critical warning: this project uses **Next.js 16** with **React 19** — newer than most training data. Before writing framework code (routing, server/client boundaries, caching, `Image`, etc.), read the relevant guide under `node_modules/next/dist/docs/` (organized into `01-app/`, `02-pages/`, `03-architecture/`, `04-community/`).

## Commands

Package manager is **pnpm** (see `pnpm-workspace.yaml` and the `packageManager` pin in `package.json`). Do not use `npm` or `yarn`.

| Task | Command |
| --- | --- |
| Install deps | `pnpm install` |
| Dev server | `pnpm dev` (binds `0.0.0.0:3000` — accessible from other devices on the LAN) |
| Production build | `pnpm build` |
| Production serve | `pnpm start` |
| Lint | `pnpm lint` (ESLint 9 flat config, extends `eslint-config-next/core-web-vitals` + `/typescript`) |
| Logic-path tests | `pnpm test:logic` (Vitest 3, node environment; watch via `pnpm test:logic:watch`) |

Test infrastructure is split into two paths. The **logic path** is wired up: Vitest runs every `__tests__/**/*.test.ts` file in `environment: 'node'`. Tests under `__tests__/` MUST NOT import React, the DOM, D3, or anything in `src/components/` — the `logic` Vitest project enforces this physically by running in node (any browser global throws `ReferenceError`), and the glob excludes `.test.tsx` so a stray TSX test won't be picked up. The **UI path** (colocated `*.test.tsx` against React components, in jsdom) is not wired up yet; there is no top-level `pnpm test` script for that reason. The single root config is `vitest.config.ts` using `test.projects: [...]`; the UI-path change will append a second project entry.

## Architecture

The product is a client-side digital-circuit timing constraint solver and waveform visualizer (see `README.md` and `ROADMAP.md` for the product story). The architecture is deliberately three-layered to keep the math pure and testable:

```
src/types/      ← Strict domain contracts (Signal, Constraint, TransitionEvent)
   ↑
src/core/       ← Pure TypeScript solver + validator. NO React, NO DOM, NO D3 imports.
   ↑
src/store/      ← Zustand store (useTimingStore). Re-runs the solver on every mutation.
   ↑
src/components/ ← React + D3 presentation. Subscribes to the store; never calls solver directly.
   ├── canvas/  ← D3 SVG rendering (WaveformTimeline + useD3Timeline hook)
   └── panels/  ← Inspector/library UI
src/data/       ← Hardcoded IC profiles (6502, 62256, ...) consumed as seed state.
```

The single hard rule is the **`src/core/` purity boundary**: nothing in `src/core/` may import React, the DOM, D3, or the store. That's what lets the solver be unit-tested without a browser and is the load-bearing assumption behind the whole "decoupled" architecture (see `README.md:33-44`).

### Current implementation state

Most files in `src/core/`, `src/store/`, `src/components/`, and `src/data/` are `// stub` placeholders awaiting implementation per the phased plan in `ROADMAP.md`. The only files with real content today are:

- `src/types/signal.ts` — `BaseSignal`, `ClockSignal`, `DataSignal`, `TransitionEvent`, `SignalState`, `EdgeDirection`
- `src/types/constraint.ts` — `Constraint`, `ConstraintType`, `SignalReference`
- `src/app/page.tsx` — still the create-next-app boilerplate

When implementing a phase from `ROADMAP.md`, the order matters: types → solver → store → components. Skipping ahead (e.g., wiring D3 before the solver returns real data) breaks the dependency direction.

### Conventions worth knowing

- TypeScript path alias: `@/*` → `./src/*` (`tsconfig.json:21-23`). Use it instead of long relative paths.
- `strict: true` is on; lean into discriminated unions like `AnySignal = ClockSignal | DataSignal` rather than optional fields.
- Styling is **Tailwind v4** with the `@tailwindcss/postcss` plugin — there is no `tailwind.config.*` file (v4 uses CSS-based config in `src/app/globals.css`).
- Time is always in nanoseconds (`*Ns` suffix) and frequency in MHz (`*MHz` suffix). Keep the suffix in field names.
