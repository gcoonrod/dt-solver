import type Database from "better-sqlite3";

import { W65C02S_14MHz, W65C02S_14MHz_IC } from "@/data/w65c02s-14mhz";
import { HM62256_IC } from "@/data/62256-sram";
import { getDb } from "./connection";

export function seed(db: Database.Database = getDb()) {
  const insertIc = db.prepare(
    "INSERT OR REPLACE INTO ic_definitions (id, name, manufacturer, data) VALUES (?, ?, ?, ?)",
  );

  insertIc.run(W65C02S_14MHz_IC.id, W65C02S_14MHz_IC.name, W65C02S_14MHz_IC.manufacturer, JSON.stringify(W65C02S_14MHz_IC));
  console.log(`Seeded IC: ${W65C02S_14MHz_IC.name}`);

  insertIc.run(HM62256_IC.id, HM62256_IC.name, HM62256_IC.manufacturer, JSON.stringify(HM62256_IC));
  console.log(`Seeded IC: ${HM62256_IC.name}`);

  const profileData = {
    signals: [...W65C02S_14MHz.signals, ...HM62256_IC.signals],
    constraints: W65C02S_14MHz.constraints,
    viewport: W65C02S_14MHz.defaultWindowNs,
  };

  db.prepare(
    "INSERT OR REPLACE INTO profiles (id, name, description, data) VALUES (?, ?, ?, ?)",
  ).run(
    "w65c02s-62256-demo",
    "W65C02S + 62256 SRAM",
    "6502 microprocessor with 62256 SRAM — bus read/write timing scenario",
    JSON.stringify(profileData),
  );
  console.log("Seeded profile: W65C02S + 62256 SRAM");

  console.log("Seed complete.");
}

const isDirectRun = process.argv[1]?.endsWith("seed.ts");
if (isDirectRun) seed();
