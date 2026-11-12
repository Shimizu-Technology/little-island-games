/** Writes (or with --check, compares) the G5 bank facts the app registers at launch. */
import { readFileSync, writeFileSync } from 'node:fs';
import type { BankFacts } from '../../../src/puzzles/edges/registration';
import { productionDirs, readCatalog, type CatalogDirs } from '../pipeline';

export const edgeKinds = ['bridges', 'loop', 'pearl-loop'] as const;
export const factsFile = 'src/puzzles/edges/packs.generated.json';
export function edgeFacts(dirs: CatalogDirs = productionDirs): Record<string, BankFacts[]> {
  const { families } = readCatalog(dirs), out: Record<string, BankFacts[]> = {};
  for (const kind of edgeKinds) { const m = families.get(kind); if (m) out[kind] = m.packs.filter(p => !m.retired.includes(p[0])).map(p => ({ slot: p[0], first: p[1], count: p[2], packHash: p[4], rules: p[6], band: m.bands[p[5]] })); }
  return out;
}
export const factsText = (facts: Record<string, BankFacts[]>) => `${JSON.stringify(facts, null, 1)}\n`;
if (process.argv[1]?.endsWith('facts.ts')) {
  const text = factsText(edgeFacts());
  if (process.argv.includes('--check')) { if (readFileSync(factsFile, 'utf8') !== text) { console.error(`${factsFile} is stale.`); process.exit(1); } }
  else writeFileSync(factsFile, text);
}
