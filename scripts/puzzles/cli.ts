import { execFileSync } from 'node:child_process';
import { assertFamilyAppendOnly, assertRootAppendOnly, validFamily, validRoot, type RootIndex } from '../../src/puzzles/bank';
import { families } from './families';
import { bakeFamily, productionDirs, readCatalog, verifyCatalog } from './pipeline';

const [command, ...rest] = process.argv.slice(2);
const flag = (name: string) => { const i = rest.indexOf(`--${name}`); return i < 0 ? undefined : rest[i + 1]; };
const has = (name: string) => rest.includes(`--${name}`);
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 });

function verifyHistory(): number {
  if (git('rev-parse', '--is-shallow-repository').trim() === 'true') throw new Error('Catalog immutability needs full Git history. Fetch with --unshallow before checking.');
  const { root, families: current } = readCatalog(productionDirs), file = `${productionDirs.content}/root.json`;
  const commits = git('log', '--full-history', '--format=%H', '--', file).trim().split('\n').filter(Boolean);
  for (const commit of commits) {
    const old: unknown = JSON.parse(git('show', `${commit}:${file}`));
    if (!validRoot(old)) throw new Error(`Historic root at ${commit} is invalid.`);
    assertRootAppendOnly(old as RootIndex, root);
    for (const [id, asset] of old.families) {
      const manifest: unknown = JSON.parse(git('show', `${commit}:${productionDirs.content}/assets/${asset}.lipuzzle`));
      const next = current.get(id);
      if (!validFamily(manifest) || !next) throw new Error(`Historic family ${id} is missing.`);
      assertFamilyAppendOnly(manifest, next);
    }
  }
  return commits.length;
}
if (command === 'verify') {
  const { errors, stats } = verifyCatalog(productionDirs, families, { shipping: has('shipping') });
  const generations = verifyHistory();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`Puzzle catalog ok: ${stats.families} families, ${stats.packs} packs, ${stats.entries} entries replayed through their engines, ${generations} root generations append-only.`);
} else if (command === 'bake') {
  const id = flag('family');
  const spec = families.find(f => f.id === id);
  if (!spec) throw new Error(`Unknown family ${id}.`);
  const sourceSha = git('rev-parse', 'HEAD').trim();
  const report = bakeFamily(spec, { dirs: productionDirs, sourceSha, seedBase: Number(flag('seed') ?? 1), maxAttempts: Number(flag('attempts') ?? 200_000), deadlineMs: Number(flag('hours') ?? 6) * 3_600_000 });
  console.log(JSON.stringify(report, null, 1));
  if (!report.published && report.status !== 'complete') process.exitCode = 1;
} else if (command === 'scale') {
  const { measureScale } = await import('./scale');
  const result = await measureScale();
  console.log(JSON.stringify(result, null, 1));
} else {
  console.error('Usage: puzzles (verify [--shipping] | bake --family <id> [--seed n] [--attempts n] [--hours n] | scale)');
  process.exit(2);
}
