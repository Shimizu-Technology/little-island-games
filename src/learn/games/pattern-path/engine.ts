import { levelOf } from "../../levelOptions";
import type { LearnEngine } from "../../types";
import { exactKeys, plain, uint } from "../../../state/saveBits";
import {
  engine as legacyEngine,
  help as legacyHelp,
  place as legacyPlace,
  taskAt as legacyTaskAt,
  type LegacyPatternState,
} from "./legacy";
import { buildRulePuzzle, patternHint, type PatternPuzzle, type RuleId } from "./rules";

export type PatternStateV2 = {
  version: 2;
  level: number;
  seed: number;
  index: number;
  total: 4;
  /** Incremented after a miss on Levels 3–5 to deal a fresh trail variant (prevents brute-force scanning). */
  attempt: number;
  helped: boolean;
  /** 0 = none, 1 = rule clue shown (no answer leak), 2 = full answer shown on second tap. */
  hintLevel: 0 | 1 | 2;
};

export type PatternState = LegacyPatternState | PatternStateV2;

export type PatternTask = {
  title: string;
  tiles: string[];
  missing: number;
  choices: string[];
  answer: string;
  /** Rule-first clue (never leaks the answer stone on v2). */
  hint: string;
  /** Full puzzle metadata on v2 (absent on legacy v1). */
  puzzle?: PatternPuzzle;
};

const LEVEL_RULES: Record<number, readonly RuleId[]> = {
  1: ["color-ab", "color-abb", "color-aab", "color-abc", "color-aabb"],
  2: ["shell-up", "shell-down", "shell-bounce"],
  3: ["num-add", "num-sub", "arrow-cw", "arrow-ccw"],
  4: ["stone-color-size", "stone-color-turn", "stone-size-turn", "grid-color-size", "grid-color-turn"],
  5: ["num-double", "num-square", "num-fib", "num-grow-step", "num-square-plus", "two-double-sub", "grid-add-rc", "grid-row-mul"],
};

const mix = (a: number, b: number) => (Math.imul(a ^ 0x9e3779b9, 1664525) + Math.imul(b + 1, 1013904223)) >>> 0;

function pickRuleFor(level: number, seed: number, index: number, attempt: number): RuleId {
  const pool = LEVEL_RULES[level] ?? LEVEL_RULES[1];
  if (level === 3) {
    // Alternate number rules (odd index) and turn rules (even index) while covering all 4 rules across seeds.
    const numRules: RuleId[] = ["num-add", "num-sub"];
    const turnRules: RuleId[] = ["arrow-cw", "arrow-ccw"];
    const group = index % 2 === 1 ? numRules : turnRules;
    return group[(seed + index + attempt) % group.length];
  }
  if (level === 4) {
    // Tasks 0-2 mix color+size, color+turn, and size+turn; task 3 is a 3x3 stone grid (color+size or color+turn).
    if (index === 3) return (seed + attempt) % 2 === 0 ? "grid-color-size" : "grid-color-turn";
    const trailRules: RuleId[] = ["stone-color-size", "stone-color-turn", "stone-size-turn"];
    return trailRules[(index + seed + attempt) % trailRules.length];
  }
  if (level === 5) {
    // Tasks 0-2 span growth & two-rule number trails; task 3 is a 3x3 number grid (add-rc or row-mul).
    if (index === 3) return (seed + attempt) % 2 === 0 ? "grid-add-rc" : "grid-row-mul";
    const numRules: RuleId[] = ["num-double", "num-square", "num-fib", "num-grow-step", "num-square-plus", "two-double-sub"];
    return numRules[(index * 2 + seed + attempt) % numRules.length];
  }
  return pool[(seed + index + attempt) % pool.length];
}

const taskCache = new Map<string, PatternTask>();

