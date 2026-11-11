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
/**
 * Evenly spaced picks through the workload order, so a rung spans easy to hard, with no template
 * over a quarter of the rung. Returned easiest first.
 */
export function spread(gen: LatinGenerator, pool: readonly Candidate[], count: number): Candidate[] {
  const sorted = [...pool].sort((a, b) => gen.workload(a) - gen.workload(b) || a.seed - b.seed), per0 = new Map<string, number>();
  for (const c of sorted) per0.set(c.template, (per0.get(c.template) ?? 0) + 1);
  // The largest rung the kit's 25% template rule allows from this pool, so every pick ships.
  let take = Math.min(count, sorted.length);
  while (take > 0 && [...per0.values()].reduce((n, k) => n + Math.min(k, Math.max(1, Math.floor(take / 4))), 0) < take) take--;
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
type Laid = CertifiedEntry<LatinPuzzle> & { candidate: Candidate };
const laid = (c: Candidate): Laid => ({ candidate: c, core: { layout: c.template, template: c.template } } as unknown as Laid);
/** Exactly what `bakeFamily` does to an accepted band before it writes packs: cap templates, then order layouts, twice. */
export function kitOrder(list: readonly Candidate[]): Candidate[] {
  const settle = (items: readonly Laid[]) => { let ordered = [...items]; for (;;) { const capped = capTemplates(ordered, BANK_CAPS.templateShare), out = orderLayouts(capped.kept); ordered = out.ordered as Laid[]; if (!capped.dropped.length && !out.dropped.length) return ordered; } };
  return settle(settle(list.map(laid))).map(e => e.candidate);
}
/**
 * The shipped rung in publishing order. The kit never puts one layout twice in a row and decides
 * which layout comes next from how many of each are left, so the layout sequence is fixed by the
 * counts. The difficulty aim at each position is the same quantile of the weakest layout's supply,
 * which every layout can reach, and nothing above that layout's hardest is used; each position takes its layout's candidate nearest that aim, never more than the allowed step below the hardest so far. The kit's own
 * ordering functions must give back the same list.
 */
export function arrange(gen: LatinGenerator, pool: readonly Candidate[], count: number): Candidate[] {
  const picks = spread(gen, pool, count);
  if (picks.length < 2) return picks;
  const load = new Map(pool.map(c => [c, gen.workload(c)])), counts = new Map<string, number>();
  for (const c of picks) counts.set(c.template, (counts.get(c.template) ?? 0) + 1);
  const supply = new Map<string, Candidate[]>();
  for (const c of [...pool].sort((a, b) => load.get(a)! - load.get(b)! || a.seed - b.seed)) if (counts.has(c.template)) supply.set(c.template, [...(supply.get(c.template) ?? []), c]);
  const quantile = (f: number) => Math.min(...[...supply.values()].map(xs => load.get(xs[Math.round(f * (xs.length - 1))])!));
  const lows = [...supply.values()].map(xs => load.get(xs[0])!), back = allowedBack(quantile(1) - Math.min(...lows)) * 0.9;
  // Above the hardest level every layout reaches, a candidate would force a later drop.
  const roof = quantile(1) + back;
  for (const [t, xs] of supply) { const kept = xs.filter(c => load.get(c)! <= roof); if (kept.length >= counts.get(t)!) supply.set(t, kept); }
  let firsts = [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || (a < b ? -1 : 1));
  for (let round = 0; round < 8; round++) {
    const sequence = orderLayouts(firsts.flatMap(t => Array.from({ length: counts.get(t)! }, () => laid({ template: t } as Candidate)))).ordered.map(e => e.core.layout);
    const free = new Map([...supply].map(([t, xs]) => [t, [...xs]]));
    const out: Candidate[] = [];
    let top = -Infinity;
    sequence.forEach((t, k) => {
      const options = free.get(t)!, floor = top - back, aim = Math.max(quantile(k / (sequence.length - 1)), top - back / 2);
      // Nearest the aim without overshooting it by much, since an overshoot raises the floor for
      // every later position; overshoot only when nothing else is hard enough.
      const nearest = (ok: (w: number) => boolean) => { let at = -1; options.forEach((c, i) => { const w = load.get(c)!; if (ok(w) && (at < 0 || Math.abs(w - aim) < Math.abs(load.get(options[at])! - aim))) at = i; }); return at; };
      let at = nearest(w => w >= floor && w <= aim + back);
      if (at < 0) at = nearest(w => w >= floor);
      // Nothing of this layout is hard enough: take its hardest left; worstBack reports it.
      if (at < 0) at = options.length - 1;
      const [c] = options.splice(at, 1);
      out.push(c); top = Math.max(top, load.get(c)!);
    });
    const kit = kitOrder(out);
    if (kit.length === out.length && kit.every((c, i) => c === out[i])) return out;
    firsts = [...new Set(out.map(c => c.template))];
  }
  throw new Error('The kit would reorder this rung; no stable publishing order was found.');
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
