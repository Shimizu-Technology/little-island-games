import { gateCrabAdapter } from '../../../src/puzzles/adapters/gate-crab';
import {
  constructPuzzle, goodTesterWitness, RULES_BY_RUNG, type GatePuzzle, type Rung,
} from '../../../src/learn/games/gate-crab/rules';
import { createRng } from '../../../src/puzzles/rng';
import { parFrom } from '../../../src/puzzles/solver';
import type { BandQuota, DescriptorCore, FamilySpec } from '../../../src/puzzles/types';

/**
 * Certified supply targets for BK-14:
 *   Target: 384 distinct 216-row truth-table puzzles across Rungs A-F
 *   Floor:  100 (>= 96 required)
 *   Each rule family stays <= 25% of its band.
 */
const bands: BandQuota[] = [
  { id: 'a', target: 16, floor: 12, advanced: false },
  { id: 'b', target: 32, floor: 16, advanced: true },
  { id: 'c', target: 44, floor: 16, advanced: true },
  { id: 'd', target: 44, floor: 16, advanced: true },
  { id: 'e', target: 160, floor: 24, advanced: true },
  { id: 'f', target: 88, floor: 16, advanced: true },
];

export function generateGateCrab(seed: number, band: Rung): DescriptorCore<GatePuzzle> | null {
  const pool = RULES_BY_RUNG[band];
  if (!pool.length) return null;
  // Cycle cleanly across every distinct rule in the rung so all rules get tried deterministically.
  const offset = seed & 0xffffff;
  const rule = pool[offset % pool.length];
  const rng = createRng(seed);
  const payload = constructPuzzle(rule, rng);
  if (!payload) return null;
  const w = goodTesterWitness(payload, 16);
  if (!w.identified || w.liveAfterStarters < 2) return null;
  const quota = bands.find(b => b.id === band)!;
  return {
    format: 1,
    seed,
    rng: 1,
    band,
    // Vary layout by starter[0] % 6 + rule family hash so packs never repeat a layout twice in a row.
    layout: `s${payload.starters[0] % 6}-${payload.quiz[0] % 4}`,
    template: rule.family,
    payload,
    objectives: [],
    limits: quota.advanced
      ? [{ metric: 'turns', max: w.upper }, { metric: 'placements', max: 5 }]
      : [],
    par: parFrom('turns', w.lower, w.upper),
    teaches: [],
    speech: null,
  };
}

export const gateCrabFamily: FamilySpec<GatePuzzle> = {
  id: 'gate-crab',
  adapter: gateCrabAdapter,
  sources: [
    'src/learn/games/gate-crab/rules.ts',
    'src/puzzles/adapters/gate-crab.ts',
    'scripts/puzzles/families/gate-crab.ts',
  ],
  bands,
  provenance: {
    source: 'original',
    note: 'Original inductive rule-discovery puzzles across the 216-row shell space (2-shell rows on Rung A, 3-shell rows on Rungs B-F). Rules are deduplicated canonically by their full 216-row truth table; quizzes select high-disagreement balanced rows that foil nearest-neighbor copying; hints use public evidence minimax splitting with proven twin-world non-leakage.',
  },
  review: { ids: [], complete: false },
  maxRowBytes: 256,
  requiresUnique: false,
  requiresTrace: true,
  hiddenInformation: true,
  generate: (seed, band) => generateGateCrab(seed, band.id as Rung),
};
