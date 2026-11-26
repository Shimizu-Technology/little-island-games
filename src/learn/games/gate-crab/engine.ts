import type { LearnEngine, LearnOptions, Outcome } from '../../types';
import { levelOf } from '../../levelOptions';
import sets from './sets.generated.json';
import {
  closestContrastingEvidence, codesToRow, compareRowsText, constructPuzzle, evaluateRow, isRowIndex,
  isShellCode, nextQuizReplacement, puzzleTuple, rowCodes, rowWords, RULE_BY_ID, RULES_BY_RUNG,
  rungLength, starterEvidence, tuplePuzzle, validPuzzle, type CounterexampleInfo, type EvidenceEntry,
  type GatePuzzle, type GateTuple, type Rung, type ShellCode,
} from './rules';
import { createRng } from '../../../puzzles/rng';
export type { CounterexampleInfo };

/** Four gates per School round, chosen from certified bank rows. */
export const ROUND = 4;
export const UNDO_LIMIT = 48;
export const TEST_LIMIT = 256;

export type TogetherStage = 'cover-maker' | 'pick-rule' | 'cover-guesser' | 'play' | 'revealed';

export type GateUndoFrame = {
  readonly phase: 'test' | 'quiz';
  readonly builder: ShellCode[];
  readonly quizChoices: (boolean | null)[];
};

export type GateCrabState = {
  version: 1;
  level: number;
  together: boolean;
  /** Four certified puzzles for solo play, or maker-selected puzzles in Together mode. */
  puzzles: GateTuple[];
  index: number;
  /** Active builder row slots (len 2 on Level 1, len 3 on Levels 2-5). */
  builder: ShellCode[];
  /** Tested evidence rows beyond the 4 starters (starters come from puzzle.starters). */
  tests: number[];
  /** Extra counterexample rows revealed by wrong quiz checks. */
  revealed: number[];
  /** Active 5 quiz rows (starts as puzzle.quiz; missed rows swap to deterministic backups). */
  quizRows: number[];
  /** Current quiz answers (null = unsorted, true = pass, false = block). */
  quizChoices: (boolean | null)[];
  phase: 'test' | 'quiz';
  checks: number;
  misses: number;
  counterexample: CounterexampleInfo | null;
  undo: GateUndoFrame[];
  won: boolean;
  helped: boolean;
  /** Optional row reading toggle (accessible spoken/captioned row descriptions). */
  readRows: boolean;
  /** Together Rule-Maker co-play state: which player makes the rule and privacy handover stage. */
  maker: 0 | 1;
  stage: TogetherStage;
  /** Finished gates: [testsCount, helped]. */
  done: [number, boolean][];
};

const levelSets = sets.levels as unknown as Record<string, string[]>;
export const levelToRung = (level: number): Rung => (['a', 'b', 'c', 'd', 'e'] as const)[Math.max(0, Math.min(4, level - 1))];

export const rowPuzzle = (row: string): GatePuzzle => {
  const parsed = tuplePuzzle(JSON.parse(row)[3]);
  if (!parsed) throw new Error('A certified Gate Crab row failed to decode.');
  return parsed;
};

export const setFor = (level: number): string[] => levelSets[String(level)] ?? [];
export const puzzleAt = (s: Pick<GateCrabState, 'puzzles' | 'index'>): GatePuzzle | null =>
  s.puzzles[s.index] ? tuplePuzzle(s.puzzles[s.index]) : null;

const keyOfTuple = (t: GateTuple) => JSON.stringify(t);
const toTuple = (row: string) => puzzleTuple(rowPuzzle(row));

const isGateTuple = (t: unknown): t is GateTuple =>
  Array.isArray(t) && t.length === 6 && tuplePuzzle(t) !== null;

