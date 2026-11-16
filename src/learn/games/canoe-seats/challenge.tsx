import React from 'react';
import { defineReplayGame } from '../../../challenge/replay';
import type { AwardRule, ChallengeViewProps, Puzzle, RegisteredDare, ReplayEngine, ReplayPayload } from '../../../challenge/types';
import { canoeSeatsAdapter, decodeAction, isPlacement } from '../../../puzzles/adapters/canoe-seats';
import { sha256Hex } from '../../../puzzles/sha256';
import sets from './sets.generated.json';
import { rowPuzzle } from './engine';
import { accepts, complete, emptySeating, items, place, puzzleTuple, type CanoePuzzle, type Seating } from './rules';

/** Inline Deep Water (rungs F-H) and the dare set (C-H), plus the packed Endless Tide banks C-H. */
export const DEEP_BANK = 308, DARE_BANK = 309, FIRST_DARE_SLOT = 2000;
/**
 * Actions are numbers so the action count, not the 4,096-byte session, is always the limit:
 * 0-119 a placement (`item * 8 + seat + 1`, or `item * 8` back to the shore), 120-135 mark a clue
 * card done or not, 136 undo, 137 reset, 138 Check, 139 help, and 140-259 a placement help made.
 */
export const USED = 120, UNDO = 136, RESET = 137, CHECK = 138, HELP = 139, HINTED = 140;
export type Action = number;
export const hinted = (placement: number): Action => HINTED + placement;
/** Lights stay on through rung D; from E the board waits for Check. A "Lights off" dare turns them off from C. */
export const lightsBand = (band: string) => band === 'a' || band === 'b' || band === 'c' || band === 'd';
/** One Help record (repeats are idempotent), a full Show me (15 placements at most), one Check, and the result's bytes. */
export const ASSIST_ACTIONS = 1 + 15 + 1, ASSIST_BYTES = 4 * ASSIST_ACTIONS + 192;
/** Ordinary play stops here; Help can always finish from any position. */
export const ORDINARY_LIMIT = 512 - ASSIST_ACTIONS;
export const UNDO_DEPTH = 48;
export type Descriptor = { puzzle: CanoePuzzle; band: string };
export type State = {
  puzzle: CanoePuzzle; lights: boolean; pos: Seating; used: number; stack: Seating[];
  placements: number; checks: number; misses: number; checked: boolean; won: boolean; actions: number;
};
type Initial = 0;
export type Payload = ReplayPayload<Initial, Action>;

export const isAction = (v: unknown): v is Action => Number.isInteger(v) && (v as number) >= 0 && ((v as number) < USED ? isPlacement(v) : (v as number) < HINTED ? true : isPlacement((v as number) - HINTED));
const placementOf = (a: Action) => (a >= HINTED ? a - HINTED : a);
const engine: ReplayEngine<Descriptor, Initial, Action, State> = {
  initial: () => 0,
  validInitial: (v): v is Initial => v === 0,
  create: (d, _initial, options) => ({ puzzle: d.puzzle, lights: lightsBand(d.band) && !options.supportOff, pos: emptySeating(d.puzzle), used: 0, stack: [], placements: 0, checks: 0, misses: 0, checked: false, won: false, actions: 0 }),
  validAction: isAction,
  step: (s, a) => {
    if (s.won) return null;
    const counted = { ...s, actions: s.actions + 1 };
    if (a === HELP) return { state: counted, event: 'help' };
    if (a >= USED && a < UNDO) {
      const clue = a - USED;
      return clue < s.puzzle.clues.length ? { state: { ...counted, used: s.used ^ (1 << clue) }, event: 'edit' } : null;
    }
    if (a === UNDO) {
      if (!s.stack.length) return null;
      const pos = s.stack[s.stack.length - 1];
      return { state: { ...counted, pos, stack: s.stack.slice(0, -1), checked: false, won: s.lights && accepts(s.puzzle, pos) }, event: 'edit' };
    }
    if (a === RESET) return s.pos.some(x => x !== -1) ? { state: { ...counted, pos: emptySeating(s.puzzle), stack: [...s.stack.slice(-(UNDO_DEPTH - 1)), s.pos], checked: false }, event: 'reset' } : null;
    if (a === CHECK) {
      if (s.lights || s.checked || !complete(s.puzzle, s.pos)) return null;
      const correct = accepts(s.puzzle, s.pos);
      return { state: { ...counted, checks: s.checks + 1, misses: s.misses + Number(!correct), checked: !correct, won: correct }, event: 'check', correct };
    }
    const { item, seat } = decodeAction(placementOf(a));
    if (item >= items(s.puzzle) || seat >= s.puzzle.n) return null;
    const pos = place(s.puzzle, s.pos, item, seat);
    if (pos === s.pos) return null;
    return { state: { ...counted, pos, stack: [...s.stack.slice(-(UNDO_DEPTH - 1)), s.pos], placements: s.placements + 1, checked: false, won: s.lights && accepts(s.puzzle, pos) }, event: 'edit' };
  },
  inspect: s => ({ solved: s.won, metrics: { placements: s.placements }, edits: s.placements, solution: s.won ? sha256Hex(`canoe|${puzzleTuple(s.puzzle).join('|')}|${s.pos.join()}`) : null, objectives: [] }),
};
/** The engine's own step, for boards that check an action against the newest accepted position. */
export const canoeStep = (s: State, a: Action): State | null => engine.step(s, a, { puzzle: s.puzzle, band: '' })?.state ?? null;
export const assisted = (a: Action) => a >= HINTED || a === HELP;
export const ordinaryFull = (s: State) => s.actions >= ORDINARY_LIMIT;
/** Mirrors the codec's reserve: past the ordinary limit only help, helped placements and Check are accepted. */
export const ordinaryAllowed = (s: State, a: Action) => assisted(a) || a === CHECK || !ordinaryFull(s);

