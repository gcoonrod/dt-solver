import type { EdgeDirection } from "./signal";

export type ConstraintType = 
  | 'SETUP'       // tADS (Address Setup)
  | 'HOLD'        // tAH (Address Hold)
  | 'PROP_DELAY'  // tPLZ, tPZL (Propagation delay)
  | 'MIN_PULSE'   // tPWH, tPWL (Pulse width high/low)
  | 'CYCLE_TIME'; // tCYC

// Points to a specific edge on a specific signal
export interface SignalReference {
  signalId: string;
  edgeDirection: EdgeDirection;
  occurrenceIndex?: number; // e.g., The 1st falling edge vs the 2nd
}

export interface Constraint {
  id: string;
  name: string;           // e.g., "tADS"
  type: ConstraintType;
  
  anchor: SignalReference; // The reference event (e.g., Clock falling edge)
  target: SignalReference; // The constrained event (e.g., Bus becoming valid)
  
  minNs?: number;         // Minimum required time (e.g., >= 30ns)
  maxNs?: number;         // Maximum allowed time
  
  // Computed by the engine, consumed by the UI
  status?: 'PASS' | 'FAIL' | 'UNRESOLVED';
  calculatedMarginNs?: number; 
}