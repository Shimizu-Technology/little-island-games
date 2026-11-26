/**
 * Writes the Word Search starter bake plan for the lead's locked scan and bake. It reads nothing private.
 *   node --import ./scripts/puzzles/register.mjs tests/fixtures/word-search/starter-plan.ts <new plan.json> [variants]
 */
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { starterPlan, starterWords } from './starter-packs';
const [out, count = '1'] = process.argv.slice(2), variants = Number(count);
if (!out || !Number.isInteger(variants) || variants < 1 || variants > 16) { console.error('starter-plan <new-plan.json> [variants 1-16]'); process.exit(1); }
if (existsSync(resolve(out))) { console.error('Plan output exists; use a new path.'); process.exit(1); }
const plan = starterPlan(variants);
writeFileSync(resolve(out), JSON.stringify(plan) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ banks: plan.banks.length, grids: plan.banks.reduce((n, b) => n + b.grids.length, 0), words: starterWords(variants).length }));
