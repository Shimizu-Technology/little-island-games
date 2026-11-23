import type { ReplayEngine, ReplayPayload } from "../../../challenge/types";
import {
  gapAction,
  isSolvedPattern,
  patternPathAdapter,
  ruleAction,
  type PatternPackAction,
  type PatternPackPayload,
} from "../../../puzzles/adapters/pattern-path";
import { sha256Hex } from "../../../puzzles/sha256";
import { uint } from "../../../state/saveBits";
import { RULE_BY_ID, patternHint, type PatternPuzzle } from "./rules";

export type PatternChallengeDescriptor = {
  payload: PatternPackPayload;
  title: string;
  ruleHint?: string;
  thinkHint?: string;
};

/**
 * Compact replay actions for Pattern Path Challenge:
 * - 0..63: fill gap slot `Math.floor(a / 16)` with choice `a % 16`
 * - 64..79: choose rule card `a - 64`
 * - 80: Check (whole-answer submission)
 * - 81: Undo last draft edit
 * - 82: Reset draft
 * - 83: Help step (Look -> Think -> One step -> Show me)
 * - 84..163: Hinted edit (`HINTED + adapterAction`, records help)
 */
export const CHECK = 80;
export const UNDO = 81;
export const RESET = 82;
export const HELP = 83;
export const HINTED = 84;
export const MAX_ACTION = HINTED + 79;

export type Action = number;
export type Initial = 0;
export type Payload = ReplayPayload<Initial, Action>;

export type State = {
  descriptor: PatternChallengeDescriptor;
  picks: number[];
  rulePick: number;
  stack: { picks: number[]; rulePick: number }[];
  /** 0 = none, 1 = Look (rule family), 2 = Think (rule + apply), 3 = One step / Show me */
  hintStage: number;
  checks: number;
  misses: number;
  /** Number of items wrong on the last failed Check (never reveals WHICH one). */
  lastWrongCount: number | null;
  checked: boolean;
  won: boolean;
  edits: number;
};

export const hinted = (adapterAction: PatternPackAction): Action => HINTED + adapterAction;
export const isHelpAction = (a: Action): boolean => a === HELP || a >= HINTED;

export const ASSIST_ACTIONS = 12;
export const ASSIST_BYTES = 480;

export const isAction = (v: unknown): v is Action => uint(v, MAX_ACTION);

export function puzzleFromDescriptor(d: PatternChallengeDescriptor): PatternPuzzle {
  const p = d.payload;
  const rule = RULE_BY_ID[p.ruleId];
  return {
    ruleId: p.ruleId,
    tiles: p.tiles,
    gaps: p.gaps,
    choices: p.choices,
    ...(p.ruleChoices ? { ruleChoices: p.ruleChoices } : {}),
    grid: p.tiles.length === 9,
    title: d.title,
    ruleHint: d.ruleHint ?? rule.lookCue,
    thinkHint: d.thinkHint ?? `Follow the rule (${rule.card}) from the stones already shown.`,
  };
}

export function completeDraft(s: State): boolean {
  const p = s.descriptor.payload;
  if (p.ruleChoices && s.rulePick < 0) return false;
  return s.picks.every((v) => v >= 0);
}

export function wrongCountOf(s: State): number {
  const p = s.descriptor.payload;
  let wrong = 0;
  if (p.ruleChoices && (s.rulePick < 0 || p.ruleChoices[s.rulePick] !== p.ruleId)) wrong++;
  for (let i = 0; i < p.gaps.length; i++) {
    const pick = s.picks[i];
    if (pick < 0 || p.choices[pick] !== p.tiles[p.gaps[i]]) wrong++;
  }
  return wrong;
}

/** Shared pure hint engine for Pattern Path Challenge. */
export function challengeHint(s: State): { text: string; nextAction: PatternPackAction | null } {
  const puzzle = puzzleFromDescriptor(s.descriptor);
  const p = s.descriptor.payload;
  const next = patternPathAdapter.hint?.({ picks: s.picks, rulePick: s.rulePick }, {
    format: 1, seed: 0, rng: 1, band: "a", layout: "", template: "", payload: p,
    objectives: [], limits: [], par: null, teaches: [], speech: null,
  }) ?? null;

  if (s.hintStage <= 1) {
    // Step 1 (Look): rule family cue — never names the answer stone!
    return { text: p.ruleChoices ? RULE_BY_ID[p.ruleId].lookCue : patternHint(puzzle, 1), nextAction: next };
  }
  if (s.hintStage === 2) {
    // Step 2 (Think): apply the rule — still does not name the answer stone!
    return { text: patternHint(puzzle, 2), nextAction: next };
  }
  // Step 3+: reveal next step or answer
  return { text: patternHint(puzzle, 3), nextAction: next };
}

