import { getDb } from './connection';

interface ProfileListRow {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
}

interface ProfileFullRow extends ProfileListRow {
  data: unknown;
  created_at: string;
}

export function listProfiles(): ProfileListRow[] {
  const db = getDb();
  return db.prepare('SELECT id, name, description, updated_at FROM profiles ORDER BY updated_at DESC').all() as ProfileListRow[];
}

export function getProfile(id: string): ProfileFullRow | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as
    | (Omit<ProfileFullRow, 'data'> & { data: string })
    | undefined;
  if (!row) return null;
  return { ...row, data: JSON.parse(row.data) };
}

export function createProfile(row: {
  id: string;
  name: string;
  description?: string;
  data: object;
}): ProfileFullRow {
  const db = getDb();
  db.prepare(
    'INSERT INTO profiles (id, name, description, data) VALUES (?, ?, ?, ?)'
  ).run(row.id, row.name, row.description ?? null, JSON.stringify(row.data));
  return getProfile(row.id)!;
}

export function updateProfile(
  id: string,
  updates: { name?: string; description?: string; data?: object }
): ProfileFullRow | null {
  const db = getDb();
  const existing = getProfile(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.data !== undefined) {
    fields.push('data = ?');
    values.push(JSON.stringify(updates.data));
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getProfile(id)!;
}

export function deleteProfile(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
  return result.changes > 0;
}
