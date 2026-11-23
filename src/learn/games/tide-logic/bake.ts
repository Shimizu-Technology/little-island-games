/** Build-time only. Re-proves and writes every certified Tide Logic belt: School Levels 1-5, Endless Tide and Deep Water.
 * Run: node --import ./scripts/puzzles/register.mjs src/learn/games/tide-logic/bake.ts */
import { writeFileSync } from 'node:fs';
import { generateContent } from './generate';
/** One belt per line keeps diffs reviewable. */
const rows = (groups: readonly (readonly object[])[], indent: string): string => `[\n${groups.map(l => `${indent}[\n${l.map(t => `${indent}${indent}${JSON.stringify(t)}`).join(',\n')}\n${indent}]`).join(',\n')}\n]`;
const c = generateContent();
const out = ` "version": 1,\n "school": ${rows(c.school, ' ').replace(/\n/g, '\n ')},\n "endless": ${rows(c.endless, ' ').replace(/\n/g, '\n ')},\n "deep": ${rows(c.deep, ' ').replace(/\n/g, '\n ')}`;
writeFileSync('src/learn/games/tide-logic/content.json', `{\n${out}\n}\n`);
console.log(`School ${c.school.map(l => l.length).join('/')}; Endless ${c.endless.map(l => l.length).join('/')}; Deep Water ${c.deep.map(l => l.length).join('/')}`);
