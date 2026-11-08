import React, { useCallback, useEffect, useRef } from 'react';
import { defineReplayGame } from '../../../challenge/replay';
import type { ChallengeViewProps, Puzzle, ReplayEngine, ReplayPayload } from '../../../challenge/types';
import { sha256Hex } from '../../../puzzles/sha256';
import sets from './sets.generated.json';
import { rowPuzzle } from './engine';
import { Playfield } from './field';
import { gridOf, homeAll, MAX_ROUTE, slideOn, type Dir, type SlipPuzzle } from './rules';

/** Inline authored set of certified bank rows. The whole bank stays packed; see the slice report for the packed-replay gap. */
export const DEEP_BANK = 480, ENDLESS_BANK = 481, FIRST_DARE_SLOT = 1200;
const MAX_ACTIONS = 500;
export type Descriptor = { puzzle: SlipPuzzle };
export type Action = Dir | 'undo' | 'reset' | 'help';
export type State = { puzzle: SlipPuzzle; crabs: number[]; moves: string; resets: number; undos: number; stack: number[][]; actions: number };
type Initial = 0;
export type Payload = ReplayPayload<Initial, Action>;

const engine: ReplayEngine<Descriptor, Initial, Action, State> = {
  initial: () => 0,
  validInitial: (v): v is Initial => v === 0,
  create: d => ({ puzzle: d.puzzle, crabs: [...d.puzzle.crabs], moves: '', resets: 0, undos: 0, stack: [], actions: 0 }),
  validAction: (v): v is Action => v === 0 || v === 1 || v === 2 || v === 3 || v === 'undo' || v === 'reset' || v === 'help',
  step: (s, a) => {
    const counted = { ...s, actions: s.actions + 1 };
    if (a === 'help') return { state: counted, event: 'help' };
    if (a === 'reset') return s.moves ? { state: { ...counted, crabs: [...s.puzzle.crabs], moves: '', stack: [], resets: s.resets + 1 }, event: 'reset' } : null;
    if (a === 'undo') {
      if (!s.stack.length) return null;
      return { state: { ...counted, crabs: s.stack[s.stack.length - 1], moves: s.moves.slice(0, -1), stack: s.stack.slice(0, -1), undos: s.undos + 1 }, event: 'edit' };
    }
    if (homeAll(s.crabs)) return null;
    const next = slideOn(gridOf(s.puzzle), s.crabs, a);
    if (next === s.crabs) return null;
    return { state: { ...counted, crabs: [...next], moves: s.moves + 'URDL'[a], stack: [...s.stack.slice(-(MAX_ROUTE - 1)), [...s.crabs]] }, event: 'edit' };
  },
  inspect: s => {
    const solved = homeAll(s.crabs);
    return { solved, metrics: { steps: s.moves.length }, edits: s.actions, solution: solved ? sha256Hex(`slip|${s.moves}`) : null, objectives: solved && !s.resets && !s.undos ? ['no-reset'] : [] };
  },
};
const noReset = { kind: 'pick-up', objective: 'no-reset' } as const;
let dareSlot = FIRST_DARE_SLOT;
function entry(row: string, bank: number, index: number, path: 'deep-water' | 'endless', tier: 1 | 2 | 3 | 4 | 5 | 6, title: string): Puzzle<Descriptor> {
  const puzzle = rowPuzzle(row), par = puzzle.route.length, shortest = dareSlot++, clean = dareSlot++;
  return {
    ref: { bank, puzzle: index, engine: 'slip-tide', rules: 1, hash: sha256Hex(row) },
    source: path === 'deep-water' ? { kind: 'deep-water', collection: bank, puzzle: index } : { kind: 'endless', bank, puzzle: index },
    path, tier, title, descriptor: { puzzle },
    dares: [
      { slot: shortest, id: `slip-short-${bank}-${index}`, label: 'Shortest route', rule: { kind: 'par', metric: 'steps', max: par }, help: 'independent' },
      { slot: clean, id: `slip-clean-${bank}-${index}`, label: 'No Undo, no Reset', rule: noReset, help: 'independent' },
    ],
    awards: [{ rule: { kind: 'par', metric: 'steps', max: par }, help: 'independent' }, { rule: noReset, help: 'independent' }],
    par: { metric: 'steps', lower: par, upper: par },
  };
}
const tierOf: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = { 'deep:f': 1, 'deep:g': 2, 'endless:d': 3, 'endless:e': 4, 'endless:f': 5, 'endless:g': 6 };
const nameOf: Record<string, string> = { f: 'Deep', g: 'Trench', d: 'Lagoon', e: 'Stopper' };
const counts = new Map<number, number>();
export const puzzles: Puzzle<Descriptor>[] = sets.challenge.flatMap(group => group.rows.map(row => {
  const path = group.path === 'deep' ? 'deep-water' as const : 'endless' as const, bank = group.path === 'deep' ? DEEP_BANK : ENDLESS_BANK, index = counts.get(bank) ?? 0;
  counts.set(bank, index + 1);
  return entry(row, bank, index, path, tierOf[`${group.path}:${group.band}`], `${nameOf[group.band]} ${index + 1}`);
}));

/** The frame ignores a dispatch while a save is in flight, so actions go through one at a time and retry until accepted. */
export function ChallengeBoard({ state, dispatch, active, width }: ChallengeViewProps<State, Action>) {
  const queue = useRef<Action[]>([]), sending = useRef<Action | null>(null), retry = useRef<ReturnType<typeof setTimeout> | null>(null), seen = useRef(state.actions);
  const stopRetry = () => { if (retry.current) clearTimeout(retry.current); retry.current = null; };
  const send = useCallback((action: Action) => {
    sending.current = action;
    const attempt = () => {
      if (sending.current !== action) return;
      dispatch(action);
      retry.current = setTimeout(attempt, 400);
    };
    attempt();
  }, [dispatch]);
  useEffect(() => stopRetry, []);
  useEffect(() => {
    if (state.actions === seen.current) return;
    seen.current = state.actions;
    sending.current = null;
    stopRetry();
    const next = queue.current.shift();
    if (next !== undefined) send(next);
  }, [send, state.actions]);
  const enqueue = (action: Action) => {
    if (sending.current === null) send(action);
    else if (queue.current.length < 2) queue.current.push(action);
  };
  const full = state.actions >= MAX_ACTIONS;
  const onMove = (d: Dir) => {
    if (full || !active || (sending.current === null && slideOn(gridOf(state.puzzle), state.crabs, d) === state.crabs)) return false;
    enqueue(d);
    return true;
  };
  return <Playfield puzzle={state.puzzle} crabs={state.crabs} title="Slip Tide" steps={state.moves.length} active={active} width={width} height={820}
    canUndo={state.stack.length > 0} canReset={state.moves.length > 0} notice={full ? 'That is a lot of tries! Choose Another puzzle for a fresh start.' : undefined}
    onMove={onMove} onHelp={() => enqueue('help')} onUndo={() => enqueue('undo')} onReset={() => enqueue('reset')} />;
}
export const registration = defineReplayGame({
  game: 'slip-tide', codec: 'slip-tide-v1', context: 'slip', cove: false, budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 }, puzzles, objectives: ['no-reset'], engine,
  Board: ChallengeBoard, controls: { help: () => 'help' as const, reset: () => 'reset' as const },
});
