/** Append-only: writes the Arcade dare banks (500–508) and dares (4000–4071) into the frozen save manifest. Safe to rerun after merges. */
import { readFileSync, writeFileSync } from 'node:fs';
import { arcadeDareCatalog } from '../../src/arcade/dares';
import { assertFrozenCatalog, catalogManifest, type CatalogManifest } from '../../src/state/catalogManifest';
const file = 'src/state/save-catalog.json', previous = JSON.parse(readFileSync(file, 'utf8')) as CatalogManifest;
const own = catalogManifest(arcadeDareCatalog()), check = process.argv.includes('--check');
const next: CatalogManifest = {
  version: 2,
  banks: [...previous.banks.filter(b => !own.banks.some(o => o.slot === b.slot)), ...own.banks].sort((a, b) => a.slot - b.slot),
  dares: [...previous.dares.filter(([s]) => !own.dares.some(([o]) => o === s)), ...own.dares].sort((a, b) => a[0] - b[0]),
  contexts: previous.contexts,
};
assertFrozenCatalog(previous, next);
const text = JSON.stringify(next, null, 2) + '\n';
if (check) { if (text !== readFileSync(file, 'utf8')) throw new Error('Arcade dares are missing from src/state/save-catalog.json. Run npm run arcade:dares.'); }
else writeFileSync(file, text);
console.log(`Arcade dare catalog ${check ? 'checked' : 'written'}: ${own.banks.length} banks, ${own.dares.length} dares.`);
