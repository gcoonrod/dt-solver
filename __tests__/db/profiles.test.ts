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

function insertProfile(id: string, name: string, data: object, description?: string) {
  db.prepare(
    "INSERT INTO profiles (id, name, description, data) VALUES (?, ?, ?, ?)",
  ).run(id, name, description ?? null, JSON.stringify(data));
}

function getProfile(id: string) {
  const row = db.prepare("SELECT * FROM profiles WHERE id = ?").get(id) as
    | { id: string; name: string; description: string | null; data: string; created_at: string; updated_at: string }
    | undefined;
  if (!row) return null;
  return { ...row, data: JSON.parse(row.data) };
}

describe("profiles CRUD", () => {
  it("inserts and retrieves a profile", () => {
    const data = { signals: [], constraints: [], viewport: { tMinNs: 0, tMaxNs: 150 } };
    insertProfile("p1", "Test Profile", data, "A test");

    const row = getProfile("p1");
    expect(row).not.toBeNull();
    expect(row!.name).toBe("Test Profile");
    expect(row!.description).toBe("A test");
    expect(row!.data).toEqual(data);
  });

  it("lists profiles ordered by updated_at descending", () => {
    insertProfile("p1", "First", { signals: [] });
    insertProfile("p2", "Second", { signals: [] });

    const rows = db
      .prepare("SELECT id, name, description, updated_at FROM profiles ORDER BY updated_at DESC")
      .all() as { id: string; name: string }[];

    expect(rows).toHaveLength(2);
  });

  it("updates a profile", () => {
    insertProfile("p1", "Old", { signals: [] });

    db.prepare("UPDATE profiles SET name = ?, updated_at = datetime('now') WHERE id = ?")
      .run("New", "p1");

    const row = getProfile("p1");
    expect(row!.name).toBe("New");
  });

  it("updates profile data JSON", () => {
    const oldData = { signals: [], constraints: [] };
    const newData = { signals: [{ id: "s1" }], constraints: [], viewport: { tMinNs: 0, tMaxNs: 200 } };
    insertProfile("p1", "Profile", oldData);

    db.prepare("UPDATE profiles SET data = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(newData), "p1");

    const row = getProfile("p1");
    expect(row!.data).toEqual(newData);
  });

  it("deletes a profile", () => {
    insertProfile("p1", "Doomed", { signals: [] });

    const result = db.prepare("DELETE FROM profiles WHERE id = ?").run("p1");
    expect(result.changes).toBe(1);
    expect(getProfile("p1")).toBeNull();
  });

  it("returns 0 changes when deleting non-existent profile", () => {
    const result = db.prepare("DELETE FROM profiles WHERE id = ?").run("nope");
    expect(result.changes).toBe(0);
  });

  it("INSERT OR REPLACE is idempotent for profiles", () => {
    db.prepare("INSERT OR REPLACE INTO profiles (id, name, data) VALUES (?, ?, ?)")
      .run("p1", "V1", JSON.stringify({ v: 1 }));
    db.prepare("INSERT OR REPLACE INTO profiles (id, name, data) VALUES (?, ?, ?)")
      .run("p1", "V2", JSON.stringify({ v: 2 }));

    const count = db.prepare("SELECT COUNT(*) as n FROM profiles").get() as { n: number };
    expect(count.n).toBe(1);

    const row = getProfile("p1");
    expect(row!.name).toBe("V2");
  });
});
