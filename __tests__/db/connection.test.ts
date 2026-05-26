import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import { getDb } from "@/db/connection";

describe("getDb", () => {
  it("returns a Database instance for in-memory path", () => {
    const db = getDb(":memory:");
    expect(db).toBeInstanceOf(Database);
  });

  it("returns the same instance for the same path (singleton)", () => {
    const db1 = getDb(":memory:");
    const db2 = getDb(":memory:");
    expect(db1).toBe(db2);
  });

  it("creates both tables on first open", () => {
    const db = getDb(":memory:");
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain("ic_definitions");
    expect(names).toContain("profiles");
  });

  it("creates indexes", () => {
    const db = getDb(":memory:");
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'")
      .all() as { name: string }[];
    const names = indexes.map((i) => i.name);
    expect(names).toContain("idx_ic_name");
    expect(names).toContain("idx_profile_updated");
  });
});
