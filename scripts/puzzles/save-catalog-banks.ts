/**
 * Writes a puzzle kit's packaged banks and contexts into the frozen save catalog, for the Latin and
 * edge writers. A slot any published tip's catalog holds must be written exactly as every one of them
 * publishes it (`publishedBanks`, which refuses tips that disagree); any other slot is this branch's
 * own and a re-bake replaces it. The kit's slots no longer packaged are dropped on the same condition.
 * Every check runs before the file is written, so a refusal leaves the working catalog unchanged.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { publishedBanks } from '../published-refs.mjs';

type Facts = { slot: number; first: number; count: number; packHash: string; rules: number; band: string };
type CatalogBank = { slot: number; family?: string };
export const saveCatalogFile = 'src/state/save-catalog.json';

export function writeSaveCatalogBanks(kit: { families: readonly string[]; facts: Record<string, Facts[]>; tier: (family: string, band: string) => number }) {
  const catalog = JSON.parse(readFileSync(saveCatalogFile, 'utf8')), published = publishedBanks(saveCatalogFile);
  const packaged = new Set(Object.values(kit.facts).flat().map(b => b.slot));
  catalog.banks = catalog.banks.filter((b: CatalogBank) => {
    if (!kit.families.includes(b.family as string) || packaged.has(b.slot)) return true;
    if (published.has(b.slot)) throw new Error(`Slot ${b.slot} is published and cannot be dropped.`);
    return false;
  });
  for (const [family, banks] of Object.entries(kit.facts)) {
    for (const b of banks) {
      // Same key order as the registration's own Bank object: the catalog compares JSON text.
      const bank = { slot: b.slot, engine: family, rules: b.rules, first: b.first, count: b.count, family, packHash: b.packHash, awards: 0, cove: true }, text = JSON.stringify(bank);
      const differs = (published.get(b.slot) ?? []).find(d => d.text !== text);
      if (differs) throw new Error(`Slot ${b.slot} is published at ${differs.ref} (${differs.commit.slice(0, 8)}) and registered differently.`);
      const at = catalog.banks.findIndex((x: CatalogBank) => x.slot === b.slot), old = catalog.banks[at];
      if (old && JSON.stringify(old) !== text) catalog.banks[at] = bank;
      if (!old) catalog.banks.push(bank);
      const context = `${family}-${kit.tier(family, b.band)}`;
      if (!catalog.contexts.includes(context)) catalog.contexts.push(context);
    }
  }
  catalog.banks.sort((a: CatalogBank, b: CatalogBank) => a.slot - b.slot);
  writeFileSync(saveCatalogFile, `${JSON.stringify(catalog, null, 2)}\n`);
}
