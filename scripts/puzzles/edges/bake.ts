/**
 * G5 bake driver: `node --import ./scripts/puzzles/register.mjs scripts/puzzles/edges/bake.ts <family> [--dry]`.
 * Builds a certified candidate pool per rung, arranges the shipped set gentle to hard in the order
 * the kit will publish it (the shared policy in ../order.ts, as G3 does), then publishes through the
 * kit's own `bakeFamily` (which certifies every row again and writes packs and receipts), and checks
 * the packs hold exactly that order. Slots and ordinals stay inside G5's reserved range.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsePack, validRoot } from '../../../src/puzzles/bank';
import { certify, type CertifyContext } from '../../../src/puzzles/checks';
import { decodeRow } from '../../../src/puzzles/descriptor';
import type { DescriptorCore, FamilySpec } from '../../../src/puzzles/types';
import { families } from '../families';
import { arrangeBy, worstBack } from '../order';
import { bakeFamily, productionDirs, readCatalog, readPackText, type CatalogDirs } from '../pipeline';
import { describe, type EdgeCandidate, type EdgeGenerator } from './family';
import { edgeGenerators } from './generators';

/** SLOTS.md reserves banks 60–79 for G5. Each family starts at its own slot; ordinals at slot × 1024. */
export const slotBase: Record<string, number> = { bridges: 60, loop: 67, 'pearl-loop': 74 };
export const SLOT_END = 80;

export type Pool<P> = { rung: string; tried: number; kept: EdgeCandidate<P>[] };
/**
 * Certified, semantically distinct candidates for one rung, generated from consecutive seeds. A cached
 * pool holds the boards of an earlier run of the same seeds; each is graded, judged against the rung
 * and certified again here (into this run's shared context), so the cache only saves the search.
 */
export function buildPool<P>(gen: EdgeGenerator<P>, spec: FamilySpec<P>, rungIndex: number, ctx: CertifyContext, want: number, maxTries: number, cache?: string): Pool<P> {
  const rung = gen.rungs[rungIndex], band = spec.bands[rungIndex], kept: EdgeCandidate<P>[] = [], per = new Map<string, number>();
  // No layout style may fill more than a quarter of the pool, so the shipped rung can use all of it.
  const cap = Math.ceil(want / 4);
  const file = cache && join(cache, `pool-${gen.family}-${rung.id}.json`);
  if (file && existsSync(file)) {
    const saved = JSON.parse(readFileSync(file, 'utf8')) as { tried: number; want: number; kept: Pick<EdgeCandidate<P>, 'seed' | 'template' | 'puzzle'>[] };
    for (const c of saved.kept) { const again = gen.judge(rung, c.seed, c.puzzle, c.template); if (again && certify(spec, band, describe(again, rung.id), ctx).ok) kept.push(again); }
    if (saved.want === want && kept.length === saved.kept.length) return { rung: rung.id, tried: saved.tried, kept };
    throw new Error(`Cached pool for ${rung.id} does not re-certify whole, or was built for another size; delete it to search again.`);
  }
  let tried = 0;
  for (let j = 0; j < maxTries && kept.length < want; j++) {
    tried++;
    const seed = ((rungIndex + 1) * 0x01000000 + j) >>> 0, c = gen.generate(rung, seed);
    if (!c || (per.get(c.template) ?? 0) >= cap) continue;
    if (certify(spec, band, describe(c, rung.id), ctx).ok) { kept.push(c); per.set(c.template, (per.get(c.template) ?? 0) + 1); }
  }
  if (file) { mkdirSync(cache!, { recursive: true }); writeFileSync(file, JSON.stringify({ tried, want, kept: kept.map(c => ({ seed: c.seed, template: c.template, puzzle: c.puzzle })) })); }
  return { rung: rung.id, tried, kept };
}
/** The shipped rung in publishing order, gentle to hard by workload (see `arrangeBy`). */
export const arrange = <P,>(pool: readonly EdgeCandidate<P>[], count: number): EdgeCandidate<P>[] => arrangeBy(c => c.workload, pool, count);
/** Moves the catalog's counters up to this family's reserved range. Nothing else changes. */
export function reserve(dirs: CatalogDirs, family: string): void {
  const file = join(dirs.content, 'root.json'), root: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!validRoot(root)) throw new Error('Root index is invalid.');
  const base = slotBase[family];
  if (root.nextSlot > base) throw new Error(`Slot ${base} for ${family} is already behind the catalog's next slot ${root.nextSlot}.`);
  writeFileSync(file, `${JSON.stringify({ ...root, nextSlot: base, nextOrdinal: Math.max(root.nextOrdinal, base * 1024) })}\n`);
}

