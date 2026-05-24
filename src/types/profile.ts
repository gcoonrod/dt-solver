import type { Constraint } from "./constraint";
import type { AnySignal } from "./signal";

export interface TimingProfile {
  id: string;
  name: string;
  description: string;
  signals: AnySignal[];
  constraints: Constraint[];
  defaultWindowNs: { tMinNs: number; tMaxNs: number };
}
