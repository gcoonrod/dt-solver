import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import ComponentLibrary from "@/components/panels/ComponentLibrary";
import { useTimingStore } from "@/store/useTimingStore";
import { TEST_STORE_STATE } from "@/test/fixtures";



beforeEach(() => {
  useTimingStore.setState(TEST_STORE_STATE);
});

afterEach(() => {
  cleanup();
});

describe("ComponentLibrary", () => {
  it("renders every seeded signal by its display name", () => {
    render(<ComponentLibrary />);
    for (const sig of useTimingStore.getState().activeProfile.signals) {
      expect(screen.getByText(sig.name)).toBeInTheDocument();
    }
  });

  it("shows the profile name and signal count in the header", () => {
    render(<ComponentLibrary />);
    const { name, signals } = useTimingStore.getState().activeProfile;
    expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getByText(String(signals.length))).toBeInTheDocument();
  });

  it("clicking Add Signal calls openSignalBuilder() instead of adding directly", async () => {
    const user = userEvent.setup();
    const beforeCount = useTimingStore.getState().signals.length;
    render(<ComponentLibrary />);

    await user.click(screen.getByRole("button", { name: /add signal/i }));

    const state = useTimingStore.getState();
    expect(state.signalBuilderOpen).toBe(true);
    expect(state.signalBuilderInitial).toBeNull();
    expect(state.signals.length).toBe(beforeCount);
  });

  it("clicking Clock shortcut calls openSignalBuilder({ mode: 'CLOCK' })", async () => {
    const user = userEvent.setup();
    render(<ComponentLibrary />);

    await user.click(screen.getByRole("button", { name: /clock/i }));

    const state = useTimingStore.getState();
    expect(state.signalBuilderOpen).toBe(true);
    expect(state.signalBuilderInitial).toEqual({ mode: "CLOCK" });
  });

  it("clicking Bus shortcut calls openSignalBuilder({ mode: 'BUS' })", async () => {
    const user = userEvent.setup();
    render(<ComponentLibrary />);

    await user.click(screen.getByRole("button", { name: /bus/i }));

    const state = useTimingStore.getState();
    expect(state.signalBuilderOpen).toBe(true);
    expect(state.signalBuilderInitial).toEqual({ mode: "BUS" });
  });

  it("clicking Line shortcut calls openSignalBuilder({ mode: 'LINE' })", async () => {
    const user = userEvent.setup();
    render(<ComponentLibrary />);

    await user.click(screen.getByRole("button", { name: /line/i }));

    const state = useTimingStore.getState();
    expect(state.signalBuilderOpen).toBe(true);
    expect(state.signalBuilderInitial).toEqual({ mode: "LINE" });
  });

  it("shortcut buttons do not insert signals directly", async () => {
    const user = userEvent.setup();
    const beforeCount = useTimingStore.getState().signals.length;
    render(<ComponentLibrary />);

    await user.click(screen.getByRole("button", { name: /clock/i }));
    expect(useTimingStore.getState().signals.length).toBe(beforeCount);

    // Reset and close the builder before clicking Bus
    useTimingStore.setState({ signalBuilderOpen: false, signalBuilderInitial: null });
    await user.click(screen.getByRole("button", { name: /bus/i }));
    expect(useTimingStore.getState().signals.length).toBe(beforeCount);
  });
});
