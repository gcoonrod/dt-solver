import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const instances = new Map<string, Database.Database>();

export function getDb(dbPath?: string): Database.Database {
  const raw = dbPath ?? process.env.DT_SOLVER_DB_PATH ?? './data/dt-solver.db';
  const resolved = raw === ':memory:' ? raw : path.resolve(raw);

  const existing = instances.get(resolved);
  if (existing) return existing;

  const dir = path.dirname(resolved);
  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(resolved);
  db.pragma('journal_mode = WAL');

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);

  instances.set(resolved, db);
  return db;
}
