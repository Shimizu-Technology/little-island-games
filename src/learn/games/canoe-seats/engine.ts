import type { LearnEngine, LearnOptions, Outcome } from '../../types';
import { levelOf } from '../../levelOptions';
import sets from './sets.generated.json';
import { accepts, complete, emptySeating, place, puzzleTuple, tuplePuzzle, validSeating, type CanoePuzzle, type CanoeTuple, type Kind, type Seating } from './rules';

/** Four boards a round, chosen from certified bank rows. Undo keeps recent seatings, not an unbounded log. */
export const ROUND = 4;
export const UNDO_LIMIT = 48;
export const MOVE_LIMIT = 4096;
/** Levels 1-5 are rungs A-E. Each level's first round opens with a teaching board for every new kind of clue. */
export const levelTeach: Record<number, readonly (Kind | 'whatif')[]> = { 1: ['at'], 2: ['ahead', 'next', 'end'], 3: ['far'], 4: ['gap', 'mid'], 5: ['whatif'] };
/** Clue lights are on by default up to Level 4. From Level 3 a child may turn them off and Check at the end; Level 5 starts with them off. */
export const lightsChoice = (level: number) => level >= 3;
export const lightsByDefault = (level: number) => level <= 4;

export type CanoeState = {
  version: 1;
  level: number;
  puzzles: CanoeTuple[];
  index: number;
  pos: Seating;
  /** Clue cards marked as used, one bit per card. */
  used: number;
  undo: Seating[];
  moves: number;
  /** Whole-answer Checks on this board, and how many missed. A miss keeps the seating. */
  checks: number;
  misses: number;
  /** The seating shown was checked and missed; Check waits for a change. */
  checked: boolean;
  won: boolean;
  helped: boolean;
  lights: boolean;
  /** Clue keepers: whose cards are showing, and whether the hand-over screen covers them. */
  keeper: 0 | 1;
  cover: boolean;
  /** Finished boards: placements, and whether help was used. */
  done: [number, boolean][];
};
type LevelSet = { teach: Record<string, string[]>; rows: string[] };
const levelSets = sets.levels as unknown as Record<string, LevelSet>;
export const rowPuzzle = (row: string): CanoePuzzle => {
  const parsed = tuplePuzzle(JSON.parse(row)[3]);
  if (!parsed) throw new Error('A certified Canoe Seats row failed to decode.');
  return parsed;
};
export const setFor = (level: number): LevelSet => levelSets[String(level)] ?? { teach: {}, rows: [] };
export const puzzleAt = (s: Pick<CanoeState, 'puzzles' | 'index'>) => (s.puzzles[s.index] ? tuplePuzzle(s.puzzles[s.index]) : null);
const toTuple = (row: string) => puzzleTuple(rowPuzzle(row));
const key = (t: CanoeTuple) => t.join('|');

