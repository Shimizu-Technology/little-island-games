import React from 'react';
import { defineReplayGame } from '../../../challenge/replay';
import type { AwardRule, ChallengeViewProps, Puzzle, RegisteredDare, ReplayEngine, ReplayPayload } from '../../../challenge/types';
import { shellScaleAdapter } from '../../../puzzles/adapters/shell-scale';
import { sha256Hex } from '../../../puzzles/sha256';
import sets from './sets.generated.json';
import { rowPuzzle } from './engine';
import {
  acceptsAnswer, draftComplete, emptyOrder, placeInOrder, provenPar, puzzleTuple, validPanPair, weighOnScale,
  type OddDir, type ShellPuzzle, type Weighing,
} from './rules';

/**
 * Reserved O5 slots:
 * - Packed banks: 360-365 (a-f, 32 certified insight puzzles)
 * - Inline Challenge banks: 366 (Deep Water, Rung F: 6 shells & 12 pearls), 367 (Endless Tide dare set, C-F)
 * - Dare slots: 2400-2499
 */
export const DEEP_BANK = 366;
export const DARE_BANK = 367;
export const FIRST_DARE_SLOT = 2400;

/**
 * Compact integer actions for ReplayPayload:
 * - 0: UNDO (answer draft)
 * - 1: RESET (answer draft)
 * - 2: CHECK (whole-answer submit)
 * - 3: HELP (idempotent after first)
 * - 100..155: PLACE_SORT(item, slot) = 100 + item * 8 + (slot + 1)
 * - 200..255: HINTED_PLACE_SORT(item, slot) = 200 + item * 8 + (slot + 1)
 * - 300..323: PICK_ODD(pearl, dir) = 300 + pearl * 2 + (dir === 'light' ? 1 : 0)
 * - 350..373: HINTED_PICK_ODD(pearl, dir) = 350 + pearl * 2 + (dir === 'light' ? 1 : 0)
 * - 400..435: WEIGH_SORT(a, b) = 400 + a * 6 + b (compact 3-digit 1v1 weighing for sort!)
 * - 500..535: HINTED_WEIGH_SORT(a, b) = 500 + a * 6 + b
 * - 1000..16,778,215: WEIGH_GROUP(leftMask, rightMask) = 1000 + leftMask * 4096 + rightMask
 * - 20,000,000..36,777,215: HINTED_WEIGH_GROUP(leftMask, rightMask) = 20_000_000 + leftMask * 4096 + rightMask
 */
export const UNDO = 0;
export const RESET = 1;
export const CHECK = 2;
export const HELP = 3;
export const PLACE_SORT_BASE = 100;
export const HINTED_PLACE_SORT_BASE = 200;
export const PICK_ODD_BASE = 300;
export const HINTED_PICK_ODD_BASE = 350;
export const WEIGH_SORT_BASE = 400;
export const HINTED_WEIGH_SORT_BASE = 500;
export const WEIGH_GROUP_BASE = 1000;
export const HINTED_WEIGH_GROUP_BASE = 20_000_000;

export type Action = number;

export const actPlaceSort = (item: number, slot: number, hinted = false): Action =>
  (hinted ? HINTED_PLACE_SORT_BASE : PLACE_SORT_BASE) + item * 8 + (slot + 1);
export const actPickOdd = (pearl: number, dir: OddDir, hinted = false): Action =>
  (hinted ? HINTED_PICK_ODD_BASE : PICK_ODD_BASE) + pearl * 2 + (dir === 'light' ? 1 : 0);
export const actWeighSort = (a: number, b: number, hinted = false): Action =>
  (hinted ? HINTED_WEIGH_SORT_BASE : WEIGH_SORT_BASE) + a * 6 + b;
export const actWeighGroup = (left: number, right: number, hinted = false): Action =>
  (hinted ? HINTED_WEIGH_GROUP_BASE : WEIGH_GROUP_BASE) + left * 4096 + right;

export function actWeighFor(p: Pick<ShellPuzzle, 'kind' | 'n'>, left: number, right: number, hinted = false): Action {
  if (p.kind === 'sort') {
    let a = -1, b = -1;
    for (let i = 0; i < p.n; i++) {
      if ((left >> i) & 1) a = i;
      if ((right >> i) & 1) b = i;
    }
    return actWeighSort(a, b, hinted);
  }
  return actWeighGroup(left, right, hinted);
}

