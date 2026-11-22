/** Append-only catalog generator for the Turtle Draw Deep Water banks 220–229 and dares 400–429.
 * Run: node --import ./scripts/puzzles/register.mjs src/learn/games/turtle-draw/generate-catalog.ts */
import { readFileSync, writeFileSync } from 'node:fs';
import { publishedJson } from '../../../../scripts/published-refs.mjs';
import { turtlePuzzles, TURTLE_BANKS } from './challenge-content';
import { assertFrozenCatalog, type CatalogManifest } from '../../../state/catalogManifest';
import type { Bank, Dare } from '../../../state/challenge';
const file = 'src/state/save-catalog.json', previous = JSON.parse(readFileSync(file, 'utf8')) as CatalogManifest;
const banks: Bank[] = TURTLE_BANKS.map(slot => {
  const rows = turtlePuzzles.filter(p => p.ref.bank === slot).sort((a, b) => a.ref.puzzle - b.ref.puzzle);
  return { slot, engine: 'turtle-draw', rules: 1, entries: rows.map(p => ({ ordinal: slot * 1024 + p.ref.puzzle, hash: p.ref.hash })), awards: rows.map(p => p.awards.reduce<number>((bits, a, i) => bits | (a ? 1 << i : 0), 0)), cove: false };
});
const dares: [number, Dare][] = turtlePuzzles.flatMap(p => p.dares.map(d => [d.slot, { kind: d.rule.kind, help: d.help, bank: p.ref.bank, puzzle: p.ref.puzzle }] as [number, Dare]));
const next: CatalogManifest = {
  ...previous,
  banks: [...previous.banks.filter(b => !TURTLE_BANKS.includes(b.slot)), ...banks].sort((a, b) => a.slot - b.slot),
  dares: [...previous.dares.filter(([slot]) => !dares.some(([s]) => s === slot)), ...dares].sort((a, b) => a[0] - b[0]),
  contexts: [...new Set([...previous.contexts, ...turtlePuzzles.map(p => `turtle-${p.tier}`)])],
};
// This branch's own banks may be re-baked until they publish; every published tip stays immutable.
for (const { value } of publishedJson(file)) assertFrozenCatalog(value as CatalogManifest, next);
assertFrozenCatalog({ ...previous, banks: previous.banks.filter(b => !TURTLE_BANKS.includes(b.slot)) }, next);
writeFileSync(file, JSON.stringify(next, null, 2) + '\n');
console.log(`Turtle catalog generated: ${banks.length} banks, ${dares.length} dares.`);
