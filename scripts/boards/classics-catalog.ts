import { readFileSync, writeFileSync } from 'node:fs';
import { registration as tic } from '../../src/challenge/registrations/tic-tac-toe';
import { registration as checkers } from '../../src/challenge/registrations/checkers';
import { registration as memory } from '../../src/challenge/registrations/memory';
import { assertFrozenCatalog, catalogManifest, type CatalogManifest } from '../../src/state/catalogManifest';
const file = 'src/state/save-catalog.json', previous = JSON.parse(readFileSync(file, 'utf8')) as CatalogManifest;
const parts = [tic, checkers, memory].map(r => catalogManifest(r.catalog));
const own = { banks: parts.flatMap(p => p.banks), dares: parts.flatMap(p => p.dares), contexts: parts.flatMap(p => p.contexts) }, check = process.argv.includes('--check');
const outside = (what: string, slot: number, lo: number, hi: number) => { if (slot < lo || slot > hi) throw new Error(`Classics ${what} ${slot} is outside its reserved range ${lo}–${hi}.`); };
for (const bank of own.banks) outside('bank', bank.slot, 480, 489);
for (const [slot] of own.dares) outside('dare', slot, 3000, 3099);
const next: CatalogManifest = {
  version: 2,
  banks: [...previous.banks.filter(b => !own.banks.some(o => o.slot === b.slot)), ...own.banks].sort((a, b) => a.slot - b.slot),
  dares: [...previous.dares.filter(([s]) => !own.dares.some(([o]) => o === s)), ...own.dares].sort((a, b) => a[0] - b[0]),
  contexts: [...previous.contexts, ...own.contexts.filter(c => !previous.contexts.includes(c))],
};
assertFrozenCatalog(previous, next);
const text = JSON.stringify(next, null, 2) + '\n';
if (check) { if (text !== readFileSync(file, 'utf8')) throw new Error('Classics catalog entries are missing or stale in src/state/save-catalog.json. Run node --import ./scripts/puzzles/register.mjs scripts/boards/classics-catalog.ts.'); }
else writeFileSync(file, text);
console.log(`Classics catalog ${check ? 'checked' : 'written'}: ${own.banks.length} bank, ${own.dares.length} dares, ${own.contexts.length} contexts.`);
