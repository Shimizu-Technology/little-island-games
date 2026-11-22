import type { AwardRule, Puzzle, RegisteredDare } from "../../../challenge/types";
import { encodePatternTuple, type PatternPackPayload } from "../../../puzzles/adapters/pattern-path";
import { sha256Hex } from "../../../puzzles/sha256";
import type { PatternChallengeDescriptor } from "./challenge-engine";
import {
  buildNumberChoices,
  buildRulePuzzle,
  checkUniqueCatalogRule,
  stone,
  type RuleId,
} from "./rules";

/**
 * Pattern Path inline Challenge banks (inside T2's reserved 280–297 / dares 900–999):
 * - Bank 286: Deep Water (16 handcrafted & verified puzzles across 4 ideas: Two gaps, Two rules, Growing steps, Pattern grids)
 * - Bank 287: School Dares (16 authored puzzles across L2–L5: L2 First try, L3–L4 Say the rule, L5 No help)
 * - Dares 900–915: School Dares (bank 287)
 * - Dares 916–931: Deep Water Dares (bank 286)
 */
export const DEEP_BANK = 286;
export const SCHOOL_DARE_BANK = 287;
export const FIRST_SCHOOL_DARE = 900;
export const FIRST_DEEP_DARE = 916;

const cleanAward: AwardRule = { rule: { kind: "clean" }, help: "independent" };
const wholeAward: AwardRule = { rule: { kind: "whole" }, help: "independent" };

function verifyHandcrafted(
  ruleId: RuleId,
  tiles: string[],
  gaps: number[],
  choices: string[],
  ruleChoices?: RuleId[],
): PatternPackPayload {
  const verdict = checkUniqueCatalogRule(tiles, gaps);
  if (!verdict.unique || verdict.matchingRules[0] !== ruleId) {
    throw new Error(`Pattern Path Deep Water puzzle failed unique-rule check for ${ruleId}: matched [${verdict.matchingRules.join(",")}]`);
  }
  return ruleChoices ? { ruleId, tiles, gaps, choices, ruleChoices } : { ruleId, tiles, gaps, choices };
}

function makeSeededPayload(
  ruleId: RuleId,
  seedStart: number,
  options?: { twoGaps?: boolean; ruleChoices?: boolean; gaps?: number[] },
): { payload: PatternPackPayload; ruleHint: string; thinkHint: string } {
  for (let i = 0; i < 64; i++) {
    const built = buildRulePuzzle(ruleId, (seedStart + i * 7919) >>> 0, options);
    if (built) {
      const payload: PatternPackPayload = built.ruleChoices
        ? { ruleId: built.ruleId, tiles: built.tiles, gaps: built.gaps, choices: built.choices, ruleChoices: built.ruleChoices }
        : { ruleId: built.ruleId, tiles: built.tiles, gaps: built.gaps, choices: built.choices };
      return { payload, ruleHint: built.ruleHint, thinkHint: built.thinkHint };
    }
  }
  throw new Error(`Could not construct unique Pattern Path puzzle for ${ruleId}`);
}

type DeepSpec = {
  tier: 3 | 4 | 5 | 6;
  title: string;
  descriptor: PatternChallengeDescriptor;
  dareLabel: string;
  dareRule: RegisteredDare["rule"];
};

