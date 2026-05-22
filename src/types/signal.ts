export type SignalState = 'HIGH' | 'LOW' | 'HIGH_Z' | 'VALID' | 'INVALID';
export type EdgeDirection = 'RISING' | 'FALLING' | 'TRANSITION';

export interface BaseSignal {
  id: string;
  name: string;        // e.g., "PHI2", "Address Bus"
  description?: string;
  color?: string;      // For the D3 renderer
  /**
   * 10-to-90% rise time in nanoseconds. Undefined or 0 means the edge is
   * treated as instantaneous (the legacy behavior before slew support).
   * Must be non-negative when defined.
   */
  riseTimeNs?: number;
  /**
   * 90-to-10% fall time in nanoseconds. Undefined or 0 means the edge is
   * treated as instantaneous. Must be non-negative when defined.
   */
  fallTimeNs?: number;
}

export interface ClockSignal extends BaseSignal {
  type: 'CLOCK';
  frequencyMHz: number; // e.g., 14 for 14MHz
  dutyCycle: number;    // e.g., 0.5 for 50%
  phaseOffsetNs: number; // For shifting multiple clocks
}

// Represents a specific moment in time for an arbitrary signal
export interface TransitionEvent {
  id: string;
  timeNs: number;
  newState: SignalState;
  direction: EdgeDirection;
  value?: string; // Display value for bus signals (e.g., "0xC000")
}

export interface DataSignal extends BaseSignal {
  type: 'DATA';
  baseState: SignalState; // What it defaults to (e.g., HIGH_Z)
  transitions: TransitionEvent[]; // Order matters, may need to find a different data structure to ensure order is preserved through serialization/deserialization
  widthBits?: number; // For multi-bit buses (e.g., 16 for ADDR[15:0])
}

export type AnySignal = ClockSignal | DataSignal;

/**
 * An edge as an interval rather than an instant. `midNs` is the canonical
 * 50% threshold (what the user typed); `startNs`/`endNs` are derived as
 * `midNs ∓ slew/2` so that floating-point drift cannot desync the three.
 */
export interface EdgeInterval {
  startNs: number;
  midNs: number;
  endNs: number;
  direction: EdgeDirection;
}