if (process.argv[1]?.endsWith('bake.ts')) {
  const kind = process.argv[2], dry = process.argv.includes('--dry'), gen = edgeGenerators[kind] as EdgeGenerator<unknown> | undefined, spec = families.find(f => f.id === kind);
  if (!gen || !spec) throw new Error(`Unknown G5 family ${kind}.`);
  const factor = Number(process.env.EDGE_POOL ?? 2), tries = Number(process.env.EDGE_TRIES ?? 400000);
  const ctx: CertifyContext = { budget: 200_000, seenExact: new Set(), seenSemantic: new Set() };
  const chosen = gen.rungs.map((rung, i) => {
    const started = Date.now(), pool = buildPool(gen, spec, i, ctx, Math.ceil(rung.target * factor), tries, process.env.EDGE_CACHE);
    let picked: EdgeCandidate<unknown>[] = [];
    try { picked = arrange(pool.kept, rung.target); } catch (e) { console.error(`${rung.id}: ${e instanceof Error ? e.message : String(e)}`); }
    console.log(JSON.stringify({ rung: rung.id, tried: pool.tried, pool: pool.kept.length, picked: picked.length, target: rung.target, floor: rung.floor, back: picked.length ? worstBack(picked.map(c => c.workload)) : null, seconds: Math.round((Date.now() - started) / 1000) }));
    return picked;
  });
  const logs = process.env.EDGE_LOGS;
  if (logs) { mkdirSync(logs, { recursive: true }); writeFileSync(join(logs, `pool-${kind}.json`), JSON.stringify(chosen.map((c, i) => ({ rung: gen.rungs[i].id, seeds: c.map(x => x.seed), workload: c.map(x => Math.round(x.workload * 10) / 10), ceilings: c.map(x => x.ceiling), templates: c.map(x => x.template) })))); }
  const short = gen.rungs.filter((r, i) => chosen[i].length < r.floor);
  const steep = gen.rungs.filter((_, i) => { if (!chosen[i].length) return false; const b = worstBack(chosen[i].map(c => c.workload)); return b.worst > b.allowed; });
  if (steep.length) { console.error(`Order steps back too far, nothing published: ${steep.map(r => r.id).join(', ')}.`); process.exitCode = 1; }
  else if (short.length) { console.error(`Below floor, nothing published: ${short.map(r => r.id).join(', ')}.`); process.exitCode = 1; }
  else if (!dry) {
    reserve(productionDirs, kind);
    const listed: FamilySpec<unknown> = { ...spec, bands: spec.bands.map((b, i) => ({ ...b, target: chosen[i].length })),
      generate: (seed, band) => { const i = spec.bands.findIndex(b => b.id === band.id), k = seed - 1 - i * 0x1000000, c = chosen[i]?.[k]; return c ? describe(c, band.id) as DescriptorCore<unknown> : null; } };
    const report = bakeFamily(listed, { dirs: productionDirs, seedBase: 1, maxAttempts: Math.max(...chosen.map(c => c.length)), sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() });
    console.log(JSON.stringify(report));
    if (!report.published || report.slots.some(s => s < slotBase[kind] || s >= SLOT_END)) { console.error('Bake did not publish inside the reserved slots.'); process.exitCode = 1; }
    // The packs must hold exactly the arranged order, row for row.
    const manifest = readCatalog(productionDirs).families.get(kind)!;
    spec.bands.forEach((band, i) => {
      const rows = manifest.packs.filter(p => manifest.bands[p[5]] === band.id).flatMap(p => parsePack(readPackText(productionDirs, p[0]), p, manifest)!.rows.map(line => decodeRow<unknown>(line, band.id, spec.adapter)!));
      if (rows.length !== chosen[i].length || rows.some((d, k) => d.seed !== chosen[i][k].seed)) { console.error(`Published order of ${band.id} differs from the arranged order.`); process.exitCode = 1; }
    });
  }
}
