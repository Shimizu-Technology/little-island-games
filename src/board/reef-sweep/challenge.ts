import type { AwardRule, Puzzle, RegisteredDare, ReplayEngine, ReplayPayload } from "../../challenge/types";
import { reefSweepAdapter, type ReefPayload } from "../../puzzles/adapters/reef-sweep";
import { decodeRow } from "../../puzzles/descriptor";
import { sha256Hex } from "../../puzzles/sha256";
import { exactKeys, plain, uint } from "../../state/saveBits";
import { boardFromMines, urchins } from "./redraw";
import {
  coordinate,
  deducePublic,
  exactMinOpenings,
  publicView,
  revealCell,
  solvePublicNoGuess,
  type DeductionTier,
  type PublicStep,
} from "./solver";
import sets from "./sets.generated.json";

/** Reserved slots for p4-reef-sweep: packed banks 464-467, inline Deep Water bank 468, dares 3350-3399. */
export const REEF_DEEP_BANK = 468;
export const REEF_FIRST_DARE = 3350;

export type ReefChallengeDescriptor = {
  size: number;
  start: number;
  mines: number[];
  band: string;
  ceiling: DeductionTier;
  parLower: number;
  parUpper: number;
};

/**
 * Compact replay actions:
 *   ["o", cell]  open a tile
 *   ["f", cell]  toggle a flag
 *   ["u"]        undo last open/flag move (can recover calmly from an urchin)
 *   ["z"]        start again
 *   ["h", stage] public hint ladder stage (0=Look, 1=Think, 2=One step)
 *   ["ho", cell] Show me: apply the exact public deduction step (open or unflag)
 */
export type Action =
  | readonly ["o", number]
  | readonly ["f", number]
  | readonly ["u"]
  | readonly ["z"]
  | readonly ["h", 0 | 1 | 2]
  | readonly ["ho", number];

export type Initial = { version: 1 };
export type Payload = ReplayPayload<Initial, Action>;

export type HistoryEntry = {
  marks: number[];
  outcome: 0 | 1 | null;
  opens: number;
};

export type State = {
  descriptor: ReefChallengeDescriptor;
  marks: number[];
  outcome: 0 | 1 | null;
  opens: number;
  lastHit: number | null;
  history: HistoryEntry[];
  hintStage: 0 | 1 | 2 | null;
  hintStep: PublicStep | null;
};

/** Certified assistance reserve: up to 49 board cells + ladder stages + result overhead. */
export const ASSIST_ACTIONS = 56;
export const ASSIST_BYTES = 768;

export const isAssistAction = (a: Action): boolean => a[0] === "h" || a[0] === "ho";

const validAction = (v: unknown): v is Action => {
  if (!Array.isArray(v)) return false;
  if (v.length === 1) return v[0] === "u" || v[0] === "z";
  if (v.length === 2) {
    if ((v[0] === "o" || v[0] === "f" || v[0] === "ho") && uint(v[1], 48)) return true;
    if (v[0] === "h" && (v[1] === 0 || v[1] === 1 || v[1] === 2)) return true;
  }
  return false;
};

/** Public deduction step for the current Challenge Reef Sweep state. Never reads hidden mines. */
export function challengeHintStep(s: State): PublicStep | null {
  if (s.outcome !== null) return null;
  const { size, start, mines } = s.descriptor;
  if (!s.marks.includes(1)) {
    const coord = coordinate(size, start);
    if (s.marks[start] === 2) {
      return {
        kind: "unflag",
        cell: start,
        tier: "single-cell",
        clues: [],
        reason: {
          look: `Look at the ringed starting space at ${coord}.`,
          think: `Remove the flag on ${coord} so you can open the safe starting space.`,
          oneStep: `Remove the flag at ${coord}, then tap ${coord} to open the reef.`,
        },
      };
    }
    return {
      kind: "open",
      cell: start,
      tier: "single-cell",
      clues: [],
      reason: {
        look: `Look at the ringed starting space at ${coord}.`,
        think: "This certified reef starts at the ringed space and solves with zero guessing.",
        oneStep: `Open ${coord} to begin the reef.`,
      },
    };
  }
  const board = boardFromMines(size, mines);
  const view = publicView(size, mines.length, board, s.marks);
  const res = deducePublic(view);
  return res.status === "deduced" ? res.step : null;
}

