import React from 'react';
import { defineReplayGame } from '../../../challenge/replay';
import type { AwardRule, ChallengeViewProps, Puzzle, ReplayEngine, ReplayPayload } from '../../../challenge/types';
import { slipTideAdapter } from '../../../puzzles/adapters/slip-tide';
import { sha256Hex } from '../../../puzzles/sha256';
import sets from './sets.generated.json';
import { rowPuzzle } from './engine';
import { gridOf, homeAll, MAX_ROUTE, slideOn, type Dir, type SlipPuzzle } from './rules';

/** Inline Deep Water and dare sets, plus the whole packed Endless Tide bank. */
export const DEEP_BANK = 298, ENDLESS_BANK = 299, FIRST_DARE_SLOT = 1200;
/**
 * Actions are one or two digits so the action count, not the 4,096-byte session, is always the limit:
 * 0–3 swipe, 4 undo, 5 reset, 6–9 a swipe the help ladder made, 10 help.
 */
export const UNDO = 4, RESET = 5, HINTED = 6, HELP = 10;
export type Action = Dir | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export const hinted = (d: Dir) => (HINTED + d) as Action;
/**
 * Longest exact route from any reachable position of any registered Challenge board (`slip-tide-challenge`
 * test re-derives it). The longest initial route is 51; wandering off it on rung G can need up to 74.
 */
export const MAX_HELP_ROUTE = 74;
/** One Help record (repeats are idempotent) plus a full Show me from anywhere, and the result's bytes. */
export const ASSIST_ACTIONS = 1 + MAX_HELP_ROUTE, ASSIST_BYTES = 3 + 2 * MAX_HELP_ROUTE + 160;
/** Ordinary swipes, Undo and Reset stop here; Help can always finish from any position. */
export const ORDINARY_LIMIT = 512 - ASSIST_ACTIONS;
export type Descriptor = { puzzle: SlipPuzzle };
export type State = { puzzle: SlipPuzzle; crabs: number[]; moves: string; resets: number; undos: number; stack: number[][]; actions: number };
type Initial = 0;
export type Payload = ReplayPayload<Initial, Action>;

const isAction = (v: unknown): v is Action => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= HELP;
const engine: ReplayEngine<Descriptor, Initial, Action, State> = {
  initial: () => 0,
  validInitial: (v): v is Initial => v === 0,
  create: d => ({ puzzle: d.puzzle, crabs: [...d.puzzle.crabs], moves: '', resets: 0, undos: 0, stack: [], actions: 0 }),
  validAction: isAction,
  step: (s, a) => {
    const counted = { ...s, actions: s.actions + 1 };
    if (a === HELP) return { state: counted, event: 'help' };
    if (a === RESET) return s.moves ? { state: { ...counted, crabs: [...s.puzzle.crabs], moves: '', stack: [], resets: s.resets + 1 }, event: 'reset' } : null;
    if (a === UNDO) {
      if (!s.stack.length) return null;
      return { state: { ...counted, crabs: s.stack[s.stack.length - 1], moves: s.moves.slice(0, -1), stack: s.stack.slice(0, -1), undos: s.undos + 1 }, event: 'edit' };
    }
    if (homeAll(s.crabs)) return null;
    const d = (a >= HINTED ? a - HINTED : a) as Dir, next = slideOn(gridOf(s.puzzle), s.crabs, d);
    if (next === s.crabs) return null;
    return { state: { ...counted, crabs: [...next], moves: s.moves + 'URDL'[d], stack: [...s.stack.slice(-(MAX_ROUTE - 1)), [...s.crabs]] }, event: 'edit' };
  },
  inspect: s => {
    const solved = homeAll(s.crabs);
    return { solved, metrics: { steps: s.moves.length }, edits: s.actions, solution: solved ? sha256Hex(`slip|${s.moves}`) : null, objectives: solved && !s.resets && !s.undos ? ['no-reset'] : [] };
  },
};
/** The engine's own step, for boards that check an action against the newest accepted position. */
export const slipStep = (s: State, a: Action): State | null => engine.step(s, a, { puzzle: s.puzzle })?.state ?? null;
export const assisted = (a: Action) => a >= HINTED;
export const ordinaryFull = (s: State) => s.actions >= ORDINARY_LIMIT;
/** Mirrors the codec: past the ordinary limit only help, helped swipes and a winning swipe are accepted. */
export function ordinaryAllowed(s: State, a: Action): boolean {
  if (assisted(a) || !ordinaryFull(s)) return true;
  const next = slipStep(s, a);
  return !!next && homeAll(next.crabs);
}
const noReset = { kind: 'pick-up', objective: 'no-reset' } as const;
const awardsFor = (p: SlipPuzzle): [AwardRule, AwardRule] => [{ rule: { kind: 'par', metric: 'steps', max: p.route.length }, help: 'independent' }, { rule: noReset, help: 'independent' }];
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
    awards: awardsFor(puzzle),
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
/** Endless Tide plays these packed bank slots whole: [slot, first ordinal, entries, pack sha256, rules, band]. */
export const packedBanks = (sets.packed as [number, number, number, string, number, string][]).map(([slot, first, count, packHash, rules, band]) => ({
  slot, first, count, packHash, rules, path: 'endless' as const, tier: tierOf[`endless:${band}`], title: nameOf[band],
}));

// The save catalog loads this file in plain Node tests; only a live screen needs the native board.
let board: typeof import('./challengeBoard').ChallengeBoard | undefined;
function LazyBoard(props: ChallengeViewProps<State, Action>) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  board ??= (require('./challengeBoard') as typeof import('./challengeBoard')).ChallengeBoard;
  return React.createElement(board, props);
}
export const registration = defineReplayGame({
  game: 'slip-tide', codec: 'slip-tide-replay-v1', context: 'slip', cove: false, budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 }, puzzles, objectives: ['no-reset'], engine,
  helpUI: 'board',
  assistance: { bytes: ASSIST_BYTES, actions: ASSIST_ACTIONS, idempotentHelp: true, isAction: a => a >= HINTED },
  Board: LazyBoard, controls: { help: (): Action => HELP, reset: (): Action => RESET },
  packed: {
    family: 'slip-tide', banks: packedBanks, awards: 3,
    open: async (loader, ordinal) => { const d = await loader.entry(slipTideAdapter, 'slip-tide', ordinal); return { ref: d.ref, descriptor: { puzzle: d.payload } }; },
    describe: d => ({ awards: awardsFor(d.puzzle), par: { metric: 'steps', lower: d.puzzle.route.length, upper: d.puzzle.route.length } }),
  },
});
