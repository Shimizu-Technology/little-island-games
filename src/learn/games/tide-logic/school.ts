/**
 * School version 3 (C4): four certified belts a round, one from each quarter of the level, easiest first.
 * Help, Undo and Clear live in the saved round, so a force-close resumes exactly where the child was.
 */
import content from './content.json';
import type { Row } from './generate';
import { FRAMES, complete, firstMiss, nearestAnswer, oneStep, routes, sorts, type Frame } from './rules';

export const SCHOOL_ROWS = content.school as unknown as Row[][];
export const PER_LEVEL = 40, QUARTER = 10, UNDO_DEPTH = 12;
export type TideV3 = {
  version: 3; level: number; picks: number[]; index: number; total: 4; rule: number[]; running: number;
  helped: boolean; hint: number; undo: number[][]; misses: number;
};
export const rowOf = (level: number, pick: number): Row => SCHOOL_ROWS[level - 1][pick];
export const frameOf = (level: number): Frame => FRAMES[SCHOOL_ROWS[level - 1][0].frame];
export const blank = (f: Frame) => f.slots.map(() => -1);
export function currentRow(s: TideV3): Row | null { return s.index >= 4 ? null : rowOf(s.level, s.picks[s.index]); }
/** One belt from each quarter, never the same four as the round before when another is possible. */
export function roundPicks(rng: () => number, previous: readonly number[] = []): number[] {
  return [0, 1, 2, 3].map(q => {
    const options = Array.from({ length: QUARTER }, (_, i) => q * QUARTER + i), fresh = options.filter(i => !previous.includes(i));
    const from = fresh.length ? fresh : options;
    return from[Math.floor(rng() * from.length) % from.length];
  });
}
const withUndo = (s: TideV3, rule: number[]): TideV3 => ({ ...s, rule, undo: [...s.undo, s.rule].slice(-UNDO_DEPTH), hint: 0 });
export function choose(s: TideV3, slot: number, option: number): TideV3 | null {
  const f = frameOf(s.level);
  if (s.running >= 0 || s.index >= 4 || slot < 0 || slot >= f.slots.length || option < 0 || option >= f.slots[slot].options.length || s.rule[slot] === option) return null;
  const rule = [...s.rule]; rule[slot] = option;
  return withUndo(s, rule);
}
export function undo(s: TideV3): TideV3 | null { return s.running >= 0 || !s.undo.length ? null : { ...s, rule: s.undo[s.undo.length - 1], undo: s.undo.slice(0, -1), hint: 0 }; }
export function clear(s: TideV3): TideV3 | null { return s.running >= 0 || s.rule.every(x => x < 0) ? null : withUndo(s, blank(frameOf(s.level))); }
/** Help's ladder: Look, then One step (one block set right), then Show rule. Null when the rule already sorts every catch. */
export function help(s: TideV3): TideV3 | null {
  const row = currentRow(s), f = frameOf(s.level);
  if (!row || s.running >= 0 || s.hint >= 3 || sorts(f, s.rule, row.target, row.belt)) return null;
  const next = s.hint + 1, rule = next === 2 ? oneStep(f, s.rule, row.target, row.belt) ?? s.rule : next === 3 ? nearestAnswer(f, s.rule, row.target) : s.rule;
  return { ...s, rule, undo: rule === s.rule ? s.undo : [...s.undo, s.rule].slice(-UNDO_DEPTH), hint: next, helped: true };
}
/** Run: a wrong rule is a miss with its first wrong catch; a right one starts the belt. */
export function run(s: TideV3): { state: TideV3; miss: number | null } | null {
  const row = currentRow(s), f = frameOf(s.level);
  if (!row || s.running >= 0 || !complete(f, s.rule)) return null;
  const miss = firstMiss(f, s.rule, row.target, row.belt);
  return miss === null ? { state: { ...s, running: 0 }, miss } : { state: { ...s, misses: Math.min(10000, s.misses + 1) }, miss };
}
export function advance(s: TideV3): TideV3 {
  const row = currentRow(s);
  if (!row || s.running < 0) return s;
  if (s.running < row.belt.length) return { ...s, running: s.running + 1 };
  return { ...s, index: s.index + 1, rule: s.index + 1 >= 4 ? [] : blank(frameOf(s.level)), running: -1, hint: 0, undo: [] };
}
/** Catches already sorted to the bucket the child's rule names. Level 4's counter. */
export function counted(s: TideV3): number {
  const row = currentRow(s);
  if (!row || s.running < 0) return 0;
  // The child's own bucket: a right rule may name the other bucket (coral and no bell → left is blue or bell → right).
  const f = frameOf(s.level), side = s.rule[f.slots.length - 1];
  if (!complete(f, s.rule)) return 0;
  const got = routes(f, s.rule, row.belt);
  // The board shows catch `running` as already sorted, so it counts too.
  return got.slice(0, Math.min(row.belt.length, s.running + 1)).filter(x => x === side).length;
}
const validRule = (f: Frame, r: unknown, allowEmpty: boolean): r is number[] => Array.isArray(r) && r.length === f.slots.length && Object.keys(r).length === r.length && r.every((o, i) => Number.isInteger(o) && o >= (allowEmpty ? -1 : 0) && o < f.slots[i].options.length);
export function validV3(x: Record<string, unknown>, level: number): x is TideV3 {
  const keys = 'helped,hint,index,level,misses,picks,rule,running,total,undo,version';
  if (Object.keys(x).sort().join() !== keys || x.version !== 3 || x.level !== level || x.total !== 4 || typeof x.helped !== 'boolean') return false;
  const s = x as unknown as TideV3, f = frameOf(level);
  if (!Array.isArray(s.picks) || s.picks.length !== 4 || !s.picks.every((p, q) => Number.isInteger(p) && p >= q * QUARTER && p < (q + 1) * QUARTER)) return false;
  if (!Number.isInteger(s.index) || s.index < 0 || s.index > 4 || !Number.isInteger(s.hint) || s.hint < 0 || s.hint > 3 || !Number.isInteger(s.misses) || s.misses < 0 || s.misses > 10000) return false;
  if (!Array.isArray(s.undo) || s.undo.length > UNDO_DEPTH || !s.undo.every(r => validRule(f, r, true))) return false;
  if (s.index === 4) return Array.isArray(s.rule) && s.rule.length === 0 && s.running === -1 && s.undo.length === 0 && s.hint === 0;
  const row = rowOf(level, s.picks[s.index]);
  if (!validRule(f, s.rule, true) || !Number.isInteger(s.running) || s.running < -1 || s.running > row.belt.length) return false;
  return s.running === -1 || sorts(f, s.rule, row.target, row.belt);
}
