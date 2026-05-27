import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

function insertIc(id: string, name: string, data: object, manufacturer?: string) {
  db.prepare(
    "INSERT INTO ic_definitions (id, name, manufacturer, data) VALUES (?, ?, ?, ?)",
  ).run(id, name, manufacturer ?? null, JSON.stringify(data));
}

function getIc(id: string) {
  const row = db.prepare("SELECT * FROM ic_definitions WHERE id = ?").get(id) as
    | { id: string; name: string; manufacturer: string | null; data: string; created_at: string; updated_at: string }
    | undefined;
  if (!row) return null;
  return { ...row, data: JSON.parse(row.data) };
}

describe("ic_definitions CRUD", () => {
  it("inserts and retrieves an IC definition", () => {
    const data = { signals: [{ id: "clk", type: "CLOCK" }], constraints: [] };
    insertIc("test-ic", "Test IC", data, "Acme");

    const row = getIc("test-ic");
    expect(row).not.toBeNull();
    expect(row!.name).toBe("Test IC");
    expect(row!.manufacturer).toBe("Acme");
    expect(row!.data).toEqual(data);
  });

  it("lists IC definitions without data column", () => {
    insertIc("ic1", "IC One", { signals: [] });
    insertIc("ic2", "IC Two", { signals: [] }, "WDC");

    const rows = db
      .prepare("SELECT id, name, manufacturer, updated_at FROM ic_definitions ORDER BY name")
      .all() as { id: string; name: string; manufacturer: string | null }[];

    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("IC One");
    expect(rows[1].manufacturer).toBe("WDC");
  });

  it("updates an IC definition", () => {
    insertIc("ic1", "Old Name", { signals: [] });

    db.prepare("UPDATE ic_definitions SET name = ?, updated_at = datetime('now') WHERE id = ?")
      .run("New Name", "ic1");

    const row = getIc("ic1");
    expect(row!.name).toBe("New Name");
  });

  it("deletes an IC definition", () => {
    insertIc("ic1", "Doomed", { signals: [] });

    const result = db.prepare("DELETE FROM ic_definitions WHERE id = ?").run("ic1");
    expect(result.changes).toBe(1);
    expect(getIc("ic1")).toBeNull();
  });

  it("returns 0 changes when deleting non-existent IC", () => {
    const result = db.prepare("DELETE FROM ic_definitions WHERE id = ?").run("nope");
    expect(result.changes).toBe(0);
  });

  it("INSERT OR REPLACE is idempotent", () => {
    const data1 = { signals: [{ id: "a" }] };
    const data2 = { signals: [{ id: "b" }] };

    db.prepare("INSERT OR REPLACE INTO ic_definitions (id, name, data) VALUES (?, ?, ?)")
      .run("ic1", "V1", JSON.stringify(data1));
    db.prepare("INSERT OR REPLACE INTO ic_definitions (id, name, data) VALUES (?, ?, ?)")
      .run("ic1", "V2", JSON.stringify(data2));

    const count = db.prepare("SELECT COUNT(*) as n FROM ic_definitions").get() as { n: number };
    expect(count.n).toBe(1);

    const row = getIc("ic1");
    expect(row!.name).toBe("V2");
    expect(row!.data).toEqual(data2);
  });
});
