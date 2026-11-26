/** Append-only catalog generator for the Tide Logic Challenge banks 245-254 and dares 650 up.
 * Run: node --import ./scripts/puzzles/register.mjs src/learn/games/tide-logic/generate-catalog.ts */
import { readFileSync, writeFileSync } from 'node:fs';
import { publishedJson } from '../../../../scripts/published-refs.mjs';
import { tidePuzzles, TIDE_BANKS } from './challenge-content';
import { assertFrozenCatalog, type CatalogManifest } from '../../../state/catalogManifest';
import type { Bank, Dare } from '../../../state/challenge';
const file = 'src/state/save-catalog.json', previous = JSON.parse(readFileSync(file, 'utf8')) as CatalogManifest;
const banks: Bank[] = TIDE_BANKS.map(slot => {
  const rows = tidePuzzles.filter(p => p.ref.bank === slot).sort((a, b) => a.ref.puzzle - b.ref.puzzle);
  return { slot, engine: 'tide-logic', rules: 1, entries: rows.map(p => ({ ordinal: slot * 1024 + p.ref.puzzle, hash: p.ref.hash })), awards: rows.map(p => p.awards.reduce<number>((bits, a, i) => bits | (a ? 1 << i : 0), 0)), cove: false };
});
const dares: [number, Dare][] = tidePuzzles.flatMap(p => p.dares.map(d => [d.slot, { kind: d.rule.kind, help: d.help, bank: p.ref.bank, puzzle: p.ref.puzzle }] as [number, Dare]));
const next: CatalogManifest = {
  ...previous,
  banks: [...previous.banks.filter(b => !TIDE_BANKS.includes(b.slot)), ...banks].sort((a, b) => a.slot - b.slot),
  dares: [...previous.dares.filter(([slot]) => !dares.some(([s]) => s === slot)), ...dares].sort((a, b) => a[0] - b[0]),
  contexts: [...new Set([...previous.contexts, ...tidePuzzles.map(p => `tide-${p.tier}`)])],
};
// This branch's own banks may be re-baked until they publish; every published tip stays immutable.
for (const { value } of publishedJson(file)) assertFrozenCatalog(value as CatalogManifest, next);
assertFrozenCatalog({ ...previous, banks: previous.banks.filter(b => !TIDE_BANKS.includes(b.slot)) }, next);
writeFileSync(file, JSON.stringify(next, null, 2) + '\n');
console.log(`Tide Logic catalog generated: ${banks.length} banks, ${dares.length} dares.`);