function buildDeepSpecs(): DeepSpec[] {
  // 1. Teach — Two gaps (Tide 3), opening with SPEC.md's exact example: 2, 5, ?, 11, ?, 17 (+3 -> 8, 14)
  const twoGap1Tiles = ["2", "5", "8", "11", "14", "17", "20"];
  const twoGap1: PatternChallengeDescriptor = {
    title: "Two gaps · Stepping by 3",
    ruleHint: "Add 3 each step along the trail.",
    thinkHint: "Use stone 2 to find stone 3, and stone 4 to find stone 5.",
    payload: verifyHandcrafted("num-add", twoGap1Tiles, [2, 4], buildNumberChoices(twoGap1Tiles, [2, 4], 28601, [7, 9, 13, 15])),
  };
  const twoGap2 = makeSeededPayload("num-sub", 28602, { twoGaps: true });
  const twoGap3 = makeSeededPayload("stone-color-turn", 28603, { twoGaps: true });
  const twoGap4 = makeSeededPayload("num-add", 28604, { twoGaps: true });

  // 2. Develop — Two rules (Tide 4), opening with SPEC.md's exact example: 3, 6, 5, 10, 9, 18, ? (double, take 1 -> 17)
  const twoRule1Tiles = ["3", "6", "5", "10", "9", "18", "17"];
  const twoRule1: PatternChallengeDescriptor = {
    title: "Two rules · Double, take 1",
    ruleHint: "Two rules take turns: double the stone, then take away 1.",
    thinkHint: "Stone 6 doubled stone 5, so stone 7 takes away 1.",
    payload: verifyHandcrafted(
      "two-double-sub",
      twoRule1Tiles,
      [6],
      buildNumberChoices(twoRule1Tiles, [6], 28605, [36, 19, 16, 15, 20]),
      ["two-double-sub", "two-add-sub", "num-double", "num-grow-step"],
    ),
  };
  const twoRule2 = makeSeededPayload("two-add-sub", 28606, { ruleChoices: true });
  const twoRule3 = makeSeededPayload("two-add-mul", 28607, { ruleChoices: true });
  const twoRule4 = makeSeededPayload("two-interleaved", 28608, { ruleChoices: true });

  // 3. Twist — Growing steps & stacked squares (Tide 5), including SPEC.md's 1, 2, 4, 7, 11, 16, ? (-> 22) and adult 2, 5, 10, 17, 26, ? (-> 37)
  const grow1Tiles = ["1", "2", "4", "7", "11", "16", "22"];
  const grow1: PatternChallengeDescriptor = {
    title: "Growing steps · Bigger jumps",
    ruleHint: "Each jump grows by 1: +1, +2, +3, +4, +5, +6.",
    thinkHint: "From 11 to 16 was +5, so add 6 next.",
    payload: verifyHandcrafted(
      "num-grow-step",
      grow1Tiles,
      [6],
      buildNumberChoices(grow1Tiles, [6], 28609, [21, 23, 24, 20, 32]),
      ["num-grow-step", "num-square", "num-fib", "num-add"],
    ),
  };
  const grow2Tiles = ["2", "5", "10", "17", "26", "37", "50"];
  const grow2: PatternChallengeDescriptor = {
    title: "Growing steps · Squares plus 1",
    ruleHint: "Take each square number (1, 4, 9, 16, 25, 36…) and add 1.",
    thinkHint: "Stone 6 is one more than 6 × 6.",
    payload: verifyHandcrafted(
      "num-square-plus",
      grow2Tiles,
      [5],
      buildNumberChoices(grow2Tiles, [5], 28610, [35, 36, 38, 39, 41]),
      ["num-square-plus", "num-square", "num-grow-step", "two-add-mul"],
    ),
  };
  const grow3 = makeSeededPayload("num-grow-step", 28611, { twoGaps: true });
  const grow4 = makeSeededPayload("num-fib", 28612, { twoGaps: true });

  // 4. Hard — 3x3 Pattern Grids (Tide 6), opening with SPEC.md's exact example: 2 3 6 / 4 5 20 / 3 7 ? (-> 21)
  const grid1Tiles = ["2", "3", "6", "4", "5", "20", "3", "7", "21"];
  const grid1: PatternChallengeDescriptor = {
    title: "Pattern grids · Product reef",
    ruleHint: "In each row, multiply the first two numbers to make the third.",
    thinkHint: "Check row 1 (2 × 3 = 6) and row 2 (4 × 5 = 20), then multiply row 3.",
    payload: verifyHandcrafted(
      "grid-row-mul",
      grid1Tiles,
      [8],
      buildNumberChoices(grid1Tiles, [8], 28613, [10, 14, 24, 28, 18]),
      ["grid-row-mul", "grid-add-rc", "num-add", "num-double"],
    ),
  };
  const grid2 = makeSeededPayload("grid-add-rc", 28614, { twoGaps: true });
  const grid3Tiles = [
    stone("coral", 0, "up"), stone("coral", 0, "right"), stone("coral", 0, "down"),
    stone("jade", 0, "up"), stone("jade", 0, "right"), stone("jade", 0, "down"),
    stone("plum", 0, "up"), stone("plum", 0, "right"), stone("plum", 0, "down"),
  ];
  const grid3: PatternChallengeDescriptor = {
    title: "Pattern grids · Color & turn reef",
    ruleHint: "Each row keeps one color; moving right turns the pointer one quarter turn clockwise.",
    thinkHint: "Match the color of the gap's row and the pointer turn of its column.",
    payload: verifyHandcrafted(
      "grid-color-turn",
      grid3Tiles,
      [4, 8],
      [
        stone("jade", 0, "right"),
        stone("plum", 0, "down"),
        stone("jade", 0, "down"),
        stone("plum", 0, "right"),
        stone("coral", 0, "right"),
        stone("plum", 0, "left"),
      ],
    ),
  };
  const grid4 = makeSeededPayload("grid-row-mul", 28616, { twoGaps: true });

  return [
    { tier: 3, title: "Two gaps 1 · Stepping by 3", descriptor: twoGap1, dareLabel: "First try (both gaps)", dareRule: { kind: "clean" } },
    { tier: 3, title: "Two gaps 2 · Stepping down", descriptor: { title: "Two gaps · Stepping down", ...twoGap2 }, dareLabel: "First try (both gaps)", dareRule: { kind: "clean" } },
    { tier: 3, title: "Two gaps 3 · Color & turn", descriptor: { title: "Two gaps · Color & turn", ...twoGap3 }, dareLabel: "First try (both gaps)", dareRule: { kind: "clean" } },
    { tier: 3, title: "Two gaps 4 · Skip trail", descriptor: { title: "Two gaps · Skip trail", ...twoGap4 }, dareLabel: "First try (both gaps)", dareRule: { kind: "clean" } },

    { tier: 4, title: "Two rules 1 · Double, take 1", descriptor: twoRule1, dareLabel: "Say the rule on first Check", dareRule: { kind: "whole" } },
    { tier: 4, title: "Two rules 2 · Up then down", descriptor: { title: "Two rules · Up then down", ...twoRule2 }, dareLabel: "Say the rule on first Check", dareRule: { kind: "whole" } },
    { tier: 4, title: "Two rules 3 · Add then double", descriptor: { title: "Two rules · Add then double", ...twoRule3 }, dareLabel: "Say the rule on first Check", dareRule: { kind: "whole" } },
    { tier: 4, title: "Two rules 4 · Woven paths", descriptor: { title: "Two rules · Woven paths", ...twoRule4 }, dareLabel: "Say the rule on first Check", dareRule: { kind: "whole" } },

    { tier: 5, title: "Growing steps 1 · Bigger jumps", descriptor: grow1, dareLabel: "Say the rule on first Check", dareRule: { kind: "whole" } },
    { tier: 5, title: "Growing steps 2 · Squares plus 1", descriptor: grow2, dareLabel: "Say the rule on first Check", dareRule: { kind: "whole" } },
    { tier: 5, title: "Growing steps 3 · Two gaps", descriptor: { title: "Growing steps · Two gaps", ...grow3 }, dareLabel: "First try (no help)", dareRule: { kind: "clean" } },
    { tier: 5, title: "Growing steps 4 · Pair sums", descriptor: { title: "Growing steps · Pair sums", ...grow4 }, dareLabel: "First try (no help)", dareRule: { kind: "clean" } },

    { tier: 6, title: "Pattern grids 1 · Product reef", descriptor: grid1, dareLabel: "Say the rule on first Check", dareRule: { kind: "whole" } },
    { tier: 6, title: "Pattern grids 2 · Row & column jumps", descriptor: { title: "Pattern grids · Row & column jumps", ...grid2 }, dareLabel: "First try (no help)", dareRule: { kind: "clean" } },
    { tier: 6, title: "Pattern grids 3 · Color & turn reef", descriptor: grid3, dareLabel: "First try (no help)", dareRule: { kind: "clean" } },
    { tier: 6, title: "Pattern grids 4 · Double product", descriptor: { title: "Pattern grids · Double product", ...grid4 }, dareLabel: "First try (no help)", dareRule: { kind: "clean" } },
  ];
}

