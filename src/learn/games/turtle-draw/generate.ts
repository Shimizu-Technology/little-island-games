/** Build-time content: every certified Turtle picture. Pure and deterministic, so tests re-bake and compare with the committed JSON.
 * Run the bake with: node --import ./scripts/puzzles/register.mjs src/learn/games/turtle-draw/bake.ts */
import { draw, flatten, type Block, type Segment } from './engine';
import { blockCost, blockDepth, flatCost, formatBlocks } from './dsl';
import { centredOrigin, closes, fits, geometryKey, samePicture } from './picture';
import { minimumPrograms, SCHOOL_COUNTS } from './mincost';
import { sha256Hex } from '../../../puzzles/sha256';
import type { Template } from './templates';

export const f = (n: number): Block => ({ kind: 'forward', n });
export const t = (angle: number): Block => ({ kind: 'turn', angle });
export const r = (times: number, ...body: Block[]): Block => ({ kind: 'repeat', times, body });
export const k = (color: 'coral' | 'teal' | 'gold'): Block => ({ kind: 'color', color });
export const lengths = [60, 70, 80, 90, 100] as const;
export const PALETTE_COLORS = ['coral', 'teal', 'gold'] as const;

export type Candidate = { family: string; tier: 1 | 2 | 3 | 4; blocks: Block[]; start?: Block[]; score: number };
export type Proved = { family: string; tier: 1 | 2 | 3 | 4; blocks: Block[]; start?: Block[]; origin: { x: number; y: number }; lines: Segment[]; min: number; alts: Block[][]; hash: string };

/** `count` entries spread evenly over a list, so one family covers its whole range. */
export const spread = <T,>(list: readonly T[], count: number): T[] => count >= list.length ? [...list] : Array.from({ length: count }, (_, i) => list[Math.floor((i * list.length) / count + list.length / count / 2)]);
const pairs = (distinct: boolean) => lengths.flatMap(a => lengths.flatMap(b => distinct && a === b ? [] : [[a, b] as const]));

/** Origin, fit and closing, or null when this picture cannot sit on the canvas as drawn. */
export function place(blocks: Block[], open = false): { origin: { x: number; y: number }; lines: Segment[] } | null {
  const first = draw(blocks);
  if (!first) return null;
  const origin = centredOrigin(first);
  const lines = origin && draw(blocks, origin);
  if (!origin || !lines || !fits(lines) || !open && !closes(lines)) return null;
  return { origin, lines };
}

export function prove(candidate: Candidate, used: Segment[][], counts: readonly number[], open = false): Proved | null {
  const placed = place(candidate.blocks, open);
  if (!placed || used.some(u => samePicture(u, placed.lines))) return null;
  const stream = flatten(candidate.blocks);
  const minimum = stream && minimumPrograms(stream, counts);
  if (!minimum) return null;
  const authored = JSON.stringify(candidate.blocks);
  return { ...candidate, ...placed, min: minimum.cost, alts: minimum.programs.filter(p => JSON.stringify(p) !== authored).slice(0, 3), hash: sha256Hex(geometryKey(placed.lines)) };
}

