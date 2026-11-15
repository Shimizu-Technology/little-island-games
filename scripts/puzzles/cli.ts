import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { families } from './families';
import { verifyHistory } from './history';
import { bakeFamily, productionDirs, readCatalog, verifyCatalog } from './pipeline';
import { parseRange, readReservations, saveCatalogPath, slotClaim, slotRangeIssues, slotRangesFile } from './slots';

const [command, ...rest] = process.argv.slice(2);
const flag = (name: string) => { const i = rest.indexOf(`--${name}`); return i < 0 ? undefined : rest[i + 1]; };
const has = (name: string) => rest.includes(`--${name}`);
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 });

if (command === 'verify') {
  const { errors, stats } = verifyCatalog(productionDirs, families, { shipping: has('shipping') });
  // Inline banks share the slot space: each lies in a reservation and never on another family's pack.
  if (!existsSync(slotRangesFile(productionDirs))) errors.push(`${slotRangesFile(productionDirs)} is missing.`);
  else {
    const packs = new Map([...readCatalog(productionDirs).families.values()].flatMap(m => m.packs.map(p => [p[0], m.family] as const)));
    const banks = (JSON.parse(readFileSync(saveCatalogPath, 'utf8')) as { banks: { slot: number; family?: string; entries?: unknown }[] }).banks;
    errors.push(...slotRangeIssues(readReservations(productionDirs), banks.map(b => ({ slot: b.slot, what: 'save-catalog bank' }))));
    for (const b of banks) if ('entries' in b && packs.has(b.slot)) errors.push(`Inline save-catalog bank ${b.slot} is also a pack of ${packs.get(b.slot)}.`);
  }
  const history = verifyHistory();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  const exempt = history.unpublished ? `; ${history.unpublished} unpublished families may still be replaced` : '';
  console.log(`Puzzle catalog ok: ${stats.families} families, ${stats.packs} packs, ${stats.entries} entries replayed through their engines; append-only from ${history.checked} published roots (${history.refs.join(', ')}: ${history.published.join(', ') || 'no families'})${exempt}.`);
} else if (command === 'bake') {
  const id = flag('family');
  const spec = families.find(f => f.id === id);
  if (!spec) throw new Error(`Unknown family ${id}.`);
  const sourceSha = git('rev-parse', 'HEAD').trim(), range = flag('range'), owner = flag('owner');
  // Explicit slots name their owner in src/content/puzzles/slot-ranges.json; without --range the sequential default runs.
  if (!range !== !owner) throw new Error('--range and --owner go together.');
  const claim = range && owner ? slotClaim(productionDirs, readCatalog(productionDirs).families.values(), parseRange(range), owner) : undefined;
  const report = bakeFamily(spec, { dirs: productionDirs, sourceSha, claim, seedBase: Number(flag('seed') ?? 1), maxAttempts: Number(flag('attempts') ?? 200_000), deadlineMs: Number(flag('hours') ?? 6) * 3_600_000 });
  console.log(JSON.stringify(report, null, 1));
  if (!report.published && report.status !== 'complete') process.exitCode = 1;
} else if (command === 'scale') {
  const { measureScale } = await import('./scale');
  const result = await measureScale();
  console.log(JSON.stringify(result, null, 1));
} else {
  console.error('Usage: puzzles (verify [--shipping] | bake --family <id> [--range first-last --owner <reservation>] [--seed n] [--attempts n] [--hours n] | scale)');
  process.exit(2);
}
