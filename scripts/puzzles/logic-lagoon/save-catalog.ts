import { readFileSync, writeFileSync } from 'node:fs';
import { registration } from '../../../src/learn/games/logic-lagoon/challenge';
import { assertFrozenCatalog, catalogManifest, type CatalogManifest } from '../../../src/state/catalogManifest';
import { publishedJson } from '../../published-refs.mjs';
const file = 'src/state/save-catalog.json', previous = JSON.parse(readFileSync(file, 'utf8')) as CatalogManifest, own = catalogManifest(registration.catalog);
if (own.banks.some(b => b.slot < 260 || b.slot > 279) || own.dares.some(([d]) => d < 800 || d > 899)) throw new Error('Outside T1 reservation.');
const next: CatalogManifest = { version: 2,
  banks: [...previous.banks.filter(b => !own.banks.some(o => b.slot === o.slot)), ...own.banks].sort((a, b) => a.slot - b.slot),
  dares: [...previous.dares.filter(([s]) => !own.dares.some(([o]) => o === s)), ...own.dares].sort((a, b) => a[0] - b[0]),
  contexts: [...previous.contexts, ...own.contexts.filter(c => !previous.contexts.includes(c))],
};
for (const p of publishedJson(file)) assertFrozenCatalog(p.value as CatalogManifest, next);
const text = JSON.stringify(next, null, 2) + '\n';
if (process.argv.includes('--check')) { if (readFileSync(file, 'utf8') !== text) throw new Error('T1 catalog stale.'); }
else writeFileSync(file, text);
