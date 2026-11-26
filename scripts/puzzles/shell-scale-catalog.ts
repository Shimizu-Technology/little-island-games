import { readFileSync, writeFileSync } from 'node:fs';
import { registration } from '../../src/learn/games/shell-scale/challenge';
import { catalogManifest } from '../../src/state/catalogManifest';

/**
 * Appends Shell Scale's banks (360-374), dares (2400-2499) and contexts to the save catalog,
 * exactly as the registration builds them. Anything already present must be identical; nothing
 * else is touched. `--check` only compares.
 */
const path = 'src/state/save-catalog.json', catalog = JSON.parse(readFileSync(path, 'utf8'));
const facts = catalogManifest(registration.catalog), same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

for (const bank of facts.banks) {
  if (bank.slot < 360 || bank.slot > 374) throw new Error(`Bank ${bank.slot} is outside O5's reserved 360-374. Nothing was written.`);
  const old = catalog.banks.find((b: { slot: number }) => b.slot === bank.slot);
  if (old && !same(old, bank)) throw new Error(`Bank ${bank.slot} is already in the catalog with different contents. Nothing was written.`);
  if (!old) catalog.banks.push(bank);
}
for (const [slot, dare] of facts.dares) {
  if (slot < 2400 || slot > 2499) throw new Error(`Dare ${slot} is outside O5's reserved 2400-2499. Nothing was written.`);
  const old = catalog.dares.find((d: [number, unknown]) => d[0] === slot);
  if (old && !same(old[1], dare)) throw new Error(`Dare ${slot} is already in the catalog with different contents. Nothing was written.`);
  if (!old) catalog.dares.push([slot, dare]);
}
for (const id of facts.contexts) if (!catalog.contexts.includes(id)) catalog.contexts.push(id);

catalog.banks.sort((a: { slot: number }, b: { slot: number }) => a.slot - b.slot);
catalog.dares.sort((a: [number, unknown], b: [number, unknown]) => a[0] - b[0]);
const text = `${JSON.stringify(catalog, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (text !== readFileSync(path, 'utf8')) {
    throw new Error('Shell Scale catalog entries are missing or stale in src/state/save-catalog.json. Run scripts/puzzles/shell-scale-catalog.ts.');
  }
} else {
  writeFileSync(path, text);
}
console.log(`Shell Scale catalog: ${facts.banks.length} banks, ${facts.dares.length} dares, ${facts.contexts.length} contexts.`);