function pick(rows: readonly string[], rng: () => number, avoid: ReadonlySet<string>, count: number): CanoeTuple[] {
  const all = rows.map(toTuple), fresh = all.filter(t => !avoid.has(key(t))), pool = fresh.length >= count ? fresh : all;
  const picks = pool.slice();
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return picks.slice(0, count);
}
/** Teaching boards lead a level's first round; a returning child gets four ordinary boards. */
export function boardsFor(level: number, rng: () => number, previous?: CanoeState): { puzzles: CanoeTuple[]; teach: number } {
  const set = setFor(level), avoid = new Set((previous?.puzzles ?? []).map(key));
  const fresh = !previous || previous.level !== level;
  const teach = fresh ? levelTeach[level].flatMap(kind => pick(set.teach[kind] ?? [], rng, avoid, 1)) : [];
  const rest = pick(set.rows, rng, new Set([...avoid, ...teach.map(key)]), ROUND - teach.length);
  return { puzzles: [...teach, ...rest].slice(0, ROUND), teach: teach.length };
}
const blank = (p: CanoePuzzle | null) => (p ? emptySeating(p) : []);
export function startRound(level: number, rng: () => number, previous?: CanoeState): CanoeState {
  const { puzzles } = boardsFor(level, rng, previous);
  if (puzzles.length !== ROUND) throw new Error('Canoe Seats has no boards for that level.');
  return {
    version: 1, level, puzzles, index: 0, pos: blank(tuplePuzzle(puzzles[0])), used: 0, undo: [], moves: 0, checks: 0, misses: 0, checked: false,
    won: false, helped: false, lights: previous?.level === level ? previous.lights : lightsByDefault(level), keeper: 0, cover: false, done: [],
  };
}
/** Lights on: the board is won the moment every friend sits where the clues say. Lights off waits for Check. */
const settle = (s: CanoeState, p: CanoePuzzle): CanoeState => (s.lights && accepts(p, s.pos) ? { ...s, won: true } : s);
export function placeItem(s: CanoeState, item: number, seat: number): CanoeState {
  const p = puzzleAt(s);
  if (!p || s.won || s.cover) return s;
  const pos = place(p, s.pos, item, seat);
  if (pos === s.pos) return s;
  return settle({ ...s, pos, moves: Math.min(MOVE_LIMIT, s.moves + 1), checked: false, undo: [...s.undo.slice(-(UNDO_LIMIT - 1)), s.pos] }, p);
}
export function undoSeat(s: CanoeState): CanoeState {
  const p = puzzleAt(s);
  if (!p || s.won || s.cover || !s.undo.length) return s;
  return settle({ ...s, pos: s.undo[s.undo.length - 1], undo: s.undo.slice(0, -1), checked: false }, p);
}
export function resetSeats(s: CanoeState): CanoeState {
  const p = puzzleAt(s);
  if (!p || s.won || s.cover || s.pos.every(x => x === -1)) return s;
  return { ...s, pos: emptySeating(p), undo: [...s.undo.slice(-(UNDO_LIMIT - 1)), s.pos], checked: false };
}
export function toggleUsed(s: CanoeState, clue: number): CanoeState {
  const p = puzzleAt(s);
  if (!p || s.won || s.cover || clue < 0 || clue >= p.clues.length) return s;
  return { ...s, used: s.used ^ (1 << clue) };
}
/** One whole-answer Check. Incomplete or unchanged seatings do nothing; a miss keeps every friend in place. */
export function checkSeats(s: CanoeState): CanoeState {
  const p = puzzleAt(s);
  if (!p || s.won || s.cover || s.lights || s.checked || !complete(p, s.pos)) return s;
  const right = accepts(p, s.pos);
  return { ...s, checks: s.checks + 1, misses: s.misses + Number(!right), checked: !right, won: right };
}
export const canCheck = (s: CanoeState) => { const p = puzzleAt(s); return !!p && !s.won && !s.cover && !s.lights && !s.checked && complete(p, s.pos); };
export function setLights(s: CanoeState, lights: boolean): CanoeState {
  const p = puzzleAt(s);
  if (!p || s.won || s.cover || s.lights === lights || !lightsChoice(s.level)) return s;
  return settle({ ...s, lights, checked: false }, p);
}
export const markHelped = (s: CanoeState): CanoeState => (s.helped ? s : { ...s, helped: true });
/** Clue keepers: hand the device over. The cover hides every card until the next keeper is ready. */
export const passClues = (s: CanoeState): CanoeState => (s.won || s.cover ? s : { ...s, cover: true, keeper: s.keeper === 0 ? 1 : 0 });
export const revealClues = (s: CanoeState): CanoeState => (s.cover ? { ...s, cover: false } : s);
/** Clue keepers deal the cards alternately, so each person holds some and neither has them all. */
export const keeperOf = (clue: number): 0 | 1 => (clue % 2 === 0 ? 0 : 1);

const fresh = (s: CanoeState, puzzles: CanoeTuple[], index: number): CanoeState => ({
  ...s, puzzles, index, pos: blank(puzzles[index] ? tuplePuzzle(puzzles[index]) : null), used: 0, undo: [], moves: 0, checks: 0, misses: 0, checked: false, won: false, helped: false, keeper: 0, cover: false,
});
/** A different board of the same kind: after Show me, or when the child wants another. Nothing is recorded. */
/** The new kind of clue a teaching board introduces, or null for an ordinary board. */
export function teachKindOf(level: number, tuple: CanoeTuple | undefined): Kind | 'whatif' | null {
  if (!tuple) return null;
  const set = setFor(level), want = key(tuple);
  return (Object.entries(set.teach).find(([, rows]) => rows.some(r => key(toTuple(r)) === want))?.[0] as Kind | 'whatif' | undefined) ?? null;
}
export function dealFresh(s: CanoeState, rng: () => number): CanoeState {
  const p = puzzleAt(s);
  if (!p) return s;
  const set = setFor(s.level), current = s.puzzles[s.index], teachKind = teachKindOf(s.level, current);
  const [next] = pick(teachKind ? set.teach[teachKind] ?? [] : set.rows, rng, new Set(s.puzzles.map(key)), 1);
  if (!next || key(next) === key(current)) return s;
  return { ...fresh(s, s.puzzles.map((t, i) => (i === s.index ? next : t)), s.index), lights: s.lights };
}
export function nextBoard(s: CanoeState): CanoeState {
  if (!puzzleAt(s) || !s.won) return s;
  return { ...fresh(s, s.puzzles, s.index + 1), done: [...s.done, [s.moves, s.helped]] };
}

