/**
 * G3 bake driver: `node --import ./scripts/puzzles/register.mjs scripts/puzzles/latin/bake.ts <family> [--dry]`.
 * Builds a certified candidate pool per rung, spreads the shipped set across the rung's difficulty
 * range, orders it easiest first, then publishes through the kit's own `bakeFamily` (which certifies
 * every row again and writes packs and receipts). Slots and ordinals come from G3's reserved range.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validRoot } from '../../../src/puzzles/bank';
import { certify, type CertifyContext } from '../../../src/puzzles/checks';
import type { LatinPuzzle } from '../../../src/puzzles/latin/core';
import type { DescriptorCore, FamilySpec } from '../../../src/puzzles/types';
import { families } from '../families';
import { bakeFamily, productionDirs, type CatalogDirs } from '../pipeline';
import { describe, type Candidate, type LatinGenerator } from './family';
import { generators } from './generators';

/** SLOTS.md reserves banks 40–59 for G3. Each family starts at its own slot; ordinals at slot × 1024. */
export const slotBase: Record<string, number> = { sudoku: 40, 'cage-math': 48, 'greater-than': 52, skyline: 54, killer: 56, 'cross-sums': 58 };
export const SLOT_END = 60;

export type Pool = { rung: string; tried: number; kept: Candidate[] };
/** Certified, semantically distinct candidates for one rung, generated from consecutive seeds. */
export function buildPool(gen: LatinGenerator, spec: FamilySpec<LatinPuzzle>, rungIndex: number, ctx: CertifyContext, want: number, maxTries: number): Pool {
  const rung = gen.rungs[rungIndex], band = spec.bands[rungIndex], kept: Candidate[] = [];
  let tried = 0;
  for (let j = 0; j < maxTries && kept.length < want; j++) {
    tried++;
    const seed = ((rungIndex + 1) * 0x01000000 + j) >>> 0, c = gen.generate(rung, seed);
    if (c && certify(spec, band, describe(c, rung.id), ctx).ok) kept.push(c);
  }
  return { rung: rung.id, tried, kept };
}
/**
 * Evenly spaced picks through the workload order, so a rung spans easy to hard, with no template
 * over a quarter of the rung. Returned easiest first.
 */
export function spread(gen: LatinGenerator, pool: readonly Candidate[], count: number): Candidate[] {
  const sorted = [...pool].sort((a, b) => gen.workload(a) - gen.workload(b) || a.seed - b.seed), take = Math.min(count, sorted.length);
  const cap = Math.max(1, Math.floor(take / 4)), used = new Set<number>(), per = new Map<string, number>(), out: Candidate[] = [];
  for (let k = 0; k < take; k++) {
    const aim = take === 1 ? 0 : Math.round(k * (sorted.length - 1) / (take - 1));
    for (let reach = 0; reach < sorted.length; reach++) {
      const at = [aim + reach, aim - reach].find(i => i >= 0 && i < sorted.length && !used.has(i) && (per.get(sorted[i].template) ?? 0) < cap);
      if (at === undefined) continue;
      used.add(at); per.set(sorted[at].template, (per.get(sorted[at].template) ?? 0) + 1); out.push(sorted[at]);
      break;
    }
  }
  return out.sort((a, b) => gen.workload(a) - gen.workload(b) || a.seed - b.seed);
}
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
    const started = Date.now(), pool = buildPool(gen, spec, i, ctx, Math.ceil(rung.target * factor), tries), picked = spread(gen, pool.kept, rung.target);
    console.log(JSON.stringify({ rung: rung.id, tried: pool.tried, pool: pool.kept.length, picked: picked.length, target: rung.target, floor: rung.floor, seconds: Math.round((Date.now() - started) / 1000) }));
    return picked;
  });
  const logs = process.env.LATIN_LOGS;
  if (logs) { mkdirSync(logs, { recursive: true }); writeFileSync(join(logs, `pool-${kind}.json`), JSON.stringify(chosen.map((c, i) => ({ rung: gen.rungs[i].id, seeds: c.map(x => x.seed), workload: c.map(x => Math.round(gen.workload(x) * 10) / 10), ceilings: c.map(x => x.grade.ceiling) })))); }
  const short = gen.rungs.filter((r, i) => chosen[i].length < r.floor);
  if (short.length) { console.error(`Below floor, nothing published: ${short.map(r => r.id).join(', ')}.`); process.exitCode = 1; }
  else if (!dry) {
    reserve(productionDirs, kind);
    const listed: FamilySpec<LatinPuzzle> = { ...spec, bands: spec.bands.map((b, i) => ({ ...b, target: chosen[i].length })),
      generate: (seed, band) => { const i = spec.bands.findIndex(b => b.id === band.id), k = seed - 1 - i * 0x1000000, c = chosen[i]?.[k]; return c ? describe(c, band.id) as DescriptorCore<LatinPuzzle> : null; } };
    const report = bakeFamily(listed, { dirs: productionDirs, seedBase: 1, maxAttempts: Math.max(...chosen.map(c => c.length)), sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() });
    console.log(JSON.stringify(report));
    const slots = report.slots;
    if (!report.published || slots.some(s => s < slotBase[kind] || s >= SLOT_END)) { console.error('Bake did not publish inside the reserved slots.'); process.exitCode = 1; }
  }
}
