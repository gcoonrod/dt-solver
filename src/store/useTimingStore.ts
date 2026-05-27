import { create } from "zustand";

import { solve } from "@/core/solver";
import type { Constraint } from "@/types/constraint";
import type { TimingProfile } from "@/types/profile";
import type { AnySignal, SignalBuilderInitial } from "@/types/signal";

export type { SignalBuilderInitial };

export interface ProfileListItem {
  id: string;
  name: string;
  updated_at: string;
}

export interface TimingState {
  // ----- persistence -----
  profileId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  profileList: ProfileListItem[];

  // ----- domain -----
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

  // ----- modal lifecycle (signal builder) -----
  signalBuilderOpen: boolean;
  signalBuilderInitial: SignalBuilderInitial | null;

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
  openSignalBuilder: (initial?: SignalBuilderInitial) => void;
  closeSignalBuilder: () => void;

  // ----- persistence actions -----
  fetchProfileList: () => Promise<void>;
  loadProfile: (id: string) => Promise<void>;
  saveProfile: () => Promise<void>;
  createProfile: (name: string) => Promise<string>;
  deleteProfile: (id: string) => Promise<void>;
}

const emptyProfile: TimingProfile = {
  id: "",
  name: "",
  description: "",
  signals: [],
  constraints: [],
  defaultWindowNs: { tMinNs: 0, tMaxNs: 150 },
};

export const useTimingStore = create<TimingState>()((set, get) => ({
  profileId: null,
  isDirty: false,
  isSaving: false,
  isLoading: true,
  profileList: [],

  activeProfile: emptyProfile,
  signals: [],
  constraints: [],
  solved: [],

  tMinNs: 0,
  tMaxNs: 150,
  cursorTimeNs: 0,
  hoveredConstraintId: null,
  selectedSignalId: null,

  builderOpen: false,
  builderInitial: null,

  signalBuilderOpen: false,
  signalBuilderInitial: null,

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
    set((s) => ({ signals: [...s.signals, sig], isDirty: true }));
    get().resolve();
  },
  removeSignal(id) {
    set((s) => ({
      signals: s.signals.filter((x) => x.id !== id),
      constraints: s.constraints.filter(
        (c) => c.anchor.signalId !== id && c.target.signalId !== id,
      ),
      isDirty: true,
    }));
    get().resolve();
  },
  addConstraint(c) {
    set((s) => ({ constraints: [...s.constraints, c], isDirty: true }));
    get().resolve();
  },
  removeConstraint(id) {
    set((s) => ({ constraints: s.constraints.filter((c) => c.id !== id), isDirty: true }));
    get().resolve();
  },
  setCursor(timeNs) {
    set({ cursorTimeNs: timeNs });
  },
  setViewport(tMinNs, tMaxNs) {
    set({ tMinNs, tMaxNs, isDirty: true });
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
  openSignalBuilder(initial) {
    set({ signalBuilderOpen: true, signalBuilderInitial: initial ?? null });
  },
  closeSignalBuilder() {
    set({ signalBuilderOpen: false, signalBuilderInitial: null });
  },

  async fetchProfileList() {
    const res = await fetch("/api/profiles");
    if (!res.ok) return;
    const list = await res.json() as ProfileListItem[];
    set({ profileList: list });
  },

  async loadProfile(id: string) {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/profiles/${id}`);
      if (!res.ok) return;
      const row = await res.json() as { id: string; name: string; description: string | null; data: { signals: AnySignal[]; constraints: Constraint[]; viewport: { tMinNs: number; tMaxNs: number } } };
      const profile: TimingProfile = {
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        signals: row.data.signals,
        constraints: row.data.constraints,
        defaultWindowNs: row.data.viewport,
      };
      get().setActiveProfile(profile);
      set({ profileId: row.id, isDirty: false });
    } finally {
      set({ isLoading: false });
    }
  },

  async saveProfile() {
    const s = get();
    if (!s.profileId || !s.isDirty) return;
    const savingProfileId = s.profileId;
    set({ isSaving: true });
    try {
      const data = {
        signals: s.signals,
        constraints: s.constraints,
        viewport: { tMinNs: s.tMinNs, tMaxNs: s.tMaxNs },
      };
      const res = await fetch(`/api/profiles/${savingProfileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: s.activeProfile.name, data }),
      });
      if (res.ok && get().profileId === savingProfileId) {
        set({ isDirty: false });
        get().fetchProfileList();
      }
    } finally {
      set({ isSaving: false });
    }
  },

  async createProfile(name: string) {
    const id = `profile-${Date.now().toString(36)}`;
    const data = { signals: [], constraints: [], viewport: { tMinNs: 0, tMaxNs: 150 } };
    await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name, data }),
    });
    await get().fetchProfileList();
    await get().loadProfile(id);
    return id;
  },

  async deleteProfile(id: string) {
    await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    await get().fetchProfileList();
    const s = get();
    if (s.profileId === id && s.profileList.length > 0) {
      await get().loadProfile(s.profileList[0].id);
    } else if (s.profileList.length === 0) {
      set({
        profileId: null,
        activeProfile: emptyProfile,
        signals: [],
        constraints: [],
        solved: [],
        isDirty: false,
        tMinNs: emptyProfile.defaultWindowNs.tMinNs,
        tMaxNs: emptyProfile.defaultWindowNs.tMaxNs,
        isLoading: false,
      });
    }
  },
}));
