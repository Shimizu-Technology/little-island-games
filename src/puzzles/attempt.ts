import { jsonBytes, uint } from '../state/saveBits';
import { deepFreeze } from './descriptor';
import type { AttemptEvent, AttemptEvidence, DescriptorCore, PuzzleAdapter } from './types';

export const ATTEMPT_LIMITS = { events: 512, bytes: 4096 } as const;
/** A metric counts only when the engine measured it. An unreported one is missing evidence, never zero. */
export const measured = (value: unknown): value is number => uint(value, Number.MAX_SAFE_INTEGER);
export type AppendResult<A> = { ok: true; events: AttemptEvent<A>[] } | { ok: false; reason: 'session-budget' };
const fits = <A,>(events: readonly AttemptEvent<A>[]) => events.length <= ATTEMPT_LIMITS.events && jsonBytes(events) <= ATTEMPT_LIMITS.bytes;
const audit = <A,>(events: readonly AttemptEvent<A>[]) => events.filter(e => e[0] !== 'a').map(e => e[0]).join();

/**
 * Never mutates and never drops the draft. At the limit, the adapter may coalesce edits. A coalesce
 * that loses a Check, help or reset is ignored: the caller must offer an explicit new attempt.
 */
export function appendEvent<P, S, A>(adapter: Pick<PuzzleAdapter<P, S, A>, 'coalesce'>, events: readonly AttemptEvent<A>[], event: AttemptEvent<A>): AppendResult<A> {
  const next = [...events, event];
  if (fits(next)) return { ok: true, events: next };
  const merged = adapter.coalesce?.(events);
  if (!merged || audit(merged) !== audit(events)) return { ok: false, reason: 'session-budget' };
  const retry = [...merged, event];
  return fits(retry) ? { ok: true, events: retry } : { ok: false, reason: 'session-budget' };
}

/**
 * Evidence comes only from replaying the log through the real engine, never from caller flags.
 * Returns null for a log the engine would not accept, including one through a state it calls invalid.
 */
export function replayAttempt<P, S, A>(adapter: PuzzleAdapter<P, S, A>, descriptor: DescriptorCore<P>, events: readonly AttemptEvent<A>[]): AttemptEvidence | null {
  if (events.length > ATTEMPT_LIMITS.events) return null;
  const d = deepFreeze(descriptor);
  let state = adapter.create(d), actions: A[] = [], runs = 0, failedChecks = 0, resets = 0, helpUsed = false, checked = false;
  if (!adapter.validState(state, d)) return null;
  for (const event of events) {
    const terminal = adapter.needsCheck ? checked : adapter.solved(state, d);
    if (event[0] === 'a') {
      if (terminal || !adapter.isAction(event[1])) return null;
      const next = adapter.reduce(state, event[1], d);
      if (next === state || !adapter.validState(next, d)) return null;
      state = next;
      actions.push(event[1]);
      checked = false;
    } else if (event[0] === 'run') {
      if (!adapter.needsCheck || terminal) return null;
      runs++;
      if (adapter.solved(state, d)) checked = true;
      else failedChecks++;
    } else if (event[0] === 'help') {
      if (terminal) return null;
      helpUsed = true;
    } else if (event[0] === 'reset') {
      if (terminal) return null;
      state = adapter.create(d);
      if (!adapter.validState(state, d)) return null;
      actions = [];
      checked = false;
      resets++;
    } else return null;
  }
  const solved = adapter.needsCheck ? checked : adapter.solved(state, d);
  const metrics = adapter.metrics(state, actions, d);
  const withinLimits = d.limits.every(l => { const value = metrics[l.metric]; return measured(value) && value <= l.max; });
  return { outcome: solved ? 'solved' : 'not-yet', metrics, withinLimits, runs, failedChecks, resets, helpUsed,
    independent: !helpUsed && failedChecks === 0, solution: solved ? adapter.solutionHash?.(state, d) ?? null : null };
}
