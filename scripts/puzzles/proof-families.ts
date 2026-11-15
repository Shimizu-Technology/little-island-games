import { createMaze } from '../../src/games/maze';
import { defaultOptions, type Difficulty } from '../../src/games/types';
import { taskAt } from '../../src/learn/games/logic-lagoon/engine';
import { logicLagoonAdapter, type LogicPayload } from '../../src/puzzles/adapters/logic-lagoon';
import { mazeAdapter, type MazePayload } from '../../src/puzzles/adapters/maze';
import { parFrom } from '../../src/puzzles/solver';
import { fnv1a32 } from '../../src/puzzles/today';
import type { BandQuota, DescriptorCore, FamilySpec } from '../../src/puzzles/types';

/** Real engines through the real gates, for tests and pipeline proof. These never enter the shipped catalog. */
const deadEnds = (walls: readonly number[]) => walls.filter(w => [1, 2, 4, 8].filter(bit => w & bit).length === 3).length;
const sizes: Record<string, Difficulty> = { small: 'easy', middle: 'medium', big: 'hard' };
export function mazeProofFamily(targets: Record<string, number> = { small: 16, middle: 16, big: 16 }): FamilySpec<MazePayload> {
  return {
    id: 'proof-maze', adapter: mazeAdapter, maxRowBytes: 256, requiresUnique: false, requiresTrace: false, hiddenInformation: false,
    sources: ['src/games/maze.ts', 'src/puzzles/adapters/maze.ts', 'scripts/puzzles/proof-families.ts'],
    provenance: { source: 'original', note: 'Seeded by the app maze engine.' }, review: { ids: [], complete: false },
    bands: Object.keys(sizes).map((id, i) => ({ id, target: targets[id] ?? 0, floor: Math.min(4, targets[id] ?? 0), advanced: i === 2 })),
    generate(seed: number, band: BandQuota): DescriptorCore<MazePayload> | null {
      const made = createMaze({ ...defaultOptions, difficulty: sizes[band.id] }, seed);
      const payload = { size: made.size, walls: made.walls };
      const route = mazeAdapter.solve({ payload } as DescriptorCore<MazePayload>, 20_000);
      if (route.status !== 'solved') return null;
      const turns = route.witness.reduce<number>((n, cell, i, all) => {
        if (i < 2) return n;
        return n + (cell - all[i - 1] !== all[i - 1] - all[i - 2] ? 1 : 0);
      }, 0);
      const steps = route.upper, firstRight = route.witness[0] === 1 ? 1 : 0;
      return { format: 1, seed, rng: 1, band: band.id, layout: `turns-${turns % 5}`, template: `open-${firstRight}-${deadEnds(made.walls) % 8}`, payload, objectives: [],
        limits: band.advanced ? [{ metric: 'steps', max: steps }] : [], par: parFrom('steps', steps, steps), teaches: [], speech: null };
    },
  };
}
const logicLevels: Record<string, number> = { little: 2, growing: 3, grown: 4 };
export function logicProofFamily(targets: Record<string, number> = { little: 4, growing: 8, grown: 2 }): FamilySpec<LogicPayload> {
  return {
    id: 'proof-logic', adapter: logicLagoonAdapter, maxRowBytes: 256, requiresUnique: true, requiresTrace: true, hiddenInformation: false,
    sources: ['src/learn/games/logic-lagoon/engine.ts', 'src/learn/games/logic-lagoon/legacy.ts', 'src/puzzles/adapters/logic-lagoon.ts', 'scripts/puzzles/proof-families.ts'],
    provenance: { source: 'original', note: 'Seeded by the app Logic Lagoon engine.' }, review: { ids: [], complete: false },
    bands: Object.keys(logicLevels).map((id, i) => ({ id, target: targets[id] ?? 0, floor: Math.min(2, targets[id] ?? 0), advanced: i === 2 })),
    generate(seed: number, band: BandQuota): DescriptorCore<LogicPayload> | null {
      const level = logicLevels[band.id], index = seed % 4;
      const task = taskAt({ version: 1, level, seed, index, total: 4, entries: [], helped: false });
      if (task.kind !== 'grid' || task.cages.length || task.writtenClue) return null;
      const blanks = task.givens.filter(v => !v).length;
      const firstRowGivens = task.givens.slice(0, task.size).filter(Boolean).length, shape = fnv1a32(task.givens.map(v => (v ? 1 : 0)).join(''));
      return { format: 1, seed, rng: 1, band: band.id, layout: `row-${firstRowGivens}`, template: `shape-${shape % 16}`,
        payload: { level, seed, index, givens: task.givens, solution: task.solution }, objectives: [], limits: [], par: parFrom('placements', blanks, blanks), teaches: [], speech: null };
    },
  };
}
