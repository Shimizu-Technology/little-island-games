import { expect, it } from 'vitest';
import { defineReplayGame } from '../src/challenge/replay';
import type { ReplayEngine } from '../src/challenge/types';
import { catalogManifest } from '../src/state/catalogManifest';
import { emptyChallenge, registerSaveContent, validChallengeSession } from '../src/state/challenge';
import { answerCheck, answerEdit, answerHelp, answerStart, type AnswerRules, type AnswerState } from '../src/puzzles/wholeAnswer';
import { plain, exactKeys, uint } from '../src/state/saveBits';

type Action = { type: 'edit'; draft: number[] } | { type: 'check' | 'help' | 'reset' };
const rules: AnswerRules<number, number[], number[]> = {
  initial: () => [0, 0], valid: d => d.length === 2 && d.every(n => uint(n, 5)), edit: (_, d) => d,
  complete: d => d.every(Boolean), accepts: (d, target) => d[0] + d[1] === target,
};
const engine: ReplayEngine<number, number, Action, AnswerState<number[]>> = {
  initial: d => d, validInitial: (v, d): v is number => v === d, create: d => answerStart(rules, d),
  validAction: (v): v is Action => plain(v) && (v.type === 'edit' ? exactKeys(v, ['type', 'draft']) && Array.isArray(v.draft) && rules.valid(v.draft, 5) : exactKeys(v, ['type']) && ['check', 'help', 'reset'].includes(v.type as string)),
  step: (s, a, d) => {
    if (a.type === 'edit') { const next = answerEdit(rules, d, s, a.draft); return next === s ? null : { state: next, event: 'edit' }; }
    if (a.type === 'check') { const next = answerCheck(rules, d, s); return next === s ? null : { state: next, event: 'check', correct: next.solved }; }
    if (a.type === 'help') return { state: answerHelp(s), event: 'help' };
    return { state: answerStart(rules, d), event: 'reset' };
  },
  inspect: s => ({ solved: s.solved, metrics: {}, edits: s.revision, solution: null, objectives: [] }),
};
const entry = defineReplayGame<number, number, Action, AnswerState<number[]>>({ game: 'whole-kit-proof', codec: 'whole-kit-proof-v1', context: 'wholekit', cove: true,
  budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 }, engine, Board: () => null, controls: { help: () => ({ type: 'help' }), reset: () => ({ type: 'reset' }) },
  puzzles: [{ ref: { engine: 'whole-kit-proof', bank: 439, puzzle: 0, rules: 1, hash: 'c'.repeat(64) }, descriptor: 5,
    title: 'Five shells', path: 'endless', tier: 1, source: { kind: 'endless', bank: 439, puzzle: 0 }, dares: [], awards: [null, null] }],
});
it('replays a neutral draft across a serialized pause; missed and helped finishes count through the existing save codec', () => {
  registerSaveContent(entry.catalog, catalogManifest(entry.catalog));
  let session = entry.start(entry.puzzles[0].ref, 'a', 'whole-1', emptyChallenge(), { supportOff: false, ownRead: false }, []);
  session = entry.move(session, { type: 'edit', draft: [3, 3] })!;
  expect(session.result).toBeNull(); expect(validChallengeSession(JSON.parse(JSON.stringify(session)), 'a')).toBe(true);
  session = entry.move(session, { type: 'check' })!;
  expect(session.result).toBeNull(); expect(entry.move(session, { type: 'check' })).toBeNull();
  session = entry.move(session, { type: 'help' })!;
  session = entry.move(session, { type: 'edit', draft: [3, 2] })!;
  expect(session.result).toBeNull();
  session = entry.move(session, { type: 'check' })!;
  expect(session.result?.event).toBe('helped'); expect(validChallengeSession(session, 'a')).toBe(true);
  expect(entry.move(session, { type: 'help' })).toBeNull();
});
it('accepts an alternate independent solution and refuses forged completion on an unsubmitted draft', () => {
  registerSaveContent(entry.catalog, catalogManifest(entry.catalog));
  const start = entry.start(entry.puzzles[0].ref, 'a', 'whole-2', emptyChallenge(), { supportOff: false, ownRead: false }, []);
  const draft = entry.move(start, { type: 'edit', draft: [4, 1] })!;
  const solved = entry.move(draft, { type: 'check' })!;
  expect(solved.result?.event).toBe('independent');
  expect(validChallengeSession({ ...draft, result: solved.result }, 'a')).toBe(false);
});
