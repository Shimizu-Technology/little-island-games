/**
 * Writes the Latin banks and contexts into the frozen save catalog. An existing slot must match
 * exactly, unless no published ref's catalog has that slot: then this branch alone added it, and a
 * re-bake replaces it (scripts/published-refs.mjs). Latin slots no longer packaged are dropped on
 * the same condition.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { kinds } from '../../../src/puzzles/latin/core';
import { latinRungs } from '../../../src/puzzles/latin/rungs';
import { publishedTexts } from '../../published-refs.mjs';
import { latinFacts } from './facts';

const file = 'src/state/save-catalog.json', catalog = JSON.parse(readFileSync(file, 'utf8'));
const published = new Set(publishedTexts(file).flatMap(text => (JSON.parse(text) as { banks: { slot: number }[] }).banks.map(b => b.slot)));
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
    if (old && JSON.stringify(old) !== JSON.stringify(bank)) {
      if (published.has(b.slot)) throw new Error(`Slot ${b.slot} is published and registered differently.`);
      catalog.banks[at] = bank;
    }
    if (!old) catalog.banks.push(bank);
    const tier = latinRungs[family as keyof typeof latinRungs].find(r => r.id === b.band)!.tier, context = `${family}-${tier}`;
    if (!catalog.contexts.includes(context)) catalog.contexts.push(context);
  }
}
catalog.banks.sort((a: { slot: number }, b: { slot: number }) => a.slot - b.slot);
writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
