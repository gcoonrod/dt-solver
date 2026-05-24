import { create } from "zustand";

import { solve } from "@/core/solver";
import { W65C02S_14MHz } from "@/data/w65c02s-14mhz";
import type { Constraint } from "@/types/constraint";
import type { TimingProfile } from "@/types/profile";
import type { AnySignal } from "@/types/signal";

export interface TimingState {
  // ----- domain -----
  // `activeProfile` is the as-loaded snapshot — the source for the title bar
  // and future "revert to profile" actions. `signals` / `constraints` are the
  // editable working copy that addSignal/removeSignal/addConstraint/removeConstraint
  // mutate. They drift from `activeProfile.signals` / `.constraints` after any
  // such edit; `setActiveProfile` is the only path that re-syncs them.
  activeProfile: TimingProfile;
  signals: AnySignal[];
  constraints: Constraint[];
  solved: Constraint[];

  // ----- viewport / interaction -----
  tMinNs: number;
  tMaxNs: number;
  cursorTimeNs: number;
  hoveredConstraintId: string | null;
  selectedSignalId: string | null;

  // ----- modal lifecycle (constraint builder) -----
  builderOpen: boolean;
  builderInitial: Constraint | null;

  // ----- actions -----
  resolve: () => void;
  setActiveProfile: (profile: TimingProfile) => void;
  addSignal: (sig: AnySignal) => void;
  removeSignal: (id: string) => void;
  addConstraint: (c: Constraint) => void;
  removeConstraint: (id: string) => void;
  setCursor: (timeNs: number) => void;
  setViewport: (tMinNs: number, tMaxNs: number) => void;
  hoverConstraint: (id: string | null) => void;
  selectSignal: (id: string | null) => void;
  zoomAt: (centerNs: number, factor: number) => void;
  fitView: () => void;
  openBuilder: (initial?: Constraint) => void;
  closeBuilder: () => void;
}

const profile = W65C02S_14MHz;
const initialSolved = solve(profile.signals, profile.constraints, 1000);

export const useTimingStore = create<TimingState>()((set, get) => ({
  activeProfile: profile,
  signals: profile.signals,
  constraints: profile.constraints,
  solved: initialSolved,

  tMinNs: profile.defaultWindowNs.tMinNs,
  tMaxNs: profile.defaultWindowNs.tMaxNs,
  cursorTimeNs: 35.7,
  hoveredConstraintId: null,
  selectedSignalId: null,

  builderOpen: false,
  builderInitial: null,

  resolve() {
    const s = get();
    set({ solved: solve(s.signals, s.constraints, Math.max(s.tMaxNs * 4, 1000)) });
  },
  setActiveProfile(p) {
    set({
      activeProfile: p,
      signals: p.signals,
      constraints: p.constraints,
      tMinNs: p.defaultWindowNs.tMinNs,
      tMaxNs: p.defaultWindowNs.tMaxNs,
      solved: solve(p.signals, p.constraints, Math.max(p.defaultWindowNs.tMaxNs * 4, 1000)),
    });
  },
  addSignal(sig) {
    set((s) => ({ signals: [...s.signals, sig] }));
    get().resolve();
  },
  removeSignal(id) {
    set((s) => ({
      signals: s.signals.filter((x) => x.id !== id),
      constraints: s.constraints.filter(
        (c) => c.anchor.signalId !== id && c.target.signalId !== id,
      ),
    }));
    get().resolve();
  },
  addConstraint(c) {
    set((s) => ({ constraints: [...s.constraints, c] }));
    get().resolve();
  },
  removeConstraint(id) {
    set((s) => ({ constraints: s.constraints.filter((c) => c.id !== id) }));
    get().resolve();
  },
  setCursor(timeNs) {
    set({ cursorTimeNs: timeNs });
  },
  setViewport(tMinNs, tMaxNs) {
    set({ tMinNs, tMaxNs });
  },
  hoverConstraint(id) {
    set({ hoveredConstraintId: id });
  },
  selectSignal(id) {
    set((s) => ({ selectedSignalId: s.selectedSignalId === id ? null : id }));
  },
  zoomAt(centerNs, factor) {
    const s = get();
    const span = s.tMaxNs - s.tMinNs;
    const newSpan = Math.min(Math.max(span * factor, 5), 5000);
    const ratio = (centerNs - s.tMinNs) / span;
    const nMin = Math.max(0, centerNs - ratio * newSpan);
    set({ tMinNs: nMin, tMaxNs: nMin + newSpan });
  },
  fitView() {
    const { defaultWindowNs } = get().activeProfile;
    set({
      tMinNs: defaultWindowNs.tMinNs,
      tMaxNs: defaultWindowNs.tMaxNs,
    });
  },
  openBuilder(initial) {
    set({ builderOpen: true, builderInitial: initial ?? null });
  },
  closeBuilder() {
    set({ builderOpen: false, builderInitial: null });
  },
}));
