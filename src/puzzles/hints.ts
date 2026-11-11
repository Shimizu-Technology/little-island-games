import { createSearch, type SearchProblem } from './solver';

export const hintSteps = ['look', 'think', 'one-step', 'show-me'] as const;
export type HintStep = typeof hintSteps[number];
export const hintLabels: Record<HintStep, string> = { look: 'Look', think: 'Think', 'one-step': 'One step', 'show-me': 'Show me' };
export type HintCue = { text: string; focus: readonly string[] };
/** V contains only visible rules, clues and the current draft. Never pass a bank descriptor/solution. */
export type PublicHintRules<V, A> = {
  /** Entry grids defer One step after an entry, without inspecting its correctness. */
  draft: {
    hasEntries(view: V): boolean; complete(view: V): boolean;
    /** A blank example built only from visible clues, independent of the child's entries. */
    opening(view: V): V;
    /** Describe the solved example without comparing it with or highlighting the child's draft. */
    describe(example: V): HintCue;
  } | null;
  look(view: V): HintCue;
  think(view: V): HintCue;
  /** Start at this exact draft, using the same pure move/goal rules as gameplay. No stored route. */
  problem(view: V): SearchProblem<V, A>;
  /** Grid adapters forbid changing a valid alternative entry; path adapters can allow a retrace. */
  preserves(before: V, after: V): boolean;
  /**
   * Optional, for path boards with no hidden information only (every piece and goal is on screen).
   * A certified shortest route from this exact view, such as a stored route the player is still on.
   * It is replayed through the real rules like any search result; null falls back to the exact search.
   */
  known?(view: V): readonly A[] | null;
  /**
   * Optional, same boards only. Look and Think point at the next route's public pieces (which piece
   * moves first, where it stops). The route comes from `known` or the same sliced exact search, and
   * the cue must not name an action. Without a route both report unavailable.
   */
  routeCue?(view: V, step: 'look' | 'think', route: readonly A[]): HintCue;
  /** Optional wording when no route exists from here. Hosts keep the default otherwise. */
  unavailable?: string;
};
export type HintResult<A> =
  | { status: 'cue'; cue: HintCue }
  | { status: 'example'; cue: HintCue }
  | { status: 'route'; actions: readonly A[]; last: boolean }
  | { status: 'unavailable' }
  | { status: 'cancelled' };
export const hintOffered = (kind: 'grid' | 'build-run', failedRuns: number) => kind === 'grid' || failedRuns >= 3;
const yieldTurn = () => new Promise<void>(resolve => setTimeout(resolve, 0));
type Found<V, A> = { status: 'found'; actions: readonly A[]; end: V } | { status: 'unavailable' } | { status: 'cancelled' };
/** Every route, stored or searched, is checked against the real rules before even its first action is shown. */
async function verified<V, A>(rules: PublicHintRules<V, A>, problem: SearchProblem<V, A>, start: V, actions: readonly A[], signal: AbortSignal, schedule: () => Promise<void>): Promise<Found<V, A>> {
  let current = start, checked = 0, started = performance.now();
  for (const action of actions) {
    if (signal.aborted) return { status: 'cancelled' };
    if (checked++ >= 64 || performance.now() - started >= 8) {
      await schedule(); checked = 0; started = performance.now();
      if (signal.aborted) return { status: 'cancelled' };
    }
    const next = problem.apply(current, action);
    if (next === current || !rules.preserves(current, next)) return { status: 'unavailable' };
    current = next;
  }
  return problem.goal(current) ? { status: 'found', actions, end: current } : { status: 'unavailable' };
}
async function findRoute<V, A>(rules: PublicHintRules<V, A>, start: V, signal: AbortSignal, schedule: () => Promise<void>, allowKnown: boolean): Promise<Found<V, A>> {
  const problem = rules.problem(start);
  const known = allowKnown ? rules.known?.(start) ?? null : null;
  if (known) {
    const stored = await verified(rules, problem, start, known, signal, schedule);
    if (stored.status !== 'unavailable') return stored;
  }
  // Enforce the current draft for moves, or the separate blank example for an explicit reveal.
  const search = createSearch({ ...problem, start, apply: (s, a) => {
    const next = problem.apply(s, a);
    return rules.preserves(s, next) ? next : s;
  } });
  for (;;) {
    if (signal.aborted) return { status: 'cancelled' };
    const result = search.run(64, 8);
    if (result.status === 'solved') return verified(rules, problem, start, result.witness, signal, schedule);
    if (result.status !== 'running') return { status: 'unavailable' };
    await schedule();
  }
}
/** Search yields after at most 8 ms (one engine expansion must itself be bounded). */
export async function requestHint<V, A>(rules: PublicHintRules<V, A>, view: V, step: HintStep, signal: AbortSignal, schedule = yieldTurn): Promise<HintResult<A>> {
  if (signal.aborted) return { status: 'cancelled' };
  if (step === 'look' || step === 'think') {
    if (!rules.routeCue) return { status: 'cue', cue: rules[step](view) };
    const found = await findRoute(rules, view, signal, schedule, true);
    if (found.status !== 'found') return found;
    if (!found.actions.length) return { status: 'cue', cue: rules[step](view) };
    return { status: 'cue', cue: rules.routeCue(view, step, found.actions) };
  }
  if (step === 'one-step' && rules.draft?.hasEntries(view)) return { status: 'cue', cue: {
    text: rules.draft.complete(view) ? 'Every box is filled. Check when you are ready, or choose Show me.' : 'Your entries are kept. Choose Show me or try another puzzle.', focus: [],
  } };
  const example = step === 'show-me' ? rules.draft : null;
  const start = example ? example.opening(view) : view;
  const found = await findRoute(rules, start, signal, schedule, !example);
  if (found.status !== 'found') return found;
  if (example) return { status: 'example', cue: example.describe(found.end) };
  return { status: 'route', actions: step === 'one-step' ? found.actions.slice(0, 1) : found.actions, last: found.actions.length <= 1 };
}
