import type { LearnEngine, LearnOptions, Outcome } from '../../types';
import { levelOf } from '../../levelOptions';
import sets from './sets.generated.json';
import {
  acceptsAnswer, draftComplete, emptyOrder, placeInOrder, provenPar, puzzleTuple, randomPracticePuzzle,
  tuplePuzzle, validOrder, validPanPair, validPuzzle, weighOnScale,
  type OddDir, type PuzzleKind, type ScaleOutcome, type ShellPuzzle, type ShellTuple, type Weighing,
} from './rules';

/** Four boards per School round (matching PLAN §8 / FND-10). Random practice stays open beside them. */
export const ROUND = 4;
export const UNDO_LIMIT = 48;
export const HISTORY_LIMIT = 200;

/** Levels 1-4 show known links / ruled-out suspects by default; Level 5 hides them by default. */
export const linksChoice = (level: number) => level >= 3;
export const linksByDefault = (level: number) => level <= 4;

/**
 * Scale-Holder co-play phases (OR-05b):
 * - 'guesser': public results only! Zero hidden weights rendered.
 * - 'cover-to-holder': handover cover hiding everything before Scale Holder sees the secret.
 * - 'holder': Scale Holder sees the secret setup and taps which side tips/balances.
 * - 'cover-to-guesser': handover cover hiding the secret before handing back to Guesser.
 */
export type HolderPhase = 'guesser' | 'cover-to-holder' | 'holder' | 'cover-to-guesser';

export type DraftSnapshot = {
  order: number[];
  oddPick: number | null;
  oddDir: OddDir | null;
};

export type ScaleState = {
  version: 1;
  level: number;
  puzzles: ShellTuple[];
  index: number;
  /** Open random practice mode (adds 0 catalog count, never blocks certified rounds). */
  practice: boolean;
  /** Public weighing transcript (strictly public). */
  history: Weighing[];
  /** Current sort answer row (lightest -> heaviest), or [] for odd-pearl puzzles. */
  order: number[];
  /** Current odd-pearl selection (or null). */
  oddPick: number | null;
  /** Current odd-pearl direction ('heavy' | 'light' | null). */
  oddDir: OddDir | null;
  /** Bounded undo stack for answer-draft changes (weighings remain in public history). */
  undo: DraftSnapshot[];
  /** Whole-answer Checks on this board, and how many missed. */
  checks: number;
  misses: number;
  /** True after a missed Check until the player changes their draft or weighs again. */
  checked: boolean;
  won: boolean;
  helped: boolean;
  /** Known links / ruled-out helper visibility. */
  showLinks: boolean;
  /** Scale-Holder co-play: who holds the secret scale (0 or 1), current handover phase, pending pans. */
  holder: 0 | 1;
  phase: HolderPhase;
  pendingWeigh: [number, number] | null;
  /** Whether the current Scale Holder has already viewed the secret for this board. */
  holderPeeked: boolean;
  /** Finished boards in this round: [weighings, helped]. */
  done: [number, boolean][];
};

type LevelSet = { rows: string[] };
const levelSets = sets.levels as unknown as Record<string, LevelSet>;

export const rowPuzzle = (row: string): ShellPuzzle => {
  const parsed = tuplePuzzle(JSON.parse(row)[3]);
  if (!parsed) throw new Error('A certified Shell Scale row failed to decode.');
  return parsed;
};

export const setFor = (level: number): LevelSet => levelSets[String(level)] ?? { rows: [] };
export const puzzleAt = (s: Pick<ScaleState, 'puzzles' | 'index'>): ShellPuzzle | null =>
  s.puzzles[s.index] ? tuplePuzzle(s.puzzles[s.index]) : null;

const toTuple = (row: string) => puzzleTuple(rowPuzzle(row));
const tupleKey = (t: ShellTuple) => t.join('|');

