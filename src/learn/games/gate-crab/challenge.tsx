import React from 'react';
import { defineReplayGame } from '../../../challenge/replay';
import type { AwardRule, ChallengeViewProps, Puzzle, RegisteredDare, ReplayEngine, ReplayPayload } from '../../../challenge/types';
import { gateCrabAdapter } from '../../../puzzles/adapters/gate-crab';
import { sha256Hex } from '../../../puzzles/sha256';
import sets from './sets.generated.json';
import { rowPuzzle } from './engine';
import {
  closestContrastingEvidence, compareRowsText, evaluateRow, goodTesterWitness, isRowIndex,
  nextQuizReplacement, rowWords, RULE_BY_ID, starterEvidence, type CounterexampleInfo,
  type EvidenceEntry, type GatePuzzle, type Rung,
} from './rules';

/**
 * Reserved O3 Gate Crab slots:
 *   Packed Endless Tide banks: 310..315 (Rungs A..F, 384 certified puzzles)
 *   Inline Deep Water bank:    316 (12 Rung F puzzles)
 *   Inline Dare bank:          317 (24 Rung A..F dare puzzles)
 *   Dare slots:                2100..2171 (inside reserved 2100..2199)
 */
export const DEEP_BANK = 316;
export const DARE_BANK = 317;
export const FIRST_DARE_SLOT = 2100;

/**
 * Compact integer action encoding (<= 4 bytes each in JSON):
 *   0..215       Ordinary test row r (0..35 on 2-shell Rung A)
 *   216..225     Ordinary quiz sort: QUIZ_BASE + slot * 2 + (pass ? 1 : 0)
 *   226          CHECK (whole-answer check of all 5 sorted quiz rows)
 *   227          UNDO (reverts last quiz edit; never drops evidence)
 *   228          RESET (clears current quiz draft)
 *   229          HELP (idempotent; coalesced so saturated Help uses at most 1 slot)
 *   230..445     Hinted test row r: HINT_TEST_BASE + r
 *   446..455     Hinted quiz sort: HINT_QUIZ_BASE + slot * 2 + (pass ? 1 : 0)
 */
export const QUIZ_BASE = 216;
export const CHECK = 226;
export const UNDO = 227;
export const RESET = 228;
export const HELP = 229;
export const HINT_TEST_BASE = 230;
export const HINT_QUIZ_BASE = 446;
export const MAX_ACTION = 455;

export type Action = number;

export const encodeQuiz = (slot: number, pass: boolean): Action => QUIZ_BASE + slot * 2 + (pass ? 1 : 0);
export const encodeHintTest = (row: number): Action => HINT_TEST_BASE + row;
export const encodeHintQuiz = (slot: number, pass: boolean): Action => HINT_QUIZ_BASE + slot * 2 + (pass ? 1 : 0);

/**
 * Worst-case save reserve:
 *   1 HELP (coalesced) + 1 possible trailing wrong CHECK + <=12 minimax HINT_TEST + 5 HINT_QUIZ + 1 final CHECK = 20 actions.
 *   We reserve 24 actions and 448 bytes so repeated tests, misses, Undo, and saturated Help can NEVER exhaust the reserve.
 */
export const ASSIST_ACTIONS = 24;
export const ASSIST_BYTES = 448;
export const ORDINARY_LIMIT = 512 - ASSIST_ACTIONS;
export const UNDO_DEPTH = 32;

export type Descriptor = { puzzle: GatePuzzle; band: Rung };
export type State = {
  puzzle: GatePuzzle;
  evidence: EvidenceEntry[];
  tests: number[];
  quizRows: number[];
  quizChoices: (boolean | null)[];
  stack: (boolean | null)[][];
  checks: number;
  misses: number;
  counterexample: CounterexampleInfo | null;
  won: boolean;
  actions: number;
};
type Initial = 0;
export type Payload = ReplayPayload<Initial, Action>;

export const isAction = (v: unknown): v is Action =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) <= MAX_ACTION;

export const assisted = (a: Action): boolean => a === HELP || a >= HINT_TEST_BASE;