/**
 * Certified reserve (PLAN §5):
 * Worst-case assisted completion from ANY reachable state (including 6-shell sort with adversarial Check taps):
 * 1 pre-limit miss + 1 idempotent HELP + <=10 hinted weighings + <=6 hinted placements + <=5 adversarial checks + 1 winning Check = 24 <= 26!
 * 512 bytes covers both 3-digit sort actions and 8-digit 12-pearl group weighings plus result JSON overhead.
 */
export const ASSIST_ACTIONS = 26;
export const ASSIST_BYTES = 512;
export const ORDINARY_LIMIT = 512 - ASSIST_ACTIONS; // 486
export const ORDINARY_GROUP_LIMIT = 300; // guarantees 8-digit group weighings stay well inside 4096 - 512 bytes
export const UNDO_DEPTH = 48;

export const linksBand = (band: string) => band === 'a' || band === 'b' || band === 'c' || band === 'd';

export type Descriptor = { puzzle: ShellPuzzle; band: string };
type DraftSnap = { order: number[]; oddPick: number | null; oddDir: OddDir | null };

export type State = {
  puzzle: ShellPuzzle;
  showLinks: boolean;
  history: Weighing[];
  order: number[];
  oddPick: number | null;
  oddDir: OddDir | null;
  stack: DraftSnap[];
  checks: number;
  misses: number;
  checked: boolean;
  won: boolean;
  actions: number;
};

type Initial = 0;
export type Payload = ReplayPayload<Initial, Action>;

export function assisted(a: Action): boolean {
  return (
    a === HELP ||
    (a >= HINTED_PLACE_SORT_BASE && a < HINTED_PLACE_SORT_BASE + 48) ||
    (a >= HINTED_PICK_ODD_BASE && a < HINTED_PICK_ODD_BASE + 24) ||
    (a >= HINTED_WEIGH_SORT_BASE && a < HINTED_WEIGH_SORT_BASE + 36) ||
    (a >= HINTED_WEIGH_GROUP_BASE && a < HINTED_WEIGH_GROUP_BASE + 4096 * 4096)
  );
}

export function isAction(v: unknown): v is Action {
  if (!Number.isInteger(v)) return false;
  const a = v as number;
  if (a >= 0 && a <= HELP) return true;
  if (a >= PLACE_SORT_BASE && a < PLACE_SORT_BASE + 48) return (a - PLACE_SORT_BASE) % 8 <= 6;
  if (a >= HINTED_PLACE_SORT_BASE && a < HINTED_PLACE_SORT_BASE + 48) return (a - HINTED_PLACE_SORT_BASE) % 8 <= 6;
  if (a >= PICK_ODD_BASE && a < PICK_ODD_BASE + 24) return true;
  if (a >= HINTED_PICK_ODD_BASE && a < HINTED_PICK_ODD_BASE + 24) return true;
  if (a >= WEIGH_SORT_BASE && a < WEIGH_SORT_BASE + 36) return true;
  if (a >= HINTED_WEIGH_SORT_BASE && a < HINTED_WEIGH_SORT_BASE + 36) return true;
  if (a >= WEIGH_GROUP_BASE && a < WEIGH_GROUP_BASE + 4096 * 4096) {
    const raw = a - WEIGH_GROUP_BASE;
    const left = Math.floor(raw / 4096), right = raw % 4096;
    return left > 0 && right > 0 && (left & right) === 0;
  }
  if (a >= HINTED_WEIGH_GROUP_BASE && a < HINTED_WEIGH_GROUP_BASE + 4096 * 4096) {
    const raw = a - HINTED_WEIGH_GROUP_BASE;
    const left = Math.floor(raw / 4096), right = raw % 4096;
    return left > 0 && right > 0 && (left & right) === 0;
  }
  return false;
}

const pushSnap = (s: State): DraftSnap[] => [
  ...s.stack.slice(-(UNDO_DEPTH - 1)),
  { order: [...s.order], oddPick: s.oddPick, oddDir: s.oddDir },
];