export const reefChallengeEngine: ReplayEngine<ReefChallengeDescriptor, Initial, Action, State> = {
  validInitial: (v): v is Initial => plain(v) && exactKeys(v, ["version"]) && v.version === 1,
  initial: () => ({ version: 1 }),
  create: (d) => ({
    descriptor: d,
    marks: Array<number>(d.size * d.size).fill(0),
    outcome: null,
    opens: 0,
    lastHit: null,
    history: [],
    hintStage: null,
    hintStep: null,
  }),
  validAction,
  step: (s, a, d) => {
    const count = d.size * d.size;
    if (s.outcome === 0) return null;

    if (a[0] === "u") {
      if (!s.history.length) return null;
      const prev = s.history[s.history.length - 1];
      return {
        state: {
          ...s,
          marks: [...prev.marks],
          outcome: prev.outcome,
          opens: prev.opens,
          lastHit: null,
          history: s.history.slice(0, -1),
          hintStage: null,
          hintStep: null,
        },
        event: "edit",
      };
    }

    if (a[0] === "z") {
      if (!s.history.length && s.hintStage === null) return null;
      return {
        state: {
          ...s,
          marks: Array<number>(count).fill(0),
          outcome: null,
          opens: 0,
          lastHit: null,
          history: [],
          hintStage: null,
          hintStep: null,
        },
        event: "reset",
      };
    }

    // After hitting an urchin, Undo or Start again calmly recovers before any further open/flag/hint.
    if (s.outcome === 1) return null;

    if (a[0] === "h") {
      const step = challengeHintStep(s);
      if (!step) return null;
      return {
        state: { ...s, hintStage: a[1], hintStep: step },
        event: "help",
      };
    }

    if (a[0] === "ho") {
      const step = challengeHintStep(s);
      if (!step || step.cell !== a[1]) return null;
      const cell = a[1];
      if (cell < 0 || cell >= count) return null;
      const snapshot: HistoryEntry = { marks: [...s.marks], outcome: s.outcome, opens: s.opens };
      if (step.kind === "unflag" || step.kind === "flag") {
        const marks = [...s.marks];
        marks[cell] = step.kind === "unflag" ? 0 : 2;
        return {
          state: {
            ...s,
            marks,
            history: [...s.history, snapshot],
            hintStage: null,
            hintStep: null,
          },
          event: "help",
        };
      }
      const board = boardFromMines(d.size, d.mines);
      const marks = revealCell(board, d.size, s.marks, cell);
      const won = board.every((v, i) => v === -1 || marks[i] === 1);
      return {
        state: {
          ...s,
          marks,
          outcome: won ? 0 : null,
          opens: s.opens + 1,
          lastHit: null,
          history: [...s.history, snapshot],
          hintStage: null,
          hintStep: null,
        },
        event: "help",
      };
    }

    const cell = a[1];
    if (cell < 0 || cell >= count || s.marks[cell] === 1) return null;

    if (a[0] === "f") {
      const snapshot: HistoryEntry = { marks: [...s.marks], outcome: s.outcome, opens: s.opens };
      const marks = [...s.marks];
      marks[cell] = marks[cell] === 2 ? 0 : 2;
      return {
        state: {
          ...s,
          marks,
          history: [...s.history, snapshot],
          hintStage: null,
          hintStep: null,
        },
        event: "edit",
      };
    }

    // Open action ["o", cell]
    if (s.marks[cell] === 2) return null;
    if (!s.marks.includes(1) && cell !== d.start) return null;
    const board = boardFromMines(d.size, d.mines);
    const snapshot: HistoryEntry = { marks: [...s.marks], outcome: s.outcome, opens: s.opens };
    const marks = revealCell(board, d.size, s.marks, cell);
    const hitMine = board[cell] === -1;
    const won = !hitMine && board.every((v, i) => v === -1 || marks[i] === 1);
    const nextState: State = {
      ...s,
      marks,
      outcome: hitMine ? 1 : won ? 0 : null,
      opens: s.opens + 1,
      lastHit: hitMine ? cell : null,
      history: [...s.history, snapshot],
      hintStage: null,
      hintStep: null,
    };
    if (hitMine) return { state: nextState, event: "check", correct: false };
    return won ? { state: nextState, event: "check", correct: true } : { state: nextState, event: "edit" };
  },
  inspect: (s, d) => {
    const solved = s.outcome === 0;
    return {
      solved,
      metrics: { steps: s.opens },
      edits: s.history.length,
      solution: solved ? sha256Hex(`reef|${d.size}|${d.start}|${d.mines.join(",")}`) : null,
      objectives: [],
    };
  },
};