function pickTuples(rows: readonly string[], rng: () => number, avoid: ReadonlySet<string>, count: number): GateTuple[] {
  const all = rows.map(toTuple);
  const fresh = all.filter(t => !avoid.has(keyOfTuple(t)));
  const pool = fresh.length >= count ? fresh : all;
  const copy = pool.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

const defaultBuilder = (len: 2 | 3): ShellCode[] => (len === 2 ? [0, 4] : [0, 4, 2]);

export function evidenceOf(s: Pick<GateCrabState, 'puzzles' | 'index' | 'tests' | 'revealed'>): EvidenceEntry[] {
  const p = puzzleAt(s);
  if (!p) return [];
  const rule = RULE_BY_ID.get(p.ruleId);
  if (!rule) return [];
  const out = starterEvidence(p);
  const seen = new Set(out.map(e => e.row));
  for (const r of [...s.tests, ...s.revealed]) {
    if (!seen.has(r)) {
      seen.add(r);
      out.push({ row: r, pass: evaluateRow(rule, p.len, r) });
    }
  }
  return out;
}

export function startRound(level: number, rng: () => number, together = false, starter: 0 | 1 = 0, previous?: GateCrabState): GateCrabState {
  const avoid = new Set((previous?.puzzles ?? []).map(keyOfTuple));
  const puzzles = pickTuples(setFor(level), rng, avoid, ROUND);
  if (puzzles.length !== ROUND) throw new Error('Gate Crab has no certified puzzles for that level.');
  const first = tuplePuzzle(puzzles[0])!;
  return {
    version: 1,
    level,
    together,
    puzzles,
    index: 0,
    builder: defaultBuilder(first.len),
    tests: [],
    revealed: [],
    quizRows: [...first.quiz],
    quizChoices: [null, null, null, null, null],
    phase: 'test',
    checks: 0,
    misses: 0,
    counterexample: null,
    undo: [],
    won: false,
    helped: false,
    readRows: previous?.readRows ?? false,
    maker: starter,
    stage: together ? 'cover-maker' : 'play',
    done: [],
  };
}

const pushUndo = (s: GateCrabState): GateUndoFrame[] => [
  ...s.undo.slice(-(UNDO_LIMIT - 1)),
  { phase: s.phase, builder: [...s.builder], quizChoices: [...s.quizChoices] },
];

export function setBuilderSlot(s: GateCrabState, slot: number, shell: ShellCode): GateCrabState {
  const p = puzzleAt(s);
  if (!p || s.won || s.stage !== 'play' || slot < 0 || slot >= p.len || !isShellCode(shell) || s.builder[slot] === shell) return s;
  const builder = s.builder.map((v, i) => (i === slot ? shell : v));
  return { ...s, builder, undo: pushUndo(s) };
}

export function cycleBuilderSlot(s: GateCrabState, slot: number): GateCrabState {
  const p = puzzleAt(s);
  if (!p || s.won || s.stage !== 'play' || slot < 0 || slot >= p.len) return s;
  const next = ((s.builder[slot] + 1) % 6) as ShellCode;
  return setBuilderSlot(s, slot, next);
}

export function loadRowIntoBuilder(s: GateCrabState, rowIdx: number): GateCrabState {
  const p = puzzleAt(s);
  if (!p || s.won || s.stage !== 'play' || !isRowIndex(p.len, rowIdx)) return s;
  const next = rowCodes(p.len, rowIdx);
  if (next.every((v, i) => v === s.builder[i])) return s;
  return { ...s, builder: next, undo: pushUndo(s) };
}

/** Tests the current builder row (or an explicit row from Help). Duplicate tests are safe no-ops. */
export function submitTestRow(s: GateCrabState, explicitRow?: number): { state: GateCrabState; duplicate: boolean; pass: boolean } {
  const p = puzzleAt(s);
  if (!p || s.won || s.stage !== 'play') return { state: s, duplicate: false, pass: false };
  const rule = RULE_BY_ID.get(p.ruleId)!;
  const row = explicitRow ?? codesToRow(s.builder);
  if (!isRowIndex(p.len, row)) return { state: s, duplicate: false, pass: false };
  const ev = evidenceOf(s);
  const existing = ev.find(e => e.row === row);
  if (existing) return { state: s, duplicate: true, pass: existing.pass };
  if (s.tests.length >= TEST_LIMIT) return { state: s, duplicate: false, pass: evaluateRow(rule, p.len, row) };
  const pass = evaluateRow(rule, p.len, row);
  return {
    state: {
      ...s,
      phase: 'test',
      builder: rowCodes(p.len, row),
      tests: [...s.tests, row],
      counterexample: null,
    },
    duplicate: false,
    pass,
  };
}

export function setPhase(s: GateCrabState, phase: 'test' | 'quiz'): GateCrabState {
  if (s.won || s.stage !== 'play' || s.phase === phase) return s;
  return { ...s, phase, undo: pushUndo(s) };
}

export function setQuizChoice(s: GateCrabState, slot: number, pass: boolean): GateCrabState {
  if (s.won || s.stage !== 'play' || slot < 0 || slot >= 5 || s.quizChoices[slot] === pass) return s;
  const quizChoices = s.quizChoices.map((v, i) => (i === slot ? pass : v));
  return { ...s, phase: 'quiz', quizChoices, undo: pushUndo(s) };
}

export const canCheckQuiz = (s: GateCrabState): boolean =>
  !s.won && s.stage === 'play' && s.quizChoices.every(v => v !== null);

/**
 * Checks all 5 sorted quiz rows at once.
 * - All 5 match: wins this gate and reveals the secret rule.
 * - Any miss: reveals the first missed quiz row as a gentle counterexample compared against the
 *   closest contrasting tested row, adds it to evidence, replaces that quiz slot with a fresh
 *   unseen backup row, clears quiz choices, and returns to testing!
 */
export function checkQuiz(s: GateCrabState): { state: GateCrabState; correct: boolean } {
  const p = puzzleAt(s);
  if (!p || !canCheckQuiz(s)) return { state: s, correct: false };
  const rule = RULE_BY_ID.get(p.ruleId)!;
  const wrongIdx = s.quizRows.findIndex((row, i) => s.quizChoices[i] !== evaluateRow(rule, p.len, row));
  if (wrongIdx < 0) {
    return {
      state: {
        ...s,
        checks: s.checks + 1,
        won: true,
        counterexample: null,
        stage: s.together ? 'revealed' : 'play',
      },
      correct: true,
    };
  }
  const missedRow = s.quizRows[wrongIdx];
  const actualPass = evaluateRow(rule, p.len, missedRow);
  const evBefore = evidenceOf(s);
  const contrast = closestContrastingEvidence(p.len, missedRow, actualPass, evBefore);
  const revealed = s.revealed.includes(missedRow) ? s.revealed : [...s.revealed, missedRow];
  const used = new Set<number>([...p.starters, ...s.tests, ...revealed, ...s.quizRows]);
  const replacement = nextQuizReplacement(p, used, actualPass);
  const nextQuizRows = replacement !== null
    ? s.quizRows.map((r, i) => (i === wrongIdx ? replacement : r))
    : s.quizRows;
  const note = contrast
    ? `This row (${rowWords(p.len, missedRow)}) ${actualPass ? 'PASSES' : 'BLOCKS'}! ${compareRowsText(p.len, missedRow, contrast.row)}`
    : `This row (${rowWords(p.len, missedRow)}) ${actualPass ? 'PASSES' : 'BLOCKS'}! It joined your clues.`;
  return {
    state: {
      ...s,
      phase: 'test',
      checks: s.checks + 1,
      misses: s.misses + 1,
      revealed,
      quizRows: nextQuizRows,
      quizChoices: [null, null, null, null, null],
      undo: [],
      counterexample: {
        row: missedRow,
        actualPass,
        contrastRow: contrast?.row ?? null,
        contrastPass: contrast?.pass ?? null,
        note,
      },
    },
    correct: false,
  };
}

export function undoStep(s: GateCrabState): GateCrabState {
  if (s.won || s.stage !== 'play' || !s.undo.length) return s;
  const prev = s.undo[s.undo.length - 1];
  return {
    ...s,
    phase: prev.phase,
    builder: [...prev.builder],
    quizChoices: [...prev.quizChoices],
    undo: s.undo.slice(0, -1),
  };
}

export function resetQuiz(s: GateCrabState): GateCrabState {
  if (s.won || s.stage !== 'play' || s.quizChoices.every(v => v === null)) return s;
  return { ...s, quizChoices: [null, null, null, null, null], undo: pushUndo(s) };
}

export const toggleReadRows = (s: GateCrabState): GateCrabState => ({ ...s, readRows: !s.readRows });
export const markHelped = (s: GateCrabState): GateCrabState => (s.helped || s.together ? s : { ...s, helped: true });

// ---------- Together Rule-Maker co-play transitions ----------

/** Maker opens the picture rule menu from the handover cover. */
export const openRulePicker = (s: GateCrabState): GateCrabState =>
  s.together && s.stage === 'cover-maker' ? { ...s, stage: 'pick-rule' } : s;

/** Maker picks a secret rule for the current gate; builds fresh balanced starters & quiz for it. */
export function pickSecretRule(s: GateCrabState, ruleId: string, seed = 42): GateCrabState {
  if (!s.together || s.stage !== 'pick-rule') return s;
  const rung = levelToRung(s.level);
  const rule = RULE_BY_ID.get(ruleId);
  if (!rule || rule.rung !== rung) return s;
  const rng = createRng((seed ^ (s.index * 7919) ^ (ruleId.length * 131)) >>> 0);
  const built = constructPuzzle(rule, rng);
  if (!built) return s;
  const tuple = puzzleTuple(built);
  const puzzles = s.puzzles.map((t, i) => (i === s.index ? tuple : t));
  return {
    ...s,
    puzzles,
    builder: defaultBuilder(built.len),
    tests: [],
    revealed: [],
    quizRows: [...built.quiz],
    quizChoices: [null, null, null, null, null],
    phase: 'test',
    checks: 0,
    misses: 0,
    counterexample: null,
    undo: [],
    won: false,
  };
}

/** Maker locks the secret rule and immediately engages the handover privacy cover for the Guesser. */
export const lockSecretRule = (s: GateCrabState): GateCrabState =>
  s.together && s.stage === 'pick-rule' ? { ...s, stage: 'cover-guesser' } : s;

/** Guesser dismisses the handover cover and begins testing the gate. */
export const startGuessing = (s: GateCrabState): GateCrabState =>
  s.together && s.stage === 'cover-guesser' ? { ...s, stage: 'play' } : s;

/** Rule choices available to the Maker in picture form for a School level. */
export const makerRuleOptions = (level: number) => RULES_BY_RUNG[levelToRung(level)];

const freshGate = (s: GateCrabState, puzzles: GateTuple[], index: number, swapMaker: boolean): GateCrabState => {
  const nextP = puzzles[index] ? tuplePuzzle(puzzles[index]) : null;
  const maker: 0 | 1 = swapMaker ? (s.maker === 0 ? 1 : 0) : s.maker;
  return {
    ...s,
    puzzles,
    index,
    builder: nextP ? defaultBuilder(nextP.len) : [],
    tests: [],
    revealed: [],
    quizRows: nextP ? [...nextP.quiz] : [],
    quizChoices: [null, null, null, null, null],
    phase: 'test',
    checks: 0,
    misses: 0,
    counterexample: null,
    undo: [],
    won: false,
    helped: false,
    maker,
    stage: s.together ? 'cover-maker' : 'play',
  };
};

export function dealFresh(s: GateCrabState, rng: () => number): GateCrabState {
  if (!puzzleAt(s)) return s;
  const avoid = new Set(s.puzzles.map(keyOfTuple));
  const [next] = pickTuples(setFor(s.level), rng, avoid, 1);
  if (!next) return s;
  const puzzles = s.puzzles.map((t, i) => (i === s.index ? next : t));
  return freshGate(s, puzzles, s.index, false);
}

export function nextGate(s: GateCrabState): GateCrabState {
  if (!puzzleAt(s) || !s.won) return s;
  return {
    ...freshGate(s, s.puzzles, s.index + 1, s.together),
    done: [...s.done, [s.tests.length, s.helped]],
  };
}

// ---------- Strict non-mutating save validator ----------
const nat = (v: unknown, max = 4096): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
const certifiedByLevel = new Map<number, Set<string>>();
const certifiedAt = (level: number) => {
  let set = certifiedByLevel.get(level);
  if (!set) {
    set = new Set(setFor(level).map(r => keyOfTuple(toTuple(r))));
    certifiedByLevel.set(level, set);
  }
  return set;
};
const validStages = new Set<TogetherStage>(['cover-maker', 'pick-rule', 'cover-guesser', 'play', 'revealed']);

export function validGateCrab(v: unknown, level?: number): v is GateCrabState {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const s = v as GateCrabState;
  if (s.version !== 1 || !nat(s.level, 5) || s.level < 1 || (level !== undefined && s.level !== level)) return false;
  if (typeof s.together !== 'boolean' || typeof s.won !== 'boolean' || typeof s.helped !== 'boolean' || typeof s.readRows !== 'boolean') return false;
  if (s.maker !== 0 && s.maker !== 1) return false;
  if (!validStages.has(s.stage)) return false;
  if (!s.together && s.stage !== 'play') return false;
  if (s.stage === 'revealed' && !s.won) return false;
  if (s.won && s.together && s.stage !== 'revealed') return false;
  if (!Array.isArray(s.puzzles) || s.puzzles.length !== ROUND || !nat(s.index, ROUND)) return false;
  if (!nat(s.checks) || !nat(s.misses) || s.misses > s.checks) return false;
  if (s.phase !== 'test' && s.phase !== 'quiz') return false;
  if (!Array.isArray(s.undo) || s.undo.length > UNDO_LIMIT) return false;
  if (!Array.isArray(s.done) || s.done.length !== s.index) return false;
  if (!s.done.every(d => Array.isArray(d) && d.length === 2 && nat(d[0], TEST_LIMIT) && typeof d[1] === 'boolean')) return false;

  const rung = levelToRung(s.level);
  const cert = certifiedAt(s.level);
  const decoded: GatePuzzle[] = [];
  for (const t of s.puzzles) {
    if (!isGateTuple(t)) return false;
    const parsed = tuplePuzzle(t);
    if (!parsed || parsed.rung !== rung || !validPuzzle(parsed)) return false;
    // Solo rounds must use certified rows; Together Rule-Maker may use any valid constructed puzzle of that level's rung.
    if (!s.together && !cert.has(keyOfTuple(t))) return false;
    decoded.push(parsed);
  }

  if (s.index === ROUND) {
    return Array.isArray(s.builder) && s.builder.length === 0 && Array.isArray(s.tests) && s.tests.length === 0
      && Array.isArray(s.revealed) && s.revealed.length === 0 && Array.isArray(s.quizRows) && s.quizRows.length === 0
      && Array.isArray(s.quizChoices) && s.quizChoices.length === 5 && s.quizChoices.every(c => c === null)
      && !s.won && !s.helped && !s.checks && !s.misses && s.counterexample === null && s.undo.length === 0;
  }

  const p = decoded[s.index];
  if (!p) return false;
  const len = rungLength(rung);
  if (!Array.isArray(s.builder) || s.builder.length !== len || !s.builder.every(isShellCode)) return false;
  if (!Array.isArray(s.tests) || s.tests.length > TEST_LIMIT || !s.tests.every(r => isRowIndex(len, r)) || new Set(s.tests).size !== s.tests.length) return false;
  if (!Array.isArray(s.revealed) || s.revealed.length > TEST_LIMIT || !s.revealed.every(r => isRowIndex(len, r)) || new Set(s.revealed).size !== s.revealed.length) return false;
  if (!Array.isArray(s.quizRows) || s.quizRows.length !== 5 || !s.quizRows.every(r => isRowIndex(len, r)) || new Set(s.quizRows).size !== 5) return false;
  if (!Array.isArray(s.quizChoices) || s.quizChoices.length !== 5 || !s.quizChoices.every(c => c === null || typeof c === 'boolean')) return false;
  if (s.counterexample !== null) {
    const ce = s.counterexample;
    if (typeof ce !== 'object' || !isRowIndex(len, ce.row) || typeof ce.actualPass !== 'boolean' || typeof ce.note !== 'string') return false;
    if (ce.contrastRow !== null && !isRowIndex(len, ce.contrastRow)) return false;
    if (ce.contrastPass !== null && typeof ce.contrastPass !== 'boolean') return false;
  }
  for (const f of s.undo) {
    if (!f || typeof f !== 'object' || (f.phase !== 'test' && f.phase !== 'quiz')) return false;
    if (!Array.isArray(f.builder) || f.builder.length !== len || !f.builder.every(isShellCode)) return false;
    if (!Array.isArray(f.quizChoices) || f.quizChoices.length !== 5 || !f.quizChoices.every(c => c === null || typeof c === 'boolean')) return false;
  }
  if (s.won) {
    const rule = RULE_BY_ID.get(p.ruleId)!;
    if (!s.quizRows.every((r, i) => s.quizChoices[i] === evaluateRow(rule, len, r))) return false;
  }
  return true;
}

export const levelInfo = [
  { name: 'One clue', description: 'Two shells at the gate. Spot one shell colour or size.' },
  { name: 'Counting', description: 'Three shells. Count how many of a colour or size appear.' },
  { name: 'Where it sits', description: 'First, middle, last, or the ends of the row.' },
  { name: 'How they relate', description: 'Compare shells to each other: same, different, or neighbours.' },
  { name: 'And, or, unless', description: 'Two clues combined with AND, OR, or UNLESS.' },
] as const;

export const engine: Omit<LearnEngine<GateCrabState>, 'id'> & { id: 'gate-crab' } = {
  id: 'gate-crab',
  name: 'Gate Crab',
  island: 'thinking',
  tagline: 'Test shell rows to discover the crab’s secret rule.',
  description: 'Build rows of shells to see which pass the gate, then sort five new rows to prove you found the secret rule.',
  help: 'Build a row of shells and tap Test at gate. Passing rows open the gate; blocking rows stay shut. When you think you know the secret rule, tap Take the quiz and sort five new rows. A wrong guess becomes a new clue!',
  helpAudio: 'gate-help',
  introAudio: 'gate-intro',
  color: '#D65B43',
  surface: '#FCEAE2',
  modes: ['solo', 'together'],
  modeLabels: { solo: 'On my own', together: 'Together: rule maker' },
  ages: [4, 14],
  ownLevels: true,
  levelNames: levelInfo,
  skills: { 'think.rule-discovery': 'Discovering hidden rules' },
  create: (options: LearnOptions, ctx) => startRound(levelOf(options), ctx.rng, options.mode === 'together', ctx.starter ?? 0, ctx.previous),
  validate: (state: unknown, options: LearnOptions): state is GateCrabState => validGateCrab(state, levelOf(options)),
  outcome: (s: GateCrabState): Outcome => (s.index >= ROUND ? 'done' : null),
  helpedWork: (s: GateCrabState, options: LearnOptions) => options.mode !== 'together' && (s.helped || s.done.some(d => d[1])),
};
