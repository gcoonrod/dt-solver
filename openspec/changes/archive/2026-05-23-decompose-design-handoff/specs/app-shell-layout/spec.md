## ADDED Requirements

### Requirement: Tiered component organization

The `src/components/` tree SHALL be organized into named tiers that establish a one-directional dependency flow from leaves to pages. Specifically:

- `src/components/ui/` SHALL contain leaf presentational components that take all data via props and SHALL NOT import from `@/store/useTimingStore`, `@/core/`, or `react-dom`.
- `src/components/features/` SHALL contain composed feature units that MAY import from `src/components/ui/`, `@/store/useTimingStore`, and helpers exported from `src/components/canvas/` or `src/components/panels/`.
- `src/app/page.tsx` (and any future page under `src/app/`) SHALL contain only layout composition and SHALL NOT define inline subcomponents or contain `useEffect` blocks that own DOM event listeners; such behavior SHALL be extracted into named hooks under `src/hooks/` or into feature components.

#### Scenario: A leaf component does not subscribe to the store

- **GIVEN** any file under `src/components/ui/`
- **WHEN** the file is inspected
- **THEN** it SHALL contain no import from `@/store/useTimingStore`
- **AND** it SHALL contain no import from `@/core/`

#### Scenario: The page file holds no inline subcomponents

- **GIVEN** `src/app/page.tsx`
- **WHEN** the file is inspected
- **THEN** it SHALL define exactly one exported component (the default `Page` export)
- **AND** it SHALL NOT define any other React function component (no `function <Name>(...) { return <... />; }` declarations beyond the default export)

#### Scenario: The page file holds no DOM event listeners

- **GIVEN** `src/app/page.tsx`
- **WHEN** the file is inspected
- **THEN** it SHALL NOT call `window.addEventListener` or `document.addEventListener` directly
- **AND** any such listener SHALL live inside a named hook under `src/hooks/` consumed by `Page`

### Requirement: Reusable leaf components extracted from the design handoff

The following leaf components SHALL exist as separate files under `src/components/ui/`, each accepting its data via props (no store subscription) and each having a colocated `*.test.tsx` file under the `ui` Vitest project:

- `ToolBtn` — an icon-and-label button with optional keyboard-shortcut tooltip. Accepts `icon`, `label`, `kbd?`, `onClick?` props.
- `CornerLabel` — a small live/scale indicator pill. Accepts no props (purely presentational) or a single optional `children` prop.
- `CursorReadout` — a labeled time-readout pill. Accepts a `timeNs: number` prop and renders the formatted time.
- `SignalStateBadge` — a per-signal color-coded value badge. Accepts `color: string` and `display: string` props. The accompanying display-string helper (`formatSignalDisplay`) lives under `src/components/features/signalDisplay.ts` because it depends on `@/core/solver` and would violate the `ui/` purity rule.
- `Splitter` — a draggable separator. Accepts `orientation: "horizontal" | "vertical"` and `onMouseDown: (e: React.MouseEvent) => void` props.

#### Scenario: Each leaf component has a colocated unit test

- **GIVEN** each leaf component file `src/components/ui/<Name>.tsx`
- **WHEN** the repository is inspected
- **THEN** a sibling file `src/components/ui/<Name>.test.tsx` SHALL exist
- **AND** the test SHALL render the component with representative props
- **AND** the test SHALL assert at least one user-observable output via an accessible query (`getByRole`, `getByText`, `getByLabelText`, or equivalent)
- **AND** the test SHALL NOT use snapshot matchers (`toMatchSnapshot`, `toMatchInlineSnapshot`)
- **AND** the test SHALL NOT import `@/store/useTimingStore`

#### Scenario: `ToolBtn` renders the kbd hint when provided

- **GIVEN** `<ToolBtn icon="zoom-in" label="Zoom In" kbd="⌘+" />`
- **WHEN** the button is rendered
- **THEN** the title attribute SHALL include both the label and the keyboard hint (e.g., `"Zoom In (⌘+)"`)
- **AND** the visible label text SHALL be present

