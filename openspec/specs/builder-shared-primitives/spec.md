# builder-shared-primitives Specification

## Purpose

The contract for 7 shared UI atom components extracted to `src/components/ui/` during the builder panel decomposition. These are generic, props-driven primitives with no store coupling: ModalBackdrop (overlay + click-outside dismiss), FormSection (labeled form field layout), KeyboardShortcuts (global hotkey listener), NumberField (labeled numeric input with suffix), SlewControls (linked rise/fall time inputs), ColorDotPicker (palette grid with selection), and TypeChipSelector (generic type chip row). Each is independently testable and reusable across both builders and future panels.

## Requirements

### Requirement: ModalBackdrop component provides overlay and click-outside dismiss

A reusable `ModalBackdrop` component SHALL exist at `src/components/ui/ModalBackdrop.tsx` that renders a fixed full-viewport overlay with backdrop blur and supports click-outside-to-close behavior.

- The component SHALL accept props: `children: ReactNode`, `onClose: () => void`, and optional `className?: string`.
- The component SHALL render a `<div>` with `role="dialog"`, `aria-modal="true"`, and `position: fixed; inset: 0; z-index: 50`.
- The component SHALL apply a dark translucent background (`rgba(2, 6, 12, 0.66)`) and `backdrop-filter: blur(4px)`.
- Clicking directly on the backdrop (not on children) SHALL invoke `onClose`.
- Clicking inside children content SHALL NOT invoke `onClose`.

#### Scenario: Click on backdrop invokes onClose

- **WHEN** the user clicks directly on the backdrop element (not on a child)
- **THEN** the `onClose` callback SHALL be invoked exactly once

#### Scenario: Click on child content does not dismiss

- **WHEN** the user clicks on content rendered inside the backdrop's children
- **THEN** the `onClose` callback SHALL NOT be invoked

#### Scenario: Backdrop renders with correct ARIA attributes

- **WHEN** the ModalBackdrop is rendered
- **THEN** the root element SHALL have `role="dialog"` and `aria-modal="true"`

### Requirement: FormSection component provides labeled form field layout

A reusable `FormSection` component SHALL exist at `src/components/ui/FormSection.tsx` that renders a consistently styled form section with label, keyboard hint, optional action slot, and children.

- The component SHALL accept props: `label: string`, `kbd?: string`, `action?: ReactNode`, `children: ReactNode`.
- The component SHALL render the label as a heading-level element (e.g., `<h3>`) with consistent typography.
- The component SHALL render the `kbd` string as a subtle monospace hint beside the label.
- The component SHALL render the `action` ReactNode (if provided) in the trailing position of the header row.
- Children SHALL be rendered below the header in a padded content area.

#### Scenario: FormSection renders label and kbd hint

- **WHEN** rendered with `label="Name"` and `kbd="auto-derived"`
- **THEN** the text "Name" SHALL be visible
- **AND** the text "auto-derived" SHALL be visible in monospace styling

#### Scenario: FormSection renders action slot when provided

- **WHEN** rendered with an action button `<button>reset</button>`
- **THEN** the "reset" button SHALL be visible in the section header

#### Scenario: FormSection renders children in content area

- **WHEN** rendered with an `<input>` as children
- **THEN** the input SHALL be rendered below the label row

### Requirement: KeyboardShortcuts component handles global hotkeys

A reusable `KeyboardShortcuts` component SHALL exist at `src/components/ui/KeyboardShortcuts.tsx` that attaches global keydown listeners for Escape and Cmd/Ctrl+Enter.

- The component SHALL accept props: `onEsc: () => void`, `onSubmit: () => void`.
- The component SHALL render nothing visible (returns `null` or a fragment).
- Pressing `Escape` SHALL invoke `onEsc`.
- Pressing `Meta+Enter` (Mac) or `Ctrl+Enter` (non-Mac) SHALL invoke `onSubmit`.
- Listeners SHALL be attached on mount and removed on unmount.

#### Scenario: Escape key invokes onEsc

- **WHEN** a keydown event with `key = "Escape"` is dispatched on the document
- **THEN** the `onEsc` callback SHALL be invoked

#### Scenario: Cmd+Enter invokes onSubmit

- **WHEN** a keydown event with `key = "Enter"` and `metaKey = true` is dispatched
- **THEN** the `onSubmit` callback SHALL be invoked

#### Scenario: Ctrl+Enter invokes onSubmit on non-Mac

- **WHEN** a keydown event with `key = "Enter"` and `ctrlKey = true` is dispatched
- **THEN** the `onSubmit` callback SHALL be invoked

### Requirement: NumberField component renders a labeled numeric input with suffix

