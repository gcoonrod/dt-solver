import { getDb } from './connection';

interface IcListRow {
  id: string;
  name: string;
  manufacturer: string | null;
  updated_at: string;
}

interface IcFullRow extends IcListRow {
  data: unknown;
  created_at: string;
}

export function listIcs(): IcListRow[] {
  const db = getDb();
  return db.prepare('SELECT id, name, manufacturer, updated_at FROM ic_definitions ORDER BY name').all() as IcListRow[];
}

export function getIc(id: string): IcFullRow | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM ic_definitions WHERE id = ?').get(id) as
    | (Omit<IcFullRow, 'data'> & { data: string })
    | undefined;
  if (!row) return null;
  return { ...row, data: JSON.parse(row.data) };
}

export function createIc(row: {
  id: string;
  name: string;
  manufacturer?: string;
  data: object;
}): IcFullRow {
  const db = getDb();
  db.prepare(
    'INSERT INTO ic_definitions (id, name, manufacturer, data) VALUES (?, ?, ?, ?)'
  ).run(row.id, row.name, row.manufacturer ?? null, JSON.stringify(row.data));
  return getIc(row.id)!;
}

export function updateIc(
  id: string,
  updates: { name?: string; manufacturer?: string; data?: object }
): IcFullRow | null {
  const db = getDb();
  const existing = getIc(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.manufacturer !== undefined) {
    fields.push('manufacturer = ?');
    values.push(updates.manufacturer);
  }
  if (updates.data !== undefined) {
    fields.push('data = ?');
    values.push(JSON.stringify(updates.data));
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = strftime('%Y-%m-%d %H:%M:%f','now')");
  values.push(id);

  db.prepare(`UPDATE ic_definitions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getIc(id)!;
}

export function deleteIc(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM ic_definitions WHERE id = ?').run(id);
  return result.changes > 0;
}