function buildSchoolDarePuzzles(): Puzzle<PatternChallengeDescriptor>[] {
  const specs: { level: 2 | 3 | 4 | 5; rule: RuleId; seed: number; sayRule: boolean; label: string; ruleKind: "clean" | "whole" }[] = [
    // Level 2: First try (Clean)
    { level: 2, rule: "shell-up", seed: 28701, sayRule: false, label: "First try", ruleKind: "clean" },
    { level: 2, rule: "shell-down", seed: 28702, sayRule: false, label: "First try", ruleKind: "clean" },
    { level: 2, rule: "shell-bounce", seed: 28703, sayRule: false, label: "First try", ruleKind: "clean" },
    { level: 2, rule: "shell-up", seed: 28704, sayRule: false, label: "First try", ruleKind: "clean" },
    // Level 3: Say the rule (Whole — pick rule card + stone, then Check)
    { level: 3, rule: "num-add", seed: 28705, sayRule: true, label: "Say the rule", ruleKind: "whole" },
    { level: 3, rule: "arrow-cw", seed: 28706, sayRule: true, label: "Say the rule", ruleKind: "whole" },
    { level: 3, rule: "num-sub", seed: 28707, sayRule: true, label: "Say the rule", ruleKind: "whole" },
    { level: 3, rule: "arrow-ccw", seed: 28708, sayRule: true, label: "Say the rule", ruleKind: "whole" },
    // Level 4: Say the rule (Whole — color, size & turn)
    { level: 4, rule: "stone-color-size", seed: 28709, sayRule: true, label: "Say the rule", ruleKind: "whole" },
    { level: 4, rule: "stone-color-turn", seed: 28710, sayRule: true, label: "Say the rule", ruleKind: "whole" },
    { level: 4, rule: "stone-size-turn", seed: 28711, sayRule: true, label: "Say the rule", ruleKind: "whole" },
    { level: 4, rule: "grid-color-turn", seed: 28712, sayRule: true, label: "Say the rule", ruleKind: "whole" },
    // Level 5: No help (Clean)
    { level: 5, rule: "num-double", seed: 28713, sayRule: false, label: "No help", ruleKind: "clean" },
    { level: 5, rule: "num-square", seed: 28714, sayRule: false, label: "No help", ruleKind: "clean" },
    { level: 5, rule: "num-fib", seed: 28715, sayRule: false, label: "No help", ruleKind: "clean" },
    { level: 5, rule: "grid-row-mul", seed: 28716, sayRule: false, label: "No help", ruleKind: "clean" },
  ];

  return specs.map((spec, idx) => {
    const built = makeSeededPayload(spec.rule, spec.seed, { ruleChoices: spec.sayRule });
    const title = `Level ${spec.level} · ${spec.label} ${(idx % 4) + 1}`;
    const descriptor: PatternChallengeDescriptor = { title, ...built };
    const hash = sha256Hex(JSON.stringify(encodePatternTuple(built.payload)));
    const steps = built.payload.gaps.length + (built.payload.ruleChoices ? 1 : 0);
    const dare: RegisteredDare = {
      slot: FIRST_SCHOOL_DARE + idx,
      id: `pattern-l${spec.level}-${idx}`,
      label: spec.label,
      rule: { kind: spec.ruleKind },
      help: "independent",
    };
    return {
      ref: { bank: SCHOOL_DARE_BANK, puzzle: idx, engine: "pattern-path", rules: 1, hash },
      source: { kind: "school", game: "pattern-path", level: spec.level, puzzle: `l${spec.level}-${(idx % 4) + 1}` },
      path: "endless",
      tier: spec.level,
      title,
      descriptor,
      dares: [dare],
      awards: [spec.ruleKind === "whole" ? wholeAward : cleanAward, null],
      par: { metric: "steps", lower: steps, upper: steps },
    };
  });
}

