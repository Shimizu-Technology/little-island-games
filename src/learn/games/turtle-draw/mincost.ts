/** Build-time and test proof of the fewest blocks. Exact for a given command stream: the search tries every split
 * and every whole-body Repeat the editor can build, at its own counts and depth. It is not a claim that no other
 * stream could draw the same picture (see src/learn/program/solver.ts `compress`, which this narrows to the editor). */
import type { Block } from './engine';
import { blockCost } from './dsl';
import type { Primitive } from './program';
export const SCHOOL_COUNTS = [2, 3, 4, 6, 8] as const;
export const DEEP_COUNTS = [2, 3, 4, 5, 6, 8, 9] as const;
/** Repeat nesting the board accepts: a repeat in a repeat in a repeat. */
export const MAX_NESTING = 3;
export type Minimum = { cost: number; programs: Block[][] };
const keep = (list: Block[][]) => { const seen = new Set<string>(); return list.filter(p => { const k = JSON.stringify(p); if (seen.has(k)) return false; seen.add(k); return true; }); };
export function minimumPrograms(stream: readonly Primitive[], counts: readonly number[], alternatives = 6): Minimum | null {
  if (!stream.length || stream.length > 120) return null;
  const key = stream.map(b => JSON.stringify(b));
  const memo = new Map<string, Minimum>();
  const best = (lo: number, hi: number, nesting: number): Minimum => {
    const id = `${lo}/${hi}/${nesting}`, cached = memo.get(id);
    if (cached) return cached;
    let result: Minimum;
    if (hi - lo === 1) result = { cost: 1, programs: [[stream[lo]]] };
    else {
      result = { cost: Infinity, programs: [] };
      const offer = (cost: number, programs: Block[][]) => {
        if (cost < result.cost) result = { cost, programs: keep(programs).slice(0, alternatives) };
        else if (cost === result.cost) result = { cost, programs: keep([...result.programs, ...programs]).slice(0, alternatives) };
      };
      for (let split = lo + 1; split < hi; split++) {
        const a = best(lo, split, nesting), b = best(split, hi, nesting);
        if (a.cost + b.cost > result.cost) continue;
        offer(a.cost + b.cost, a.programs.flatMap(x => b.programs.map(y => [...x, ...y])).slice(0, alternatives * 2));
      }
      if (nesting < MAX_NESTING) for (const times of counts) {
        const length = hi - lo;
        if (length % times) continue;
        const width = length / times;
        let repeated = true;
        for (let i = width; i < length && repeated; i++) repeated = key[lo + i] === key[lo + i % width];
        if (!repeated) continue;
        const body = best(lo, lo + width, nesting + 1);
        offer(1 + body.cost, body.programs.map(p => [{ kind: 'repeat', times, body: p } as Block]));
      }
    }
    memo.set(id, result);
    return result;
  };
  const found = best(0, stream.length, 0);
  return Number.isFinite(found.cost) ? found : null;
}
/** Sanity: every returned program really costs `cost`. */
export const verifyMinimum = (m: Minimum): boolean => m.programs.every(p => blockCost(p) === m.cost);
