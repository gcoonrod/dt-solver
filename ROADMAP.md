# MVP Roadmap: DT Solver

This document outlines the Minimum Viable Product (MVP) phases for the client-side digital circuit timing constraint solver. The architecture separates the core constraint-solving math from the React/D3 visualization layer to ensure high testability.

## Phase 1: Core Types & Mock Data (The Contracts)
**Goal:** Define the exact TypeScript interfaces for the system and validate them with real-world processor profiles.

- [ ] **Define Base Interfaces:** Create strict TypeScript contracts in `src/types/` for `Signal`, `ClockSignal`, and `DataSignal`.
- [ ] **Define Constraint Interfaces:** Create the `Constraint` interface to link source events (anchor) to target events, including min/max boundaries.
- [ ] [cite_start]**Create 6502 Mock Profile:** Instantiate a hardcoded mock file for the W65C02S microprocessor running at 14MHz (5.0V)[cite: 234]. [cite_start]Ensure the mock data accurately captures key constraints like Address Setup Time (tADS) and Address Hold Time (tAH)[cite: 234].
- [ ] **Create eZ80 Mock Profile:** Instantiate a secondary mock file for the eZ80 architecture to ensure the data model can handle a different set of asynchronous bus cycles and read/write overlaps.
- [ ] **Unit Test:** Verify objects instantiate correctly in a pure `.ts` environment without React dependencies.

## Phase 2: The Solving Engine (The Math)
**Goal:** Build the pure TypeScript functions that process signals and constraints to determine valid timing windows.

- [ ] **Clock Generation Logic:** Write a function that calculates and outputs absolute timestamps (in nanoseconds) for continuous clock edges based on frequency and duty cycle.
- [ ] **Graph Traversal (Propagation):** Write the engine logic to forward-propagate constraints (e.g., if Event A happens at *T*, and Event B must happen $\ge 30$ns later, calculate the earliest bound for Event B).
- [ ] **Conflict Detection:** Implement validation logic to flag any constraints where the calculated minimum bound exceeds the maximum bound (negative margin).
- [ ] **Unit Test:** Feed the 6502 and eZ80 mock data into the engine via Jest/Vitest. Assert that manually forcing an overlapping setup/hold time successfully throws a violation flag.

## Phase 3: Zustand Store & React Binding (The Glue)
**Goal:** Establish the global state that React and D3 will react to, bypassing the overhead of React Context.

- [ ] **Initialize Store:** Set up `useTimingStore.ts` holding the current `Signals`, `Constraints`, and the computed output of the Solving Engine.
- [ ] **Create Actions:** Write store mutators (e.g., `updateConstraintBounds(id, min, max)`, `addSignal(signal)`).
- [ ] **Engine Integration:** Wire the store so that any action mutating a signal or constraint automatically triggers a re-run of the Solving Engine to update the computed margins.
- [ ] **Integration Test:** Build a temporary React component with raw HTML inputs. Bind them to the store and verify that changing a numerical input updates the raw state output instantly.

## Phase 4: The D3 Visualization Hook (The Canvas)
**Goal:** Render the raw timing data into an accurate, interactive waveform timeline.

- [ ] **Canvas Setup:** Create `WaveformTimeline.tsx` and establish the D3 scales (X-axis in nanoseconds, Y-axis divided into discrete signal lanes).
- [ ] **Draw Standard Clocks:** Implement standard square wave SVG path generation for `ClockSignal` objects.
- [ ] **Draw Data Buses:** Implement polygon/path drawing logic for `DataSignal` crossover buses to visually represent High-Z, Valid, and Invalid states.
- [ ] **Draw Constraints:** Render horizontal arrow markers with vertical reference ticks for active constraints (e.g., spanning from a clock falling edge to a data bus transition).
- [ ] **Visual Testing:** Verify the UI successfully mounts and renders the static 6502 and eZ80 mock data into visually accurate timing diagrams.

## Post-MVP increments

- **Rise/fall time support** *(landed: `openspec/changes/add-rise-fall-time-support`)*: `BaseSignal` gained optional `riseTimeNs` / `fallTimeNs`; the solver now models edges as `{startNs, midNs, endNs}` intervals and selects the conservative worst-case endpoint per constraint type (SETUP: anchor `start` ↔ target `end`; HOLD: opposite; PROP_DELAY: both `end`). The W65C02S demo was retuned so `tADS` remains the single FAIL after the math change, and the waveform renderer draws true sloped edges proportional to slew.

## Phase 5: The Interactive UI (The Polish)
**Goal:** Build the surrounding application layout and wire up user inputs to drive the visualizations in real-time.

- [ ] **Component Library Panel:** Build a left-hand sidebar to display available IC profiles and signals, allowing users to toggle them on the main canvas.
- [ ] **Constraint Inspector Panel:** Build a bottom tabular view listing all active constraints, displaying their calculated margins and highlighting violations in red.
- [ ] **Store Hookup:** Wire the sidebar and inspector controls directly to the Zustand store actions.
- [ ] **End-to-End Test:** Confirm that dragging a parameter slider in the UI updates the state, computes the new margins, and seamlessly redrafts the D3 SVGs without significant frame drops.