import { boardFromMines, candidateMines, urchins } from "../../../src/board/reef-sweep/redraw";
import { exactMinOpenings, solvePublicNoGuess, type DeductionTier } from "../../../src/board/reef-sweep/solver";
import { reefSweepAdapter, type ReefPayload } from "../../../src/puzzles/adapters/reef-sweep";
import { parFrom } from "../../../src/puzzles/solver";
import { fnv1a32 } from "../../../src/puzzles/today";
import type { BandQuota, DescriptorCore, FamilySpec } from "../../../src/puzzles/types";

type ReefBandConfig = {
  size: 5 | 6 | 7;
  ceiling: DeductionTier;
  minOpens: number;
  teaches: string[];
};

export const reefBands: Record<string, ReefBandConfig> = {
  "single-5": { size: 5, ceiling: "single-cell", minOpens: 2, teaches: ["single-cell"] },
  "single-6": { size: 6, ceiling: "single-cell", minOpens: 4, teaches: ["single-cell"] },
  "subset-7": { size: 7, ceiling: "subset", minOpens: 5, teaches: ["subset-difference"] },
  "coupled-7": { size: 7, ceiling: "coupled", minOpens: 5, teaches: ["coupled-count"] },
};

function startQuadrant(size: number, start: number): string {
  const r = Math.floor(start / size),
    c = start % size,
    mid = size / 2;
  return `q${r < mid ? 0 : 1}${c < mid ? 0 : 1}`;
}

/**
 * BK-21 certified 128-entry Reef Sweep bank (4 tiered deduction bands × 32 entries).
 * Serves both as the certified fallback pool (all live sizes 5×5, 6×6, 7×7) and
 * the tiered deduction Challenge bank (single-cell -> subset/difference -> coupled/mine-count).
 */
export const reefSweepFamily: FamilySpec<ReefPayload> = {
  id: "reef-sweep",
  adapter: reefSweepAdapter,
  sources: [
    "src/board/reef-sweep/solver.ts",
    "src/board/reef-sweep/redraw.ts",
    "src/puzzles/adapters/reef-sweep.ts",
    "scripts/puzzles/families/reef-sweep.ts",
  ],
  bands: [
    { id: "single-5", target: 32, floor: 32, advanced: false },
    { id: "single-6", target: 32, floor: 32, advanced: false },
    { id: "subset-7", target: 32, floor: 32, advanced: true },
    { id: "coupled-7", target: 32, floor: 32, advanced: true },
  ],
  provenance: {
    source: "original",
    note: "Generated from fixed deterministic seeds and proven no-guess solvable by the pure public-constraint deduction solver with counterfactual hidden-world verification.",
  },
  review: { ids: [], complete: false },
  maxRowBytes: 256,
  requiresUnique: false,
  requiresTrace: true,
  hiddenInformation: true,
  generate(seed: number, band: BandQuota): DescriptorCore<ReefPayload> | null {
    const cfg = reefBands[band.id];
    if (!cfg) return null;
    const count = cfg.size * cfg.size;
    const start = fnv1a32(`reef-start|${band.id}|${seed}`) % count;
    const mines = candidateMines(seed, cfg.size, start, 0, urchins(cfg.size));
    const board = boardFromMines(cfg.size, mines);

    const solved = solvePublicNoGuess(board, cfg.size, start, { maxTier: cfg.ceiling, nodeBudget: 16_000 });
    if (solved.status !== "solved" || solved.ceiling !== cfg.ceiling || solved.opens.length < cfg.minOpens) {
      return null;
    }
    // Verify genuine tier counterfactual: lower tier must stall on subset and coupled bands.
    if (cfg.ceiling === "subset") {
      const lower = solvePublicNoGuess(board, cfg.size, start, { maxTier: "single-cell", nodeBudget: 16_000 });
      if (lower.status !== "stalled") return null;
    } else if (cfg.ceiling === "coupled") {
      const lower = solvePublicNoGuess(board, cfg.size, start, { maxTier: "subset", nodeBudget: 16_000 });
      if (lower.status !== "stalled") return null;
    }

    const lowerBound = exactMinOpenings(board, cfg.size);
    const upperBound = solved.opens.length;
    const payload: ReefPayload = { size: cfg.size, start, mines };
    const layout = startQuadrant(cfg.size, start);
    const template = `t${fnv1a32(`${band.id}|${mines.join(",")}`) % 8}`;

    return {
      format: 1,
      seed,
      rng: 1,
      band: band.id,
      layout,
      template,
      payload,
      objectives: [],
      limits: [],
      par: parFrom("steps", lowerBound, upperBound),
      teaches: cfg.teaches,
      speech: null,
    };
  },
};