function pick(rows: readonly string[], rng: () => number, avoid: ReadonlySet<string>, count: number): ShellTuple[] {
  const all = rows.map(toTuple);
  const fresh = all.filter(t => !avoid.has(tupleKey(t)));
  const pool = fresh.length >= count ? fresh : all;
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

const blankDraft = (p: ShellPuzzle | null): DraftSnapshot => ({
  order: p && p.kind === 'sort' ? emptyOrder(p.n) : [],
  oddPick: null,
  oddDir: null,
});

const freshBoard = (
  s: Pick<ScaleState, 'level' | 'showLinks' | 'holder' | 'done' | 'practice'>,
  puzzles: ShellTuple[],
  index: number,
): ScaleState => {
  const p = puzzles[index] ? tuplePuzzle(puzzles[index]) : null;
  const draft = blankDraft(p);
  return {
    version: 1,
    level: s.level,
    puzzles,
    index,
    practice: s.practice,
    history: [],
    order: draft.order,
    oddPick: draft.oddPick,
    oddDir: draft.oddDir,
    undo: [],
    checks: 0,
    misses: 0,
    checked: false,
    won: false,
    helped: false,
    showLinks: s.showLinks,
    holder: s.holder,
    phase: 'guesser',
    pendingWeigh: null,
    holderPeeked: false,
    done: s.done,
  };
};

export function startRound(level: number, rng: () => number, previous?: ScaleState): ScaleState {
  const set = setFor(level);
  const avoid = new Set((previous?.puzzles ?? []).map(tupleKey));
  const puzzles = pick(set.rows, rng, avoid, ROUND);
  if (puzzles.length !== ROUND) throw new Error('Shell Scale has no certified boards for that level.');
  const showLinks = previous?.level === level ? previous.showLinks : linksByDefault(level);
  return freshBoard({ level, showLinks, holder: 0, done: [], practice: false }, puzzles, 0);
}

const pushUndo = (s: ScaleState): DraftSnapshot[] => [
  ...s.undo.slice(-(UNDO_LIMIT - 1)),
  { order: [...s.order], oddPick: s.oddPick, oddDir: s.oddDir },
];

/** Solo weighing: evaluates immediately against the hidden weights and appends to public history. */
export function weighSolo(s: ScaleState, left: number, right: number): ScaleState {
  const p = puzzleAt(s);
  if (!p || s.won || s.phase !== 'guesser' || s.history.length >= HISTORY_LIMIT) return s;
  const outcome = weighOnScale(p, left, right);
  if (!outcome) return s;
  return { ...s, history: [...s.history, { left, right, outcome }], checked: false };
}

/** Scale-Holder step 1: Guesser requests a weighing; transitions to handover cover for Holder. */
export function requestHolderWeigh(s: ScaleState, left: number, right: number): ScaleState {
  const p = puzzleAt(s);
  if (!p || s.won || s.phase !== 'guesser' || s.history.length >= HISTORY_LIMIT) return s;
  if (!validPanPair(p, left, right)) return s;
  return { ...s, phase: 'cover-to-holder', pendingWeigh: [left, right], checked: false };
}

/** Scale-Holder step 2: Holder taps "I'm [Name]: show secret" to open the Holder screen. */
export function openHolderScreen(s: ScaleState): ScaleState {
  if (s.won || s.phase !== 'cover-to-holder' || !s.pendingWeigh) return s;
  return { ...s, phase: 'holder', holderPeeked: true };
}

/** Scale-Holder step 3: Holder taps which side tips/balances. Only truthful answers commit. */
export function answerHolderWeigh(s: ScaleState, outcome: ScaleOutcome): ScaleState {
  const p = puzzleAt(s);
  if (!p || s.won || s.phase !== 'holder' || !s.pendingWeigh) return s;
  const [left, right] = s.pendingWeigh;
  const truth = weighOnScale(p, left, right);
  if (!truth || outcome !== truth) return s;
  return {
    ...s,
    history: [...s.history, { left, right, outcome }],
    pendingWeigh: null,
    phase: 'cover-to-guesser',
  };
}

/** Scale-Holder step 4: Guesser taps "I'm [Name]: see the scale" to view the public result. */
export function openGuesserScreen(s: ScaleState): ScaleState {
  if (s.won || s.phase !== 'cover-to-guesser') return s;
  return { ...s, phase: 'guesser' };
}

/**
 * Swap Scale Holder and Guesser cleanly on one device!
 * If the outgoing holder already peeked at this board's secret, deals a fresh board of the same
 * kind so the new Guesser never guesses a secret they just saw.
 */
export function swapRoles(s: ScaleState, rng: () => number): ScaleState {
  const p = puzzleAt(s);
  if (!p || s.won || s.phase !== 'guesser') return s;
  const nextHolder: 0 | 1 = s.holder === 0 ? 1 : 0;
  if (!s.holderPeeked && s.history.length === 0) {
    return { ...s, holder: nextHolder };
  }
  const nextPuzzle = s.practice
    ? puzzleTuple(randomPracticePuzzle(p.kind, p.n, rng))
    : pick(setFor(s.level).rows, rng, new Set(s.puzzles.map(tupleKey)), 1)[0] ?? puzzleTuple(randomPracticePuzzle(p.kind, p.n, rng));
  const puzzles = s.puzzles.map((t, i) => (i === s.index ? nextPuzzle : t));
  return freshBoard({ level: s.level, showLinks: s.showLinks, holder: nextHolder, done: s.done, practice: s.practice }, puzzles, s.index);
}

export function setOrderSlot(s: ScaleState, item: number, slot: number): ScaleState {
  const p = puzzleAt(s);
  if (!p || p.kind !== 'sort' || s.won || s.phase !== 'guesser') return s;
  const order = placeInOrder(s.order, p.n, item, slot);
  if (order === s.order) return s;
  return { ...s, order, undo: pushUndo(s), checked: false };
}

export function pickOddPearl(s: ScaleState, pearl: number, dir?: OddDir): ScaleState {
  const p = puzzleAt(s);
  if (!p || p.kind === 'sort' || s.won || s.phase !== 'guesser') return s;
  if (!Number.isInteger(pearl) || pearl < 0 || pearl >= p.n) return s;
  const nextDir: OddDir | null = p.kind === 'odd-heavy' ? 'heavy' : (dir ?? s.oddDir);
  if (s.oddPick === pearl && s.oddDir === nextDir) return s;
  return { ...s, oddPick: pearl, oddDir: nextDir, undo: pushUndo(s), checked: false };
}

export function setOddDirection(s: ScaleState, dir: OddDir): ScaleState {
  const p = puzzleAt(s);
  if (!p || p.kind !== 'odd-either' || s.won || s.phase !== 'guesser') return s;
  if (s.oddDir === dir) return s;
  return { ...s, oddDir: dir, undo: pushUndo(s), checked: false };
}

export function undoDraft(s: ScaleState): ScaleState {
  if (s.won || s.phase !== 'guesser' || !s.undo.length) return s;
  const prev = s.undo[s.undo.length - 1];
  return { ...s, order: prev.order, oddPick: prev.oddPick, oddDir: prev.oddDir, undo: s.undo.slice(0, -1), checked: false };
}

export function resetDraft(s: ScaleState): ScaleState {
  const p = puzzleAt(s);
  if (!p || s.won || s.phase !== 'guesser') return s;
  const blank = blankDraft(p);
  const unchanged = s.order.join() === blank.order.join() && s.oddPick === blank.oddPick && s.oddDir === blank.oddDir;
  if (unchanged) return s;
  return { ...s, ...blank, undo: pushUndo(s), checked: false };
}

export function canCheckAnswer(s: ScaleState): boolean {
  const p = puzzleAt(s);
  return !!p && !s.won && s.phase === 'guesser' && !s.checked && draftComplete(p, s);
}

/** Explicit whole-answer Check. Over par is NEVER a failure! */
export function checkAnswer(s: ScaleState): ScaleState {
  const p = puzzleAt(s);
  if (!p || !canCheckAnswer(s)) return s;
  const correct = acceptsAnswer(p, s);
  return {
    ...s,
    checks: s.checks + 1,
    misses: s.misses + Number(!correct),
    checked: !correct,
    won: correct,
  };
}

export function setShowLinks(s: ScaleState, on: boolean): ScaleState {
  if (s.won || s.phase !== 'guesser' || s.showLinks === on || !linksChoice(s.level)) return s;
  return { ...s, showLinks: on };
}

export const markHelped = (s: ScaleState): ScaleState => (s.helped ? s : { ...s, helped: true });

export function dealFresh(s: ScaleState, rng: () => number): ScaleState {
  const p = puzzleAt(s);
  if (!p) return s;
  if (s.practice) {
    const next = puzzleTuple(randomPracticePuzzle(p.kind, p.n, rng));
    return freshBoard({ level: s.level, showLinks: s.showLinks, holder: s.holder, done: s.done, practice: true }, s.puzzles.map((t, i) => (i === s.index ? next : t)), s.index);
  }
  const [next] = pick(setFor(s.level).rows, rng, new Set(s.puzzles.map(tupleKey)), 1);
  if (!next || tupleKey(next) === tupleKey(s.puzzles[s.index])) return s;
  return freshBoard({ level: s.level, showLinks: s.showLinks, holder: s.holder, done: s.done, practice: false }, s.puzzles.map((t, i) => (i === s.index ? next : t)), s.index);
}

/** Open random practice on any supported configuration (2-6 shells, 9 pearls, 12 pearls), adding 0 catalog count. */
export function startRandomPractice(s: ScaleState, kind: PuzzleKind, n: number, rng: () => number): ScaleState {
  const next = puzzleTuple(randomPracticePuzzle(kind, n, rng));
  const puzzles = s.puzzles.length ? s.puzzles.map((t, i) => (i === s.index ? next : t)) : [next];
  const idx = s.puzzles.length ? Math.min(s.index, puzzles.length - 1) : 0;
  return freshBoard({ level: s.level, showLinks: s.showLinks, holder: s.holder, done: s.done, practice: true }, puzzles, idx);
}

/** Advance to the next board in the round (alternating Scale Holder automatically in Together play). */
export function nextBoard(s: ScaleState): ScaleState {
  if (!puzzleAt(s) || !s.won) return s;
  const nextHolder: 0 | 1 = s.holder === 0 ? 1 : 0;
  return freshBoard(
    { level: s.level, showLinks: s.showLinks, holder: nextHolder, done: [...s.done, [s.history.length, s.helped]], practice: s.practice },
    s.puzzles,
    s.index + 1,
  );
}

const nat = (v: unknown, max = 4096): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
const certifiedCache = new Map<number, Set<string>>();
const certifiedAt = (level: number) => {
  let set = certifiedCache.get(level);
  if (!set) {
    set = new Set(setFor(level).rows.map(r => tupleKey(toTuple(r))));
    certifiedCache.set(level, set);
  }
  return set;
};

const isShellTuple = (t: unknown): t is ShellTuple => tuplePuzzle(t) !== null;

const validSnapshot = (p: ShellPuzzle, snap: unknown): snap is DraftSnapshot => {
  if (!snap || typeof snap !== 'object') return false;
  const d = snap as DraftSnapshot;
  if (p.kind === 'sort') return validOrder(p.n, d.order) && d.oddPick === null && d.oddDir === null;
  const pickOk = d.oddPick === null || (Number.isInteger(d.oddPick) && d.oddPick >= 0 && d.oddPick < p.n);
  const dirOk = d.oddDir === null || d.oddDir === 'heavy' || (p.kind === 'odd-either' && d.oddDir === 'light');
  return Array.isArray(d.order) && d.order.length === 0 && pickOk && dirOk;
};

/** Strict save validator: rejects forged wins, invalid tuples, and impossible states without mutating input. */
export function validScale(v: unknown, level?: number): v is ScaleState {
  const s = v as ScaleState;
  if (!s || typeof s !== 'object' || s.version !== 1 || !nat(s.level, 5) || s.level < 1 || (level !== undefined && s.level !== level)) return false;
  if (typeof s.practice !== 'boolean' || !Array.isArray(s.puzzles) || s.puzzles.length !== ROUND || !nat(s.index, ROUND)) return false;
  if (!nat(s.checks) || !nat(s.misses) || s.misses > s.checks) return false;
  if (![s.checked, s.won, s.helped, s.showLinks, s.holderPeeked].every(b => typeof b === 'boolean')) return false;
  if (s.holder !== 0 && s.holder !== 1) return false;
  if (!['guesser', 'cover-to-holder', 'holder', 'cover-to-guesser'].includes(s.phase)) return false;
  if (!s.showLinks && !linksChoice(s.level)) return false;
  if (!Array.isArray(s.undo) || s.undo.length > UNDO_LIMIT || !Array.isArray(s.history) || s.history.length > HISTORY_LIMIT) return false;
  if (!Array.isArray(s.done) || s.done.length !== s.index || !s.done.every(d => Array.isArray(d) && d.length === 2 && nat(d[0], HISTORY_LIMIT) && typeof d[1] === 'boolean')) return false;

  const cert = certifiedAt(s.level);
  const decoded: ShellPuzzle[] = [];
  for (const t of s.puzzles) {
    if (!isShellTuple(t)) return false;
    if (!s.practice && !cert.has(tupleKey(t))) return false;
    const p = tuplePuzzle(t);
    if (!p || !validPuzzle(p)) return false;
    decoded.push(p);
  }

  if (s.index === ROUND) {
    return Array.isArray(s.order) && s.order.length === 0 && s.oddPick === null && s.oddDir === null
      && s.history.length === 0 && s.undo.length === 0 && !s.won && !s.checked && !s.checks && !s.misses
      && s.phase === 'guesser' && s.pendingWeigh === null;
  }
  const p = decoded[s.index];
  if (!p) return false;
  if (!validSnapshot(p, { order: s.order, oddPick: s.oddPick, oddDir: s.oddDir })) return false;
  if (!s.undo.every(u => validSnapshot(p, u))) return false;
  for (const w of s.history) {
    if (!w || typeof w !== 'object' || !validPanPair(p, w.left, w.right) || weighOnScale(p, w.left, w.right) !== w.outcome) return false;
  }
  if (s.pendingWeigh !== null) {
    if (!Array.isArray(s.pendingWeigh) || s.pendingWeigh.length !== 2 || !validPanPair(p, s.pendingWeigh[0], s.pendingWeigh[1])) return false;
    if (s.phase !== 'cover-to-holder' && s.phase !== 'holder') return false;
  } else if (s.phase === 'cover-to-holder' || s.phase === 'holder') {
    return false;
  }
  if (s.won && !acceptsAnswer(p, s)) return false;
  if (s.won && s.phase !== 'guesser') return false;
  if (s.checked && (s.won || !draftComplete(p, s) || !s.misses)) return false;
  return true;
}

export const levelInfo = [
  { name: 'Two shells', description: 'Put two shells on the pans. Which one is heavier? Par: 1.' },
  { name: 'Three shells', description: 'Line up three shells, lightest to heaviest. Some pairs you already know! Par: 3.' },
  { name: 'Four shells', description: 'Find the order of four shells in 5 weighings instead of 6. Par: 5.' },
  { name: 'Nine pearls', description: 'One of nine pearls is heavier. Weigh groups of 3 to find it in 2! Par: 2.' },
  { name: 'Five shells', description: 'Five shells in 7 weighings, with helper links tucked away. Par: 7.' },
] as const;

export const engine: Omit<LearnEngine<ScaleState>, 'id'> & { id: 'shell-scale' } = {
  id: 'shell-scale',
  name: 'Shell Scale',
  island: 'thinking',
  tagline: 'Weigh shells and pearls. Find the hidden weights.',
  description: 'Put shells or groups of pearls on the balance scale to discover their hidden weights in as few weighings as you can.',
  help: 'Place shells on the left and right pans and tap Weigh. The scale tips toward the heavier side. Line shells up from lightest to heaviest, or pick the odd pearl, then tap Check. Over par is never a failure.',
  helpAudio: 'scale-help',
  introAudio: 'scale-intro',
  color: '#2B6E75',
  surface: '#E2F1F3',
  modes: ['solo', 'together'],
  modeLabels: { solo: 'On my own', together: 'Together: scale holder' },
  ages: [4, 14],
  ownLevels: true,
  levelNames: levelInfo,
  skills: { 'think.scale-deduction': 'Using information on a balance scale' },
  create: (options: LearnOptions, ctx) => startRound(levelOf(options), ctx.rng, ctx.previous),
  validate: (state: unknown, options: LearnOptions): state is ScaleState => validScale(state, levelOf(options)),
  outcome: (s: ScaleState): Outcome => (s.index >= ROUND ? 'done' : null),
};

export { provenPar };
