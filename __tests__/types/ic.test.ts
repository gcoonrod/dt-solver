import { describe, expect, it } from "vitest";

import { W65C02S_14MHz_IC } from "@/data/w65c02s-14mhz";
import { HM62256_IC } from "@/data/62256-sram";
import type { ICDefinition } from "@/types/ic";

function validateIC(ic: ICDefinition) {
  const signalIds = new Set(ic.signals.map((s) => s.templateId));

  it(`has no duplicate signal templateIds`, () => {
    expect(signalIds.size).toBe(ic.signals.length);
  });

  const constraintIds = new Set(ic.constraints.map((c) => c.templateId));

  it(`has no duplicate constraint templateIds`, () => {
    expect(constraintIds.size).toBe(ic.constraints.length);
  });

  it(`all constraint anchors reference valid signal templates`, () => {
    for (const c of ic.constraints) {
      expect(signalIds.has(c.anchorTemplateId)).toBe(true);
    }
  });

  it(`all constraint targets reference valid signal templates`, () => {
    for (const c of ic.constraints) {
      expect(signalIds.has(c.targetTemplateId)).toBe(true);
    }
  });

  it(`has required metadata fields`, () => {
    expect(ic.id).toBeTruthy();
    expect(ic.name).toBeTruthy();
    expect(ic.manufacturer).toBeTruthy();
    expect(ic.description).toBeTruthy();
  });
}

describe("W65C02S_14MHz_IC", () => {
  validateIC(W65C02S_14MHz_IC);

  it("has 5 signals and 6 constraints", () => {
    expect(W65C02S_14MHz_IC.signals).toHaveLength(5);
    expect(W65C02S_14MHz_IC.constraints).toHaveLength(6);
  });

  it("has WDC as manufacturer", () => {
    expect(W65C02S_14MHz_IC.manufacturer).toBe("WDC");
  });
});

describe("HM62256_IC", () => {
  validateIC(HM62256_IC);

  it("has 5 signals and 4 constraints", () => {
    expect(HM62256_IC.signals).toHaveLength(5);
    expect(HM62256_IC.constraints).toHaveLength(4);
  });

  it("has Hitachi as manufacturer", () => {
    expect(HM62256_IC.manufacturer).toBe("Hitachi");
  });
});
