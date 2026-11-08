import type { AnswerRules } from '../../src/puzzles/wholeAnswer';
import type { PublicHintRules } from '../../src/puzzles/hints';
export type Draft = readonly number[];
export type PublicSum = { target: number; draft: Draft };
/** Used by the native fixture: select only facts that are actually printed on the board. */
export function publicSumView(world: { target: number; draft: Draft; solution?: Draft; privateRecord?: unknown }): PublicSum {
  return { target: world.target, draft: [...world.draft] };
}
export const sumRules: AnswerRules<number, Draft, Draft> = {
  initial: () => [0, 0], valid: d => d.length === 2 && d.every(n => Number.isInteger(n) && n >= 0 && n <= 4),
  edit: (_, a) => a, complete: d => d.every(Boolean), accepts: (d, t) => d[0] + d[1] === t,
};
export const sumHints: PublicHintRules<PublicSum, Draft> = {
  draft: { hasEntries: s => s.draft.some(Boolean), complete: s => s.draft.every(Boolean) },
  look: () => ({ text: 'Look at the two number boxes.', focus: ['left', 'right'] }),
  think: s => ({ text: `Find two numbers that add to ${s.target}.`, focus: [] }),
  preserves: (before, after) => before.draft.every((n, i) => !n || n === after.draft[i]),
  problem: start => ({ start, key: s => s.draft.join(), nodeBudget: 100,
    moves: s => [0, 1].flatMap(i => s.draft[i] ? [] : [1, 2, 3, 4].map(n => s.draft.map((v, j) => i === j ? n : v))),
    apply: (s, a) => ({ ...s, draft: a }), goal: s => sumRules.complete(s.draft, s.target) && sumRules.accepts(s.draft, s.target) }),
};
