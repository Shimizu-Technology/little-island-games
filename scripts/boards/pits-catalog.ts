/**
 * Append-only: writes the board puzzle banks, their dares and contexts into the frozen save manifest,
 * from the same registrations the app loads. Each game keeps to its reserved slots (P1 boards: banks
 * 460–479, dares 3200–3399):
 *   Shell Pits endgames    bank 460, dares 3200–3263, pits-1 to pits-4
 *   Coconut Drop puzzles   bank 461, dares 3264–3311, coconut-1 to coconut-3
 *   Fishing Nets endings   bank 462, dares 3312–3335, nets-1 to nets-4
 *   Hidden Canoes charts   bank 463, dares 3336–3347, canoes-1 to canoes-4
 * Safe to rerun after merges: other slices' banks, dares and contexts are kept, and a changed slot stops the run.
 *   npm run boards:catalog            write
 *   npm run boards:catalog -- --check fail if the manifest is missing or differs from the registrations
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { registration as pits } from '../../src/challenge/registrations/shell-pits';
import { registration as coconut } from '../../src/challenge/registrations/drop-puzzles';
import { registration as nets } from '../../src/challenge/registrations/fishing-nets';
import { registration as canoes } from '../../src/challenge/registrations/hidden-canoes';
import { assertFrozenCatalog, catalogManifest, type CatalogManifest } from '../../src/state/catalogManifest';
const boards = [
  { name: 'Shell Pits', registration: pits, banks: [460, 460], dares: [3200, 3263] },
  { name: 'Coconut Drop', registration: coconut, banks: [461, 461], dares: [3264, 3311] },
  { name: 'Fishing Nets', registration: nets, banks: [462, 462], dares: [3312, 3335] },
  { name: 'Hidden Canoes', registration: canoes, banks: [463, 463], dares: [3336, 3347] },
] as const;
const file = 'src/state/save-catalog.json', previous = JSON.parse(readFileSync(file, 'utf8')) as CatalogManifest;
const check = process.argv.includes('--check');
const outside = (name: string, what: string, slot: number, [lo, hi]: readonly number[]) => { if (slot < lo || slot > hi) throw new Error(`${name} ${what} ${slot} is outside its reserved range ${lo}–${hi}.`); };
let next: CatalogManifest = previous;
const lines: string[] = [];
for (const b of boards) {
  const own = catalogManifest(b.registration.catalog);
  for (const bank of own.banks) outside(b.name, 'bank', bank.slot, b.banks);
  for (const [slot] of own.dares) outside(b.name, 'dare', slot, b.dares);
  next = {
    version: 2,
    banks: [...next.banks.filter(x => !own.banks.some(o => o.slot === x.slot)), ...own.banks].sort((x, y) => x.slot - y.slot),
    dares: [...next.dares.filter(([s]) => !own.dares.some(([o]) => o === s)), ...own.dares].sort((x, y) => x[0] - y[0]),
    contexts: [...next.contexts, ...own.contexts.filter(c => !next.contexts.includes(c))],
  };
  lines.push(`${b.name} catalog ${check ? 'checked' : 'written'}: ${own.banks.length} bank, ${own.dares.length} dares, ${own.contexts.length} contexts.`);
}
assertFrozenCatalog(previous, next);
const text = JSON.stringify(next, null, 2) + '\n';
if (check) { if (text !== readFileSync(file, 'utf8')) throw new Error('Board catalog entries are missing or stale in src/state/save-catalog.json. Run npm run boards:catalog.'); }
else writeFileSync(file, text);
console.log(lines.join('\n'));
