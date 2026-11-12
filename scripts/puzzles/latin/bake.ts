/**
 * G3 bake driver: `node --import ./scripts/puzzles/register.mjs scripts/puzzles/latin/bake.ts <family> [--dry]`.
 * Builds a certified candidate pool per rung, arranges the shipped set gentle to hard in the order
 * the kit will publish it, then publishes through the kit's own `bakeFamily` (which certifies every
 * row again and writes packs and receipts). Slots and ordinals come from G3's reserved range.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsePack, validRoot } from '../../../src/puzzles/bank';
import { certify, type CertifyContext } from '../../../src/puzzles/checks';
import type { LatinPuzzle } from '../../../src/puzzles/latin/core';
import type { DescriptorCore, FamilySpec } from '../../../src/puzzles/types';
import { families } from '../families';
import { bakeFamily, productionDirs, readCatalog, readPackText, type CatalogDirs } from '../pipeline';
import { arrangeBy, worstBack } from '../order';
import { decodeRow } from '../../../src/puzzles/descriptor';
import { grade } from '../../../src/puzzles/latin/solver';
import { describe, type Candidate, type LatinGenerator } from './family';
import { generators } from './generators';

/**
 * SLOTS.md reserves banks 40–59 for G3 (and 100–109, unused). Each family starts at its own slot;
 * ordinals at slot × 1024. Cross Sums has no slot until it passes its stop rule.
 */
export const slotBase: Record<string, number> = { sudoku: 40, 'cage-math': 48, 'greater-than': 53, skyline: 56, killer: 58 };
export const SLOT_END = 60;
/** The shared publishing-order policy (scripts/puzzles/order.ts): gentle to hard, no rest beats. */
export { STEP_BACK, STEP_SLACK, allowedBack, kitOrder, worstBack } from '../order';

export type Pool = { rung: string; tried: number; kept: Candidate[] };
/** Certified, semantically distinct candidates for one rung, generated from consecutive seeds. */
export function buildPool(gen: LatinGenerator, spec: FamilySpec<LatinPuzzle>, rungIndex: number, ctx: CertifyContext, want: number, maxTries: number, cache?: string): Pool {
  const rung = gen.rungs[rungIndex], band = spec.bands[rungIndex], kept: Candidate[] = [];
  // A cached pool holds the certified puzzles of an earlier run of the same seeds; each is graded and
  // certified again here (into this run's shared context), so the cache only saves the search.
  const file = cache && join(cache, `pool-${gen.kind}-${rung.id}.json`);
  if (file && existsSync(file)) {
    const saved = JSON.parse(readFileSync(file, 'utf8')) as { tried: number; kept: Pick<Candidate, 'seed' | 'template' | 'puzzle'>[] };
    for (const c of saved.kept) { const g = grade(c.puzzle, 800_000); if (g.status === 'complete' && certify(spec, band, describe({ ...c, grade: g }, rung.id), ctx).ok) kept.push({ ...c, grade: g }); }
    if (kept.length >= Math.min(want, saved.kept.length)) return { rung: rung.id, tried: saved.tried, kept: kept.slice(0, want) };
  }
  kept.length = 0;
  let tried = 0;
  for (let j = 0; j < maxTries && kept.length < want; j++) {
    tried++;
    const seed = ((rungIndex + 1) * 0x01000000 + j) >>> 0, c = gen.generate(rung, seed);
    if (c && certify(spec, band, describe(c, rung.id), ctx).ok) kept.push(c);
  }
  if (file) { mkdirSync(cache!, { recursive: true }); writeFileSync(file, JSON.stringify({ tried, kept: kept.map(c => ({ seed: c.seed, template: c.template, puzzle: c.puzzle })) })); }
  return { rung: rung.id, tried, kept };
}
/** The shipped rung in publishing order: see `arrangeBy`. */
export const arrange = (gen: LatinGenerator, pool: readonly Candidate[], count: number): Candidate[] => arrangeBy(gen.workload, pool, count);
/** Moves the catalog's counters up to this family's reserved range. Nothing else changes. */
export function reserve(dirs: CatalogDirs, family: string): void {
  const file = join(dirs.content, 'root.json'), root: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!validRoot(root)) throw new Error('Root index is invalid.');
  const base = slotBase[family];
  if (root.nextSlot > base) throw new Error(`Slot ${base} for ${family} is already behind the catalog's next slot ${root.nextSlot}.`);
  writeFileSync(file, `${JSON.stringify({ ...root, nextSlot: base, nextOrdinal: Math.max(root.nextOrdinal, base * 1024) })}\n`);
}

