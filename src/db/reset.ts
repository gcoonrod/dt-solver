import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './connection';
import { seed } from './seed';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const db = getDb();

console.log('Dropping tables...');
db.prepare('DROP TABLE IF EXISTS ic_definitions').run();
db.prepare('DROP TABLE IF EXISTS profiles').run();
console.log('Tables dropped.');

console.log('Re-creating schema...');
const schema = fs.readFileSync(path.join(currentDir, 'schema.sql'), 'utf-8');
db.exec(schema);
console.log('Schema applied.');

console.log('Seeding data...');
seed(db);

console.log('Reset complete.');