#### Scenario: `CursorReadout` formats nanoseconds via the shared formatter

- **GIVEN** `<CursorReadout timeNs={35.7} />`
- **WHEN** the readout is rendered
- **THEN** the rendered text SHALL equal the output of `formatTime(35.7)` from `@/components/canvas/WaveformTimeline`

### Requirement: Composed feature components extracted from the design handoff

The following feature components SHALL exist as separate files under `src/components/features/`, each composing leaf components from `src/components/ui/` and subscribing to `@/store/useTimingStore` where needed. Each feature SHALL have a colocated `*.test.tsx` file under the `ui` Vitest project that exercises the component against the real store reset to a known profile in `beforeEach`.

- `WaveformToolbar` — top toolbar with zoom/fit controls, time-range readout, cursor readout, and per-signal mini-badges.
- `ChannelLabels` — left strip listing each signal's name, type, and current state at the cursor.
- `WaveformWorkspace` — the canvas zone: composes `WaveformToolbar` above a row of `ChannelLabels` + `<WaveformTimeline />` + `<CornerLabel />`.

#### Scenario: Each feature has a colocated component test

- **GIVEN** each feature file `src/components/features/<Name>.tsx`
- **WHEN** the repository is inspected
- **THEN** a sibling file `src/components/features/<Name>.test.tsx` SHALL exist
- **AND** the test SHALL reset `useTimingStore` to the `W65C02S_14MHz` profile in `beforeEach`
- **AND** the test SHALL NOT mock `useTimingStore`
- **AND** the test SHALL assert at least one user-observable output via an accessible query

#### Scenario: `WaveformToolbar` updates when the cursor moves

- **GIVEN** `<WaveformToolbar />` rendered against a store reset to `W65C02S_14MHz` with `cursorTimeNs = 0`
- **WHEN** `useTimingStore.getState().setCursor(50)` is called
- **THEN** the cursor readout SHALL re-render to display the formatted value of `50` ns

#### Scenario: `ChannelLabels` lists every signal in the profile

- **GIVEN** `<ChannelLabels />` rendered against a store reset to `W65C02S_14MHz`
- **WHEN** the component is rendered
- **THEN** every signal name from `W65C02S_14MHz.signals` SHALL be present in the rendered output
- **AND** each signal's row SHALL display its current state badge at the cursor

#### Scenario: `WaveformWorkspace` composes its three zones

- **GIVEN** `<WaveformWorkspace />` rendered against a store reset to `W65C02S_14MHz`
- **WHEN** the component is rendered
- **THEN** elements rendered by `WaveformToolbar`, `ChannelLabels`, `WaveformTimeline`, and `CornerLabel` SHALL all be present in the resulting DOM

### Requirement: Page-level behaviors extracted into named hooks

The vertical-split drag behavior and the global keyboard shortcuts behavior SHALL be implemented as named hooks under `src/hooks/`:

- `useVerticalSplit({ initialFrac, minFrac, maxFrac })` — owns the drag state and returns `{ bottomFrac, containerRef, startDrag }`. It SHALL clamp the returned fraction within `[minFrac, maxFrac]`.
- `useGlobalShortcuts()` — registers `window` keydown listeners that drive the store actions `zoomAt`, `fitView`, and `setCursor`. It SHALL ignore keystrokes whose `e.target` is an `<input>` or `<textarea>` element.

#### Scenario: `useVerticalSplit` clamps the fraction within bounds

- **GIVEN** a hook instance with `minFrac = 0.15`, `maxFrac = 0.7`
- **WHEN** a drag would compute a fraction below `0.15` or above `0.7`
- **THEN** the returned `bottomFrac` SHALL be clamped to the respective bound

#### Scenario: `useGlobalShortcuts` ignores keystrokes inside text inputs

- **GIVEN** a `<Page />` rendered against a store reset to `W65C02S_14MHz`
- **WHEN** the user focuses an `<input>` element and presses `f`
- **THEN** `fitView` SHALL NOT be dispatched
- **AND** the store's `tMinNs` / `tMaxNs` SHALL remain unchanged

