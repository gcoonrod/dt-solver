// W65C02S microprocessor @ 14 MHz / 5.0 V — bus read/write cycle profile.
// AC characteristics modeled per the WDC datasheet (approximate; values intended
// to exercise the solver with one realistic FAIL case for the demo scene).
//
// All edges carry rise/fall time (`riseTimeNs`/`fallTimeNs`) so the solver
// works at conservative endpoints (anchor.startNs / target.endNs for setup).
// Transition timestamps below name the *50%* midpoint of each edge; the
// physical edge spans midNs ± slew/2.
//
// Period @ 14 MHz: T = 71.43 ns. The scene captures the first two PHI2 cycles
// (a read followed by a write).
//
//        |<-- read cycle -->|<-- write cycle -->|
//   PHI2: ___/‾‾‾‾‾\_______/‾‾‾‾‾\_______/‾‾‾‾‾
//          0       35.7    71.4   107.1   142.9
//
// All times in nanoseconds.

import type { AnySignal } from "@/types/signal";
import type { Constraint } from "@/types/constraint";

export const W65C02S_14MHz_signals: AnySignal[] = [
  {
    id: "phi2",
    type: "CLOCK",
    name: "PHI2",
    description: "System clock — 14 MHz",
    color: "#22d3ee",
    frequencyMHz: 14,
    dutyCycle: 0.5,
    phaseOffsetNs: 0,
    riseTimeNs: 2,
    fallTimeNs: 2,
  },
  {
    id: "addr",
    type: "DATA",
    name: "ADDR[15:0]",
    description: "CPU address bus",
    color: "#f59e0b",
    widthBits: 16,
    baseState: "INVALID",
    riseTimeNs: 3,
    fallTimeNs: 3,
    transitions: [
      { id: "addr-1", timeNs: 0,    newState: "INVALID", direction: "TRANSITION", value: "----" },
      { id: "addr-2", timeNs: 15,   newState: "VALID",   direction: "TRANSITION", value: "0xC000" },
      { id: "addr-3", timeNs: 71.4, newState: "INVALID", direction: "TRANSITION", value: "----" },
      { id: "addr-4", timeNs: 86,   newState: "VALID",   direction: "TRANSITION", value: "0xC001" },
    ],
  },
  {
    id: "rw",
    type: "DATA",
    name: "R/W̄",
    description: "Read (high) / write (low)",
    color: "#a78bfa",
    baseState: "HIGH",
    riseTimeNs: 3,
    fallTimeNs: 3,
    transitions: [
      { id: "rw-1", timeNs: 0,  newState: "HIGH", direction: "RISING",  value: "1" },
      { id: "rw-2", timeNs: 83, newState: "LOW",  direction: "FALLING", value: "0" },
    ],
  },
  {
    id: "data",
    type: "DATA",
    name: "DATA[7:0]",
    description: "Memory data bus",
    color: "#f472b6",
    widthBits: 8,
    baseState: "HIGH_Z",
    riseTimeNs: 3,
    fallTimeNs: 3,
    transitions: [
      { id: "data-1", timeNs: 0,   newState: "HIGH_Z", direction: "TRANSITION" },
      { id: "data-2", timeNs: 22,  newState: "VALID",  direction: "TRANSITION", value: "0xA9" },
      { id: "data-3", timeNs: 50,  newState: "HIGH_Z", direction: "TRANSITION" },
      { id: "data-4", timeNs: 93,  newState: "VALID",  direction: "TRANSITION", value: "0x55" },
      { id: "data-5", timeNs: 130, newState: "HIGH_Z", direction: "TRANSITION" },
    ],
  },
  {
    id: "cs",
    type: "DATA",
    name: "CS̄",
    description: "Chip select (active low)",
    color: "#a3e635",
    baseState: "HIGH",
    riseTimeNs: 3,
    fallTimeNs: 3,
    transitions: [
      { id: "cs-1", timeNs: 0,   newState: "HIGH", direction: "RISING"  },
      { id: "cs-2", timeNs: 8,   newState: "LOW",  direction: "FALLING" },
      { id: "cs-3", timeNs: 50,  newState: "HIGH", direction: "RISING"  },
      { id: "cs-4", timeNs: 78,  newState: "LOW",  direction: "FALLING" },
      { id: "cs-5", timeNs: 122, newState: "HIGH", direction: "RISING"  },
    ],
  },
];

export const W65C02S_14MHz_constraints: Constraint[] = [
  {
    id: "tads",
    name: "tADS — Address Setup",
    type: "SETUP",
    anchor: { signalId: "phi2", edgeDirection: "FALLING" },
    target: { signalId: "addr", edgeDirection: "TRANSITION" },
    minNs: 30,
  },
  {
    id: "tah",
    name: "tAH — Address Hold",
    type: "HOLD",
    anchor: { signalId: "phi2", edgeDirection: "FALLING" },
    target: { signalId: "addr", edgeDirection: "TRANSITION" },
    minNs: 10,
  },
  {
    id: "tdsr",
    name: "tDSR — Data Read Setup",
    type: "SETUP",
    anchor: { signalId: "phi2", edgeDirection: "FALLING" },
    target: { signalId: "data", edgeDirection: "TRANSITION" },
    minNs: 10,
  },
  {
    id: "tbvd",
    name: "tBVD — Address Valid Delay",
    type: "PROP_DELAY",
    anchor: { signalId: "phi2", edgeDirection: "RISING" },
    target: { signalId: "addr", edgeDirection: "TRANSITION" },
    maxNs: 30,
  },
  {
    id: "trws",
    name: "tRWS — R/W̄ Setup",
    type: "SETUP",
    anchor: { signalId: "phi2", edgeDirection: "FALLING" },
    target: { signalId: "rw",   edgeDirection: "TRANSITION" },
    minNs: 20,
  },
  {
    id: "tcs",
    name: "tCS — Chip Select Setup",
    type: "SETUP",
    anchor: { signalId: "phi2", edgeDirection: "FALLING" },
    target: { signalId: "cs",   edgeDirection: "FALLING" },
    minNs: 25,
  },
];

export interface TimingProfile {
  id: string;
  name: string;
  description: string;
  signals: AnySignal[];
  constraints: Constraint[];
  defaultWindowNs: { tMinNs: number; tMaxNs: number };
}

export const W65C02S_14MHz: TimingProfile = {
  id: "w65c02s-14mhz",
  name: "W65C02S @ 14 MHz",
  description: "WDC W65C02S microprocessor running at 14 MHz / 5.0 V",
  signals: W65C02S_14MHz_signals,
  constraints: W65C02S_14MHz_constraints,
  defaultWindowNs: { tMinNs: 0, tMaxNs: 150 },
};
