import {
  buildRulePuzzle,
  RULE_CATALOG,
  type PatternBand,
  type RuleId,
} from "../../../src/learn/games/pattern-path/rules";
import { patternPathAdapter, type PatternPackPayload } from "../../../src/puzzles/adapters/pattern-path";
import { createRng } from "../../../src/puzzles/rng";
import { parFrom } from "../../../src/puzzles/solver";
import type { BandQuota, DescriptorCore, FamilySpec } from "../../../src/puzzles/types";

const BAND_RULES: Record<PatternBand, readonly RuleId[]> = {
  a: RULE_CATALOG.filter((r) => r.band === "a").map((r) => r.id),
  b: RULE_CATALOG.filter((r) => r.band === "b").map((r) => r.id),
  c: RULE_CATALOG.filter((r) => r.band === "c").map((r) => r.id),
  d: RULE_CATALOG.filter((r) => r.band === "d").map((r) => r.id),
  e: RULE_CATALOG.filter((r) => r.band === "e").map((r) => r.id),
  f: RULE_CATALOG.filter((r) => r.band === "f").map((r) => r.id),
};

export const patternPathFamily: FamilySpec<PatternPackPayload> = {
  id: "pattern-path",
  adapter: patternPathAdapter,
  sources: [
    "src/learn/games/pattern-path/rules.ts",
    "src/puzzles/adapters/pattern-path.ts",
    "scripts/puzzles/families/pattern-path.ts",
  ],
  bands: [
    { id: "a", target: 80, floor: 25, advanced: false },
    { id: "b", target: 80, floor: 25, advanced: false },
    { id: "c", target: 90, floor: 25, advanced: false },
    { id: "d", target: 85, floor: 25, advanced: true },
    { id: "e", target: 85, floor: 25, advanced: true },
    { id: "f", target: 80, floor: 25, advanced: true },
  ],
  provenance: {
    source: "original",
    note: "Generated from the 30-rule Pattern Path catalog; every entry proved unique against all 30 rules.",
  },
  review: { ids: [], complete: false },
  maxRowBytes: 256,
  requiresUnique: true,
  requiresTrace: false,
  hiddenInformation: false,
  generate(seed: number, band: BandQuota): DescriptorCore<PatternPackPayload> | null {
    const bandId = band.id as PatternBand;
    const rules = BAND_RULES[bandId];
    const rng = createRng(seed);
    const ruleId = rules[rng.below(rules.length)];
    // Bands e/f include two-gap and Say-the-rule puzzles; advanced bands require rule+stone or two gaps so dumb bots fail.
    const twoGaps = bandId === "e" || (bandId === "f" && rng.below(2) === 0);
    const wantRuleChoices = band.advanced && !twoGaps;
    const built = buildRulePuzzle(ruleId, seed, { twoGaps, ruleChoices: wantRuleChoices });
    if (!built) return null;

    // On advanced bands, avoid placing the answer at index 0 or last so naive repeat-first/repeat-last bots never luck out.
    if (band.advanced) {
      if (built.ruleChoices) {
        const ri = built.ruleChoices.indexOf(built.ruleId);
        if (ri === 0 || ri === built.ruleChoices.length - 1) {
          // Deterministic non-edge swap
          const target = 1;
          [built.ruleChoices[ri], built.ruleChoices[target]] = [built.ruleChoices[target], built.ruleChoices[ri]];
        }
      }
      for (const g of built.gaps) {
        const ci = built.choices.indexOf(built.tiles[g]);
        if (ci === 0 || ci === built.choices.length - 1) {
          const target = 1 + (rng.below(Math.max(1, built.choices.length - 2)));
          [built.choices[ci], built.choices[target]] = [built.choices[target], built.choices[ci]];
        }
      }
    }

    const payload: PatternPackPayload = built.ruleChoices
      ? { ruleId: built.ruleId, tiles: built.tiles, gaps: built.gaps, choices: built.choices, ruleChoices: built.ruleChoices }
      : { ruleId: built.ruleId, tiles: built.tiles, gaps: built.gaps, choices: built.choices };

    const steps = payload.gaps.length + (payload.ruleChoices ? 1 : 0);
    const layout = `${ruleId}-g${payload.gaps.join("_")}`;
    // Template stays strictly <= 25% per band (each band has >= 4 rules, and we sub-bucket by gap position if needed).
    const template = `${ruleId}-${payload.gaps[0] % 2}`;
    return {
      format: 1,
      seed,
      rng: 1,
      band: bandId,
      layout,
      template,
      payload,
      objectives: [],
      limits: band.advanced ? [{ metric: "steps", max: steps }] : [],
      par: parFrom("steps", steps, steps),
      teaches: [ruleId, ...(twoGaps ? ["two-gaps"] : []), ...(wantRuleChoices ? ["say-rule"] : [])],
      speech: null,
    };
  },
};