#### Scenario: `useGlobalShortcuts` advances the cursor on ArrowRight

- **GIVEN** a `<Page />` rendered against a store reset to `W65C02S_14MHz` with `cursorTimeNs = 10`
- **WHEN** an `ArrowRight` keydown is dispatched on `window` with no input focused
- **THEN** `useTimingStore.getState().cursorTimeNs` SHALL equal `11` (clamped against `tMaxNs`)

### Requirement: Page shell composes features and owns no business logic

`src/app/page.tsx` SHALL be reduced to a layout shell that:

- Renders `<ComponentLibrary />`, `<WaveformWorkspace />`, `<InspectorPanel />` (or the existing `<ConstraintInspector />`), and a `<Splitter />` between the workspace and inspector.
- Consumes `useVerticalSplit(...)` for the bottom-panel sizing and `useGlobalShortcuts()` for keyboard handling.
- Contains no inline component definitions, no `useEffect` blocks, no direct `window.addEventListener` calls, and no `useState` for drag/cursor state.
- Imports no helpers from `@/core/` directly (the solver is reached through the store).

#### Scenario: The page file is small and structural

- **GIVEN** `src/app/page.tsx`
- **WHEN** the file is inspected after extraction is complete
- **THEN** it SHALL contain no `useEffect` call
- **AND** it SHALL contain no `useState` call
- **AND** it SHALL contain no `addEventListener` call

### Requirement: Page-shell integration test

A test at `src/app/page.test.tsx` SHALL exist under the `ui` Vitest project and SHALL exercise the page-level interactions that cross multiple components:

- Splitter drag updates the visible split.
- Global zoom-in shortcut (`⌘=` / `Ctrl+=`) reduces `tMaxNs - tMinNs`.
- Global fit shortcut (`f`) restores the profile's default window.
- Global `ArrowRight` advances the cursor.
- The cursor readout in the toolbar re-renders when `setCursor` is dispatched from outside the page.

#### Scenario: Page integration test resets the store before each case

- **GIVEN** `src/app/page.test.tsx`
- **WHEN** the file is inspected
- **THEN** a `beforeEach` hook SHALL reset `useTimingStore` to the `W65C02S_14MHz` profile
- **AND** the test SHALL NOT mock `useTimingStore`

#### Scenario: Zoom-in shortcut narrows the window

- **GIVEN** `<Page />` rendered against a store reset to `W65C02S_14MHz`
- **AND** the initial window width `w0 = tMaxNs - tMinNs`
- **WHEN** a keydown with `key = "="` and `metaKey = true` is dispatched on `window`
- **THEN** the new window width SHALL be strictly less than `w0`

#### Scenario: Fit shortcut restores the default window

- **GIVEN** `<Page />` rendered against a store reset to `W65C02S_14MHz`
- **AND** the window has been zoomed in via the zoom-in shortcut
- **WHEN** a keydown with `key = "f"` is dispatched on `window`
- **THEN** `tMinNs` SHALL equal `W65C02S_14MHz.defaultWindowNs.tMinNs`
- **AND** `tMaxNs` SHALL equal `W65C02S_14MHz.defaultWindowNs.tMaxNs`

### Requirement: `ui` Vitest project include glob covers pages and hooks

The `ui` project's `include` glob in `vitest.config.ts` SHALL be widened to `['src/{app,components,hooks}/**/*.test.{ts,tsx}']` so that colocated tests under `src/app/` and `src/hooks/` are picked up. The `logic` project's `include` glob SHALL remain `['__tests__/**/*.test.ts']` and SHALL NOT pick up any `.tsx` file.

#### Scenario: Page test runs under the `ui` project

- **GIVEN** `src/app/page.test.tsx`
- **WHEN** `pnpm test:ui` runs
- **THEN** the test SHALL execute under the jsdom environment

#### Scenario: Logic project never picks up `.tsx`

- **GIVEN** the widened `ui` include glob
- **WHEN** `pnpm test:logic` runs
- **THEN** no file under `src/app/`, `src/components/`, or `src/hooks/` ending in `.tsx` SHALL be executed
