import { solve } from "@/core/solver";
import { W65C02S_14MHz } from "@/data/w65c02s-14mhz";
import type { TimingState } from "@/store/useTimingStore";

const profile = W65C02S_14MHz;
const solved = solve(profile.signals, profile.constraints, 1000);

export const TEST_STORE_STATE: Partial<TimingState> = {
  profileId: profile.id,
  isDirty: false,
  isSaving: false,
  isLoading: false,
  profileList: [],
  icLibrary: [],
  activeProfile: profile,
  signals: profile.signals,
  constraints: profile.constraints,
  solved,
  tMinNs: profile.defaultWindowNs.tMinNs,
  tMaxNs: profile.defaultWindowNs.tMaxNs,
  cursorTimeNs: 35.7,
  hoveredConstraintId: null,
  selectedSignalId: null,
  builderOpen: false,
  builderInitial: null,
  signalBuilderOpen: false,
  signalBuilderInitial: null,
};
