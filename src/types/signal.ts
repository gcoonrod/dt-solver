export type SignalState = 'HIGH' | 'LOW' | 'HIGH_Z' | 'VALID' | 'INVALID';
export type EdgeDirection = 'RISING' | 'FALLING' | 'TRANSITION';

export interface BaseSignal {
  id: string;
  name: string;        // e.g., "PHI2", "Address Bus"
  description?: string;
  color?: string;      // For the D3 renderer
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