/** Every candidate in preference order, plus how many of the family the level ships. The bake takes the first that prove and are new. */
type Family = { name: string; quota: number; pool: Block[][] };
const ordered = <T,>(list: readonly T[], quota: number): T[] => { const first = spread(list, quota); return [...first, ...list.filter(x => !first.includes(x))]; };
const sizes = lengths.flatMap(a => lengths.map(b => [a, b] as const)), ordered20 = sizes.filter(([a, b]) => a !== b);
const L1: Family[] = [
  { name: 'line', quota: 5, pool: lengths.map(a => [f(a)]) },
  { name: 'corner', quota: 10, pool: ordered(sizes, 10).map(([a, b]) => [f(a), t(90), f(b)]) },
  ...[45, 60, 120].map(angle => ({ name: `bend-${angle}`, quota: 5, pool: ordered(sizes, 5).map(([a, b]) => [f(a), t(angle), f(b)]) })),
  { name: 'u-turn', quota: 10, pool: ordered(lengths.flatMap(a => lengths.flatMap(b => lengths.map(c => [a, b, c] as const))), 10).map(([a, b, c]) => [f(a), t(90), f(b), t(90), f(c)]) },
];
/** A closed flat shape: a side, a turn, ..., a last side. The final turn back to the start heading is not needed to close the picture. */
const flatShape = (side: (i: number) => number, turns: number[]): Block[] => Array.from({ length: turns.length + 1 }, (_, i) => i < turns.length ? [f(side(i)), t(turns[i])] : [f(side(i))]).flat();
const alternate = (turns: number[]) => ordered(ordered20, 20).map(([a, b]) => flatShape(i => i % 2 ? b : a, turns));
const L2: Family[] = [
  { name: 'rectangle', quota: 10, pool: alternate([90, 90, 90]) },
  { name: 'rhombus-60', quota: 5, pool: lengths.map(a => flatShape(() => a, [60, 120, 60])) },
  { name: 'rhombus-120', quota: 5, pool: lengths.map(a => flatShape(() => a, [120, 60, 120])) },
  { name: 'slant-60', quota: 10, pool: alternate([60, 120, 60]) },
  { name: 'slant-120', quota: 10, pool: alternate([120, 60, 120]) },
];
/** Loop a shape. A side of 120–200 takes two Forward blocks, which makes pictures no Level 2 shape repeats. */
const sides = [120, 130, 140, 150, 160, 170, 180, 190, 200].map(side => { const a = Math.floor(side / 20) * 10; return [a, side - a] as const; });
const L3: Family[] = [
  { name: 'triangle', quota: 5, pool: lengths.map(a => [r(3, f(a), t(120))]) },
  { name: 'square', quota: 5, pool: lengths.map(a => [r(4, f(a), t(90))]) },
  { name: 'hexagon', quota: 5, pool: lengths.map(a => [r(6, f(a), t(60))]) },
  { name: 'octagon', quota: 5, pool: lengths.map(a => [r(8, f(a), t(45))]) },
  { name: 'long-square', quota: 9, pool: sides.map(([a, b]) => [r(4, f(a), f(b), t(90))]) },
  { name: 'long-triangle', quota: 8, pool: ordered(sides, 8).map(([a, b]) => [r(3, f(a), f(b), t(120))]) },
  { name: 'long-hexagon', quota: 3, pool: sides.slice(0, 3).map(([a, b]) => [r(6, f(a), f(b), t(60))]) },
];
/** Angles: a loop whose body turns twice, so the child works out what the turns add up to. */
const loop2 = (n: number, x: number, y: number, turnFirst: boolean) => ordered(ordered20, 20).map(([a, b]) => [r(n, ...(turnFirst ? [t(x), f(a), t(y), f(b)] : [f(a), t(x), f(b), t(y)]))]);
const L4: Family[] = [
  { name: 'rectangle', quota: 10, pool: loop2(2, 90, 90, true) },
  { name: 'parallelogram', quota: 10, pool: [...loop2(2, 60, 120, true), ...loop2(2, 120, 60, true)] },
  { name: 'alt-hexagon', quota: 10, pool: loop2(3, 60, 60, false) },
  { name: 'alt-octagon', quota: 10, pool: loop2(4, 45, 45, false) },
];

