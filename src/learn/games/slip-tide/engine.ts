import type { LearnEngine, LearnOptions, Outcome } from '../../types';
import { levelOf } from '../../levelOptions';
import sets from './sets.generated.json';
import { dirOf, dirs, gridOf, HOME, homeAll, puzzleTuple, slideOn, tuplePuzzle, type Crabs, type Dir, type SlipPuzzle } from './rules';

/** Four boards a round, chosen from certified bank rows. Undo keeps the recent positions, not an unbounded log. */
export const ROUND = 4;
export const UNDO_LIMIT = 48;
export const STEP_LIMIT = 4096;
export type SlipTuple = [number, string, string, string, string];
export type SlipState = {
  version: 1;
  level: number;
  puzzles: SlipTuple[];
  index: number;
  crabs: number[];
  steps: number;
  undo: number[][];
  resets: number;
  helped: boolean;
  /** Finished boards: swipes, and the certified shortest. */
  done: [number, number][];
};
export type RowSet = readonly string[];
const levelSets = sets.levels as Record<string, RowSet>;
export const rowPuzzle = (row: string): SlipPuzzle => {
  const parsed = tuplePuzzle(JSON.parse(row)[3]);
  if (!parsed) throw new Error('A certified Slip Tide row failed to decode.');
  return parsed;
};
export const setFor = (level: number) => levelSets[String(level)] ?? [];
export const puzzleAt = (s: SlipState) => tuplePuzzle(s.puzzles[s.index]);
const toTuple = (p: SlipPuzzle) => puzzleTuple(p) as SlipTuple;

function drawn(level: number, rng: () => number, avoid: readonly SlipTuple[], count: number): SlipTuple[] {
  const all = setFor(level).map(rowPuzzle).map(toTuple), seen = new Set(avoid.map(t => JSON.stringify(t)));
  const fresh = all.filter(t => !seen.has(JSON.stringify(t))), pool = fresh.length >= count ? fresh : all;
  const picks = pool.slice();
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return picks.slice(0, count);
}
export function startRound(level: number, rng: () => number, previous?: SlipState): SlipState {
  const puzzles = drawn(level, rng, previous?.puzzles ?? [], ROUND);
  if (puzzles.length !== ROUND) throw new Error('Slip Tide has no boards for that level.');
  return { version: 1, level, puzzles, index: 0, crabs: [...tuplePuzzle(puzzles[0])!.crabs], steps: 0, undo: [], resets: 0, helped: false, done: [] };
}
const fresh = (crabs: readonly number[]) => [...crabs];
export function swipeBoard(s: SlipState, d: Dir): SlipState {
  const puzzle = puzzleAt(s);
  if (!puzzle || homeAll(s.crabs)) return s;
  const next = slideOn(gridOf(puzzle), s.crabs, d);
  if (next === s.crabs) return s;
  return { ...s, crabs: fresh(next), steps: Math.min(STEP_LIMIT, s.steps + 1), undo: [...s.undo.slice(-(UNDO_LIMIT - 1)), fresh(s.crabs)] };
}
export function undoBoard(s: SlipState): SlipState {
  if (!s.undo.length || homeAll(s.crabs)) return s;
  return { ...s, crabs: fresh(s.undo[s.undo.length - 1]), steps: Math.max(0, s.steps - 1), undo: s.undo.slice(0, -1) };
}
export function resetBoard(s: SlipState): SlipState {
  const puzzle = puzzleAt(s);
  if (!puzzle || (!s.steps && !s.undo.length)) return s;
  return { ...s, crabs: fresh(puzzle.crabs), steps: 0, undo: [], resets: s.resets + 1 };
}
export const markHelped = (s: SlipState): SlipState => (s.helped ? s : { ...s, helped: true });
/** A different board of the same kind: after Show me, or when the child just wants another. Nothing is recorded. */
export function dealFresh(s: SlipState, rng: () => number): SlipState {
  const [next] = drawn(s.level, rng, s.puzzles, 1);
  if (!next) return s;
  return { ...s, puzzles: s.puzzles.map((t, i) => (i === s.index ? next : t)), crabs: fresh(tuplePuzzle(next)!.crabs), steps: 0, undo: [], resets: 0, helped: false };
}
export function nextBoard(s: SlipState): SlipState {
  const puzzle = puzzleAt(s);
  if (!puzzle || !homeAll(s.crabs)) return s;
  const index = s.index + 1, upcoming = s.puzzles[index];
  return { ...s, index, crabs: upcoming ? fresh(tuplePuzzle(upcoming)!.crabs) : [], steps: 0, undo: [], resets: 0, helped: false, done: [...s.done, [s.steps, puzzle.route.length]] };
}
const nat = (v: unknown, max = STEP_LIMIT): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
function legalCrabs(p: SlipPuzzle, v: unknown): boolean {
  if (!Array.isArray(v) || v.length !== p.crabs.length) return false;
  const grid = gridOf(p), live = v.filter(c => c !== HOME);
  return v.every((c, i) => c === HOME || (nat(c, p.size * p.size - 1) && !grid.rocks[c] && p.pools[i] !== c)) && new Set(live).size === live.length;
}
/** Saved boards must be byte-for-byte certified rows of their own level, so every stored route is a proven shortest one. */
const certified = new Map<number, Set<string>>();
const certifiedAt = (level: number) => {
  let rows = certified.get(level);
  if (!rows) { rows = new Set(setFor(level).map(row => JSON.stringify(toTuple(rowPuzzle(row))))); certified.set(level, rows); }
  return rows;
};
const same = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((c, i) => c === b[i]);
/**
 * One real swipe joins each remembered position to the next: it started on an unfinished board and moved
 * something, because swipeBoard records neither a blocked swipe nor one after a win. Four slides, never a search.
 */