const engine: ReplayEngine<Descriptor, Initial, Action, State> = {
  initial: () => 0,
  validInitial: (v): v is Initial => v === 0,
  create: (d, _initial, options) => ({
    puzzle: d.puzzle,
    showLinks: linksBand(d.band) && !options.supportOff,
    history: [],
    order: d.puzzle.kind === 'sort' ? emptyOrder(d.puzzle.n) : [],
    oddPick: null,
    oddDir: null,
    stack: [],
    checks: 0,
    misses: 0,
    checked: false,
    won: false,
    actions: 0,
  }),
  validAction: isAction,
  step: (s, a) => {
    if (s.won) return null;
    const counted = { ...s, actions: s.actions + 1 };
    if (a === HELP) return { state: counted, event: 'help' };
    if (a === UNDO) {
      if (!s.stack.length) return null;
      const prev = s.stack[s.stack.length - 1];
      return {
        state: { ...counted, order: prev.order, oddPick: prev.oddPick, oddDir: prev.oddDir, stack: s.stack.slice(0, -1), checked: false },
        event: 'edit',
      };
    }
    if (a === RESET) {
      const blankOrder = s.puzzle.kind === 'sort' ? emptyOrder(s.puzzle.n) : [];
      const same = s.order.join() === blankOrder.join() && s.oddPick === null && s.oddDir === null;
      if (same) return null;
      return {
        state: { ...counted, order: blankOrder, oddPick: null, oddDir: null, stack: pushSnap(s), checked: false },
        event: 'reset',
      };
    }
    if (a === CHECK) {
      if (s.checked || !draftComplete(s.puzzle, s)) return null;
      const correct = acceptsAnswer(s.puzzle, s);
      return {
        state: { ...counted, checks: s.checks + 1, misses: s.misses + Number(!correct), checked: !correct, won: correct },
        event: 'check',
        correct,
      };
    }
    if (
      (a >= PLACE_SORT_BASE && a < PLACE_SORT_BASE + 48) ||
      (a >= HINTED_PLACE_SORT_BASE && a < HINTED_PLACE_SORT_BASE + 48)
    ) {
      if (s.puzzle.kind !== 'sort') return null;
      const raw = a >= HINTED_PLACE_SORT_BASE ? a - HINTED_PLACE_SORT_BASE : a - PLACE_SORT_BASE;
      const item = Math.floor(raw / 8), slot = (raw % 8) - 1;
      if (item >= s.puzzle.n || slot >= s.puzzle.n) return null;
      const order = placeInOrder(s.order, s.puzzle.n, item, slot);
      if (order === s.order) return null;
      return { state: { ...counted, order, stack: pushSnap(s), checked: false }, event: 'edit' };
    }
    if (
      (a >= PICK_ODD_BASE && a < PICK_ODD_BASE + 24) ||
      (a >= HINTED_PICK_ODD_BASE && a < HINTED_PICK_ODD_BASE + 24)
    ) {
      if (s.puzzle.kind === 'sort') return null;
      const raw = a >= HINTED_PICK_ODD_BASE ? a - HINTED_PICK_ODD_BASE : a - PICK_ODD_BASE;
      const pearl = Math.floor(raw / 2), dir: OddDir = raw % 2 === 1 ? 'light' : 'heavy';
      if (pearl >= s.puzzle.n) return null;
      if (s.puzzle.kind === 'odd-heavy' && dir !== 'heavy') return null;
      if (s.oddPick === pearl && s.oddDir === dir) return null;
      return { state: { ...counted, oddPick: pearl, oddDir: dir, stack: pushSnap(s), checked: false }, event: 'edit' };
    }
    if (
      (a >= WEIGH_SORT_BASE && a < WEIGH_SORT_BASE + 36) ||
      (a >= HINTED_WEIGH_SORT_BASE && a < HINTED_WEIGH_SORT_BASE + 36)
    ) {
      if (s.puzzle.kind !== 'sort') return null;
      const isHinted = a >= HINTED_WEIGH_SORT_BASE;
      const raw = isHinted ? a - HINTED_WEIGH_SORT_BASE : a - WEIGH_SORT_BASE;
      const leftIdx = Math.floor(raw / 6), rightIdx = raw % 6;
      if (leftIdx >= s.puzzle.n || rightIdx >= s.puzzle.n || leftIdx === rightIdx) return null;
      const left = 1 << leftIdx, right = 1 << rightIdx;
      const outcome = weighOnScale(s.puzzle, left, right);
      if (!outcome) return null;
      // A hinted weighing does not alter the draft, so `checked` stays latched at the reserve boundary.
      return {
        state: { ...counted, history: [...s.history, { left, right, outcome }], checked: isHinted ? s.checked : false },
        event: 'edit',
      };
    }
    if (
      (a >= WEIGH_GROUP_BASE && a < WEIGH_GROUP_BASE + 4096 * 4096) ||
      (a >= HINTED_WEIGH_GROUP_BASE && a < HINTED_WEIGH_GROUP_BASE + 4096 * 4096)
    ) {
      if (s.puzzle.kind === 'sort') return null;
      const isHinted = a >= HINTED_WEIGH_GROUP_BASE;
      const raw = isHinted ? a - HINTED_WEIGH_GROUP_BASE : a - WEIGH_GROUP_BASE;
      const left = Math.floor(raw / 4096), right = raw % 4096;
      if (!validPanPair(s.puzzle, left, right)) return null;
      const outcome = weighOnScale(s.puzzle, left, right);
      if (!outcome) return null;
      return {
        state: { ...counted, history: [...s.history, { left, right, outcome }], checked: isHinted ? s.checked : false },
        event: 'edit',
      };
    }
    return null;
  },
  inspect: s => ({
    solved: s.won,
    metrics: { turns: s.history.length },
    edits: s.actions,
    solution: s.won
      ? sha256Hex(`scale|${puzzleTuple(s.puzzle).join('|')}|${s.order.join(',')}|${s.oddPick ?? ''}|${s.oddDir ?? ''}`)
      : null,
    objectives: [],
  }),
};

