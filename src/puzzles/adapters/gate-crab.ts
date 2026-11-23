import {
  bestSplittingRow, copyNearestPasses, evaluateRow, goodTesterWitness, isNonAlternating, isRowIndex,
  liveHypotheses, puzzleTuple, rowSpaceSize, RULE_BY_ID, rungIndex, starterEvidence, tuplePuzzle,
  validPuzzle, type EvidenceEntry, type GatePuzzle, type Rung,
} from '../../learn/games/gate-crab/rules';
import { exactKeys, plain } from '../../state/saveBits';
import { sha256Hex } from '../sha256';
import type { Claim, DescriptorCore, HiddenTwin, PuzzleAdapter, SolveResult, TechniqueResult } from '../types';

/**
 * Pure adapter connecting Gate Crab to the puzzle certification kit.
 * Actions:
 *   0..215       Test row r against the Gate Crab (0..35 on 2-shell Rung A)
 *   216..225     Sort quiz slot i (0..4) to Block (0) or Pass (1): QUIZ_ACTION_BASE + i * 2 + val
 */
export const QUIZ_ACTION_BASE = 216;
export const MAX_ADAPTER_ACTION = QUIZ_ACTION_BASE + 9;

export type GateAdapterState = {
  readonly evidence: readonly EvidenceEntry[];
  readonly tests: readonly number[];
  readonly quiz: readonly (boolean | null)[];
  readonly quizEdits: number;
};
export type GateAdapterAction = number;
type D = DescriptorCore<GatePuzzle>;

export const encodeQuizAction = (slot: number, pass: boolean): GateAdapterAction => QUIZ_ACTION_BASE + slot * 2 + (pass ? 1 : 0);
export const decodeQuizAction = (a: number): { slot: number; pass: boolean } => ({
  slot: Math.floor((a - QUIZ_ACTION_BASE) / 2),
  pass: (a - QUIZ_ACTION_BASE) % 2 === 1,
});
export const isAdapterAction = (a: unknown): a is GateAdapterAction =>
  Number.isInteger(a) && (a as number) >= 0 && (a as number) <= MAX_ADAPTER_ACTION;

export const rungCeilings: Record<Rung, string> = {
  a: 'one-clue',
  b: 'counting',
  c: 'position',
  d: 'relation',
  e: 'compound',
  f: 'deep-rule',
};

function solve(d: D): SolveResult<GateAdapterAction> {
  const p = d.payload;
  const rule = RULE_BY_ID.get(p.ruleId);
  if (!rule) return { status: 'unsolved' };
  const w = goodTesterWitness(p, 16);
  if (!w.identified) return { status: 'budget-exhausted', nodes: w.tests.length };
  const quizActions = p.quiz.map((row, i) => encodeQuizAction(i, evaluateRow(rule, p.len, row)));
  return {
    status: 'solved',
    witness: [...w.tests, ...quizActions],
    metric: 'turns',
    lower: w.lower,
    upper: w.upper,
    exact: w.lower === w.upper,
  };
}

/** Pure public-evidence hint: never reads d.payload.ruleId! */
function publicHint(s: GateAdapterState, d: D): GateAdapterAction | null {
  const p = d.payload;
  const live = liveHypotheses(p.rung, p.len, s.evidence);
  if (!live.length) return null;
  if (live.length > 1) return bestSplittingRow(p.rung, p.len, s.evidence);
  const deduced = live[0];
  for (let i = 0; i < 5; i++) {
    const want = evaluateRow(deduced, p.len, p.quiz[i]);
    if (s.quiz[i] !== want) return encodeQuizAction(i, want);
  }
  return null;
}

function twins(s: GateAdapterState, d: D): HiddenTwin<GatePuzzle, GateAdapterState>[] {
  const p = d.payload;
  const live = liveHypotheses(p.rung, p.len, s.evidence).filter(h => h.id !== p.ruleId);
  const out: HiddenTwin<GatePuzzle, GateAdapterState>[] = [];
  for (const rival of live) {
    if (out.length >= 6) break;
    const altPayload: GatePuzzle = { ...p, ruleId: rival.id };
    if (!validPuzzle(altPayload)) continue;
    out.push({
      state: s,
      descriptor: { ...d, payload: altPayload },
    });
  }
  return out;
}

function technique(d: D): TechniqueResult {
  const p = d.payload;
  const rule = RULE_BY_ID.get(p.ruleId);
  if (!rule) return { status: 'stalled' };
  const w = goodTesterWitness(p, 16);
  if (!w.identified) return { status: 'stalled' };
  return {
    status: 'complete',
    ceiling: rungCeilings[p.rung],
    steps: w.upper + 5,
    trace: `${p.rung}:${rule.family}:live0=${w.liveAfterStarters}:tests=${w.tests.join(',')}`,
  };
}