const engine: ReplayEngine<Descriptor, Initial, Action, State> = {
  initial: () => 0,
  validInitial: (v): v is Initial => v === 0,
  create: d => ({
    puzzle: d.puzzle,
    evidence: starterEvidence(d.puzzle),
    tests: [],
    quizRows: [...d.puzzle.quiz],
    quizChoices: [null, null, null, null, null],
    stack: [],
    checks: 0,
    misses: 0,
    counterexample: null,
    won: false,
    actions: 0,
  }),
  validAction: isAction,
  step: (s, a) => {
    if (s.won) return null;
    const p = s.puzzle;
    const rule = RULE_BY_ID.get(p.ruleId);
    if (!rule) return null;
    const counted = { ...s, actions: s.actions + 1 };

    if (a === HELP) return { state: counted, event: 'help' };

    if (a === UNDO) {
      if (!s.stack.length) return null;
      const prev = s.stack[s.stack.length - 1];
      return { state: { ...counted, quizChoices: prev, stack: s.stack.slice(0, -1) }, event: 'edit' };
    }

    if (a === RESET) {
      if (s.quizChoices.every(c => c === null)) return null;
      return {
        state: {
          ...counted,
          quizChoices: [null, null, null, null, null],
          stack: [...s.stack.slice(-(UNDO_DEPTH - 1)), s.quizChoices],
        },
        event: 'reset',
      };
    }

    if (a === CHECK) {
      if (!s.quizChoices.every(c => c !== null)) return null;
      const wrongIdx = s.quizRows.findIndex((row, i) => s.quizChoices[i] !== evaluateRow(rule, p.len, row));
      if (wrongIdx < 0) {
        return {
          state: { ...counted, checks: s.checks + 1, counterexample: null, won: true },
          event: 'check',
          correct: true,
        };
      }
      const missedRow = s.quizRows[wrongIdx];
      const actualPass = evaluateRow(rule, p.len, missedRow);
      const contrast = closestContrastingEvidence(p.len, missedRow, actualPass, s.evidence);
      const evidence = s.evidence.some(e => e.row === missedRow)
        ? s.evidence
        : [...s.evidence, { row: missedRow, pass: actualPass }];
      const used = new Set<number>([...evidence.map(e => e.row), ...s.quizRows]);
      const replacement = nextQuizReplacement(p, used, actualPass);
      const quizRows = replacement !== null
        ? s.quizRows.map((r, i) => (i === wrongIdx ? replacement : r))
        : s.quizRows;
      const note = contrast
        ? `This row (${rowWords(p.len, missedRow)}) ${actualPass ? 'PASSES' : 'BLOCKS'}! ${compareRowsText(p.len, missedRow, contrast.row)}`
        : `This row (${rowWords(p.len, missedRow)}) ${actualPass ? 'PASSES' : 'BLOCKS'}! It joined your clues.`;
      return {
        state: {
          ...counted,
          evidence,
          quizRows,
          quizChoices: [null, null, null, null, null],
          stack: [],
          checks: s.checks + 1,
          misses: s.misses + 1,
          counterexample: {
            row: missedRow,
            actualPass,
            contrastRow: contrast?.row ?? null,
            contrastPass: contrast?.pass ?? null,
            note,
          },
        },
        event: 'check',
        correct: false,
      };
    }

    // Quiz sort (ordinary or hinted)
    if ((a >= QUIZ_BASE && a < CHECK) || (a >= HINT_QUIZ_BASE && a <= MAX_ACTION)) {
      const base = a >= HINT_QUIZ_BASE ? HINT_QUIZ_BASE : QUIZ_BASE;
      const slot = Math.floor((a - base) / 2);
      const pass = (a - base) % 2 === 1;
      if (slot < 0 || slot >= 5 || s.quizChoices[slot] === pass) return null;
      const quizChoices = s.quizChoices.map((v, i) => (i === slot ? pass : v));
      return {
        state: {
          ...counted,
          quizChoices,
          stack: [...s.stack.slice(-(UNDO_DEPTH - 1)), s.quizChoices],
        },
        event: 'edit',
      };
    }

    // Test row (ordinary 0..215 or hinted 230..445)
    const row = a >= HINT_TEST_BASE ? a - HINT_TEST_BASE : a;
    if (!isRowIndex(p.len, row)) return null;
    if (s.evidence.some(e => e.row === row)) return null;
    const pass = evaluateRow(rule, p.len, row);
    return {
      state: {
        ...counted,
        evidence: [...s.evidence, { row, pass }],
        tests: [...s.tests, row],
        counterexample: null,
      },
      event: 'edit',
    };
  },
  inspect: s => ({
    solved: s.won,
    metrics: { turns: s.tests.length },
    edits: s.tests.length,
    solution: s.won ? sha256Hex(`gate-crab|${s.puzzle.ruleId}|${s.quizRows.join(',')}`) : null,
    objectives: [],
  }),
};

export const gateCrabStep = (s: State, a: Action): State | null =>
  engine.step(s, a, { puzzle: s.puzzle, band: s.puzzle.rung })?.state ?? null;

export const ordinaryFull = (s: State): boolean => s.actions >= ORDINARY_LIMIT;

/** Past the ordinary action ceiling, only Help, hinted steps, and Check are accepted. */
export const ordinaryAllowed = (s: State, a: Action): boolean =>
  assisted(a) || a === CHECK || !ordinaryFull(s);

