import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { W65C02S_14MHz } from "@/data/w65c02s-14mhz";
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

describe("seed", () => {
  it("inserts one IC definition and one profile", () => {
    seed(db);

    const ics = db.prepare("SELECT COUNT(*) as n FROM ic_definitions").get() as { n: number };
    expect(ics.n).toBe(1);

    const profiles = db.prepare("SELECT COUNT(*) as n FROM profiles").get() as { n: number };
    expect(profiles.n).toBe(1);
  });

  it("seeds the W65C02S IC with correct metadata", () => {
    seed(db);

    const row = db.prepare("SELECT * FROM ic_definitions WHERE id = ?").get(W65C02S_14MHz.id) as {
      id: string;
      name: string;
      manufacturer: string;
      data: string;
    };

    expect(row.name).toBe(W65C02S_14MHz.name);
    expect(row.manufacturer).toBe("WDC");

    const data = JSON.parse(row.data);
    expect(data.signals).toHaveLength(W65C02S_14MHz.signals.length);
    expect(data.constraints).toHaveLength(W65C02S_14MHz.constraints.length);
  });

  it("seeds a profile with viewport from defaultWindowNs", () => {
    seed(db);

    const row = db.prepare("SELECT * FROM profiles WHERE id = ?").get(W65C02S_14MHz.id) as {
      data: string;
    };

    const data = JSON.parse(row.data);
    expect(data.viewport).toEqual(W65C02S_14MHz.defaultWindowNs);
    expect(data.signals).toHaveLength(W65C02S_14MHz.signals.length);
  });

  it("is idempotent — running twice does not create duplicates", () => {
    seed(db);
    seed(db);

    const ics = db.prepare("SELECT COUNT(*) as n FROM ic_definitions").get() as { n: number };
    expect(ics.n).toBe(1);

    const profiles = db.prepare("SELECT COUNT(*) as n FROM profiles").get() as { n: number };
    expect(profiles.n).toBe(1);
  });
});
