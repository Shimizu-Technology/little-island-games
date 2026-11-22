import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { productionDirs, readCatalog, readPackText } from './pipeline';
import { parsePack } from '../../src/puzzles/bank';

/** Copies certified pack rows, unchanged, into the School levels and the inline Challenge sets. */
const OUT = 'src/learn/games/canoe-seats/sets.generated.json';
const LEVELS: Record<string, string> = { 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e' };
const LEVEL_SIZE = 48, TEACH_SIZE = 6;
/** Deep Water opens hats with teaching boards for "share a seat" and "do not share", then G and H. */
const DEEP: [string, number, string[]][] = [['f', 8, ['teach-same', 'teach-diff']], ['g', 6, []], ['h', 6, []]];
/** The dare set: four inline boards per rung from C, each with two dares. */
const DARE_BANDS = ['c', 'd', 'e', 'f', 'g', 'h'], DARE_SIZE = 4;
const ENDLESS_BANDS = ['c', 'd', 'e', 'f', 'g', 'h'];
const { families } = readCatalog(productionDirs), manifest = families.get('canoe-seats');
if (!manifest) throw new Error('Bake the canoe-seats family first.');
const rowsFor = (band: string) => manifest.packs.filter(p => manifest.bands[p[5]] === band).flatMap(p => parsePack(readPackText(productionDirs, p[0]), p, manifest)!.rows);
const template = (row: string) => JSON.parse(row)[2] as string;
const clueCount = (row: string) => (JSON.parse(row)[3][3] as string).split(',').length;
const taken = new Set<string>();
const take = (rows: string[], count: number) => { const out = rows.filter(r => !taken.has(r)).slice(0, count); out.forEach(r => taken.add(r)); return out; };
const levels = Object.fromEntries(Object.entries(LEVELS).map(([level, band]) => {
  const all = rowsFor(band), teach: Record<string, string[]> = {};
  for (const row of all) { const t = template(row); if (t.startsWith('teach-')) (teach[t.slice(6)] ??= []).length < TEACH_SIZE && teach[t.slice(6)].push(row); }
  Object.values(teach).flat().forEach(r => taken.add(r));
  return [level, { teach, rows: take(all.filter(r => !template(r).startsWith('teach-')), LEVEL_SIZE) }];
}));
const deep = DEEP.map(([band, count, teachFirst]) => {
  const all = rowsFor(band), first = teachFirst.flatMap(t => take(all.filter(r => template(r) === t), 1));
  // H opens with its gentlest board, the one with the fewest clues, as the first look at fruit.
  const rest = band === 'h' ? take([...all].sort((a, b) => clueCount(a) - clueCount(b)), count) : take(all.filter(r => !template(r).startsWith('teach-')), count - first.length);
  return { path: 'deep', band, rows: [...first, ...rest] };
});
const dares = DARE_BANDS.map(band => ({ path: 'endless', band, rows: take(rowsFor(band).filter(r => !template(r).startsWith('teach-')), DARE_SIZE) }));
const challenge = [...deep, ...dares];
const rows = [...Object.values(levels).flatMap(l => [...Object.values(l.teach).flat(), ...l.rows]), ...challenge.flatMap(c => c.rows)];
const hash = createHash('sha256').update(rows.join('\n')).digest('hex');
/** Immutable facts for the packed Endless Tide banks: [slot, first ordinal, entries, pack sha256, rules, band]. */
const packed = manifest.packs.filter(p => ENDLESS_BANDS.includes(manifest.bands[p[5]])).map(p => [p[0], p[1], p[2], p[4], p[6], manifest.bands[p[5]]]);
writeFileSync(OUT, `${JSON.stringify({ hash, levels, challenge, packed }, null, 1)}\n`);
console.log(`Wrote ${rows.length} certified rows, ${readFileSync(OUT).length} bytes.`);
