import { exactKeys, plain, uint } from "../../state/saveBits";
import {
  RULE_BY_ID,
  RULE_IDS,
  checkUniqueCatalogRule,
  matchCatalogRule,
  type RuleId,
} from "../../learn/games/pattern-path/rules";
import type { Claim, DescriptorCore, PuzzleAdapter } from "../types";

export type PatternPackPayload = {
  ruleId: RuleId;
  tiles: string[];
  /** Sorted gap indices (1 or 2 gaps). */
  gaps: number[];
  /** Candidate stone choices. */
  choices: string[];
  /** Optional rule-card choices for Say-the-rule puzzles (includes ruleId). */
  ruleChoices?: RuleId[];
};

export type PatternPackState = {
  /** Index into payload.choices for each gap slot, or -1 if unfilled. */
  picks: number[];
  /** Index into payload.ruleChoices, or -1 if unfilled (unused when ruleChoices is absent). */
  rulePick: number;
};

/**
 * Compact action integer:
 * - 0..63: fill gap slot `Math.floor(a / 16)` with choice `a % 16`
 * - 64..79: pick rule choice `a - 64`
 */
export type PatternPackAction = number;

export const gapAction = (gapSlot: number, choiceIdx: number): PatternPackAction => gapSlot * 16 + choiceIdx;
export const ruleAction = (ruleIdx: number): PatternPackAction => 64 + ruleIdx;

type D = DescriptorCore<PatternPackPayload>;

const isRuleId = (v: unknown): v is RuleId => typeof v === "string" && (RULE_IDS as readonly string[]).includes(v);
const isToken = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 24;

export function validPatternPayload(x: unknown): x is PatternPackPayload {
  if (!plain(x)) return false;
  const keys = "ruleChoices" in x ? ["choices", "gaps", "ruleChoices", "ruleId", "tiles"] : ["choices", "gaps", "ruleId", "tiles"];
  if (!exactKeys(x, keys)) return false;
  if (!isRuleId(x.ruleId)) return false;
  if (!Array.isArray(x.tiles) || (x.tiles.length !== 7 && x.tiles.length !== 9) || !x.tiles.every(isToken)) return false;
  const tiles = x.tiles as string[];
  if (!Array.isArray(x.gaps) || x.gaps.length < 1 || x.gaps.length > 2) return false;
  const gaps = x.gaps as number[];
  if (!gaps.every((g) => uint(g, tiles.length - 1))) return false;
  if (gaps.length === 2 && gaps[0] >= gaps[1]) return false;
  if (tiles.length === 7 && gaps.some((g) => g < 2)) return false;
  if (!Array.isArray(x.choices) || x.choices.length < 3 || x.choices.length > 8 || !x.choices.every(isToken)) return false;
  if (new Set(x.choices).size !== x.choices.length) return false;
  if (!gaps.every((g) => (x.choices as string[]).includes(tiles[g]))) return false;
  if (x.ruleChoices !== undefined) {
    if (!Array.isArray(x.ruleChoices) || x.ruleChoices.length < 2 || x.ruleChoices.length > 4 || !x.ruleChoices.every(isRuleId)) return false;
    if (new Set(x.ruleChoices).size !== x.ruleChoices.length || !(x.ruleChoices as RuleId[]).includes(x.ruleId)) return false;
  }
  return true;
}

/** Compact tuple: [ruleIndex, tiles, gaps, choices, ruleChoiceIndices?]. */
export function encodePatternTuple(p: PatternPackPayload): unknown {
  const rIdx = RULE_IDS.indexOf(p.ruleId);
  const rc = p.ruleChoices?.map((id) => RULE_IDS.indexOf(id));
  return rc ? [rIdx, p.tiles, p.gaps, p.choices, rc] : [rIdx, p.tiles, p.gaps, p.choices];
}

export function decodePatternTuple(x: unknown): PatternPackPayload | null {
  if (!Array.isArray(x) || (x.length !== 4 && x.length !== 5)) return null;
  const [rIdx, tiles, gaps, choices, rc] = x;
  if (!uint(rIdx, RULE_IDS.length - 1)) return null;
  const ruleId = RULE_IDS[rIdx];
  let ruleChoices: RuleId[] | undefined;
  if (x.length === 5) {
    if (!Array.isArray(rc) || !rc.every((i) => uint(i, RULE_IDS.length - 1))) return null;
    ruleChoices = (rc as number[]).map((i) => RULE_IDS[i]);
  }
  const p = ruleChoices ? { ruleId, tiles, gaps, choices, ruleChoices } : { ruleId, tiles, gaps, choices };
  return validPatternPayload(p) ? p : null;
}

export function isSolvedPattern(s: PatternPackState, p: PatternPackPayload): boolean {
  if (p.ruleChoices) {
    if (s.rulePick < 0 || p.ruleChoices[s.rulePick] !== p.ruleId) return false;
  }
  return p.gaps.every((g, slot) => {
    const pick = s.picks[slot];
    return pick >= 0 && pick < p.choices.length && p.choices[pick] === p.tiles[g];
  });
}

