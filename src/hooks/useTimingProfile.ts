import { useTimingStore } from "@/store/useTimingStore";
import type { TimingProfile } from "@/types/profile";

export function useTimingProfile(): {
  activeProfile: TimingProfile;
  setActiveProfile: (profile: TimingProfile) => void;
} {
  const activeProfile = useTimingStore((s) => s.activeProfile);
  const setActiveProfile = useTimingStore((s) => s.setActiveProfile);
  return { activeProfile, setActiveProfile };
}
