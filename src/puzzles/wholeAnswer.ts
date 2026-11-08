import { canonical } from './descriptor';

/** Whole-answer state is derived by the host's versioned replay codec, never trusted from a save. */
export type AnswerRules<P, D, A> = {
  initial(puzzle: P): D;
  valid(draft: D, puzzle: P): boolean;
  edit(draft: D, action: A, puzzle: P): D;
  complete(draft: D, puzzle: P): boolean;
  /** The real engine's predicate, including every valid alternate, rather than a stored witness. */
  accepts(draft: D, puzzle: P): boolean;
};
export type AnswerState<D> = {
  draft: D; revision: number; checkedRevision: number | null;
  checks: number; misses: number; solved: boolean; helped: boolean;
  /** A miss in a choice game retires its options. The submitted draft remains visible. */
  needsVariant: boolean;
  last: { draft: D; correct: boolean } | null;
};
export const answerStart = <P, D, A>(rules: AnswerRules<P, D, A>, puzzle: P): AnswerState<D> => ({
  draft: rules.initial(puzzle), revision: 0, checkedRevision: null, checks: 0, misses: 0,
  solved: false, helped: false, needsVariant: false, last: null,
});
export function answerEdit<P, D, A>(rules: AnswerRules<P, D, A>, puzzle: P, state: AnswerState<D>, action: A): AnswerState<D> {
  if (state.solved || state.needsVariant) return state;
  const draft = rules.edit(state.draft, action, puzzle);
  if (draft === state.draft || !rules.valid(draft, puzzle) || canonical(draft) === canonical(state.draft)) return state;
  return { ...state, draft, revision: state.revision + 1 };
}
/** Incomplete or repeated submissions have no effect. A failed Check never erases an entry. */
export function answerCheck<P, D, A>(rules: AnswerRules<P, D, A>, puzzle: P, state: AnswerState<D>, kind: 'board' | 'choice' = 'board'): AnswerState<D> {
  if (state.solved || state.needsVariant || state.checkedRevision === state.revision || !rules.valid(state.draft, puzzle) || !rules.complete(state.draft, puzzle)) return state;
  const correct = rules.accepts(state.draft, puzzle);
  return { ...state, checks: state.checks + 1, misses: state.misses + Number(!correct), checkedRevision: state.revision,
    solved: correct, needsVariant: !correct && kind === 'choice', last: { draft: state.draft, correct } };
}
/** The host chooses a genuinely different, reviewed sibling on the same skill; skipping earns nothing. */
export function answerVariant<P, D, A>(rules: AnswerRules<P, D, A>, state: AnswerState<D>, previous: { id: string; skill: string }, next: { id: string; skill: string; puzzle: P }): AnswerState<D> {
  if (!state.needsVariant || previous.id === next.id || previous.skill !== next.skill) return state;
  const draft = rules.initial(next.puzzle);
  if (!rules.valid(draft, next.puzzle)) return state;
  return { ...state, draft, revision: state.revision + 1, checkedRevision: null, needsVariant: false };
}
export const answerHelp = <D,>(state: AnswerState<D>): AnswerState<D> => state.helped || state.solved ? state : { ...state, helped: true };
export const answerIndependent = <D,>(state: AnswerState<D>) => state.solved && !state.helped && state.misses === 0;
/** Do not call a cell judge at all in whole mode, including after a failed Check. */
export function cellFeedback<T>(mode: 'beginner' | 'whole', judge: () => T): T | null {
  return mode === 'beginner' ? judge() : null;
}
export const canCheckAnswer = <P, D, A>(rules: AnswerRules<P, D, A>, puzzle: P, state: AnswerState<D>) =>
  !state.solved && !state.needsVariant && state.checkedRevision !== state.revision && rules.valid(state.draft, puzzle) && rules.complete(state.draft, puzzle);
