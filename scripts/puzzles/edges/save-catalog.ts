/** Appends the G5 banks and contexts to the frozen save catalog. An existing slot must match exactly. */
import { readFileSync, writeFileSync } from 'node:fs';
import { edgeFacts } from './facts';
import { edgeGenerators } from './generators';

const file = 'src/state/save-catalog.json', catalog = JSON.parse(readFileSync(file, 'utf8'));
for (const [family, banks] of Object.entries(edgeFacts())) {
  for (const b of banks) {
    // Same key order as the registration's own Bank object: the catalog compares JSON text.
    const bank = { slot: b.slot, engine: family, rules: b.rules, first: b.first, count: b.count, family, packHash: b.packHash, awards: 0, cove: true };
    const old = catalog.banks.find((x: { slot: number }) => x.slot === b.slot);
    if (old && JSON.stringify(old) !== JSON.stringify(bank)) throw new Error(`Slot ${b.slot} is already registered differently.`);
    if (!old) catalog.banks.push(bank);
    const tier = edgeGenerators[family].rungs.find((r: { id: string }) => r.id === b.band)!.tier, context = `${family}-${tier}`;
    if (!catalog.contexts.includes(context)) catalog.contexts.push(context);
  }
}
catalog.banks.sort((a: { slot: number }, b: { slot: number }) => a.slot - b.slot);
writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
