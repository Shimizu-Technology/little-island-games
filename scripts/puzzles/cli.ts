import { execFileSync } from 'node:child_process';
import { families } from './families';
import { verifyHistory } from './history';
import { bakeFamily, productionDirs, verifyCatalog } from './pipeline';

const [command, ...rest] = process.argv.slice(2);
const flag = (name: string) => { const i = rest.indexOf(`--${name}`); return i < 0 ? undefined : rest[i + 1]; };
const has = (name: string) => rest.includes(`--${name}`);
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 });

if (command === 'verify') {
  const { errors, stats } = verifyCatalog(productionDirs, families, { shipping: has('shipping') });
  const history = verifyHistory();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  const exempt = history.unpublished ? `; ${history.unpublished} unpublished families may still be replaced` : '';
  console.log(`Puzzle catalog ok: ${stats.families} families, ${stats.packs} packs, ${stats.entries} entries replayed through their engines; append-only from ${history.checked} published roots (${history.refs.join(', ')}: ${history.published.join(', ') || 'no families'})${exempt}.`);
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
