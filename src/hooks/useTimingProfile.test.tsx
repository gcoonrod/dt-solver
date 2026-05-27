import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useTimingProfile } from "@/hooks/useTimingProfile";
import { useTimingStore } from "@/store/useTimingStore";
import type { TimingProfile } from "@/types/profile";

const INITIAL = useTimingStore.getInitialState();

beforeEach(() => {
  useTimingStore.setState(INITIAL, true);
});

describe("useTimingProfile", () => {
  it("returns the live store value for activeProfile and setActiveProfile", () => {
    const { result } = renderHook(() => useTimingProfile());

    expect(result.current.activeProfile).toBe(
      useTimingStore.getState().activeProfile,
    );
    expect(result.current.setActiveProfile).toBe(
      useTimingStore.getState().setActiveProfile,
    );
  });

  it("re-runs the consumer after setActiveProfile is dispatched from outside", () => {
    const { result } = renderHook(() => useTimingProfile());
    const initialName = result.current.activeProfile.name;

    const p2: TimingProfile = {
      id: "alt",
      name: "Alt Profile For Hook Test",
      description: "",
      signals: [],
      constraints: [],
      defaultWindowNs: { tMinNs: 0, tMaxNs: 10 },
    };

    act(() => {
      useTimingStore.getState().setActiveProfile(p2);
    });

    expect(result.current.activeProfile.name).not.toBe(initialName);
    expect(result.current.activeProfile.name).toBe("Alt Profile For Hook Test");
    expect(result.current.activeProfile).toBe(p2);
  });
});
