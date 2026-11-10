/**
 * G5 Bridges generator. Grows a connected network from one island: each new island sits at the far
 * end of a fresh straight bridge that crosses nothing, then a style may add extra bridges between
 * islands that already see each other. The numbers are the bridge counts. Only boards the grader
 * finishes with no guessing, inside the rung's technique window, are kept.
 */
import { createRng, type Rng } from '../../../src/puzzles/rng';
import { shapeOf, type BridgesPuzzle } from '../../../src/puzzles/edges/core';
import { grade, rank, type Grade, type Technique } from '../../../src/puzzles/edges/solver';
import { bridgesRungs, type BridgesRung } from '../../../src/puzzles/edges/rungs';
import type { EdgeGenerator } from './family';

export type BridgesCandidate = { seed: number; puzzle: BridgesPuzzle; template: string; grade: Extract<Grade, { status: 'complete' }> };
/** Layout styles are the bank's templates: no style may fill more than a quarter of a rung. */
type Style = { id: string; reach: number; doubles: number; extra: number; fill: number };
export const bridgesStyles: readonly Style[] = [
  { id: 'reef', reach: 3, doubles: 0.35, extra: 0.15, fill: 1 },
  { id: 'causeway', reach: 6, doubles: 0.3, extra: 0.1, fill: 0.85 },
  { id: 'atoll', reach: 4, doubles: 0.5, extra: 0.35, fill: 0.9 },
  { id: 'scatter', reach: 5, doubles: 0.2, extra: 0.05, fill: 1 },
  { id: 'twin', reach: 4, doubles: 0.65, extra: 0.2, fill: 0.95 },
  { id: 'drift', reach: 4, doubles: 0.15, extra: 0.08, fill: 1 },
  { id: 'spit', reach: 7, doubles: 0.12, extra: 0.02, fill: 0.95 },
  { id: 'lagoon', reach: 3, doubles: 0.25, extra: 0.05, fill: 1 },
];
const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

function grow(rng: Rng, width: number, height: number, islands: number, style: Style): BridgesPuzzle | null {
  const size = width * height, island = new Int8Array(size), across = new Uint8Array(size), upright = new Uint8Array(size), placed: number[] = [], degree = new Map<number, number>();
  const add = (c: number) => { island[c] = 1; placed.push(c); degree.set(c, 0); };
  const near = (c: number) => { const x = c % width, y = Math.floor(c / width); return dirs.some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < width && ny < height && island[ny * width + nx]; }); };
  add(rng.below(size));
  const want = Math.max(2, Math.round(islands * style.fill));
  for (let tries = 0; placed.length < want && tries < want * 60; tries++) {
    const from = placed[rng.below(placed.length)], [dx, dy] = dirs[rng.below(4)], length = 2 + rng.below(Math.max(1, style.reach - 1));
    const x = from % width + dx * length, y = Math.floor(from / width) + dy * length;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const to = y * width + x, path: number[] = [];
    for (let k = 1; k < length; k++) path.push((Math.floor(from / width) + dy * k) * width + from % width + dx * k);
    // The new island and its bridge sit only on open water, away from other islands' sides.
    if (island[to] || across[to] || upright[to] || near(to) || path.some(c => island[c] || across[c] || upright[c])) continue;
    if ((degree.get(from) ?? 0) >= 7) continue;
    const count = rng.below(1000) < style.doubles * 1000 ? 2 : 1;
    add(to);
    for (const c of path) (dx ? across : upright)[c] = 1;
    degree.set(from, degree.get(from)! + count); degree.set(to, count);
  }
  if (placed.length < 2) return null;
  const clues = Array<number>(size).fill(0);
  placed.forEach(c => { clues[c] = degree.get(c)!; });
  // Extra bridges between islands that already see each other turn the tree into a network.
  const draft: BridgesPuzzle = { kind: 'bridges', width, height, clues: [...clues] }, { links, islands: list } = shapeOf(draft);
  for (const link of rng.shuffle(links)) {
    if (rng.below(1000) >= style.extra * 1000) continue;
    const a = list[link.a].cell, b = list[link.b].cell;
    if (link.water.some(c => across[c] || upright[c]) || !link.water.length) continue;
    const count = rng.below(1000) < style.doubles * 1000 ? 2 : 1;
    if (clues[a] + count > 8 || clues[b] + count > 8) continue;
    for (const c of link.water) (link.horizontal ? across : upright)[c] = 1;
    clues[a] += count; clues[b] += count;
  }
  return { kind: 'bridges', width, height, clues };
}

/** Effort per step, by technique (tidy … chain). One weight per technique, checked by the banks test. */
export const bridgesWeights = [0, 1, 2.5, 4, 6, 9, 14];
const weights = bridgesWeights;
export const bridgesWorkload = (g: Extract<Grade, { status: 'complete' }>, p: BridgesPuzzle) =>
  g.steps.reduce((n, s) => n + weights[rank(s.technique)], 0) + shapeOf(p).islands.length * 0.2;

/** One candidate for a rung, or null when the board misses the rung's technique window. */
/** The seeded layout alone, before grading. */
export function drawBridges(rung: BridgesRung, seed: number): { puzzle: BridgesPuzzle; style: string } | null {
  const rng = createRng(seed), style = bridgesStyles[rng.below(bridgesStyles.length)];
  const span = rung.islands[1] - rung.islands[0] + 1, islands = rung.islands[0] + rng.below(span);
  const puzzle = grow(rng, rung.width, rung.height, islands, style);
  return puzzle && shapeOf(puzzle).islands.length >= rung.islands[0] * 0.8 ? { puzzle, style: style.id } : null;
}
export function generateBridges(rung: BridgesRung, seed: number): BridgesCandidate | null {
  const drawn = drawBridges(rung, seed);
  if (!drawn) return null;
  const { puzzle, style } = drawn, g = grade(puzzle);
  if (g.status !== 'complete' || rank(g.ceiling) < rank(rung.min) || rank(g.ceiling) > rank(rung.max)) return null;
  if (rung.needs && !g.steps.some(s => s.technique === rung.needs)) return null;
  if (rung.trials && g.steps.filter(s => rank(s.technique) >= rank('what-if')).length < rung.trials) return null;
  return { seed, puzzle, template: style, grade: g };
}
/** Bank sizes per rung, and the stop-and-tell floors. */
const supply: Record<string, [number, number]> = { ripple: [240, 100], shallows: [300, 100], stepping: [300, 100], sandbar: [300, 100], archipelago: [300, 100], atoll: [300, 100], channel: [300, 100] };
export const bridgesGenerator: EdgeGenerator<BridgesPuzzle, BridgesRung> = {
  family: 'bridges',
  rungs: bridgesRungs.map(r => ({ ...r, target: supply[r.id][0], floor: supply[r.id][1] })),
  generate: (rung, seed) => { const c = generateBridges(rung, seed); return c ? { seed, puzzle: c.puzzle, template: c.template, ceiling: c.grade.ceiling, workload: bridgesWorkload(c.grade, c.puzzle) } : null; },
};
export const ceilingOf = (c: BridgesCandidate): Technique => c.grade.ceiling;
export { bridgesRungs };
