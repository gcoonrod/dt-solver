import type { ReactNode } from "react";

import type {
  EdgeDirection,
  SignalState,
  SignalTypeId,
  TransitionEvent,
} from "@/types/signal";

// ============================================================================
// Type taxonomy
// ============================================================================

export type SBSwatch = "sky" | "amber" | "violet";

export interface SBTypeDef {
  id: SignalTypeId;
  label: string;
  sym: string;
  icon: ReactNode;
  swatch: SBSwatch;
  blurb: string;
}

const SB_ICON_CLOCK = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 16h3v-8h4v8h4v-8h4v8h3" />
  </svg>
);

const SB_ICON_BUS = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <g><path d="M3 8h3l2 -2h8l2 2h3" /><path d="M3 16h3l2 2h8l2 -2h3" /></g>
  </svg>
);

const SB_ICON_LINE = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12h4l2-6 4 12 2-6h8" />
  </svg>
);

export const TYPE_DEFS: SBTypeDef[] = [
  { id: "CLOCK", label: "Clock", sym: "clk", icon: SB_ICON_CLOCK, swatch: "sky", blurb: "Periodic signal with frequency, duty cycle, and phase offset." },
  { id: "BUS", label: "Bus", sym: "[n:0]", icon: SB_ICON_BUS, swatch: "amber", blurb: "Multi-bit data bus with transitions between valid/invalid states." },
  { id: "LINE", label: "Line", sym: "1b", icon: SB_ICON_LINE, swatch: "violet", blurb: "Single-bit signal with high/low transitions." },
];

export const TYPE_DEF_BY_ID: Record<SignalTypeId, SBTypeDef> = Object.fromEntries(
  TYPE_DEFS.map((d) => [d.id, d]),
) as Record<SignalTypeId, SBTypeDef>;

export const SWATCH_SB: Record<SBSwatch, { active: string; icon: string }> = {
  sky: {
    active: "bg-sky-500/10 border-sky-500/30 text-sky-300 shadow-[inset_0_1px_3px_rgba(56,189,248,0.08)] font-medium",
    icon: "bg-sky-500/15 border-sky-500/30 text-sky-300",
  },
  amber: {
    active: "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-[inset_0_1px_3px_rgba(245,158,11,0.08)] font-medium",
    icon: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  },
  violet: {
    active: "bg-violet-500/10 border-violet-500/30 text-violet-300 shadow-[inset_0_1px_3px_rgba(167,139,250,0.08)] font-medium",
    icon: "bg-violet-500/15 border-violet-500/30 text-violet-300",
  },
};

// ============================================================================
// Constants
// ============================================================================

export const FREQ_UNITS = ["Hz", "kHz", "MHz", "GHz"] as const;
export type FreqUnit = (typeof FREQ_UNITS)[number];
export const FREQ_TO_MHZ: Record<FreqUnit, number> = { Hz: 1e-6, kHz: 1e-3, MHz: 1, GHz: 1e3 };

export const COLOR_PALETTE = [
  "#22d3ee", "#f59e0b", "#a78bfa", "#f472b6",
  "#a3e635", "#fb7185", "#38bdf8", "#34d399",
];

export function bestUnitForMHz(mhz: number): { value: number; unit: FreqUnit } {
  if (mhz >= 1000) return { value: mhz / 1000, unit: "GHz" };
  if (mhz >= 1) return { value: mhz, unit: "MHz" };
  if (mhz >= 0.001) return { value: mhz * 1000, unit: "kHz" };
  return { value: mhz * 1e6, unit: "Hz" };
}

// ============================================================================
// Time formatting for rulers
// ============================================================================

export function sbFormatTime(ns: number): string {
  const abs = Math.abs(ns);
  if (abs < 0.001) return `${(ns * 1e6).toFixed(0)} fs`;
  if (abs < 1) return `${(ns * 1000).toFixed(1)} ps`;
  if (abs < 1000) return `${ns.toFixed(1)} ns`;
  if (abs < 1e6) return `${(ns / 1000).toFixed(2)} µs`;
  return `${(ns / 1e6).toFixed(3)} ms`;
}

export function sbFormatTickWithStep(t: number, niceStep: number): string {
  let unit: string;
  let divisor: number;
  if (niceStep < 0.001) {
    unit = "fs"; divisor = 1e-6;
  } else if (niceStep < 1) {
    unit = "ps"; divisor = 0.001;
  } else if (niceStep < 1000) {
    unit = "ns"; divisor = 1;
  } else if (niceStep < 1e6) {
    unit = "µs"; divisor = 1000;
  } else {
    unit = "ms"; divisor = 1e6;
  }
  const v = t / divisor;
  const s = Number.isInteger(v) ? v.toString() : v.toFixed(1);
  return `${s} ${unit}`;
}

// ============================================================================
// Default transition seeds
// ============================================================================

export function defaultTransitions(typeId: SignalTypeId): TransitionEvent[] {
  if (typeId === "BUS") {
    return [
      { id: "sb-t1", timeNs: 20, newState: "VALID", direction: "TRANSITION", value: "0x00" },
      { id: "sb-t2", timeNs: 45, newState: "INVALID", direction: "TRANSITION" },
      { id: "sb-t3", timeNs: 70, newState: "VALID", direction: "TRANSITION", value: "0xFF" },
    ];
  }
  return [
    { id: "sb-t1", timeNs: 20, newState: "HIGH", direction: "RISING" },
    { id: "sb-t2", timeNs: 50, newState: "LOW", direction: "FALLING" },
    { id: "sb-t3", timeNs: 80, newState: "HIGH", direction: "RISING" },
  ];
}

export function directionForState(state: SignalState, typeId: SignalTypeId): EdgeDirection {
  if (typeId === "BUS") return "TRANSITION";
  if (state === "HIGH") return "RISING";
  if (state === "LOW") return "FALLING";
  return "TRANSITION";
}
