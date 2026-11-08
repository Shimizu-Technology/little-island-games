import { createSearch, type SearchProblem } from './solver';

export const hintSteps = ['look', 'think', 'one-step', 'show-me'] as const;
export type HintStep = typeof hintSteps[number];
export const hintLabels: Record<HintStep, string> = { look: 'Look', think: 'Think', 'one-step': 'One step', 'show-me': 'Show me' };
export type HintCue = { text: string; focus: readonly string[] };
/** V contains only visible rules, clues and the current draft. Never pass a bank descriptor/solution. */
export type PublicHintRules<V, A> = {
  /** Entry grids defer One step after an entry, without inspecting its correctness. */
  draft: { hasEntries(view: V): boolean; complete(view: V): boolean } | null;
  look(view: V): HintCue;
  think(view: V): HintCue;
  /** Start at this exact draft, using the same pure move/goal rules as gameplay. No stored route. */
  problem(view: V): SearchProblem<V, A>;
  /** Grid adapters forbid changing a valid alternative entry; path adapters can allow a retrace. */
  preserves(before: V, after: V): boolean;
};
export type HintResult<A> =
  | { status: 'cue'; cue: HintCue }
  | { status: 'route'; actions: readonly A[]; last: boolean }
  | { status: 'unavailable' }
  | { status: 'cancelled' };
export const hintOffered = (kind: 'grid' | 'build-run', failedRuns: number) => kind === 'grid' || failedRuns >= 3;
const yieldTurn = () => new Promise<void>(resolve => setTimeout(resolve, 0));
/** Search yields after at most 8 ms (one engine expansion must itself be bounded). */
export async function requestHint<V, A>(rules: PublicHintRules<V, A>, view: V, step: HintStep, signal: AbortSignal, schedule = yieldTurn): Promise<HintResult<A>> {
  if (signal.aborted) return { status: 'cancelled' };
  if (step === 'look' || step === 'think') return { status: 'cue', cue: rules[step](view) };
  if (step === 'one-step' && rules.draft?.hasEntries(view)) return { status: 'cue', cue: {
    text: rules.draft.complete(view) ? 'Every box is filled. Check when you are ready, or choose Show me.' : 'Your entries are kept. Choose Show me or try another puzzle.', focus: [],
  } };
  const problem = rules.problem(view);
  // Enforce the requested starting draft even if an adapter accidentally supplies its opening.
  const search = createSearch({ ...problem, start: view, apply: (s, a) => {
    const next = problem.apply(s, a);
    return rules.preserves(s, next) ? next : s;
  } });
  for (;;) {
    if (signal.aborted) return { status: 'cancelled' };
    const result = search.run(64, 8);
    if (result.status === 'solved') {
      // Check the returned actions against the real rules before showing even the first one.
      let current = view, checked = 0, started = performance.now();
      for (const action of result.witness) {
        if (signal.aborted) return { status: 'cancelled' };
        if (checked++ >= 64 || performance.now() - started >= 8) {
          await schedule(); checked = 0; started = performance.now();
          if (signal.aborted) return { status: 'cancelled' };
        }
        const next = problem.apply(current, action);
        if (next === current || !rules.preserves(current, next)) return { status: 'unavailable' };
        current = next;
      }
      if (!problem.goal(current)) return { status: 'unavailable' };
      return { status: 'route', actions: step === 'one-step' ? result.witness.slice(0, 1) : result.witness, last: result.witness.length <= 1 };
    }
    if (result.status !== 'running') return { status: 'unavailable' };
    await schedule();
  }
}
