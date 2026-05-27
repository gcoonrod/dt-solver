import { describe, expect, it } from "vitest";

import {
  formatChannelLabelDisplay,
  formatSignalDisplay,
} from "@/components/features/signalDisplay";
import type { BusSignal, ClockSignal, LineSignal } from "@/types/signal";

const clock: ClockSignal = {
  id: "clk",
  type: "CLOCK",
  name: "CLK",
  frequencyMHz: 10, // T = 100 ns; HIGH for [0, 50), LOW for [50, 100)
  dutyCycle: 0.5,
  phaseOffsetNs: 0,
};

const dataWithValue: BusSignal = {
  id: "bus",
  type: "BUS",
  name: "BUS",
  baseState: "HIGH_Z",
  widthBits: 8,
  transitions: [
    { id: "t-0", timeNs: 0, newState: "HIGH_Z", direction: "TRANSITION" },
    { id: "t-1", timeNs: 10, newState: "VALID", direction: "TRANSITION", value: "0xA9" },
  ],
};

const dataPlainHigh: LineSignal = {
  id: "rw",
  type: "LINE",
  name: "RW",
  baseState: "HIGH",
  transitions: [{ id: "rw-0", timeNs: 0, newState: "HIGH", direction: "RISING" }],
};

const dataPlainLow: LineSignal = {
  id: "rw",
  type: "LINE",
  name: "RW",
  baseState: "LOW",
  transitions: [{ id: "rw-0", timeNs: 0, newState: "LOW", direction: "FALLING" }],
};

const dataInvalid: BusSignal = {
  id: "addr",
  type: "BUS",
  name: "ADDR",
  baseState: "INVALID",
  widthBits: 16,
  transitions: [{ id: "a-0", timeNs: 0, newState: "INVALID", direction: "TRANSITION" }],
};

describe("formatSignalDisplay", () => {
  it("renders a clock HIGH instant as '1'", () => {
    expect(formatSignalDisplay(clock, 10)).toBe("1");
  });

  it("renders a clock LOW instant as '0'", () => {
    expect(formatSignalDisplay(clock, 60)).toBe("0");
  });

  it("prefers an explicit transition value over a state glyph", () => {
    expect(formatSignalDisplay(dataWithValue, 50)).toBe("0xA9");
  });

  it("renders HIGH_Z as 'Z' when no explicit value is set", () => {
    expect(formatSignalDisplay(dataWithValue, 0)).toBe("Z");
  });

  it("renders a HIGH data signal as '1'", () => {
    expect(formatSignalDisplay(dataPlainHigh, 0)).toBe("1");
  });

  it("renders a LOW data signal as '0'", () => {
    expect(formatSignalDisplay(dataPlainLow, 0)).toBe("0");
  });

  it("renders an INVALID state as its first letter", () => {
    expect(formatSignalDisplay(dataInvalid, 0)).toBe("I");
  });
});

describe("formatChannelLabelDisplay", () => {
  it("renders a clock HIGH instant as 'HIGH'", () => {
    expect(formatChannelLabelDisplay(clock, 10)).toBe("HIGH");
  });

  it("renders a clock LOW instant as 'LOW'", () => {
    expect(formatChannelLabelDisplay(clock, 60)).toBe("LOW");
  });

  it("renders HIGH_Z as 'HiZ' (channel-row variant)", () => {
    expect(formatChannelLabelDisplay(dataWithValue, 0)).toBe("HiZ");
  });

  it("prefers an explicit transition value over a state glyph", () => {
    expect(formatChannelLabelDisplay(dataWithValue, 50)).toBe("0xA9");
  });
});
