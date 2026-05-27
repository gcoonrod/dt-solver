import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { seed } from "@/db/seed";

const schemaPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/db/schema.sql",
);

let db: InstanceType<typeof Database>;

beforeEach(() => {
  db = new Database(":memory:");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);
});

afterEach(() => {
  db.close();
});

describe("seed with IC library model", () => {
  it("inserts 2 IC definitions", () => {
    seed(db);
    const count = db.prepare("SELECT COUNT(*) as n FROM ic_definitions").get() as { n: number };
    expect(count.n).toBe(2);
  });

  it("inserts 1 profile", () => {
    seed(db);
    const count = db.prepare("SELECT COUNT(*) as n FROM profiles").get() as { n: number };
    expect(count.n).toBe(1);
  });

  it("seeds W65C02S with ICDefinition shape", () => {
    seed(db);
    const row = db.prepare("SELECT data FROM ic_definitions WHERE id = 'w65c02s-14mhz'").get() as { data: string };
    const ic = JSON.parse(row.data);
    expect(ic.manufacturer).toBe("WDC");
    expect(ic.signals.length).toBeGreaterThan(0);
    expect(ic.signals[0].templateId).toBeDefined();
    expect(ic.constraints.length).toBeGreaterThan(0);
    expect(ic.constraints[0].templateId).toBeDefined();
    expect(ic.constraints[0].anchorTemplateId).toBeDefined();
  });

  it("seeds HM62256 with ICDefinition shape", () => {
    seed(db);
    const row = db.prepare("SELECT data FROM ic_definitions WHERE id = 'hm62256-70ns'").get() as { data: string };
    const ic = JSON.parse(row.data);
    expect(ic.manufacturer).toBe("Hitachi");
    expect(ic.signals.length).toBe(5);
    expect(ic.constraints.length).toBe(4);
  });

  it("default profile combines signals from both ICs", () => {
    seed(db);
    const row = db.prepare("SELECT data FROM profiles WHERE id = 'w65c02s-62256-demo'").get() as { data: string };
    const profile = JSON.parse(row.data);
    const ids = profile.signals.map((s: { id: string }) => s.id);
    expect(ids).toContain("phi2");
    expect(ids).toContain("sram-addr");
  });

  it("is idempotent", () => {
    seed(db);
    seed(db);
    const ics = db.prepare("SELECT COUNT(*) as n FROM ic_definitions").get() as { n: number };
    expect(ics.n).toBe(2);
    const profiles = db.prepare("SELECT COUNT(*) as n FROM profiles").get() as { n: number };
    expect(profiles.n).toBe(1);
  });
});
