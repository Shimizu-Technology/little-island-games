/**
 * Takes G3 families out of the working catalog so they can be baked again in place:
 * `node --import ./scripts/puzzles/register.mjs scripts/puzzles/latin/unpublish.ts <family…>`.
 * Allowed only for a family that neither the root nor the save catalog at any published tip holds
 * (scripts/published-refs.mjs); it refuses otherwise, because a published pack is immutable, and
 * stops if a published ref is missing or unreadable. Counters keep their values, except that slots
 * and ordinals this branch alone took above every published root are handed back.
 */
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { packAsset, validRoot, type RootIndex } from '../../../src/puzzles/bank';
import { publishedJson } from '../../published-refs.mjs';
import { generatedAssets, productionDirs, readCatalog } from '../pipeline';

const ids = process.argv.slice(2), dirs = productionDirs, file = `${dirs.content}/root.json`;
const published = publishedJson(file).map(({ ref, value }) => { if (!validRoot(value)) throw new Error(`The published root at ${ref} is invalid.`); return value; });
const savedFamilies = new Set(publishedJson('src/state/save-catalog.json').flatMap(s => (s.value as { banks: { family?: string }[] }).banks.map(b => b.family)));
const { root, families } = readCatalog(dirs);
for (const id of ids) {
  if (published.some(r => r.families.some(f => f[0] === id))) throw new Error(`${id} is in a published root and is immutable.`);
  if (savedFamilies.has(id)) throw new Error(`${id} has a published save-catalog bank and is immutable.`);
  const manifest = families.get(id);
  if (!manifest) continue;
  for (const p of manifest.packs) rmSync(join(dirs.content, 'assets', `${packAsset(p[0])}.lipuzzle`), { force: true });
  rmSync(join(dirs.content, 'assets', `${root.families.find(f => f[0] === id)![1]}.lipuzzle`), { force: true });
  if (existsSync(join(dirs.receipts, id))) rmSync(join(dirs.receipts, id), { recursive: true });
  families.delete(id);
}
const kept = root.families.filter(f => !ids.includes(f[0]));
const usedSlot = Math.max(0, ...[...families.values()].flatMap(m => m.packs.map(p => p[0] + 1)), ...published.map(r => r.nextSlot));
const usedOrdinal = Math.max(0, ...[...families.values()].flatMap(m => m.packs.map(p => p[1] + p[2])), ...published.map(r => r.nextOrdinal));
const next: RootIndex = { ...root, nextSlot: usedSlot, nextOrdinal: usedOrdinal, families: kept };
if (!validRoot(next)) throw new Error('The reduced root is invalid.');
writeFileSync(file, `${JSON.stringify(next)}\n`);
writeFileSync(join(dirs.content, 'assets.generated.ts'), generatedAssets(next, families));
console.log(`Unpublished ${ids.join(', ')}; next slot ${next.nextSlot}, next ordinal ${next.nextOrdinal}, revision ${next.revision}.`);
