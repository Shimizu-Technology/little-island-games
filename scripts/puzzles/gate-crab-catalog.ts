import { readFileSync, writeFileSync } from 'node:fs';
import { registration } from '../../src/learn/games/gate-crab/challenge';
import { catalogManifest } from '../../src/state/catalogManifest';

/**
 * Appends Gate Crab's banks, dares and contexts to src/state/save-catalog.json, exactly as the
 * registration builds them. Reserved ranges: banks 310-329, dares 2100-2199.
 */
const path = 'src/state/save-catalog.json';
const catalog = JSON.parse(readFileSync(path, 'utf8'));
const facts = catalogManifest(registration.catalog);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

for (const bank of facts.banks) {
  if (bank.slot < 310 || bank.slot > 329) throw new Error(`Bank ${bank.slot} is outside O3's reserved 310-329. Nothing was written.`);
  const old = catalog.banks.find((b: { slot: number }) => b.slot === bank.slot);
  if (old && !same(old, bank)) throw new Error(`Bank ${bank.slot} is already in the catalog with different contents. Nothing was written.`);
  if (!old) catalog.banks.push(bank);
}
for (const [slot, dare] of facts.dares) {
  if (slot < 2100 || slot > 2199) throw new Error(`Dare ${slot} is outside O3's reserved 2100-2199. Nothing was written.`);
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
    throw new Error('Gate Crab catalog entries are missing or stale in src/state/save-catalog.json. Run scripts/puzzles/gate-crab-catalog.ts.');
  }
} else {
  writeFileSync(path, text);
}
console.log(`Gate Crab catalog: ${facts.banks.length} banks, ${facts.dares.length} dares, ${facts.contexts.length} contexts.`);
