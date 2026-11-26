import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { productionDirs, readCatalog, readPackText } from './pipeline';
import { parsePack } from '../../src/puzzles/bank';
import { goodTesterWitness, tuplePuzzle } from '../../src/learn/games/gate-crab/rules';

/**
 * Copies certified pack rows, unchanged, into School Levels 1-5 (Rungs A-E) and inline
 * Challenge sets (Deep Water Rung F + Endless Tide dare cards across Rungs A-F).
 */
const OUT = 'src/learn/games/gate-crab/sets.generated.json';
const LEVELS: Record<string, string> = { 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e' };
const LEVEL_CAP = 40;
const DARE_BANDS = ['a', 'b', 'c', 'd', 'e', 'f'];
const DARE_SIZE = 4;
const DEEP_F_COUNT = 12;

const { families } = readCatalog(productionDirs);
const manifest = families.get('gate-crab');
if (!manifest) throw new Error('Bake the gate-crab family first.');

const rowsFor = (band: string) =>
  manifest.packs
    .filter(p => manifest.bands[p[5]] === band)
    .flatMap(p => parsePack(readPackText(productionDirs, p[0]), p, manifest)!.rows);

const optimalTests = (row: string): number => {
  const p = tuplePuzzle(JSON.parse(row)[3]);
  if (!p) throw new Error('Malformed certified Gate Crab row.');
  return goodTesterWitness(p, 16).upper;
};

const levels = Object.fromEntries(
  Object.entries(LEVELS).map(([level, band]) => [level, rowsFor(band).slice(0, LEVEL_CAP)]),
);

// Inline Deep Water: 12 Rung F puzzles, preferring puzzles solvable in <= 3 tests for fair 3-test dares.
const fRows = rowsFor('f');
const fSorted = [...fRows].sort((a, b) => optimalTests(a) - optimalTests(b));
const deepRows = fSorted.slice(0, DEEP_F_COUNT);
const deepSet = new Set(deepRows);

// Inline Dare set: 4 puzzles per rung A-F, preferring <= 3 optimal tests so the 3-test dare is always fair.
const dares = DARE_BANDS.map(band => {
  const pool = rowsFor(band).filter(r => !deepSet.has(r));
  const sorted = [...pool].sort((a, b) => optimalTests(a) - optimalTests(b));
  return { path: 'endless' as const, band, rows: sorted.slice(0, DARE_SIZE) };
});

const challenge = [
  { path: 'deep' as const, band: 'f', rows: deepRows },
  ...dares,
];

const allRows = [...Object.values(levels).flat(), ...challenge.flatMap(c => c.rows)];
const hash = createHash('sha256').update(allRows.join('\n')).digest('hex');

/** Immutable facts for the packed Endless Tide banks: [slot, first ordinal, entries, pack sha256, rules, band]. */
const packed = manifest.packs.map(p => [p[0], p[1], p[2], p[4], p[6], manifest.bands[p[5]]]);

writeFileSync(OUT, `${JSON.stringify({ hash, levels, challenge, packed }, null, 1)}\n`);
console.log(`Wrote ${allRows.length} certified Gate Crab rows, ${readFileSync(OUT).length} bytes.`);