function nextHintAction(s: PatternPackState, d: D): PatternPackAction | null {
  const p = d.payload;
  if (p.ruleChoices) {
    const want = p.ruleChoices.indexOf(p.ruleId);
    if (s.rulePick !== want) return ruleAction(want);
  }
  for (let slot = 0; slot < p.gaps.length; slot++) {
    const want = p.choices.indexOf(p.tiles[p.gaps[slot]]);
    if (s.picks[slot] !== want) return gapAction(slot, want);
  }
  return null;
}

function claims(d: D): Claim[] {
  const p = d.payload;
  const verdict = checkUniqueCatalogRule(p.tiles, p.gaps);
  return [
    {
      id: "unique-catalog-rule",
      proven: verdict.unique && verdict.matchingRules[0] === p.ruleId,
      evidence: `rules:${verdict.matchingRules.join(",")}`,
    },
    {
      id: "gap-after-stone-2",
      proven: p.tiles.length === 9 || p.gaps.every((g) => g >= 2),
      evidence: `gaps:${p.gaps.join(",")}`,
    },
  ];
}

export const patternPathAdapter: PuzzleAdapter<PatternPackPayload, PatternPackState, PatternPackAction> = {
  engine: "pattern-path",
  rules: 1,
  needsCheck: true,
  isPayload: validPatternPayload,
  isAction: (x): x is PatternPackAction => uint(x, 79),
  encodePayload: encodePatternTuple,
  decodePayload: decodePatternTuple,
  create: (d) => ({ picks: Array<number>(d.payload.gaps.length).fill(-1), rulePick: -1 }),
  validState: (x, d): x is PatternPackState =>
    plain(x) &&
    exactKeys(x, ["picks", "rulePick"]) &&
    Array.isArray(x.picks) &&
    x.picks.length === d.payload.gaps.length &&
    x.picks.every((v) => typeof v === "number" && Number.isInteger(v) && v >= -1 && v < d.payload.choices.length) &&
    typeof x.rulePick === "number" &&
    Number.isInteger(x.rulePick) &&
    x.rulePick >= -1 &&
    x.rulePick < (d.payload.ruleChoices?.length ?? 0),
  reduce: (s, a, d) => {
    const p = d.payload;
    if (a >= 64) {
      const rIdx = a - 64;
      if (!p.ruleChoices || rIdx >= p.ruleChoices.length || s.rulePick === rIdx) return s;
      return { ...s, rulePick: rIdx };
    }
    const slot = Math.floor(a / 16), choiceIdx = a % 16;
    if (slot >= p.gaps.length || choiceIdx >= p.choices.length || s.picks[slot] === choiceIdx) return s;
    const picks = [...s.picks];
    picks[slot] = choiceIdx;
    return { ...s, picks };
  },
  actions: (s, d) => {
    const p = d.payload, out: PatternPackAction[] = [];
    if (p.ruleChoices) {
      for (let i = 0; i < p.ruleChoices.length; i++) if (s.rulePick !== i) out.push(ruleAction(i));
    }
    for (let slot = 0; slot < p.gaps.length; slot++) {
      for (let c = 0; c < p.choices.length; c++) if (s.picks[slot] !== c) out.push(gapAction(slot, c));
    }
    return out;
  },
  solved: (s, d) => isSolvedPattern(s, d.payload),
  metrics: (_s, actions) => ({ steps: actions.length }),
  solve: (d) => {
    const p = d.payload;
    const witness: PatternPackAction[] = [];
    if (p.ruleChoices) witness.push(ruleAction(p.ruleChoices.indexOf(p.ruleId)));
    for (let slot = 0; slot < p.gaps.length; slot++) {
      witness.push(gapAction(slot, p.choices.indexOf(p.tiles[p.gaps[slot]])));
    }
    return { status: "solved", witness, metric: "steps", lower: witness.length, upper: witness.length, exact: true };
  },
  count: (d) => {
    const v = checkUniqueCatalogRule(d.payload.tiles, d.payload.gaps);
    return { status: "counted", count: v.unique ? 1 : v.matchingRules.length === 0 ? 0 : 2 };
  },
  independentCount: (d) => {
    // Independent check over the single rule plus cross-check over all other rules in reverse order.
    const p = d.payload;
    const gapSet = new Set(p.gaps);
    const visible = p.tiles.map((t, i) => (gapSet.has(i) ? null : t));
    let totalRules = 0;
    let totalSols = 0;
    for (let i = RULE_IDS.length - 1; i >= 0; i--) {
      const id = RULE_IDS[i];
      const sols = matchCatalogRule(id, visible);
      if (sols.length > 0) {
        totalRules++;
        totalSols += sols.length;
        if (totalRules > 1 || totalSols > 1) return { status: "counted", count: 2 };
      }
    }
    return { status: "counted", count: totalRules === 1 && totalSols === 1 ? 1 : 0 };
  },
  semanticKey: (d) => {
    const p = d.payload;
    const gapSet = new Set(p.gaps);
    const masked = p.tiles.map((t, i) => (gapSet.has(i) ? "?" : t)).join(",");
    return `${p.ruleId}|${masked}|${p.ruleChoices ? "say" : "stone"}`;
  },
  hint: nextHintAction,
  claims,
};

export const ruleCardFor = (ruleId: RuleId) => RULE_BY_ID[ruleId].card;