A reusable `NumberField` component SHALL exist at `src/components/ui/NumberField.tsx` that renders a labeled number input with an inline unit suffix.

- The component SHALL accept props: `label: string`, `value: string`, `onChange: (v: string) => void`, `suffix?: string`, `min?: number`.
- The component SHALL render an `<input>` element with the current value.
- The component SHALL render the suffix (if provided) as an inline indicator adjacent to the input.
- The `onChange` handler SHALL be called with the raw string value on each input change.

#### Scenario: NumberField displays value and suffix

- **WHEN** rendered with `value="50"` and `suffix="ns"`
- **THEN** the input SHALL display "50"
- **AND** the text "ns" SHALL be visible adjacent to the input

#### Scenario: NumberField calls onChange on input

- **WHEN** the user types "42" into the input
- **THEN** `onChange` SHALL be called with the string value

### Requirement: SlewControls component renders linked rise/fall time inputs

A reusable `SlewControls` component SHALL exist at `src/components/ui/SlewControls.tsx` that renders paired rise-time and fall-time inputs with a link toggle.

- The component SHALL accept props: `riseTimeNs: string`, `setRiseTimeNs: (v: string) => void`, `fallTimeNs: string`, `setFallTimeNs: (v: string) => void`, `linked: boolean`, `setLinked: (v: boolean) => void`.
- When `linked` is `true`, changing rise time SHALL also update fall time to the same value (and vice versa).
- When `linked` is `false`, rise and fall time SHALL be independently editable.
- A toggle button SHALL allow the user to switch between linked and unlinked modes.

#### Scenario: Linked mode synchronizes rise and fall

- **WHEN** `linked` is `true` and the user changes rise time to "3"
- **THEN** `setRiseTimeNs` SHALL be called with "3"
- **AND** `setFallTimeNs` SHALL be called with "3"

#### Scenario: Unlinked mode allows independent editing

- **WHEN** `linked` is `false` and the user changes rise time to "3"
- **THEN** `setRiseTimeNs` SHALL be called with "3"
- **AND** `setFallTimeNs` SHALL NOT be called

#### Scenario: Toggle button switches link state

- **WHEN** the user clicks the link toggle button
- **THEN** `setLinked` SHALL be called with the opposite of the current `linked` value

### Requirement: ColorDotPicker component renders a palette grid

A reusable `ColorDotPicker` component SHALL exist at `src/components/ui/ColorDotPicker.tsx` that renders a row of selectable color dots from a palette.

- The component SHALL accept props: `value: string`, `onChange: (color: string) => void`, `palette: string[]`, `usedColors?: Set<string>`.
- The component SHALL render one dot per palette entry.
- The currently selected color (matching `value`) SHALL be visually distinguished (ring/border).
- Colors present in `usedColors` SHALL be visually dimmed but still selectable.
- Clicking a dot SHALL invoke `onChange` with that color.

#### Scenario: Active color shows visual indicator

- **WHEN** rendered with `value="#22d3ee"` and that color is in the palette
- **THEN** the dot for `#22d3ee` SHALL have a distinguishing ring or border

#### Scenario: Clicking a dot selects it

- **WHEN** the user clicks the dot for color `#f59e0b`
- **THEN** `onChange` SHALL be called with `"#f59e0b"`

#### Scenario: Used colors are dimmed

- **WHEN** `usedColors` contains `"#a78bfa"`
- **THEN** the dot for `#a78bfa` SHALL have reduced opacity or a dimmed appearance

### Requirement: TypeChipSelector component renders a generic type picker

A reusable `TypeChipSelector` component SHALL exist at `src/components/ui/TypeChipSelector.tsx` that renders a row of selectable type chips given a generic type definition array.

- The component SHALL accept generic props: `types: T[]`, `value: string`, `onChange: (id: string) => void`, `getId: (t: T) => string`, `getLabel: (t: T) => string`, `getIcon?: (t: T) => ReactNode`, `getSymbol?: (t: T) => string`, `getBlurb?: (t: T) => string`, `getActiveClass: (t: T) => string`, `columns?: number`.
- The active chip (matching `value`) SHALL be visually highlighted with the swatch color.
- Inactive chips SHALL have a neutral/muted appearance.
- Clicking a chip SHALL invoke `onChange` with that type's id.

#### Scenario: Active chip is highlighted

- **WHEN** rendered with `value="CLOCK"` and types include a CLOCK entry
- **THEN** the CLOCK chip SHALL have a highlighted/accented appearance

#### Scenario: Clicking an inactive chip selects it

- **WHEN** the user clicks the "BUS" chip while value is "CLOCK"
- **THEN** `onChange` SHALL be called with `"BUS"`
