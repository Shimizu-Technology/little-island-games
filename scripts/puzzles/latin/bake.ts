/**
 * G3 bake driver: `node --import ./scripts/puzzles/register.mjs scripts/puzzles/latin/bake.ts <family> [--dry]`.
 * Builds a certified candidate pool per rung, arranges the shipped set gentle to hard in the order
 * the kit will publish it, then publishes through the kit's own `bakeFamily` (which certifies every
 * row again and writes packs and receipts). Slots and ordinals come from G3's reserved range.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validRoot } from '../../../src/puzzles/bank';
import { certify, type CertifyContext } from '../../../src/puzzles/checks';
import type { LatinPuzzle } from '../../../src/puzzles/latin/core';
import type { DescriptorCore, FamilySpec } from '../../../src/puzzles/types';
import { families } from '../families';
import { bakeFamily, capTemplates, orderLayouts, productionDirs, readCatalog, readPackText, type CatalogDirs } from '../pipeline';
import { BANK_CAPS, parsePack } from '../../../src/puzzles/bank';
import { decodeRow } from '../../../src/puzzles/descriptor';
import type { CertifiedEntry } from '../../../src/puzzles/checks';
import { describe, type Candidate, type LatinGenerator } from './family';
import { generators } from './generators';

/**
 * SLOTS.md reserves banks 40–59 for G3 (and 100–109, unused). Each family starts at its own slot;
 * ordinals at slot × 1024. Cross Sums has no slot until it passes its stop rule.
 */
export const slotBase: Record<string, number> = { sudoku: 40, 'cage-math': 48, 'greater-than': 53, skyline: 56, killer: 58 };
export const SLOT_END = 60;
/**
 * Inside a rung, the published order runs gentle to hard. No puzzle may be easier than the hardest
 * one before it by more than STEP_BACK of the rung's workload span, or STEP_SLACK workload points
 * when that is larger (half a point is four more empty squares, or half a hidden single). There are
 * no rest beats. See `allowedBack` and `worstBack`.
 */
export const STEP_BACK = 0.05, STEP_SLACK = 0.5;
export const allowedBack = (span: number) => Math.max(STEP_BACK * span, STEP_SLACK);

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
type Laid = CertifiedEntry<LatinPuzzle> & { candidate: Candidate };
const laid = (c: Candidate): Laid => ({ candidate: c, core: { layout: c.template, template: c.template } } as unknown as Laid);
/** Exactly what `bakeFamily` does to an accepted band before it writes packs: cap templates, then order layouts, twice. */
export function kitOrder(list: readonly Candidate[]): Candidate[] {
  const settle = (items: readonly Laid[]) => { let ordered = [...items]; for (;;) { const capped = capTemplates(ordered, BANK_CAPS.templateShare), out = orderLayouts(capped.kept); ordered = out.ordered as Laid[]; if (!capped.dropped.length && !out.dropped.length) return ordered; } };
  return settle(settle(list.map(laid))).map(e => e.candidate);
}
/**
 * The shipped rung in publishing order. The kit never puts one layout twice in a row and takes the
 * most plentiful layout next, so layouts with equal counts are dealt round and round from the first
 * puzzle to the last. Each chosen layout gets an equal share, no more than a quarter of the rung.
 * Every position has a common difficulty aim rising through the pool's own spread, from the easiest
 * level every layout can start at; it takes its layout's easiest unused candidate at or above both
 * the aim and the allowed step below the hardest so far. When a layout runs short of hard puzzles,
 * the aim's top comes down until no puzzle steps back too far. Of the layout choices that give the
 * full rung, the widest gentle one wins. The kit's own ordering functions must give back the list.
 */
export function arrange(gen: LatinGenerator, pool: readonly Candidate[], count: number): Candidate[] {
  const load = new Map(pool.map(c => [c, gen.workload(c)])), supply = new Map<string, Candidate[]>();
  for (const c of [...pool].sort((a, b) => load.get(a)! - load.get(b)! || a.seed - b.seed)) supply.set(c.template, [...(supply.get(c.template) ?? []), c]);
  const layouts = [...supply.keys()].sort((a, b) => supply.get(b)!.length - supply.get(a)!.length || (a < b ? -1 : 1));
  const gentle = (out: readonly Candidate[]) => { const b = worstBack(out.map(c => load.get(c)!)); return b.worst <= b.allowed; };
  let best: { out: Candidate[]; span: number } | null = null;
  for (let k = layouts.length; k >= 4; k--) {
    const chosen = layouts.slice(0, k), n = Math.min(count, k * Math.min(...chosen.map(t => supply.get(t)!.length)), k * Math.floor(count / 4));
    if (best && n < best.out.length) continue;
    const counts = new Map(chosen.map((t, i) => [t, Math.floor(n / k) + (i < n % k ? 1 : 0)]));
    if (chosen.some(t => counts.get(t)! > Math.max(1, Math.floor(n / 4)))) continue;
    const values = chosen.map(t => supply.get(t)!.map(c => load.get(c)!)), all = values.flat().sort((a, b) => a - b);
    const low = Math.max(...values.map(xs => xs[0])), high = Math.min(...values.map(xs => xs.at(-1)!));
    const sequence = orderLayouts(chosen.flatMap(t => Array.from({ length: counts.get(t)! }, () => laid({ template: t } as Candidate)))).ordered.map(e => e.core.layout);
    const build = (top: number): Candidate[] => {
      const band = all.filter(w => w >= low && w <= top), back = allowedBack(top - low) * 0.999, free = new Map(chosen.map(t => [t, [...supply.get(t)!]]));
      let peak = -Infinity;
      return sequence.map((t, j) => {
        const options = free.get(t)!, aim = Math.max(band[Math.round(j / Math.max(1, sequence.length - 1) * (band.length - 1))] ?? low, peak - back);
        let at = options.findIndex(c => load.get(c)! >= aim);
        // Nothing of this layout is hard enough: take its hardest left; worstBack reports it.
        if (at < 0) at = options.length - 1;
        const [c] = options.splice(at, 1);
        peak = Math.max(peak, load.get(c)!);
        return c;
      });
    };
    for (let step = 0; step <= 60; step++) {
      const top = high - (high - low) * step / 60, out = build(top);
      if (!gentle(out)) continue;
      const span = Math.max(...out.map(c => load.get(c)!)) - Math.min(...out.map(c => load.get(c)!));
      const kit = kitOrder(out);
      if (kit.length === out.length && kit.every((c, i) => c === out[i]) && (!best || n > best.out.length || span > best.span)) best = { out, span };
      break;
    }
  }
  if (!best) throw new Error('No gentle publishing order the kit keeps was found for this rung.');
  return best.out;
}
/** The largest drop below the hardest puzzle so far, and what the policy allows for this order. */
export function worstBack(loads: readonly number[]): { worst: number; allowed: number } {
  let top = -Infinity, worst = 0;
  for (const w of loads) { worst = Math.max(worst, top - w); top = Math.max(top, w); }
  return { worst, allowed: allowedBack(Math.max(...loads) - Math.min(...loads)) };
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
    const started = Date.now(), pool = buildPool(gen, spec, i, ctx, Math.ceil(rung.target * factor), tries), picked = arrange(gen, pool.kept, rung.target);
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
