/** Certified School pictures (C2c, BK-22): 40 per level, baked and proved by bake.ts and tests/c2c-turtle-content.test.ts.
 * Runtime only decodes them; nothing is searched on a device. */
import content from './templates.json';
import { parseBlocks } from './dsl';
import type { Block, Task } from './engine';
export const LEVEL_TASKS = 40;
export type Template = { family: string; tier: 1 | 2 | 3 | 4; blocks: string; origin: [number, number]; min: number; limit: number; hash: string; alts: string[]; start?: string };
export const schoolTemplates = content.levels as unknown as Template[][];
const must = (text: string): Block[] => { const blocks = parseBlocks(text); if (!blocks) throw new Error(`Bad Turtle template: ${text}`); return blocks; };
/** The same task every time for the same level and picture, so a saved round can be rebuilt and compared exactly. */
export function templateTask(level: number, index: number): Task {
  const t = schoolTemplates[level - 1][index];
  return {
    seed: index, template: index, target: must(t.blocks), limit: t.limit, requiredLoop: level >= 3, debug: t.start !== undefined,
    ...(level >= 4 ? { blockEditor: true } : {}), origin: { x: t.origin[0], y: t.origin[1] }, ...(t.start !== undefined ? { start: must(t.start) } : {}),
  };
}
/** One picture from each tier, easiest first, avoiding the previous round's pictures where it can. */
export function roundTemplates(level: number, rng: () => number, avoid: readonly number[] = []): number[] {
  return [1, 2, 3, 4].map(tier => {
    const pool = schoolTemplates[level - 1].flatMap((t, i) => t.tier === tier ? [i] : []);
    const fresh = pool.filter(i => !avoid.includes(i));
    const from = fresh.length ? fresh : pool;
    return from[Math.floor(rng() * from.length) % from.length];
  });
}
/** Every certified way to draw this picture at this level: the written one and its equally short alternatives. The hint aims at the nearest. */
export const templateWinners = (level: number, index: number): Block[][] => [must(schoolTemplates[level - 1][index].blocks), ...schoolTemplates[level - 1][index].alts.map(must)];
