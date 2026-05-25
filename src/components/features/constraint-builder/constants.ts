import type { ConstraintType } from "@/types/constraint";
import type { AnySignal, EdgeDirection } from "@/types/signal";

export type Swatch = "sky" | "violet" | "amber" | "emerald" | "slate";

export interface TypeDef {
  id: ConstraintType;
  label: string;
  sym: string;
  blurb: string;
  inequality: string;
  bounds: "min" | "max";
  sameSignal: boolean;
  swatch: Swatch;
  accent: string;
}

export const TYPE_DEFS: TypeDef[] = [
  {
    id: "SETUP",
    label: "Setup",
    sym: "tSU",
    blurb: "Target settles a minimum time before the anchor edge.",
    inequality: "Δ ≥ tSU,min",
    bounds: "min",
    sameSignal: false,
    swatch: "sky",
    accent: "#38bdf8",
  },
  {
    id: "HOLD",
    label: "Hold",
    sym: "tH",
    blurb: "Target remains stable a minimum time after the anchor edge.",
    inequality: "Δ ≥ tH,min",
    bounds: "min",
    sameSignal: false,
    swatch: "violet",
    accent: "#a78bfa",
  },
  {
    id: "PROP_DELAY",
    label: "Prop Delay",
    sym: "tPD",
    blurb: "Target follows the anchor edge within a maximum delay.",
    inequality: "Δ ≤ tPD,max",
    bounds: "max",
    sameSignal: false,
    swatch: "amber",
    accent: "#f59e0b",
  },
  {
    id: "MIN_PULSE",
    label: "Min Pulse",
    sym: "tW",
    blurb: "Pulse width on the anchor signal must exceed the minimum.",
    inequality: "pw ≥ tW,min",
    bounds: "min",
    sameSignal: true,
    swatch: "emerald",
    accent: "#34d399",
  },
  {
    id: "CYCLE_TIME",
    label: "Cycle Time",
    sym: "tCYC",
    blurb: "Period between successive same-direction anchor edges.",
    inequality: "T ≥ tCYC,min",
    bounds: "min",
    sameSignal: true,
    swatch: "slate",
    accent: "#94a3b8",
  },
];

export const TYPE_DEF_BY_ID: Record<ConstraintType, TypeDef> = Object.fromEntries(
  TYPE_DEFS.map((d) => [d.id, d]),
) as Record<ConstraintType, TypeDef>;

export const SWATCH_BG: Record<Swatch, string> = {
  sky: "bg-sky-500/10 border-sky-500/30 text-sky-300",
  violet: "bg-violet-500/10 border-violet-500/30 text-violet-300",
  amber: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  slate: "bg-slate-500/10 border-slate-500/40 text-slate-300",
};

export interface EdgeOption {
  id: EdgeDirection;
  label: string;
  arrow: string;
}

export function edgeOptionsFor(sig: AnySignal | undefined): EdgeOption[] {
  if (!sig) return [{ id: "TRANSITION", label: "Any", arrow: "⤳" }];
  if (sig.type === "CLOCK") {
    return [
      { id: "RISING", label: "Rising", arrow: "↑" },
      { id: "FALLING", label: "Falling", arrow: "↓" },
    ];
  }
  return [
    { id: "TRANSITION", label: "Valid", arrow: "⤳" },
    { id: "RISING", label: "Rising", arrow: "↑" },
    { id: "FALLING", label: "Falling", arrow: "↓" },
  ];
}
