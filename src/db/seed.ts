import { W65C02S_14MHz } from '@/data/w65c02s-14mhz';
import { getDb } from './connection';

export function seed(db = getDb()) {
  const icData = {
    signals: W65C02S_14MHz.signals,
    constraints: W65C02S_14MHz.constraints,
  };

  db.prepare(
    'INSERT OR REPLACE INTO ic_definitions (id, name, manufacturer, data) VALUES (?, ?, ?, ?)'
  ).run(W65C02S_14MHz.id, W65C02S_14MHz.name, 'WDC', JSON.stringify(icData));
  console.log(`Seeded IC definition: ${W65C02S_14MHz.name}`);

  const profileData = {
    signals: W65C02S_14MHz.signals,
    constraints: W65C02S_14MHz.constraints,
    viewport: W65C02S_14MHz.defaultWindowNs,
  };

  db.prepare(
    'INSERT OR REPLACE INTO profiles (id, name, description, data) VALUES (?, ?, ?, ?)'
  ).run(W65C02S_14MHz.id, W65C02S_14MHz.name, W65C02S_14MHz.description, JSON.stringify(profileData));
  console.log(`Seeded profile: ${W65C02S_14MHz.name}`);

  console.log('Seed complete.');
}

const isDirectRun = process.argv[1]?.endsWith('seed.ts');
if (isDirectRun) seed();
