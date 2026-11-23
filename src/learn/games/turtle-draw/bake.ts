/** Build-time only. Re-proves and writes every certified Turtle picture: School templates and Deep Water puzzles.
 * Run: node --import ./scripts/puzzles/register.mjs src/learn/games/turtle-draw/bake.ts */
import { writeFileSync } from 'node:fs';
import { generateSchool } from './generate';
import { generateDeep } from './deep';
/** One picture per line keeps diffs reviewable. */
const rows = (groups: readonly (readonly object[])[], indent: string): string => `[\n${groups.map(l => `${indent}[\n${l.map(t => `${indent}${indent}${JSON.stringify(t)}`).join(',\n')}\n${indent}]`).join(',\n')}\n]`;
const school = generateSchool(), deep = generateDeep(school.lines);
writeFileSync('src/learn/games/turtle-draw/templates.json', `{\n "version": 1,\n "levels": ${rows(school.levels, ' ').replace(/\n/g, '\n ')}\n}\n`);
writeFileSync('src/learn/games/turtle-draw/deep-content.json', `{\n "version": 1,\n "build": ${rows(deep.steps.map(s => s.build), ' ').replace(/\n/g, '\n ')},\n "predict": ${rows(deep.steps.map(s => s.predict), ' ').replace(/\n/g, '\n ')}\n}\n`);
console.log(`School ${school.levels.map(l => l.length).join('/')}; Deep Water ${deep.steps.map(s => `${s.build.length}+${s.predict.length}`).join(' ')}`);
