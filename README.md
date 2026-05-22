# dt-solver

`dt-solver` is a client-side digital circuit timing constraint solver and interactive visualization tool. It is designed to help hardware developers map, visualize, and validate AC characteristics (like setup times, hold times, and propagation delays) across different integrated circuits. 

Whether you are analyzing read/write overlaps on a custom 6502 single-board computer or debugging asynchronous bus cycles for an eZ80, `dt-solver` provides instantaneous visual feedback to ensure your digital logic timing margins are mathematically sound.

## Core Features

* **Interactive Waveform Canvas:** A highly granular, zoomable timeline built with D3.js to visualize standard clocks and discrete data buses.
* **Real-Time Constraint Solving:** Powered by a pure-TypeScript graph traversal engine that calculates timing margins entirely in the browser.
* **Conflict Detection:** Automatically evaluates constraints against current signal states and visually flags setup/hold violations.
* **Decoupled Architecture:** The core mathematical solver is strictly separated from the React presentation layer, ensuring high testability and performance.

## Tech Stack

* **Framework:** [Next.js](https://nextjs.org) (App Router)
* **State Management:** [Zustand](https://zustand-demo.pmnd.rs/) (for high-performance, cross-component state without Context re-renders)
* **Visualization:** [D3.js](https://d3js.org/)
* **Styling:** Tailwind CSS
* **Language:** TypeScript

## Getting Started

First, install the dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application. The UI will automatically update as you edit the source files.

## Project Structure

* `src/core/` - The pure-TypeScript solving engine and validation logic (No React dependencies).
* `src/types/` - Strict domain models for Signals, Constraints, and Events.
* `src/store/` - The Zustand state store bridging the solver engine and the UI.
* `src/components/canvas/` - D3.js rendering hooks and waveform SVG components.
* `src/components/panels/` - React UI components for the component library and constraint inspector.
* `src/data/` - Hardcoded mock profiles for specific ICs.

## Testing

Because the core solving engine is completely decoupled from the DOM and React, all constraint math and graph traversals can be tested via pure unit tests.

```bash
pnpm test
```

## Deployment

Because `dt-solver` handles all constraint calculations entirely client-side, it requires no backend API. It can be easily deployed via the [Vercel Platform](https://vercel.com/new) or exported as a static site to be hosted on any standard web server.