/** Seat each friend exactly once, never moving one: the par. Lights off and first-Check are the other marks. */
const once = (p: CanoePuzzle): AwardRule => ({ rule: { kind: 'par', metric: 'placements', max: items(p) }, help: 'independent' });
const awardsFor = (d: Descriptor): [AwardRule, AwardRule] => [once(d.puzzle), lightsBand(d.band) ? { rule: { kind: 'clean' }, help: 'independent' } : { rule: { kind: 'whole' }, help: 'independent' }];
let dareSlot = FIRST_DARE_SLOT;
function entry(row: string, band: string, bank: number, index: number, path: 'deep-water' | 'endless', tier: 1 | 2 | 3 | 4 | 5 | 6, title: string): Puzzle<Descriptor> {
  const puzzle = rowPuzzle(row), d = { puzzle, band }, total = items(puzzle);
  const check: RegisteredDare = lightsBand(band)
    ? { slot: dareSlot++, id: `canoe-dark-${bank}-${index}`, label: 'Lights off: Check at the end', rule: { kind: 'blind' }, help: 'independent' }
    : { slot: dareSlot++, id: `canoe-first-${bank}-${index}`, label: 'Right on the first Check', rule: { kind: 'whole' }, help: 'independent' };
  const seatOnce: RegisteredDare = { slot: dareSlot++, id: `canoe-once-${bank}-${index}`, label: 'Seat each friend only once', rule: { kind: 'par', metric: 'placements', max: total }, help: 'independent' };
  return {
    ref: { bank, puzzle: index, engine: 'canoe-seats', rules: canoeSeatsAdapter.rules, hash: sha256Hex(row) },
    source: path === 'deep-water' ? { kind: 'deep-water', collection: bank, puzzle: index } : { kind: 'endless', bank, puzzle: index },
    path, tier, title, descriptor: d, dares: [check, seatOnce], awards: awardsFor(d), par: { metric: 'placements', lower: total, upper: total },
  };
}
const deepTier: Record<string, 1 | 2 | 3> = { f: 1, g: 2, h: 3 };
const endlessTier: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = { c: 1, d: 2, e: 3, f: 4, g: 5, h: 6 };
const nameOf: Record<string, string> = { c: 'Four friends', d: 'Five friends', e: 'What if', f: 'Hats', g: 'Five and hats', h: 'Full canoe' };
const counts = new Map<number, number>();
export const puzzles: Puzzle<Descriptor>[] = sets.challenge.flatMap(group => group.rows.map(row => {
  const deep = group.path === 'deep', bank = deep ? DEEP_BANK : DARE_BANK, index = counts.get(bank) ?? 0;
  counts.set(bank, index + 1);
  return entry(row, group.band, bank, index, deep ? 'deep-water' : 'endless', deep ? deepTier[group.band] : endlessTier[group.band], `${nameOf[group.band]} ${index + 1}`);
}));
/** Endless Tide plays these packed bank slots whole: [slot, first ordinal, entries, pack sha256, rules, band]. */
export const packedBanks = (sets.packed as [number, number, number, string, number, string][]).map(([slot, first, count, packHash, rules, band]) => ({
  slot, first, count, packHash, rules, path: 'endless' as const, tier: endlessTier[band], title: nameOf[band], band,
}));
const bandOfSlot = new Map(packedBanks.map(b => [b.slot, b.band]));

// The save catalog loads this file in plain Node tests; only a live screen needs the native board.
let board: typeof import('./challengeBoard').ChallengeBoard | undefined;
function LazyBoard(props: ChallengeViewProps<State, Action>) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  board ??= (require('./challengeBoard') as typeof import('./challengeBoard')).ChallengeBoard;
  return React.createElement(board, props);
}
export const registration = defineReplayGame({
  game: 'canoe-seats', codec: 'canoe-seats-replay-v1', context: 'canoe', cove: false, budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 }, puzzles, objectives: [], engine,
  helpUI: 'board',
  assistance: { bytes: ASSIST_BYTES, actions: ASSIST_ACTIONS, idempotentHelp: true, isAction: a => a >= HINTED },
  completionText: () => 'Everyone has a seat, and every clue is true.',
  Board: LazyBoard, controls: { help: (): Action => HELP, reset: (): Action => RESET },
  packed: {
    family: 'canoe-seats', banks: packedBanks.map(({ band: _band, ...b }) => b), awards: 3,
    open: async (loader, ordinal) => {
      const d = await loader.entry(canoeSeatsAdapter, 'canoe-seats', ordinal);
      return { ref: d.ref, descriptor: { puzzle: d.payload, band: bandOfSlot.get(d.ref.bank) ?? d.band } };
    },
    describe: d => ({ awards: awardsFor(d), par: { metric: 'placements', lower: items(d.puzzle), upper: items(d.puzzle) } }),
  },
});