export const scaleStep = (s: State, a: Action): State | null => engine.step(s, a, { puzzle: s.puzzle, band: '' })?.state ?? null;

export const ordinaryLimitFor = (p: Pick<ShellPuzzle, 'kind'>) =>
  p.kind === 'sort' ? ORDINARY_LIMIT : ORDINARY_GROUP_LIMIT;

export const ordinaryFull = (s: State) => s.actions >= ordinaryLimitFor(s.puzzle);

/** Past the ordinary limit only assisted actions (Help + hinted weighings/placements) and Check are accepted. */
export const ordinaryAllowed = (s: State, a: Action) => assisted(a) || a === CHECK || !ordinaryFull(s);

const parRule = (p: ShellPuzzle): AwardRule => ({
  rule: { kind: 'par', metric: 'turns', max: provenPar(p) },
  help: 'independent',
});

const awardsFor = (d: Descriptor): [AwardRule, AwardRule] => [
  parRule(d.puzzle),
  linksBand(d.band) ? { rule: { kind: 'clean' }, help: 'independent' } : { rule: { kind: 'whole' }, help: 'independent' },
];

let dareSlot = FIRST_DARE_SLOT;
function entry(
  row: string,
  band: string,
  bank: number,
  index: number,
  path: 'deep-water' | 'endless',
  tier: 1 | 2 | 3 | 4 | 5 | 6,
  title: string,
): Puzzle<Descriptor> {
  const puzzle = rowPuzzle(row), d = { puzzle, band }, par = provenPar(puzzle);
  const parDare: RegisteredDare = {
    slot: dareSlot++,
    id: `scale-par-${bank}-${index}`,
    label: `Finish in ${par} ${par === 1 ? 'weighing' : 'weighings'}`,
    rule: { kind: 'par', metric: 'turns', max: par },
    help: 'independent',
  };
  const secondDare: RegisteredDare = linksBand(band)
    ? { slot: dareSlot++, id: `scale-blind-${bank}-${index}`, label: 'Links off: hold them in mind', rule: { kind: 'blind' }, help: 'independent' }
    : { slot: dareSlot++, id: `scale-first-${bank}-${index}`, label: 'Right on the first Check', rule: { kind: 'whole' }, help: 'independent' };
  return {
    ref: { bank, puzzle: index, engine: 'shell-scale', rules: shellScaleAdapter.rules, hash: sha256Hex(row) },
    source: path === 'deep-water' ? { kind: 'deep-water', collection: bank, puzzle: index } : { kind: 'endless', bank, puzzle: index },
    path,
    tier,
    title,
    descriptor: d,
    dares: [parDare, secondDare],
    awards: awardsFor(d),
    par: { metric: 'turns', lower: par, upper: par },
  };
}

