import type { AnySignal, EdgeDirection } from "./signal";
import type { ConstraintType } from "./constraint";

export type SignalTemplate = AnySignal & {
  templateId: string;
  pin?: string;
};

export interface ConstraintTemplate {
  templateId: string;
  name: string;
  type: ConstraintType;
  anchorTemplateId: string;
  anchorEdge: EdgeDirection;
  targetTemplateId: string;
  targetEdge: EdgeDirection;
  minNs?: number;
  maxNs?: number;
}

export interface ICDefinition {
  id: string;
  name: string;
  manufacturer: string;
  description: string;
  speedGrades?: string[];
  signals: SignalTemplate[];
  constraints: ConstraintTemplate[];
}
