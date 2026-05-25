## MODIFIED Requirements

### Requirement: Builder lives under `features/`, not `ui/`

The `SignalBuilder` component SHALL be located at
`src/components/features/SignalBuilder.tsx`, MAY import from
`@/store/useTimingStore`, and SHALL have a colocated test file at
`src/components/features/SignalBuilder.test.tsx` under the `ui`
Vitest project.

The root file at `src/components/features/SignalBuilder.tsx` SHALL be a thin re-export from the `./signal-builder` sub-directory. The actual implementation SHALL reside in `src/components/features/signal-builder/` with a barrel export at `index.ts`.

The trace renderers consumed by the preview SHALL be imported as named
exports from `@/components/canvas/WaveformTimeline` (no duplication of
SVG path generation).

#### Scenario: Builder component file exists under features/

- **GIVEN** the repository
- **WHEN** the filesystem is inspected
- **THEN** `src/components/features/SignalBuilder.tsx` SHALL exist
- **AND** `src/components/features/SignalBuilder.test.tsx` SHALL exist
- **AND** `src/components/features/signal-builder/index.ts` SHALL exist

#### Scenario: Root file is a thin re-export shell

- **GIVEN** `src/components/features/SignalBuilder.tsx`
- **WHEN** the file is inspected
- **THEN** it SHALL contain a re-export from `./signal-builder`
- **AND** it SHALL NOT contain component logic, state management, or JSX beyond the export statement

#### Scenario: Builder consumes traces from WaveformTimeline

- **GIVEN** `src/components/features/signal-builder/SBPreviewWaveform.tsx`
- **WHEN** the file is inspected
- **THEN** it SHALL import at least one of `ClockTrace`, `LineTrace`,
  `BusTrace` from `@/components/canvas/WaveformTimeline`
- **AND** it SHALL NOT define its own equivalent path-generation
  function for clock, line, or bus rendering