/** Flowers nest a shape inside a turn: `repeat outer [ repeat inner [forward, turn], turn ]`, drawn in one colour. */
export const flowers = (): { blocks: Block[]; outer: number; inner: number; length: number; turnFirst: boolean; color: number }[] => {
  const out: { blocks: Block[]; outer: number; inner: number; length: number; turnFirst: boolean; color: number }[] = [];
  let color = 0;
  for (const outer of [3, 4, 6, 8]) for (const inner of [3, 4, 6, 8]) for (const length of lengths) for (const turnFirst of [false, true]) {
    const turn = 360 / inner, body = turnFirst ? [t(turn), f(length)] : [f(length), t(turn)];
    out.push({ blocks: [k(PALETTE_COLORS[color++ % 3]), r(outer, r(inner, ...body), t(360 / outer))], outer, inner, length, turnFirst, color: color - 1 });
  }
  return out;
};
const angles = [45, 60, 90, 120], counts = [2, 3, 4, 6, 8];
/** One planted bug in an otherwise correct flower. The bug must change the picture: a count that merely retraces a closed shape is not a bug. */
export function plantBug(blocks: Block[], family: 'fix-turn' | 'fix-count' | 'fix-missing', index: number): Block[] {
  const goal = draw(blocks)!;
  for (let variant = 0; variant < 12; variant++) {
    const copy = JSON.parse(JSON.stringify(blocks)) as Block[];
    const outer = copy[1] as Extract<Block, { kind: 'repeat' }>, inner = outer.body[0] as Extract<Block, { kind: 'repeat' }>;
    const useOuter = (index + variant) % 2 === 1, pick = Math.floor(variant / 2);
    if (family === 'fix-turn') {
      const turn = (useOuter ? outer.body[1] : inner.body.find(b => b.kind === 'turn')) as Extract<Block, { kind: 'turn' }>;
      const options = angles.filter(a => a !== turn.angle);
      turn.angle = options[(pick + index) % options.length];
    } else if (family === 'fix-count') {
      const target = useOuter ? outer : inner, options = counts.filter(n => n !== target.times);
      target.times = options[(pick + index) % options.length];
    } else if (useOuter) outer.body.pop();
    else inner.body.splice(inner.body.findIndex(b => b.kind === 'turn'), 1);
    const lines = draw(copy);
    if (lines && !samePicture(lines, goal)) return copy;
  }
  throw new Error(`No ${family} bug changes ${formatBlocks(blocks)}`);
}
const L5 = (used: Segment[][]): Candidate[] => {
  const all = flowers().map(c => ({ ...c, score: flatCost(c.blocks) + (c.turnFirst ? 1 : 0) }));
  const fresh: typeof all = [], seen = [...used];
  for (const c of all.sort((a, b) => a.score - b.score)) {
    const placed = place(c.blocks);
    if (placed && !seen.some(u => samePicture(u, placed.lines))) { fresh.push(c); seen.push(placed.lines); }
  }
  const families = ['flower', 'fix-turn', 'fix-count', 'fix-missing'] as const;
  return spread(fresh, 40).map((c, i) => {
    const family = families[i % 4], tier = (1 + Math.floor(i / 10)) as 1 | 2 | 3 | 4;
    return { family, tier, blocks: c.blocks, score: c.score, ...(family === 'flower' ? {} : { start: plantBug(c.blocks, family, Math.floor(i / 4)) }) };
  });
};

const FAMILIES = [L1, L2, L3, L4];
type Row = { score: number; row: Template };
/** Closed pictures from Level 2 up; Level 1's lines and corners are open on purpose. */
export function generateSchool(): { levels: Template[][]; lines: Segment[][] } {
  const levels: Template[][] = [], used: Segment[][] = [];
  /** Levels 1 and 2 are flat on purpose (no Repeat is offered yet), so their "fewest blocks" is the written plan itself. */
  const emit = (level: number, rows: Row[], p: Proved, order: number) => {
    const flat = level <= 2, cost = flat ? blockCost(p.blocks) : p.min, limit = flat ? flatCost(p.blocks) + 4 : p.min + 1;
    const size = p.blocks.reduce((n, b) => n + (b.kind === 'forward' ? b.n : 0), 0);
    rows.push({ score: flatCost(p.blocks) * 100000 + order * 1000 + size + (p.start ? 1 : 0), row: { family: p.family, tier: p.tier, blocks: formatBlocks(p.blocks), origin: [p.origin.x, p.origin.y], min: cost, limit, hash: p.hash, alts: flat ? [] : p.alts.map(formatBlocks), ...(p.start ? { start: formatBlocks(p.start) } : {}) } });
    used.push(p.lines);
  };
  /** Easiest first (fewest commands drawn); each quarter is a tier, so a round steps up through four pictures. */
  const finish = (rows: Row[]): Template[] => rows.sort((a, b) => a.score - b.score).map((r, i) => ({ ...r.row, tier: (1 + Math.floor((i * 4) / rows.length)) as 1 | 2 | 3 | 4 }));
  FAMILIES.forEach((families, index) => {
    const level = index + 1, rows: Row[] = [];
    families.forEach((family, order) => {
      let taken = 0;
      for (const blocks of family.pool) {
        if (taken === family.quota) break;
        const proved = prove({ family: family.name, tier: 1, blocks, score: 0 }, used, SCHOOL_COUNTS, level === 1);
        if (proved) { emit(level, rows, proved, order); taken++; }
      }
      if (taken < family.quota) throw new Error(`Level ${level} ${family.name}: only ${taken} of ${family.quota} certified pictures`);
    });
    levels.push(finish(rows));
  });
  const rows: Row[] = [];
  for (const candidate of L5(used)) {
    const proved = prove(candidate, used, SCHOOL_COUNTS);
    if (!proved) throw new Error(`Level 5 ${candidate.family}: ${formatBlocks(candidate.blocks)} is not certified`);
    emit(5, rows, proved, ['flower', 'fix-turn', 'fix-count', 'fix-missing'].indexOf(candidate.family));
  }
  levels.push(finish(rows));
  return { levels, lines: used };
}
export { blockCost, blockDepth };