export const bandMeta: Record<string, { tier: 1 | 2 | 3 | 4; title: string; ceiling: DeductionTier; detail: string }> = {
  "single-5": {
    tier: 1,
    title: "5×5 · Single-clue reefs",
    ceiling: "single-cell",
    detail: "5×5 with 3 urchins · every step follows from one visible number",
  },
  "single-6": {
    tier: 2,
    title: "6×6 · Single-clue chains",
    ceiling: "single-cell",
    detail: "6×6 with 5 urchins · longer chains of single-number clues",
  },
  "subset-7": {
    tier: 3,
    title: "7×7 · Overlap & difference",
    ceiling: "subset",
    detail: "7×7 with 8 urchins · compare touching numbers to rule out urchins",
  },
  "coupled-7": {
    tier: 4,
    title: "7×7 · Coupled & urchin count",
    ceiling: "coupled",
    detail: "7×7 with 8 urchins · link clues together and count remaining urchins",
  },
};

export function descriptorFromPayload(payload: ReefPayload, band: string): ReefChallengeDescriptor {
  const board = boardFromMines(payload.size, payload.mines);
  const solved = solvePublicNoGuess(board, payload.size, payload.start);
  const meta = bandMeta[band] ?? bandMeta["single-5"];
  const lower = exactMinOpenings(board, payload.size);
  const upper = solved.status === "solved" ? solved.opens.length : payload.size * payload.size - urchins(payload.size);
  return {
    size: payload.size,
    start: payload.start,
    mines: [...payload.mines],
    band,
    ceiling: solved.status === "solved" ? solved.ceiling : meta.ceiling,
    parLower: lower,
    parUpper: Math.max(lower, upper),
  };
}

export const awardsFor = (d: ReefChallengeDescriptor): readonly [AwardRule, AwardRule] => [
  { rule: { kind: "clean" }, help: "independent" },
  { rule: { kind: "par", metric: "steps", max: d.parUpper }, help: "independent" },
];

const deepNames = [
  "Shallow Cove",
  "Coral Step",
  "Tide Ring",
  "Shell Line",
  "Lagoon Chain",
  "Sandbar",
  "Twin Clues",
  "Shared Edge",
  "Reef Difference",
  "Last Urchin",
  "Linked Frontier",
  "Deep Count",
];

let dareCursor = REEF_FIRST_DARE;
let puzzleIndex = 0;

export const reefDeepPuzzles: readonly Puzzle<ReefChallengeDescriptor>[] = sets.deep.flatMap((group) =>
  group.rows.map((row) => {
    const idx = puzzleIndex++;
    const decoded = decodeRow<ReefPayload>(row, group.band, reefSweepAdapter);
    if (!decoded) throw new Error(`Invalid certified Reef Sweep Deep Water row in band ${group.band}.`);
    const d = descriptorFromPayload(decoded.payload, group.band);
    const meta = bandMeta[group.band];
    const cleanSlot = dareCursor++;
    const parSlot = dareCursor++;
    const dares: RegisteredDare[] = [
      {
        slot: cleanSlot,
        id: `reef-${idx + 1}-clean`,
        label: "No help and no urchin hits",
        rule: { kind: "clean" },
        help: "independent",
      },
      {
        slot: parSlot,
        id: `reef-${idx + 1}-par`,
        label: `Clear in ${d.parUpper} openings or fewer`,
        rule: { kind: "par", metric: "steps", max: d.parUpper },
        help: "independent",
      },
    ];
    return {
      ref: { bank: REEF_DEEP_BANK, puzzle: idx, engine: "reef-sweep", rules: 1, hash: sha256Hex(row) },
      source: { kind: "deep-water", collection: REEF_DEEP_BANK, puzzle: idx },
      path: "deep-water",
      tier: meta.tier,
      title: `${deepNames[idx] ?? `Reef ${idx + 1}`} · ${meta.title}`,
      descriptor: d,
      dares,
      awards: awardsFor(d),
      par: { metric: "steps", lower: d.parLower, upper: d.parUpper },
    };
  })
);

export const reefPackedBanks = (
  sets.packed as unknown as readonly [number, number, number, string, number, string][]
).map(([slot, first, count, packHash, rules, band]) => ({
  slot,
  first,
  count,
  packHash,
  rules,
  band,
  path: "endless" as const,
  tier: bandMeta[band].tier,
  title: bandMeta[band].title,
}));