if (process.argv[1]?.endsWith('bake.ts')) {
  const kind = process.argv[2], dry = process.argv.includes('--dry'), gen = generators[kind], spec = families.find(f => f.id === kind) as FamilySpec<LatinPuzzle> | undefined;
  if (!gen || !spec) throw new Error(`Unknown Latin family ${kind}.`);
  const factor = Number(process.env.LATIN_POOL ?? 2), tries = Number(process.env.LATIN_TRIES ?? 60000);
  const ctx: CertifyContext = { budget: 200_000, seenExact: new Set(), seenSemantic: new Set() };
  const chosen = gen.rungs.map((rung, i) => {
    const started = Date.now(), pool = buildPool(gen, spec, i, ctx, Math.ceil(rung.target * factor), tries, process.env.LATIN_CACHE);
    let picked: Candidate[] = [];
    try { picked = arrange(gen, pool.kept, rung.target); } catch (e) { console.error(`${rung.id}: ${e instanceof Error ? e.message : String(e)}`); }
    console.log(JSON.stringify({ rung: rung.id, tried: pool.tried, pool: pool.kept.length, picked: picked.length, target: rung.target, floor: rung.floor, back: worstBack(picked.map(gen.workload)), seconds: Math.round((Date.now() - started) / 1000) }));
    return picked;
  });
  const logs = process.env.LATIN_LOGS;
  if (logs) { mkdirSync(logs, { recursive: true }); writeFileSync(join(logs, `pool-${kind}.json`), JSON.stringify(chosen.map((c, i) => ({ rung: gen.rungs[i].id, seeds: c.map(x => x.seed), workload: c.map(x => Math.round(gen.workload(x) * 10) / 10), ceilings: c.map(x => x.grade.ceiling) })))); }
  const short = gen.rungs.filter((r, i) => chosen[i].length < r.floor);
  const steep = gen.rungs.filter((_, i) => { const b = worstBack(chosen[i].map(gen.workload)); return b.worst > b.allowed; });
  if (steep.length) { console.error(`Order steps back too far, nothing published: ${steep.map(r => r.id).join(', ')}.`); process.exitCode = 1; }
  else if (short.length) { console.error(`Below floor, nothing published: ${short.map(r => r.id).join(', ')}.`); process.exitCode = 1; }
  else if (!dry) {
    reserve(productionDirs, kind);
    const listed: FamilySpec<LatinPuzzle> = { ...spec, bands: spec.bands.map((b, i) => ({ ...b, target: chosen[i].length })),
      generate: (seed, band) => { const i = spec.bands.findIndex(b => b.id === band.id), k = seed - 1 - i * 0x1000000, c = chosen[i]?.[k]; return c ? describe(c, band.id) as DescriptorCore<LatinPuzzle> : null; } };
    const report = bakeFamily(listed, { dirs: productionDirs, seedBase: 1, maxAttempts: Math.max(...chosen.map(c => c.length)), sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() });
    console.log(JSON.stringify(report));
    const slots = report.slots;
    if (!report.published || slots.some(s => s < slotBase[kind] || s >= SLOT_END)) { console.error('Bake did not publish inside the reserved slots.'); process.exitCode = 1; }
    // The packs must hold exactly the arranged order, row for row.
    const manifest = readCatalog(productionDirs).families.get(kind)!;
    spec.bands.forEach((band, i) => {
      const rows = manifest.packs.filter(p => manifest.bands[p[5]] === band.id).flatMap(p => parsePack(readPackText(productionDirs, p[0]), p, manifest)!.rows.map(line => decodeRow<LatinPuzzle>(line, band.id, spec.adapter)!));
      if (rows.length !== chosen[i].length || rows.some((d, k) => d.seed !== chosen[i][k].seed)) { console.error(`Published order of ${band.id} differs from the arranged order.`); process.exitCode = 1; }
    });
  }
}