export function taskAt(s: PatternState): PatternTask {
  if (s.version === 1) return legacyTaskAt(s);
  const key = `${s.level}:${s.seed}:${s.index}:${s.attempt}`;
  const hit = taskCache.get(key);
  if (hit) return hit;

  const baseSeed = mix(mix(s.seed, s.index * 9871 + 17), s.attempt * 31337 + s.level * 131);
  const ruleId = pickRuleFor(s.level, s.seed, s.index, s.attempt);

  // Try deterministic seeds until the independent 30-rule uniqueness checker certifies the puzzle.
  let puzzle: PatternPuzzle | null = null;
  for (let tries = 0; tries < 64 && !puzzle; tries++) {
    puzzle = buildRulePuzzle(ruleId, (baseSeed + tries * 7919) >>> 0);
  }
  if (!puzzle) {
    // Guaranteed fallback inside same level rule set
    const fallbackRule = LEVEL_RULES[s.level]?.[0] ?? "color-ab";
    for (let tries = 0; tries < 64 && !puzzle; tries++) {
      puzzle = buildRulePuzzle(fallbackRule, (baseSeed + 9001 + tries * 7919) >>> 0);
    }
  }
  const built = puzzle!;
  const missing = built.gaps[0];
  const task: PatternTask = {
    title: built.title,
    tiles: built.tiles,
    missing,
    choices: built.choices,
    answer: built.tiles[missing],
    hint: patternHint(built, 1),
    puzzle: built,
  };
  taskCache.set(key, task);
  if (taskCache.size > 64) taskCache.delete(taskCache.keys().next().value!);
  return task;
}

/** Pure hint text for the current School state (step 1 = rule clue only, step 2 = answer revealed). */
export function hintText(s: PatternState): string {
  const t = taskAt(s);
  if (s.version === 1) return `${t.hint} The missing stone is ${t.answer}.`;
  if (!t.puzzle) return t.hint;
  return patternHint(t.puzzle, s.hintLevel >= 2 ? 3 : 1);
}

export function place(s: PatternState, tile: string): PatternState {
  if (s.version === 1) return legacyPlace(s, tile);
  if (s.index >= s.total) return s;
  const task = taskAt(s);
  if (tile === task.answer) {
    return { ...s, index: s.index + 1, attempt: 0, hintLevel: 0 };
  }
  // Levels 3–5 deal a fresh trail after a miss so tapping every choice cannot brute-force the round.
  if (s.level >= 3) {
    return { ...s, attempt: Math.min(s.attempt + 1, 999), hintLevel: 0 };
  }
  return s;
}

export function help(s: PatternState): PatternState {
  if (s.version === 1) return legacyHelp(s);
  const nextLevel = s.hintLevel === 0 ? 1 : 2;
  return { ...s, helped: true, hintLevel: nextLevel as 1 | 2 };
}

export const engine: LearnEngine<PatternState> = {
  id: legacyEngine.id,
  name: legacyEngine.name,
  island: legacyEngine.island,
  ages: legacyEngine.ages,
  ownLevels: legacyEngine.ownLevels,
  tagline: legacyEngine.tagline,
  description: legacyEngine.description,
  color: legacyEngine.color,
  surface: legacyEngine.surface,
  modes: legacyEngine.modes,
  skills: legacyEngine.skills,
  levelNames: [
    { name: "Color trail", description: "Fill AB, ABB, AAB, ABC, and AABB color trails." },
    { name: "Growing shells", description: "Follow climbing, shrinking, and bouncing shell trails." },
    { name: "Skip and turn", description: "Count by steps and turn arrows clockwise or back." },
    { name: "Two clues and turn", description: "Follow color, size, and turning pointers together." },
    { name: "Number reef", description: "Solve doubling, squares, growing steps, two-rule trails, and number grids." },
  ],
  help: "Look at the stones along the trail and find the rule. Tap a stone below to fill the gap. Tap Help once to hear the rule, and a second time if you want to see the stone.",
  spokenIntro: "Look along the stone trail and find which stone fills the glowing gap!",
  spokenHelp: "Look at the stones along the trail and find the rule. Tap a stone below to fill the glowing gap. Tap Help once for a rule clue, and a second time if you want to see the missing stone.",
  create: (o, ctx): PatternStateV2 => ({
    version: 2,
    level: levelOf(o),
    seed: Math.floor(ctx.rng() * 0xffffffff) >>> 0,
    index: 0,
    total: 4,
    attempt: 0,
    helped: false,
    hintLevel: 0,
  }),
  validate: (v, o): v is PatternState => {
    if (!plain(v)) return false;
    if (v.version === 1) return legacyEngine.validate(v, o);
    if (!exactKeys(v, ["attempt", "helped", "hintLevel", "index", "level", "seed", "total", "version"])) return false;
    const s = v as PatternStateV2;
    return (
      s.version === 2 &&
      s.level === levelOf(o) &&
      s.total === 4 &&
      uint(s.seed, 0xffffffff) &&
      uint(s.index, 4) &&
      uint(s.attempt, 999) &&
      typeof s.helped === "boolean" &&
      (s.hintLevel === 0 || s.hintLevel === 1 || s.hintLevel === 2)
    );
  },
  outcome: (s) => (s.index === 4 ? "done" : null),
};