function claims(d: D): Claim[] {
  const p = d.payload;
  const rule = RULE_BY_ID.get(p.ruleId);
  if (!rule) return [{ id: 'known-rule', proven: false, evidence: 'unknown-rule' }];
  const ev0 = starterEvidence(p);
  const live0 = liveHypotheses(p.rung, p.len, ev0);
  const rivals0 = live0.filter(h => h.id !== rule.id);
  const quizAnswers = p.quiz.map(r => evaluateRow(rule, p.len, r));
  const quizPassCount = quizAnswers.filter(Boolean).length;
  // Every quiz row disagrees with at least one rival rule when rivals exist, and the quiz separates rivals.
  const separatedRivals = rivals0.filter(h => p.quiz.some((r, i) => evaluateRow(h, p.len, r) !== quizAnswers[i])).length;
  const w = goodTesterWitness(p, 16);
  return [
    {
      id: 'truth-table-216',
      proven: rule.table216.length === 216 && rule.pass216 >= 12 && rule.pass216 <= 204,
      evidence: `hash:${rule.tableHash.slice(0, 12)}:pass216=${rule.pass216}`,
    },
    {
      id: 'rung-match',
      proven: rule.rung === p.rung && d.band === p.rung && rungIndex(rule.rung) === rungIndex(p.rung),
      evidence: `rung:${p.rung}:family:${rule.family}`,
    },
    {
      id: 'starters-ambiguous',
      proven: live0.length >= 2 && w.identified,
      evidence: `live0:${live0.length}:tests:${w.upper}`,
    },
    {
      id: 'balanced-non-alternating-quiz',
      proven: (quizPassCount === 2 || quizPassCount === 3) && isNonAlternating(quizAnswers),
      evidence: `quizPass:${quizPassCount}:vec:${quizAnswers.map(Number).join('')}`,
    },
    {
      id: 'quiz-disagrees',
      proven: rivals0.length > 0 && separatedRivals > 0,
      evidence: `separated:${separatedRivals}/${rivals0.length}:nn:${copyNearestPasses(p.len, rule, p.starters, p.quiz) ? 1 : 0}`,
    },
  ];
}

export const gateCrabAdapter: PuzzleAdapter<GatePuzzle, GateAdapterState, GateAdapterAction> = {
  engine: 'gate-crab',
  rules: 1,
  needsCheck: true,
  isPayload: (x): x is GatePuzzle =>
    plain(x)
    && exactKeys(x, ['len', 'rung', 'ruleId', 'starters', 'quiz', 'backups'])
    && validPuzzle(x as GatePuzzle)
    && tuplePuzzle(puzzleTuple(x as GatePuzzle)) !== null,
  isAction: isAdapterAction,
  encodePayload: puzzleTuple,
  decodePayload: tuplePuzzle,
  create: d => ({
    evidence: starterEvidence(d.payload),
    tests: [],
    quiz: [null, null, null, null, null],
    quizEdits: 0,
  }),
  validState: (x, d): x is GateAdapterState => {
    if (!plain(x) || !exactKeys(x, ['evidence', 'tests', 'quiz', 'quizEdits'])) return false;
    const s = x as GateAdapterState;
    const p = d.payload;
    const rule = RULE_BY_ID.get(p.ruleId);
    if (!rule || !Array.isArray(s.evidence) || !Array.isArray(s.tests) || !Array.isArray(s.quiz) || s.quiz.length !== 5) return false;
    if (!Number.isInteger(s.quizEdits) || s.quizEdits < 0) return false;
    if (s.evidence.length !== 4 + s.tests.length) return false;
    const seen = new Set<number>();
    for (const e of s.evidence) {
      if (!plain(e) || !exactKeys(e, ['row', 'pass']) || !isRowIndex(p.len, e.row) || typeof e.pass !== 'boolean') return false;
      if (seen.has(e.row) || evaluateRow(rule, p.len, e.row) !== e.pass) return false;
      seen.add(e.row);
    }
    return s.quiz.every(v => v === null || typeof v === 'boolean');
  },
  reduce: (s, a, d) => {
    const p = d.payload;
    const rule = RULE_BY_ID.get(p.ruleId);
    if (!rule) return s;
    if (a >= QUIZ_ACTION_BASE) {
      const { slot, pass } = decodeQuizAction(a);
      if (slot < 0 || slot >= 5 || s.quiz[slot] === pass) return s;
      const quiz = s.quiz.map((v, i) => (i === slot ? pass : v));
      return { ...s, quiz, quizEdits: s.quizEdits + 1 };
    }
    if (!isRowIndex(p.len, a)) return s;
    if (s.evidence.some(e => e.row === a)) return s;
    const pass = evaluateRow(rule, p.len, a);
    return {
      ...s,
      evidence: [...s.evidence, { row: a, pass }],
      tests: [...s.tests, a],
    };
  },
  actions: (s, d) => {
    const p = d.payload;
    const tested = new Set(s.evidence.map(e => e.row));
    const space = rowSpaceSize(p.len);
    const out: GateAdapterAction[] = [];
    for (let r = 0; r < space; r++) if (!tested.has(r)) out.push(r);
    for (let i = 0; i < 5; i++) {
      if (s.quiz[i] !== false) out.push(encodeQuizAction(i, false));
      if (s.quiz[i] !== true) out.push(encodeQuizAction(i, true));
    }
    return out;
  },
  solved: (s, d) => {
    const p = d.payload;
    const rule = RULE_BY_ID.get(p.ruleId);
    if (!rule) return false;
    return p.quiz.every((row, i) => s.quiz[i] === evaluateRow(rule, p.len, row));
  },
  metrics: s => ({ turns: s.tests.length, placements: s.quizEdits }),
  solve: d => solve(d),
  /** Canonical full 216-row truth table: semantically equivalent rules ALWAYS hash identically. */
  semanticKey: d => RULE_BY_ID.get(d.payload.ruleId)!.table216,
  /** Public progress only: fewer remaining live hypotheses + sorted quiz slots (never reads ruleId). */
  progress: (s, d) => {
    const live = liveHypotheses(d.payload.rung, d.payload.len, s.evidence).length;
    const sorted = s.quiz.filter(v => v !== null).length;
    return -live * 10 + sorted;
  },
  solutionHash: (s, d) => sha256Hex(`gate-crab|${d.payload.ruleId}|${s.quiz.map(v => (v ? '1' : '0')).join('')}`),
  hint: publicHint,
  hidden: {
    view: (s, d) => ({
      len: d.payload.len,
      rung: d.payload.rung,
      evidence: s.evidence,
      quizRows: d.payload.quiz,
      quiz: s.quiz,
    }),
    twins,
  },
  technique,
  claims,
};
