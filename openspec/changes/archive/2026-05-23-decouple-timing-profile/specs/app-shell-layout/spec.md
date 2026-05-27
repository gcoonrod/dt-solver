## ADDED Requirements

### Requirement: Concrete profile constants reached only through the store seam

Concrete profile constants exported from `src/data/*-profile.ts` and `src/data/w65c02s-14mhz.ts` (currently `W65C02S_14MHz`; future seeds added under `src/data/`) SHALL be imported only by `src/store/useTimingStore.ts` and by files within `src/data/` itself. All other files under `src/app/`, `src/components/`, and `src/hooks/` SHALL reach the active profile through `useTimingStore` selectors or the `useTimingProfile()` hook (see the `timing-profile` capability). This rule extends the existing tiered organization to the data layer: the store is the single seam through which presentation-tier code learns which profile is loaded.

#### Scenario: Feature components do not import concrete profile data

- **GIVEN** any file under `src/components/features/`, `src/components/ui/`, `src/components/canvas/`, or `src/components/panels/`
- **WHEN** the file is inspected
- **THEN** it SHALL contain no `import ... from "@/data/w65c02s-14mhz"`
- **AND** it SHALL contain no `import ... from "@/data/*-profile"`

#### Scenario: Page file does not import concrete profile data

- **GIVEN** `src/app/page.tsx`
- **WHEN** the file is inspected
- **THEN** it SHALL contain no import from `@/data/`

#### Scenario: Hooks do not import concrete profile data

- **GIVEN** any file under `src/hooks/`
- **WHEN** the file is inspected
- **THEN** it SHALL contain no import from `@/data/`

### Requirement: `useTimingProfile` lives in `src/hooks/`

The hook that exposes the active timing profile to React components SHALL live at `src/hooks/useTimingProfile.ts`, alongside the other shell hooks (`useVerticalSplit`, `useGlobalShortcuts`). It SHALL be a thin selector hook — no `useState`, no `useEffect`, no Context provider — so that the page shell can adopt it without paying any new render or wiring cost.

#### Scenario: Hook file exists in the hooks tier

- **GIVEN** the repository after this change is applied
- **WHEN** the filesystem is inspected
- **THEN** `src/hooks/useTimingProfile.ts` SHALL exist
- **AND** it SHALL export a function named `useTimingProfile`

#### Scenario: Hook contains no React state or effects

- **GIVEN** `src/hooks/useTimingProfile.ts`
- **WHEN** the file is inspected
- **THEN** it SHALL NOT call `useState`, `useReducer`, `useEffect`, `useLayoutEffect`, or `createContext`
