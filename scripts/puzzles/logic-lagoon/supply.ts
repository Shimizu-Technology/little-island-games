import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { decodeRow } from '../../../src/puzzles/descriptor';
import { latinAdapter } from '../../../src/puzzles/latin/adapter';
import { encodePuzzle } from '../../../src/puzzles/latin/core';
import { lagoonLatinAdapter } from '../../../src/puzzles/adapters/lagoon-latin';
import { readCatalog, readPackText, productionDirs } from '../pipeline';
const { families } = readCatalog(productionDirs), teacher = families.get('logic-lagoon')!;
const rows = (family: string, slots: number[]) => families.get(family)!.packs.filter(p => slots.includes(p[0])).flatMap(pack => readPackText(productionDirs, pack[0]).trim().split('\n').slice(1).map((line, i) => {
  const adapter = family === 'sudoku' ? latinAdapter('sudoku') : lagoonLatinAdapter, d = decodeRow(line, families.get(family)!.bands[pack[5]], adapter)!;
  return { source: [pack[0], i, createHash('sha256').update(line).digest('hex')], puzzle: encodePuzzle(d.payload), teaches: d.teaches[0] };
}));
// Reused rows keep their original bank/index/hash: these are not additional supply or receipts.
const schoolFile = 'src/learn/games/logic-lagoon/supply-v1.json';
const schoolText = JSON.stringify({ sprout: rows('sudoku', [40]), coral: rows('sudoku', [42]), cages: rows('logic-lagoon', [260]) }) + '\n';
if (existsSync(schoolFile) && readFileSync(schoolFile, 'utf8') !== schoolText) throw new Error('School catalog 1 is frozen. Add a new catalog version and keep its decoder.');
writeFileSync(schoolFile, schoolText);
writeFileSync('src/learn/games/logic-lagoon/packs.generated.json', JSON.stringify(teacher.packs.map(p => ({ slot: p[0], first: p[1], count: p[2], packHash: p[4], band: teacher.bands[p[5]], rules: p[6] })), null, 2) + '\n');