const endlessTier: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = { c: 1, d: 2, e: 3, f: 4 };
const nameOf: Record<string, string> = {
  c: 'Four shells',
  d: 'Nine pearls',
  e: 'Five shells',
  f: 'Deep scale',
};

const counts = new Map<number, number>();
export const puzzles: Puzzle<Descriptor>[] = sets.challenge.flatMap(group =>
  group.rows.map(row => {
    const deep = group.path === 'deep';
    const bank = deep ? DEEP_BANK : DARE_BANK;
    const index = counts.get(bank) ?? 0;
    counts.set(bank, index + 1);
    const p = rowPuzzle(row);
    const label = deep
      ? p.kind === 'sort'
        ? `Six shells ${index + 1}`
        : `Twelve pearls ${index + 1}`
      : `${nameOf[group.band]} ${index + 1}`;
    const tier: 1 | 2 | 3 | 4 | 5 | 6 = deep ? (p.kind === 'sort' ? 1 : 2) : endlessTier[group.band];
    return entry(row, group.band, bank, index, deep ? 'deep-water' : 'endless', tier, label);
  }),
);

/** Endless Tide packed bank slots (rungs C-F): [slot, first ordinal, entries, pack sha256, rules, band]. */
export const packedBanks = (sets.packed as [number, number, number, string, number, string][]).map(
  ([slot, first, count, packHash, rules, band]) => ({
    slot,
    first,
    count,
    packHash,
    rules,
    path: 'endless' as const,
    tier: endlessTier[band],
    title: nameOf[band],
    band,
  }),
);
const bandOfSlot = new Map(packedBanks.map(b => [b.slot, b.band]));

const parLookup = new Map(puzzles.map(p => [`${p.ref.bank}:${p.ref.puzzle}`, provenPar(p.descriptor.puzzle)]));

let board: typeof import('./challengeBoard').ChallengeBoard | undefined;
function LazyBoard(props: ChallengeViewProps<State, Action>) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  board ??= (require('./challengeBoard') as typeof import('./challengeBoard')).ChallengeBoard;
  return React.createElement(board, props);
}

export const registration = defineReplayGame({
  game: 'shell-scale',
  codec: 'shell-scale-replay-v1',
  context: 'scale',
  cove: false,
  budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
  puzzles,
  objectives: [],
  engine,
  helpUI: 'board',
  assistance: { bytes: ASSIST_BYTES, actions: ASSIST_ACTIONS, idempotentHelp: true, isAction: assisted },
  completionText: (ref, result) => {
    const par = parLookup.get(`${ref.bank}:${ref.puzzle}`);
    if (result.event === 'together') return 'You weighed it out together!';
    if (result.cost !== null && par !== undefined && result.cost > par) {
      return `Sorted in ${result.cost} weighings! The tide thinks it can be done in ${par} — want to try again?`;
    }
    return result.cost !== null
      ? `Every weight found in ${result.cost} ${result.cost === 1 ? 'weighing' : 'weighings'}!`
      : 'Every weight found!';
  },
  Board: LazyBoard,
  controls: { help: (): Action => HELP, reset: (): Action => RESET },
  packed: {
    family: 'shell-scale',
    banks: packedBanks.map(({ band: _band, ...b }) => b),
    awards: 3,
    open: async (loader, ordinal) => {
      const d = await loader.entry(shellScaleAdapter, 'shell-scale', ordinal);
      return { ref: d.ref, descriptor: { puzzle: d.payload, band: bandOfSlot.get(d.ref.bank) ?? d.band } };
    },
    describe: d => {
      const par = provenPar(d.puzzle);
      return { awards: awardsFor(d), par: { metric: 'turns', lower: par, upper: par } };
    },
  },
});
