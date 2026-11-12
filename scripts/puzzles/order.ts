/**
 * Publishing order for a packed rung, shared by the G3 (Latin) and G5 (edge) bake drivers. The kit's
 * `bakeFamily` re-orders an accepted band (template caps, then `orderLayouts`), so a rung is arranged
 * here in exactly the order the kit will publish, then checked against the kit's own functions.
 */
import { BANK_CAPS } from '../../src/puzzles/bank';
import type { CertifiedEntry } from '../../src/puzzles/checks';
import { capTemplates, orderLayouts } from './pipeline';

/**
 * Inside a rung, the published order runs gentle to hard. No puzzle may be easier than the hardest
 * one before it by more than STEP_BACK of the rung's workload span, or STEP_SLACK workload points
 * when that is larger (in Sudoku, half a point is four more empty squares or half a hidden single;
 * in Bridges and Loop, about half of one simplest step). There are no rest beats. See `allowedBack` and `worstBack`.
 */
export const STEP_BACK = 0.05, STEP_SLACK = 0.5;
export const allowedBack = (span: number) => Math.max(STEP_BACK * span, STEP_SLACK);
/** What the order needs of a candidate: a seed, and its layout (template), which the kit spaces out. */
export type Orderable = { seed: number; template: string };

type Laid<C> = CertifiedEntry<unknown> & { candidate: C };
const laid = <C extends Orderable>(c: C): Laid<C> => ({ candidate: c, core: { layout: c.template, template: c.template } } as unknown as Laid<C>);
/** Exactly what `bakeFamily` does to an accepted band before it writes packs: cap templates, then order layouts, twice. */
export function kitOrder<C extends Orderable>(list: readonly C[]): C[] {
  const settle = (items: readonly Laid<C>[]) => { let ordered = [...items]; for (;;) { const capped = capTemplates(ordered, BANK_CAPS.templateShare), out = orderLayouts(capped.kept); ordered = out.ordered as Laid<C>[]; if (!capped.dropped.length && !out.dropped.length) return ordered; } };
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
 * largest rung, the widest gentle one wins; a rung shrinks only when nothing at full size is gentle.
 * The kit's own ordering functions must give back the list.
 */
export function arrangeBy<C extends Orderable>(workload: (c: C) => number, pool: readonly C[], count: number): C[] {
  const load = new Map(pool.map(c => [c, workload(c)])), supply = new Map<string, C[]>();
  for (const c of [...pool].sort((a, b) => load.get(a)! - load.get(b)! || a.seed - b.seed)) supply.set(c.template, [...(supply.get(c.template) ?? []), c]);
  const layouts = [...supply.keys()].sort((a, b) => supply.get(b)!.length - supply.get(a)!.length || (a < b ? -1 : 1));
  const gentle = (out: readonly C[]) => { const b = worstBack(out.map(c => load.get(c)!)); return b.worst <= b.allowed; };
  let best: { out: C[]; span: number } | null = null;
  // Full size first; a rung only shrinks (in steps of a twentieth) when no layout choice is gentle.
  for (let size = count; !best && size >= Math.ceil(count / 2); size -= Math.max(1, Math.ceil(count / 20))) for (let k = layouts.length; k >= 4; k--) {
    const chosen = layouts.slice(0, k), n = Math.min(size, k * Math.min(...chosen.map(t => supply.get(t)!.length)), k * Math.floor(size / 4));
    if (best && n < best.out.length) continue;
    const counts = new Map(chosen.map((t, i) => [t, Math.floor(n / k) + (i < n % k ? 1 : 0)]));
    if (chosen.some(t => counts.get(t)! > Math.max(1, Math.floor(n / 4)))) continue;
    const values = chosen.map(t => supply.get(t)!.map(c => load.get(c)!)), all = values.flat().sort((a, b) => a - b);
    const low = Math.max(...values.map(xs => xs[0])), high = Math.min(...values.map(xs => xs.at(-1)!));
    const sequence = orderLayouts(chosen.flatMap(t => Array.from({ length: counts.get(t)! }, () => laid({ template: t, seed: 0 })))).ordered.map(e => e.core.layout);
    const build = (top: number): C[] => {
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
