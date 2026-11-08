import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { productionDirs, readCatalog, readPackText } from './pipeline';
import { parsePack } from '../../src/puzzles/bank';

/** Copies certified pack rows, unchanged, into the small School and Challenge sets the board can open without a pack load. */
const OUT = 'src/learn/games/slip-tide/sets.generated.json';
const LEVELS: Record<string, string> = { 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e' };
const LEVEL_SIZE = 32, TIERS: [string, string, number][] = [['deep', 'f', 8], ['deep', 'g', 6], ['endless', 'd', 4], ['endless', 'e', 4], ['endless', 'f', 4], ['endless', 'g', 4]];
const { families } = readCatalog(productionDirs), manifest = families.get('slip-tide');
if (!manifest) throw new Error('Bake the slip-tide family first.');
const rowsFor = (band: string) => manifest.packs.filter(p => manifest.bands[p[5]] === band).flatMap(p => parsePack(readPackText(productionDirs, p[0]), p, manifest)!.rows);
const levels = Object.fromEntries(Object.entries(LEVELS).map(([level, band]) => [level, rowsFor(band).slice(0, LEVEL_SIZE)]));
const taken = new Map<string, number>();
const take = (band: string, count: number) => { const from = taken.get(band) ?? 0; taken.set(band, from + count); return rowsFor(band).slice(from, from + count); };
const challenge = TIERS.map(([path, band, count]) => ({ path, band, rows: take(band, count) }));
const rows = [...Object.values(levels).flat(), ...challenge.flatMap(c => c.rows)];
const hash = createHash('sha256').update(rows.join('\n')).digest('hex');
writeFileSync(OUT, `${JSON.stringify({ hash, levels, challenge }, null, 1)}\n`);
console.log(`Wrote ${rows.length} certified rows, ${readFileSync(OUT).length} bytes.`);
