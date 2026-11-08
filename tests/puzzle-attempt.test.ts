import { describe, expect, it } from 'vitest';
import { ATTEMPT_LIMITS, appendEvent, replayAttempt } from '../src/puzzles/attempt';
import type { AttemptEvent } from '../src/puzzles/types';
import { toyAdapter, toyCore, type ToyAction, type ToyPayload, type ToyState } from './helpers/puzzle-toy';
import type { PuzzleAdapter } from '../src/puzzles/types';

type E = AttemptEvent<ToyAction>;
const a = (n: ToyAction): E => ['a', n];
const checked = toyAdapter({ needsCheck: true });
const d = toyCore({ payload: { goal: 3 }, par: null, limits: [{ metric: 'steps', max: 2 }] });

describe('attempt replay', () => {
  it('derives a clean independent solve from the log alone', () => {
    expect(replayAttempt(toyAdapter(), d, [a(1), a(2)])).toMatchObject({ outcome: 'solved', metrics: { steps: 2 }, withinLimits: true, runs: 0, helpUsed: false, independent: true });
  });
  it('reports over-limit solves as solved but outside the limits', () => {
    expect(replayAttempt(toyAdapter(), d, [a(1), a(1), a(1)])).toMatchObject({ outcome: 'solved', withinLimits: false });
  });
  it('rejects a no-op, a move after the end, and an unknown event', () => {
    const adapter = toyAdapter();
    expect(replayAttempt(adapter, d, [a(2), a(2)])).toBeNull(); // 4 would overshoot, so the engine refuses it
    expect(replayAttempt(adapter, d, [a(1), a(2), a(1)])).toBeNull();
    expect(replayAttempt(adapter, d, [['forge'] as unknown as E])).toBeNull();
    expect(replayAttempt(adapter, d, [['a', 9] as unknown as E])).toBeNull();
  });
  it('holds whole-answer games neutral until Check, retains the draft and counts a miss once', () => {
    const miss = replayAttempt(checked, d, [a(1), ['run'], a(2), ['run']]);
    expect(miss).toMatchObject({ outcome: 'solved', runs: 2, failedChecks: 1, independent: false, metrics: { steps: 2 } });
    expect(replayAttempt(checked, d, [a(1), a(2)])).toMatchObject({ outcome: 'not-yet', runs: 0 });
    expect(replayAttempt(checked, d, [a(1), a(2), ['run']])).toMatchObject({ outcome: 'solved', independent: true });
  });
  it('refuses Check on a game with no Check, and Check after the answer is accepted', () => {
    expect(replayAttempt(toyAdapter(), d, [['run']])).toBeNull();
    expect(replayAttempt(checked, d, [a(1), a(2), ['run'], ['run']])).toBeNull();
  });
  it('keeps run and failure history across reset, while the route starts over', () => {
    const e = replayAttempt(checked, d, [a(1), ['run'], ['reset'], a(1), a(2), ['run']]);
    expect(e).toMatchObject({ outcome: 'solved', runs: 2, failedChecks: 1, resets: 1, independent: false, metrics: { steps: 2 } });
  });
  it('marks help from the event, never from a caller flag', () => {
    expect(replayAttempt(toyAdapter(), d, [['help'], a(1), a(2)])).toMatchObject({ outcome: 'solved', helpUsed: true, independent: false });
  });
  it('never mutates the descriptor it replays', () => {
    const before = JSON.stringify(d);
    replayAttempt(toyAdapter(), d, [a(1)]);
    expect(JSON.stringify(d)).toBe(before);
    const writer: PuzzleAdapter<ToyPayload, ToyState, ToyAction> = toyAdapter({ create: dd => { dd.payload.goal = 99; return { at: 0 }; } });
    expect(() => replayAttempt(writer, toyCore({ payload: { goal: 3 } }), [])).toThrow(TypeError);
  });
  it('rejects a log longer than the bound before touching the engine', () => {
    const long: E[] = Array(ATTEMPT_LIMITS.events + 1).fill(['help']);
    expect(replayAttempt(toyAdapter({ create: () => { throw new Error('should not run'); } }), d, long)).toBeNull();
  });
});
describe('attempt log limits', () => {
  it('appends without mutating', () => {
    const start = Object.freeze([]) as readonly E[];
    const next = appendEvent(toyAdapter(), start, a(1));
    expect(next).toEqual({ ok: true, events: [a(1)] });
    expect(start).toEqual([]);
  });
  it('refuses the event that would break the budget, leaving the log intact', () => {
    const full: E[] = Array(ATTEMPT_LIMITS.events).fill(a(1));
    expect(appendEvent(toyAdapter(), full, a(1))).toEqual({ ok: false, reason: 'session-budget' });
    expect(full).toHaveLength(ATTEMPT_LIMITS.events);
  });
  it('lets the adapter coalesce edits while every Check, help and reset survives', () => {
    const log: E[] = [...Array(ATTEMPT_LIMITS.events - 1).fill(a(1)), ['run']];
    const coalesce = (events: readonly E[]) => [a(1), ...events.filter(e => e[0] !== 'a')];
    const merged = appendEvent(toyAdapter({ coalesce }), log, a(2));
    expect(merged.ok).toBe(true);
    if (merged.ok) expect(merged.events).toEqual([a(1), ['run'], a(2)]);
  });
  it('ignores a coalesce that loses audit evidence', () => {
    const log: E[] = [...Array(ATTEMPT_LIMITS.events - 1).fill(a(1)), ['help']];
    expect(appendEvent(toyAdapter({ coalesce: () => [a(1)] }), log, a(2))).toEqual({ ok: false, reason: 'session-budget' });
  });
  it('also bounds UTF-8 bytes, not only length', () => {
    const big = Array.from({ length: 2 }, () => ['a', 'é'.repeat(2100)] as unknown as E);
    expect(appendEvent(toyAdapter(), [big[0]], big[1])).toEqual({ ok: false, reason: 'session-budget' });
  });
});