export const challengeEngine: ReplayEngine<PatternChallengeDescriptor, Initial, Action, State> = {
  initial: () => 0,
  validInitial: (v): v is Initial => v === 0,
  create: (d) => ({
    descriptor: d,
    picks: Array<number>(d.payload.gaps.length).fill(-1),
    rulePick: -1,
    stack: [],
    hintStage: 0,
    checks: 0,
    misses: 0,
    lastWrongCount: null,
    checked: false,
    won: false,
    edits: 0,
  }),
  validAction: isAction,
  step: (s, a, d) => {
    if (s.won) return null;
    const p = d.payload;

    if (a === HELP) {
      if (s.hintStage >= 3) return null;
      return {
        state: { ...s, hintStage: s.hintStage + 1 },
        event: "help",
      };
    }

    if (a === UNDO) {
      if (!s.stack.length) return null;
      const prev = s.stack[s.stack.length - 1];
      return {
        state: {
          ...s,
          picks: prev.picks,
          rulePick: prev.rulePick,
          stack: s.stack.slice(0, -1),
          checked: false,
          lastWrongCount: null,
        },
        event: "edit",
      };
    }

    if (a === RESET) {
      if (s.picks.every((v) => v < 0) && s.rulePick < 0) return null;
      return {
        state: {
          ...s,
          picks: Array<number>(p.gaps.length).fill(-1),
          rulePick: -1,
          stack: [...s.stack.slice(-31), { picks: [...s.picks], rulePick: s.rulePick }],
          checked: false,
          lastWrongCount: null,
        },
        event: "reset",
      };
    }

    if (a === CHECK) {
      if (!completeDraft(s) || s.checked) return null;
      const ok = isSolvedPattern({ picks: s.picks, rulePick: s.rulePick }, p);
      const wrong = ok ? 0 : wrongCountOf(s);
      return {
        state: {
          ...s,
          checks: s.checks + 1,
          misses: s.misses + (ok ? 0 : 1),
          lastWrongCount: ok ? null : wrong,
          checked: !ok,
          won: ok,
        },
        event: "check",
        correct: ok,
      };
    }

    const isHinted = a >= HINTED;
    const raw = isHinted ? a - HINTED : a;
    if (raw >= 64) {
      const rIdx = raw - 64;
      if (!p.ruleChoices || rIdx >= p.ruleChoices.length || s.rulePick === rIdx) return null;
      return {
        state: {
          ...s,
          rulePick: rIdx,
          stack: [...s.stack.slice(-31), { picks: [...s.picks], rulePick: s.rulePick }],
          checked: false,
          lastWrongCount: null,
          edits: s.edits + 1,
        },
        event: isHinted ? "help" : "edit",
      };
    }

    const slot = Math.floor(raw / 16);
    const choiceIdx = raw % 16;
    if (slot >= p.gaps.length || choiceIdx >= p.choices.length || s.picks[slot] === choiceIdx) return null;
    const picks = [...s.picks];
    picks[slot] = choiceIdx;
    return {
      state: {
        ...s,
        picks,
        stack: [...s.stack.slice(-31), { picks: [...s.picks], rulePick: s.rulePick }],
        checked: false,
        lastWrongCount: null,
        edits: s.edits + 1,
      },
      event: isHinted ? "help" : "edit",
    };
  },
  inspect: (s, d) => {
    const p = d.payload;
    const solution = s.won
      ? sha256Hex(`pattern-path|${p.ruleId}|${p.gaps.map((g) => p.tiles[g]).join(",")}|${p.ruleChoices ? p.ruleId : ""}`)
      : null;
    return {
      solved: s.won,
      metrics: { steps: s.edits },
      edits: s.edits,
      solution,
      objectives: [],
    };
  },
};

export { gapAction, ruleAction };
