import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { productionDirs, readCatalog, readPackText } from './pipeline';
import { parsePack } from '../../src/puzzles/bank';

/**
 * Copies certified Shell Scale pack rows (32 insight puzzles across rungs a-f), unchanged,
 * into School Levels 1-5 (rungs a-e) and Challenge inline Deep Water (rung f) + dare set (c-f),
 * plus packed bank facts for Endless Tide (rungs c-f).
 */
const OUT = 'src/learn/games/shell-scale/sets.generated.json';
const LEVELS: Record<string, string> = { 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e' };
const ENDLESS_BANDS = ['c', 'd', 'e', 'f'];

const { families } = readCatalog(productionDirs), manifest = families.get('shell-scale');
if (!manifest) throw new Error('Bake the shell-scale family first.');

const rowsFor = (band: string) =>
  manifest.packs
    .filter(p => manifest.bands[p[5]] === band)
    .flatMap(p => parsePack(readPackText(productionDirs, p[0]), p, manifest)!.rows);

const levels = Object.fromEntries(
  Object.entries(LEVELS).map(([level, band]) => [level, { rows: rowsFor(band) }]),
);

// Deep Water: all 6 certified Rung F puzzles (3x 6-shell sort + 3x 12-pearl heavy-or-light).
const deep = [{ path: 'deep', band: 'f', rows: rowsFor('f') }];

// Inline dare set: 2 curated insight puzzles per rung C, D, E, F (8 puzzles x 2 dares = 16 dares inside 2400-2499).
const dares = ['c', 'd', 'e', 'f'].map(band => ({ path: 'endless', band, rows: rowsFor(band).slice(0, 2) }));

const challenge = [...deep, ...dares];
const allRows = [
  ...Object.values(levels).flatMap(l => l.rows),
  ...challenge.flatMap(c => c.rows),
];
const hash = createHash('sha256').update(allRows.join('\n')).digest('hex');

/** Immutable facts for the packed Endless Tide banks: [slot, first ordinal, entries, pack sha256, rules, band]. */
const packed = manifest.packs
  .filter(p => ENDLESS_BANDS.includes(manifest.bands[p[5]]))
  .map(p => [p[0], p[1], p[2], p[4], p[6], manifest.bands[p[5]]]);

writeFileSync(OUT, `${JSON.stringify({ hash, levels, challenge, packed }, null, 1)}\n`);
console.log(`Wrote Shell Scale sets (${allRows.length} refs, ${readFileSync(OUT).length} bytes).`);
