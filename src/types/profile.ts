import type { Constraint } from "./constraint";
import type { AnySignal } from "./signal";

export interface Provenance {
  icId: string;
  templateId: string;
  importedAt: string;
}

export interface TimingProfile {
  id: string;
  name: string;
  description: string;
  signals: AnySignal[];
  constraints: Constraint[];
  defaultWindowNs: { tMinNs: number; tMaxNs: number };
}
