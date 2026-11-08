import { describe, expect, it, vi } from 'vitest';
import { answerCheck, answerEdit, answerHelp, answerIndependent, answerStart, answerVariant, canCheckAnswer, cellFeedback, type AnswerRules } from '../src/puzzles/wholeAnswer';
import { deepFreeze } from '../src/puzzles/descriptor';

type Puzzle = { sum: number };
type Draft = readonly number[];
const rules: AnswerRules<Puzzle, Draft, Draft> = {
  initial: () => [], valid: draft => draft.every(n => Number.isInteger(n) && n >= 0),
  edit: (_, action) => action, complete: draft => draft.length === 2,
  accepts: (draft, puzzle) => draft[0] + draft[1] === puzzle.sum,
};
const puzzle = { sum: 5 };
it('holds all feedback until an explicit complete Check; a miss keeps the exact draft and counts once', () => {
  const judge = vi.fn(rules.accepts), real = { ...rules, accepts: judge };
  const initial = answerStart(real, puzzle);
  expect(answerCheck(real, puzzle, initial)).toBe(initial);
  let state = answerEdit(real, puzzle, initial, [2, 2]);
  expect(judge).not.toHaveBeenCalled(); expect(state.solved).toBe(false);
  const draft = state.draft; deepFreeze(state);
  state = answerCheck(real, puzzle, state);
  expect(state.draft).toBe(draft); expect(state.last?.draft).toBe(draft);
  expect(state.checks).toBe(1); expect(state.misses).toBe(1);
  expect(answerCheck(real, puzzle, state)).toBe(state); expect(judge).toHaveBeenCalledTimes(1);
  state = answerEdit(real, puzzle, state, [3, 2]);
  expect(state.solved).toBe(false); expect(canCheckAnswer(real, puzzle, state)).toBe(true);
  state = answerCheck(real, puzzle, state);
  expect(state.solved).toBe(true); expect(state.checks).toBe(2); expect(answerIndependent(state)).toBe(false);
});
it('does not call cell judges in Challenge; beginner help remains per-cell', () => {
  const judge = vi.fn(() => 'right');
  expect(cellFeedback('whole', judge)).toBeNull(); expect(judge).not.toHaveBeenCalled();
  expect(cellFeedback('beginner', judge)).toBe('right'); expect(judge).toHaveBeenCalledOnce();
});
it.each([[1, 4], [2, 3], [3, 2], [4, 1]])('accepts an alternate %j + %j through the engine, not one stored answer', (a, b) => {
  const state = answerCheck(rules, puzzle, answerEdit(rules, puzzle, answerStart(rules, puzzle), [a, b]));
  expect(answerIndependent(state)).toBe(true);
  expect(answerEdit(rules, puzzle, state, [0, 0])).toBe(state);
});
it('retires missed choice options and retains the submission until a distinct same-skill sibling is requested', () => {
  const missed = answerCheck(rules, puzzle, answerEdit(rules, puzzle, answerStart(rules, puzzle), [2, 2]), 'choice');
  const previous = { id: 'a', skill: 'add' };
  expect(missed.needsVariant).toBe(true);
  expect(answerEdit(rules, puzzle, missed, [2, 3])).toBe(missed);
  expect(answerCheck(rules, puzzle, missed, 'choice')).toBe(missed);
  expect(answerVariant(rules, missed, previous, { ...previous, puzzle })).toBe(missed);
  expect(answerVariant(rules, missed, previous, { id: 'b', skill: 'read', puzzle })).toBe(missed);
  const fresh = answerVariant(rules, missed, previous, { id: 'b', skill: 'add', puzzle: { sum: 6 } });
  expect(fresh.draft).toEqual([]); expect(fresh.last?.draft).toEqual([2, 2]); expect(fresh.misses).toBe(1);
  expect(fresh.needsVariant).toBe(false);
});
it('helped finishes count as solved while first-try independence remains false', () => {
  const start = answerHelp(answerStart(rules, puzzle));
  const solved = answerCheck(rules, puzzle, answerEdit(rules, puzzle, start, [2, 3]));
  expect(solved.solved).toBe(true); expect(answerIndependent(solved)).toBe(false);
});
describe('immutable inputs', () => {
  it('rejects an invalid draft without losing work', () => {
    const start = deepFreeze(answerStart(rules, puzzle));
    expect(answerEdit(rules, puzzle, start, [-1])).toBe(start);
    expect(start.draft).toEqual([]);
  });
});