const nat = (v: unknown, max = MOVE_LIMIT): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
/** Saved boards must be byte-for-byte certified rows of their own level, teaching or ordinary. */
const certified = new Map<number, Set<string>>();
const certifiedAt = (level: number) => {
  let rows = certified.get(level);
  if (!rows) {
    const set = setFor(level);
    rows = new Set([...Object.values(set.teach).flat(), ...set.rows].map(r => key(toTuple(r))));
    certified.set(level, rows);
  }
  return rows;
};
/**
 * Shape, certified boards, and a state play could reach: valid seatings in the canoe and in Undo,
 * a win that really is the answer, a missed Check that only a complete seating could make, and
 * lights that would already have finished a correct board. Anything else is rejected whole.
 */
export function validCanoe(v: unknown, level?: number): v is CanoeState {
  const s = v as CanoeState;
  if (!s || typeof s !== 'object' || s.version !== 1 || !nat(s.level, 5) || s.level < 1 || level !== undefined && s.level !== level) return false;
  if (!Array.isArray(s.puzzles) || s.puzzles.length !== ROUND || !nat(s.index, ROUND) || !nat(s.moves) || !nat(s.checks) || !nat(s.misses) || s.misses > s.checks) return false;
  if (![s.checked, s.won, s.helped, s.lights, s.cover].every(b => typeof b === 'boolean') || (s.keeper !== 0 && s.keeper !== 1)) return false;
  if (!Array.isArray(s.undo) || s.undo.length > UNDO_LIMIT || !Array.isArray(s.done) || s.done.length !== s.index || !s.done.every(d => Array.isArray(d) && d.length === 2 && nat(d[0]) && typeof d[1] === 'boolean')) return false;
  if (!s.lights && !lightsChoice(s.level) || !Number.isInteger(s.used) || s.used < 0) return false;
  const rows = certifiedAt(s.level);
  if (!s.puzzles.every(t => Array.isArray(t) && rows.has(key(t)))) return false;
  if (s.index === ROUND) return Array.isArray(s.pos) && !s.pos.length && !s.undo.length && !s.moves && !s.checks && !s.won && !s.helped && !s.used && !s.checked && !s.cover;
  const p = tuplePuzzle(s.puzzles[s.index])!;
  if (!validSeating(p, s.pos) || !s.undo.every(u => validSeating(p, u)) || s.used >= 1 << p.clues.length) return false;
  if (s.won !== (s.lights ? accepts(p, s.pos) : s.won) || s.won && !accepts(p, s.pos)) return false;
  if (s.checked && (s.won || s.lights || !complete(p, s.pos) || !s.misses)) return false;
  return !s.won || !s.cover;
}
export const levelInfo = [
  { name: 'Two friends', description: 'Two friends and one clue. Which seat is whose?' },
  { name: 'Three friends', description: 'In front of, right next to, and the ends of the canoe.' },
  { name: 'Four friends', description: 'Not next to. Two clues work together.' },
  { name: 'Five friends', description: 'One seat between, and not at an end. Follow a chain of clues.' },
  { name: 'What if?', description: 'Try a friend in a seat and see if the clues break. Check at the end.' },
] as const;
export const engine: Omit<LearnEngine<CanoeState>, 'id'> & { id: 'canoe-seats' } = {
  id: 'canoe-seats',
  name: 'Canoe Seats',
  island: 'thinking',
  tagline: 'Who sits where? The picture clues know.',
  description: 'Seat every friend in the canoe so every picture clue is true.',
  help: 'Pick up a friend and tap a seat. Seat 1 is at the front. Tap a clue card to hear it, and tap it again to mark it done. When every clue is true, everyone is in the right seat. Undo and Reset are free.',
  helpAudio: 'canoe-help',
  introAudio: 'canoe-intro',
  color: '#B5673A',
  surface: '#F6E4CF',
  modes: ['solo', 'together'],
  modeLabels: { solo: 'On my own', together: 'Together: clue keepers' },
  ages: [4, 14],
  ownLevels: true,
  levelNames: levelInfo,
  skills: { 'think.seat-logic': 'Putting clues together' },
  create: (options: LearnOptions, ctx) => startRound(levelOf(options), ctx.rng, ctx.previous),
  validate: (state: unknown, options: LearnOptions): state is CanoeState => validCanoe(state, levelOf(options)),
  outcome: (s: CanoeState): Outcome => (s.index >= ROUND ? 'done' : null),
};