const awardsFor = (d: Descriptor): [AwardRule, AwardRule] => {
  const w = goodTesterWitness(d.puzzle, 16);
  const budget = Math.max(3, w.upper);
  return [
    { rule: { kind: 'par', metric: 'turns', max: budget }, help: 'independent' },
    { rule: { kind: 'clean' }, help: 'independent' },
  ];
};

let dareSlot = FIRST_DARE_SLOT;
function entry(
  row: string,
  band: Rung,
  bank: number,
  index: number,
  path: 'deep-water' | 'endless',
  tier: 1 | 2 | 3 | 4 | 5 | 6,
  title: string,
): Puzzle<Descriptor> {
  const puzzle = rowPuzzle(row);
  const d: Descriptor = { puzzle, band };
  const w = goodTesterWitness(puzzle, 16);
  const budget = Math.max(3, w.upper);
  const threeTests: RegisteredDare = {
    slot: dareSlot++,
    id: `gate-tests-${bank}-${index}`,
    label: budget === 3 ? 'Pass the quiz in 3 tests' : `Pass the quiz in ${budget} tests`,
    rule: { kind: 'par', metric: 'turns', max: budget },
    help: 'independent',
  };
  const cleanQuiz: RegisteredDare = {
    slot: dareSlot++,
    id: `gate-clean-${bank}-${index}`,
    label: 'Sort all 5 right on the first try',
    rule: { kind: 'clean' },
    help: 'independent',
  };
  return {
    ref: { bank, puzzle: index, engine: 'gate-crab', rules: gateCrabAdapter.rules, hash: sha256Hex(row) },
    source: path === 'deep-water'
      ? { kind: 'deep-water', collection: bank, puzzle: index }
      : { kind: 'endless', bank, puzzle: index },
    path,
    tier,
    title,
    descriptor: d,
    dares: [threeTests, cleanQuiz],
    awards: awardsFor(d),
    par: { metric: 'turns', lower: w.lower, upper: w.upper },
  };
}

const endlessTier: Record<Rung, 1 | 2 | 3 | 4 | 5 | 6> = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 };
const nameOf: Record<Rung, string> = {
  a: 'One clue',
  b: 'Counting',
  c: 'Where it sits',
  d: 'How they relate',
  e: 'And, or, unless',
  f: 'Deep rules',
};

const counts = new Map<number, number>();
export const puzzles: Puzzle<Descriptor>[] = (sets.challenge as { path: 'deep' | 'endless'; band: Rung; rows: string[] }[]).flatMap(group =>
  group.rows.map((row, idxInGroup) => {
    const deep = group.path === 'deep';
    const bank = deep ? DEEP_BANK : DARE_BANK;
    const index = counts.get(bank) ?? 0;
    counts.set(bank, index + 1);
    const tier: 1 | 2 | 3 | 4 | 5 | 6 = deep
      ? (Math.min(3, Math.floor(idxInGroup / 4) + 1) as 1 | 2 | 3)
      : endlessTier[group.band];
    const label = deep ? `Deep gate ${index + 1}` : `${nameOf[group.band]} ${idxInGroup + 1}`;
    return entry(row, group.band, bank, index, deep ? 'deep-water' : 'endless', tier, label);
  }),
);

/** Packed Endless Tide banks (slots 310..315, all 384 certified puzzles). */
export const packedBanks = (sets.packed as [number, number, number, string, number, Rung][]).map(
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

// Node tests load this file directly; lazily require native UI board only on render.
let board: typeof import('./challengeBoard').ChallengeBoard | undefined;
function LazyBoard(props: ChallengeViewProps<State, Action>) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  board ??= (require('./challengeBoard') as typeof import('./challengeBoard')).ChallengeBoard;
  return React.createElement(board, props);
}

export const registration = defineReplayGame({
  game: 'gate-crab',
  codec: 'gate-crab-replay-v1',
  context: 'gate',
  cove: false,
  budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
  puzzles,
  objectives: [],
  engine,
  helpUI: 'board',
  assistance: { bytes: ASSIST_BYTES, actions: ASSIST_ACTIONS, idempotentHelp: true, isAction: assisted },
  completionText: () => 'You discovered the Gate Crab’s secret rule and sorted all five rows!',
  Board: LazyBoard,
  controls: { help: (): Action => HELP, reset: (): Action => RESET },
  packed: {
    family: 'gate-crab',
    banks: packedBanks.map(({ band: _band, ...b }) => b),
    awards: 3,
    open: async (loader, ordinal) => {
      const d = await loader.entry(gateCrabAdapter, 'gate-crab', ordinal);
      return { ref: d.ref, descriptor: { puzzle: d.payload, band: bandOfSlot.get(d.ref.bank) ?? (d.band as Rung) } };
    },
    describe: d => {
      const w = goodTesterWitness(d.puzzle, 16);
      return { awards: awardsFor(d), par: { metric: 'turns', lower: w.lower, upper: w.upper } };
    },
  },
});
