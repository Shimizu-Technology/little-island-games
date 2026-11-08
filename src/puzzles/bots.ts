import { replayAttempt } from './attempt';
import { createRng } from './rng';
import type { AttemptEvent, DescriptorCore, PuzzleAdapter } from './types';

/** `legal` is false when the bot's own moves replay through a state the engine calls invalid. */
export type BotRun = { id: string; ran: boolean; solved: boolean; beat: boolean; legal: boolean; steps: number };
type Choose<A> = (actions: readonly A[], step: number) => A;
const policies = <A,>(seed: number): Record<string, Choose<A>> => {
  const rng = createRng(seed);
  return {
    'repeat-first': a => a[0],
    'repeat-last': a => a[a.length - 1],
    alternate: (a, step) => a[step % 2 ? a.length - 1 : 0],
    cycle: (a, step) => a[step % a.length],
    random: a => a[rng.below(a.length)],
  };
};
export const BOT_STEPS = 256;
/** Plenty for a dumb player: four times the shortest solution, so bots stay affordable on engines that recompute per move. */
export const botSteps = (witnessLength: number) => Math.min(BOT_STEPS, witnessLength * 4 + 8);

/** Dumb players, using only public moves and public progress. `beat` means one met the advertised objective. */
export function runBots<P, S, A>(adapter: PuzzleAdapter<P, S, A>, d: DescriptorCore<P>, maxSteps = BOT_STEPS): BotRun[] {
  const play = (id: string, choose: (s: S, actions: readonly A[], step: number) => A | null): BotRun => {
    let state = adapter.create(d), steps = 0;
    const events: AttemptEvent<A>[] = [];
    let ended = false;
    while (steps < maxSteps && !ended) {
      if (adapter.solved(state, d)) { if (adapter.needsCheck) events.push(['run']); ended = true; break; }
      const actions = adapter.actions(state, d);
      if (!actions.length) break;
      const action = choose(state, actions, steps);
      if (action === null) break;
      const next = adapter.reduce(state, action, d);
      steps++;
      if (next === state) continue;
      state = next;
      events.push(['a', action]);
      if (events.length >= 500) break;
    }
    const evidence = replayAttempt(adapter, d, events);
    const solved = evidence?.outcome === 'solved';
    return { id, ran: true, solved, beat: solved && !!evidence?.withinLimits, legal: evidence !== null, steps };
  };
  const runs = Object.entries(policies<A>(d.seed)).map(([id, pick]) => play(id, (_, actions, step) => pick(actions, step)));
  const tried = new Set<string>();
  runs.push(play('scan', (_, actions) => {
    const fresh = actions.find(a => !tried.has(JSON.stringify(a)));
    if (fresh === undefined) tried.clear();
    const action = fresh ?? actions[0];
    tried.add(JSON.stringify(action));
    return action;
  }));
  const progress = adapter.progress;
  runs.push(progress
    ? play('greedy', (s, actions) => {
      let best: A | null = null, score = Number.NEGATIVE_INFINITY;
      for (const a of actions) {
        const next = adapter.reduce(s, a, d);
        if (next === s) continue;
        const value = progress(next, d);
        if (value > score) { score = value; best = a; }
      }
      return best;
    })
    : { id: 'greedy', ran: false, solved: false, beat: false, legal: true, steps: 0 });
  return runs;
}
