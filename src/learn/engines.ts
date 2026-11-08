import type { LearnEngine, LearnId } from './types';
import { withGrowth } from './growth/engine';
import { registeredEngines as originalEngines } from './generated/engines';

/** Typical age span of Levels 1–5 for the original twelve games (new games declare their own). */
const originalAges: Partial<Record<LearnId, readonly [number, number]>> = {
  "reef-race": [4, 9], "island-market": [4, 9], "sound-boat": [5, 9], "turtle-tales": [5, 10], "which-one": [5, 9], "tide-pool": [4, 9],
  "float-sink": [4, 9], "crab-commands": [5, 10], "hafa-adai": [4, 12], "shell-math": [4, 9], "number-hop": [4, 9], "quick-practice": [5, 9],
};
export const engines = Object.fromEntries(Object.entries(originalEngines).map(([id, engine]) => [id, withGrowth({ ...engine, ages: engine.ages ?? originalAges[id as LearnId] })])) as Record<LearnId, LearnEngine<unknown>>;

/** Every skill label across games, for the grown-up practice view. */
export const skillLabels = (): Record<string, string> =>
  Object.values(engines).reduce<Record<string, string>>((all, e) => ({ ...all, ...e.skills }), {});
