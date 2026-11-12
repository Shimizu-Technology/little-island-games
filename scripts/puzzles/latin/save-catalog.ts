/**
 * Writes the Latin banks and contexts into the frozen save catalog. A slot the catalog at any
 * published tip holds must be written exactly as published; any other slot is this branch's own and
 * a re-bake replaces it (scripts/published-refs.mjs, which stops if a published ref is missing).
 * Latin slots no longer packaged are dropped on the same condition.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { kinds } from '../../../src/puzzles/latin/core';
import { latinRungs } from '../../../src/puzzles/latin/rungs';
import { publishedJson } from '../../published-refs.mjs';
import { latinFacts } from './facts';

const file = 'src/state/save-catalog.json', catalog = JSON.parse(readFileSync(file, 'utf8'));
const published = new Map(publishedJson(file).flatMap(s => (s.value as { banks: { slot: number }[] }).banks.map(b => [b.slot, JSON.stringify(b)] as const)));
const facts = latinFacts(), packaged = new Set(Object.values(facts).flat().map(b => b.slot));
catalog.banks = catalog.banks.filter((b: { slot: number; family?: string }) => {
  if (!kinds.includes(b.family as never) || packaged.has(b.slot)) return true;
  if (published.has(b.slot)) throw new Error(`Slot ${b.slot} is published and cannot be dropped.`);
  return false;
});
for (const [family, banks] of Object.entries(facts)) {
  for (const b of banks) {
    // Same key order as the registration's own Bank object: the catalog compares JSON text.
    const bank = { slot: b.slot, engine: family, rules: b.rules, first: b.first, count: b.count, family, packHash: b.packHash, awards: 0, cove: true };
    const at = catalog.banks.findIndex((x: { slot: number }) => x.slot === b.slot), old = catalog.banks[at];
    if (published.has(b.slot) && published.get(b.slot) !== JSON.stringify(bank)) throw new Error(`Slot ${b.slot} is published and registered differently.`);
    if (old && JSON.stringify(old) !== JSON.stringify(bank)) catalog.banks[at] = bank;
    if (!old) catalog.banks.push(bank);
    const tier = latinRungs[family as keyof typeof latinRungs].find(r => r.id === b.band)!.tier, context = `${family}-${tier}`;
    if (!catalog.contexts.includes(context)) catalog.contexts.push(context);
  }
}
catalog.banks.sort((a: { slot: number }, b: { slot: number }) => a.slot - b.slot);
writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