function buildDeepPuzzles(): Puzzle<PatternChallengeDescriptor>[] {
  return buildDeepSpecs().map((spec, idx) => {
    const hash = sha256Hex(JSON.stringify(encodePatternTuple(spec.descriptor.payload)));
    const steps = spec.descriptor.payload.gaps.length + (spec.descriptor.payload.ruleChoices ? 1 : 0);
    const dare: RegisteredDare = {
      slot: FIRST_DEEP_DARE + idx,
      id: `pattern-dw-${idx}`,
      label: spec.dareLabel,
      rule: spec.dareRule,
      help: "independent",
    };
    return {
      ref: { bank: DEEP_BANK, puzzle: idx, engine: "pattern-path", rules: 1, hash },
      source: { kind: "deep-water", collection: DEEP_BANK, puzzle: idx },
      path: "deep-water",
      tier: spec.tier,
      title: spec.title,
      descriptor: spec.descriptor,
      dares: [dare],
      awards: [spec.dareRule.kind === "whole" ? wholeAward : cleanAward, null],
      par: { metric: "steps", lower: steps, upper: steps },
    };
  });
}

export const patternChallengePuzzles: readonly Puzzle<PatternChallengeDescriptor>[] = [
  ...buildDeepPuzzles(),
  ...buildSchoolDarePuzzles(),
];