const oneSwipe = (p: SlipPuzzle, from: readonly number[], to: readonly number[]) => !homeAll(from) && !same(from, to) && dirs.some(d => same(slideOn(gridOf(p), from, d), to));
/**
 * Shape, certified boards, and a history that could have happened: a finished board took at least its
 * shortest route and still holds its winning swipe, zero swipes means the starting position, and Undo
 * remembers real one-swipe steps that each moved a crab on an unfinished board.
 * Anything else is rejected whole, so the frame keeps the original and offers recovery.
 */
export function validSlip(v: unknown, level?: number): v is SlipState {
  const s = v as SlipState;
  if (!s || typeof s !== 'object' || s.version !== 1 || !nat(s.level, 5) || s.level < 1 || level !== undefined && s.level !== level || !Array.isArray(s.puzzles) || s.puzzles.length !== ROUND || !nat(s.index, ROUND)
    || !nat(s.steps) || !nat(s.resets) || typeof s.helped !== 'boolean' || !Array.isArray(s.undo) || s.undo.length > UNDO_LIMIT || !Array.isArray(s.done) || s.done.length !== s.index
    || !s.done.every(d => Array.isArray(d) && d.length === 2 && nat(d[0]) && nat(d[1]))) return false;
  const rows = certifiedAt(s.level);
  if (!s.puzzles.every(t => rows.has(JSON.stringify(t)))) return false;
  const boards = s.puzzles.map(t => tuplePuzzle(t)!);
  if (!s.done.every(([steps, par], i) => par === parOf(boards[i]) && steps >= par)) return false;
  if (s.index === ROUND) return Array.isArray(s.crabs) && s.crabs.length === 0 && !s.undo.length && !s.steps && !s.resets && !s.helped;
  const current = boards[s.index];
  if (!legalCrabs(current, s.crabs) || !s.undo.every(u => legalCrabs(current, u)) || s.undo.length > s.steps) return false;
  if (!s.steps && !same(s.crabs, current.crabs)) return false;
  // A finished board keeps the swipe that finished it: every win pushes its unfinished position, and Undo is off once home.
  if (homeAll(s.crabs) && (s.steps < parOf(current) || !s.undo.length)) return false;
  const chain = [...s.undo, s.crabs];
  if (s.undo.length === s.steps && s.steps && !same(s.undo[0], current.crabs)) return false;
  return chain.every((at, i) => !i || oneSwipe(current, chain[i - 1], at));
}
export const parOf = (p: SlipPuzzle) => p.route.length;
export const finishedBoard = (s: SlipState) => s.index < s.puzzles.length && homeAll(s.crabs);
export const replayRoute = (p: SlipPuzzle, route: readonly Dir[], from: Crabs = p.crabs) => route.reduce<Crabs>((at, d) => slideOn(gridOf(p), at, d), from);
export const routeDirs = (p: SlipPuzzle) => [...p.route].map(dirOf);
export const levelInfo = [
  { name: 'Paddling', description: 'One crab on a small lagoon. Two swipes or fewer.' },
  { name: 'Shallows', description: 'One crab, a few more rocks, three to five swipes.' },
  { name: 'Two crabs', description: 'Two crabs move together. One may have to wait for the other.' },
  { name: 'Lagoon', description: 'Bigger water and longer routes. Some moves are dead ends.' },
  { name: 'Stopper', description: 'One crab cannot get home alone. Use another crab as a stopper.' },
] as const;
export const engine: Omit<LearnEngine<SlipState>, 'id'> & { id: 'slip-tide' } = {
  id: 'slip-tide',
  name: 'Slip Tide',
  island: 'thinking',
  tagline: 'One swipe slides every crab.',
  description: 'Swipe to slide every crab at once. Bring each one home to its own pool.',
  help: 'Swipe up, down, left or right. Every crab slides that way until a wall, a rock or another crab stops it. A crab that reaches its own pool goes home. Undo and Reset are free.',
  helpAudio: 'slip-help',
  introAudio: 'slip-intro',
  color: '#2F7E8D',
  surface: '#D5EEE9',
  modes: ['solo', 'together'],
  modeLabels: { solo: 'On my own', together: 'Together: two directions each' },
  ages: [4, 14],
  ownLevels: true,
  levelNames: levelInfo,
  skills: { 'think.slide-plan': 'Planning slides ahead' },
  create: (options: LearnOptions, ctx) => startRound(levelOf(options), ctx.rng, ctx.previous),
  validate: (state: unknown, options: LearnOptions): state is SlipState => validSlip(state, levelOf(options)),
  outcome: (s: SlipState): Outcome => (s.index >= ROUND ? 'done' : null),
};
