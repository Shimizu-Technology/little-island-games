/**
 * Append-only: writes the Shell Pits endgame bank (460), its dares (3200–3263) and contexts (pits-1 to pits-4)
 * into the frozen save manifest, from the same registration the app loads. Safe to rerun after merges:
 * other slices' banks, dares and contexts are kept, and a changed Pits slot stops the run.
 *   npm run boards:catalog            write
 *   npm run boards:catalog -- --check fail if the manifest is missing or differs from the registration
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { registration } from '../../src/challenge/registrations/shell-pits';
import { assertFrozenCatalog, catalogManifest, type CatalogManifest } from '../../src/state/catalogManifest';
const file = 'src/state/save-catalog.json', previous = JSON.parse(readFileSync(file, 'utf8')) as CatalogManifest;
const own = catalogManifest(registration.catalog), check = process.argv.includes('--check');
const outside = (what: string, slot: number, lo: number, hi: number) => { if (slot < lo || slot > hi) throw new Error(`Shell Pits ${what} ${slot} is outside its reserved range ${lo}–${hi}.`); };
for (const bank of own.banks) outside('bank', bank.slot, 460, 460);
for (const [slot] of own.dares) outside('dare', slot, 3200, 3263);
const next: CatalogManifest = {
  version: 2,
  banks: [...previous.banks.filter(b => !own.banks.some(o => o.slot === b.slot)), ...own.banks].sort((a, b) => a.slot - b.slot),
  dares: [...previous.dares.filter(([s]) => !own.dares.some(([o]) => o === s)), ...own.dares].sort((a, b) => a[0] - b[0]),
  contexts: [...previous.contexts, ...own.contexts.filter(c => !previous.contexts.includes(c))],
};
assertFrozenCatalog(previous, next);
const text = JSON.stringify(next, null, 2) + '\n';
if (check) { if (text !== readFileSync(file, 'utf8')) throw new Error('Shell Pits catalog entries are missing or stale in src/state/save-catalog.json. Run npm run boards:catalog.'); }
else writeFileSync(file, text);
console.log(`Shell Pits catalog ${check ? 'checked' : 'written'}: ${own.banks.length} bank, ${own.dares.length} dares, ${own.contexts.length} contexts.`);
