/**
 * Syncs Picture Grid's baked manifest (`src/puzzles/picture-grid/manifest.generated.json`) and
 * appends its banks (110–139) and contexts (`picture-grid-1..4`) into `src/state/save-catalog.json`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { definePictureGrid, pictureGridBankFacts } from '../../../src/puzzles/picture-grid/registration';
import { assertFrozenCatalog, catalogManifest, type CatalogManifest } from '../../../src/state/catalogManifest';
import { publishedJson } from '../../published-refs.mjs';
import { productionDirs, readCatalog } from '../pipeline';

const manifestFile = 'src/puzzles/picture-grid/manifest.generated.json';
const catalogFile = 'src/state/save-catalog.json';
const check = process.argv.includes('--check');

const manifest = readCatalog(productionDirs).families.get('picture-grid');
if (!manifest) throw new Error('Picture Grid is not baked in the puzzle catalog.');
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
if (check) {
  if (readFileSync(manifestFile, 'utf8') !== manifestText) throw new Error(`${manifestFile} is stale.`);
} else {
  writeFileSync(manifestFile, manifestText);
}

const own = catalogManifest(definePictureGrid(pictureGridBankFacts(manifest)).catalog);
if (own.banks.some(b => b.slot < 110 || b.slot > 139) || own.dares.some(([d]) => d < 1700 || d > 1799)) {
  throw new Error('Outside G4a Picture Grid reservation.');
}
const previous = JSON.parse(readFileSync(catalogFile, 'utf8')) as CatalogManifest;
const next: CatalogManifest = {
  version: 2,
  banks: [...previous.banks.filter(b => !own.banks.some(o => b.slot === o.slot)), ...own.banks].sort((a, b) => a.slot - b.slot),
  dares: [...previous.dares.filter(([s]) => !own.dares.some(([o]) => o === s)), ...own.dares].sort((a, b) => a[0] - b[0]),
  contexts: [...previous.contexts, ...own.contexts.filter(c => !previous.contexts.includes(c))],
};
for (const p of publishedJson(catalogFile)) assertFrozenCatalog(p.value as CatalogManifest, next);
const catalogText = `${JSON.stringify(next, null, 2)}\n`;
if (check) {
  if (readFileSync(catalogFile, 'utf8') !== catalogText) throw new Error('Picture Grid save-catalog entries are stale.');
} else {
  writeFileSync(catalogFile, catalogText);
}
