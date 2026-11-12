/**
 * Takes G3 families out of the working catalog so they can be baked again in place:
 * `node --import ./scripts/puzzles/register.mjs scripts/puzzles/latin/unpublish.ts <family…>`.
 * Allowed only for a family no published ref contains (see scripts/puzzles/history.ts); it refuses
 * otherwise, because a published pack is immutable. Counters keep their values, except that slots
 * and ordinals this branch alone took above every published root are handed back.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { packAsset, validRoot, type RootIndex } from '../../../src/puzzles/bank';
import { publishedRefs } from '../history';
import { generatedAssets, productionDirs, readCatalog } from '../pipeline';

const ids = process.argv.slice(2), dirs = productionDirs, file = `${dirs.content}/root.json`;
const show = (ref: string) => { try { return execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; } };
const refs = publishedRefs.filter(ref => { try { execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { stdio: 'ignore' }); return true; } catch { return false; } });
if (!refs.length) throw new Error('No published ref is present, so nothing can be shown to be unpublished.');
const published = refs.map(show).filter((x): x is string => x !== null).map(text => JSON.parse(text) as unknown).filter(validRoot) as RootIndex[];
const { root, families } = readCatalog(dirs);
for (const id of ids) {
  if (published.some(r => r.families.some(f => f[0] === id))) throw new Error(`${id} is in a published root and is immutable.`);
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
