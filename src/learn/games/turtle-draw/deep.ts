/** Build-time content: Deep Water (SC-03). Five steps, each a bank of twelve "draw it" puzzles and a bank of twelve "predict the picture"
 * puzzles, every picture closed, on the canvas and new to the whole set. Pure and deterministic; the bake and the tests both call it. */
import { draw, type Block, type Segment } from './engine';
import { blockCost, blockDepth, flatCost, formatBlocks } from './dsl';
import { samePicture } from './picture';
import { DEEP_COUNTS } from './mincost';
import { f, k, prove, r, spread, t, type Candidate, type Proved } from './generate';

export const DEEP_LENGTHS = [40, 50, 60, 70, 80, 90, 100] as const;
export const DEEP_TURNS = [40, 45, 60, 72, 90, 120, 144] as const;
export const STEPS = [
  { key: 'five', name: 'Five sides', idea: 'Turn 72° and repeat 5 times' },
  { key: 'star', name: 'Stars', idea: 'Turn 144° and repeat 5 times' },
  { key: 'nine', name: 'Nine sides', idea: 'Turn 40° and repeat 9 times' },
  { key: 'grow', name: 'Growing shapes', idea: 'Grow +10 makes every later side longer' },
  { key: 'mixed', name: 'Mixed patterns', idea: 'Put the ideas together' },
] as const;
export const BANK_FIRST = 220;
/** Banks 220–224 are the five "draw it" steps; 225–229 are the same steps as "predict the picture". */
export const buildBank = (step: number) => BANK_FIRST + step;
export const predictBank = (step: number) => BANK_FIRST + 5 + step;

type Family = { name: string; quota: number; pool: Block[][] };
const sums = (low: number, high: number) => { const out: (readonly [number, number])[] = []; for (const a of DEEP_LENGTHS) for (const b of DEEP_LENGTHS) if (a <= b && a + b >= low && a + b <= high) out.push([a, b]); return out; };
/** Every picture a family can show: each shape in `lengths`, drawn forward-first and turn-first, with a pen colour on every other one. */
const rosette = (outer: number, inner: number, lengths: readonly number[], extra: Block[] = [], growFirst = false, outerAngle = 360 / outer): Block[][] => {
  const out: Block[][] = [];
  lengths.forEach((a, i) => [false, true].forEach(turnFirst => {
    const body = turnFirst ? [t(360 / inner), f(a)] : [f(a), t(360 / inner)];
    const loop = r(outer, ...(growFirst ? extra : []), r(inner, ...body), t(outerAngle), ...(growFirst ? [] : extra));
    out.push(i % 2 ? [k(['coral', 'teal', 'gold'][i % 3] as 'coral'), loop] : [loop]);
  }));
  return out;
};
const g: Block = { kind: 'grow' };
const outerTurns = [3, 4, 5, 6, 8, 9] as const;
const growing = (inner: number, growFirst: boolean) => outerTurns.flatMap(outer => [40, 50, 60].flatMap(a => rosette(outer, inner, [a], [g], growFirst).slice(0, 1)));
/** A loop whose body walks two sides; with turns that add to a multiple of the loop's angle, every such loop closes. */
const pairs = (lengths: readonly number[], times: number, x: number, y: number, distinct = true): Block[][] => lengths.flatMap(a => lengths.flatMap(b => distinct && a === b ? [] : [[r(times, f(a), t(x), f(b), t(y))]]));
const SMALL = [40, 50, 60, 70] as const;
const FAMILIES: Family[][] = [
  [
    { name: 'pentagon', quota: 6, pool: DEEP_LENGTHS.map(a => [r(5, f(a), t(72))]) },
    { name: 'long-pentagon', quota: 6, pool: sums(110, 200).map(([a, b]) => [r(5, f(a), f(b), t(72))]) },
    { name: 'pentagon-pair', quota: 6, pool: spread(pairs(DEEP_LENGTHS, 5, 72, 72), 30) },
    { name: 'pentagon-rosette', quota: 6, pool: [...rosette(5, 3, SMALL), ...rosette(5, 4, SMALL), ...rosette(5, 6, [40, 50])] },
  ],
  [
    { name: 'star', quota: 6, pool: DEEP_LENGTHS.map(a => [r(5, f(a), t(144))]) },
    { name: 'long-star', quota: 6, pool: sums(110, 200).map(([a, b]) => [r(5, f(a), f(b), t(144))]) },
    { name: 'zig-star', quota: 6, pool: [...spread(pairs(DEEP_LENGTHS, 5, 72, 144), 20), ...pairs(DEEP_LENGTHS, 5, 144, 72)] },
    { name: 'twin-star', quota: 6, pool: pairs(DEEP_LENGTHS, 5, 144, 144) },
  ],
  [
    { name: 'nonagon', quota: 6, pool: DEEP_LENGTHS.map(a => [r(9, f(a), t(40))]) },
    { name: 'bent-nonagon', quota: 6, pool: spread(DEEP_LENGTHS.slice(0, 4).flatMap(a => DEEP_LENGTHS.slice(0, 4).flatMap(b => DEEP_LENGTHS.slice(0, 4).filter(c => !(a === b && b === c)).map(c => [r(3, f(a), t(40), f(b), t(40), f(c), t(40))]))), 40) },
    { name: 'nine-rosette', quota: 6, pool: [...rosette(9, 3, [40, 50, 60]), ...rosette(9, 4, [40, 50, 60]), ...rosette(9, 5, [40, 50])] },
    { name: 'nine-zig', quota: 6, pool: [...pairs(SMALL, 9, 40, 120), ...pairs(SMALL, 9, 120, 40)] },
  ],
  [
    { name: 'growing-triangles', quota: 5, pool: growing(3, false) },
    { name: 'growing-squares', quota: 5, pool: growing(4, false) },
    { name: 'growing-hexagons', quota: 5, pool: growing(6, false) },
    { name: 'growing-rectangles', quota: 5, pool: outerTurns.flatMap(outer => [[40, 50], [40, 60], [50, 60], [40, 70]].map(([a, b]) => [r(outer, r(2, f(a), t(90), f(b), t(90)), t(360 / outer), g)])) },
    { name: 'grow-first', quota: 4, pool: [...growing(3, true), ...growing(4, true), ...growing(6, true)] },
  ],
  [
    { name: 'star-growth', quota: 5, pool: [3, 4, 6].flatMap(inner => [40, 50, 60].flatMap(a => rosette(5, inner, [a], [g], false, 144).slice(0, 1))) },
    { name: 'nine-growth', quota: 5, pool: [3, 4, 5].flatMap(inner => [40, 50, 60].flatMap(a => rosette(9, inner, [a], [g]).slice(0, 1))) },
    { name: 'compound', quota: 5, pool: [[3, 3, 3], [3, 3, 4], [3, 4, 3], [4, 3, 3], [3, 3, 5], [5, 3, 3], [3, 5, 3], [4, 4, 3], [3, 4, 4], [4, 3, 4]].flatMap(([A, B, C]) => [40, 50].map(a => [r(A, r(B, r(C, f(a), t(360 / C)), t(360 / B)), t(360 / A))])) },
    { name: 'five-nine', quota: 5, pool: [40, 50].flatMap(a => [[r(5, r(9, f(a), t(40)), t(72))], [r(9, r(5, f(a), t(72)), t(40))], [r(9, r(5, f(a), t(144)), t(40))], [r(5, r(5, f(a), t(144)), t(72))], [r(5, r(5, f(a), t(72)), t(144))]]) },
    { name: 'long-sides', quota: 4, pool: sums(120, 200).flatMap(([a, b]) => [[r(4, f(a), f(b), t(90))], [r(3, f(a), f(b), t(120))], [r(6, f(a), f(b), t(60))]]) },
  ],
];

/** How a program is often misread. Each returns null when it would change nothing. */
const mapRepeats = (blocks: Block[], fn: (b: Extract<Block, { kind: 'repeat' }>, index: number) => Block): Block[] => { let n = 0; const go = (list: Block[]): Block[] => list.map(b => b.kind === 'repeat' ? fn({ ...b, body: go(b.body) }, n++) : b); return go(blocks); };
const repeatCount = (blocks: Block[]) => { let n = 0; mapRepeats(blocks, b => { n++; return b; }); return n; };
export const misreads = {
  /** Read every Repeat as "once". */
  once: (blocks: Block[]): Block[] => blocks.flatMap<Block>(b => b.kind === 'repeat' ? misreads.once(b.body) : [b]),
  outerCount: (blocks: Block[]): Block[] => { const times = (blocks.find(b => b.kind === 'repeat') as Extract<Block, { kind: 'repeat' }> | undefined)?.times ?? 4; const to = DEEP_COUNTS.filter(n => n !== times).sort((a, b) => Math.abs(a - times) - Math.abs(b - times))[0]; return blocks.map(b => b === blocks.find(x => x.kind === 'repeat') ? { ...(b as Extract<Block, { kind: 'repeat' }>), times: to } : b); },
  innerCount: (blocks: Block[]): Block[] => { const total = repeatCount(blocks); return total < 2 ? [] : mapRepeats(blocks, (b, i) => i === 0 ? { ...b, times: DEEP_COUNTS.filter(n => n !== b.times).sort((x, y) => Math.abs(x - b.times) - Math.abs(y - b.times))[0] } : b); },
  firstTurn: (blocks: Block[]): Block[] => { let done = false; const go = (list: Block[]): Block[] => list.map(b => { if (b.kind === 'repeat') return { ...b, body: go(b.body) }; if (b.kind === 'turn' && !done) { done = true; return { kind: 'turn', angle: DEEP_TURNS.filter(a => a !== b.angle).sort((x, y) => Math.abs(x - b.angle) - Math.abs(y - b.angle))[0] }; } return b; }); return go(blocks); },
  noGrow: (blocks: Block[]): Block[] => blocks.flatMap<Block>(b => b.kind === 'grow' ? [] : b.kind === 'repeat' ? [{ ...b, body: misreads.noGrow(b.body) }] : [b]),
  firstLength: (blocks: Block[]): Block[] => { let done = false; const go = (list: Block[]): Block[] => list.map(b => { if (b.kind === 'repeat') return { ...b, body: go(b.body) }; if (b.kind === 'forward' && !done) { done = true; return { kind: 'forward', n: b.n >= 100 ? b.n - 10 : b.n + 10 }; } return b; }); return go(blocks); },
};
export type Misread = keyof typeof misreads;
/** Pictures that a reader who skimmed would draw. At the top rungs the first is always "ignore the Repeat". */
export function choicesFor(program: Block[], tier: number, rotate: number): { blocks: Block[][]; answer: number; kinds: (Misread | 'answer')[] } {
  const answer = draw(program, undefined)!, seen: Segment[][] = [answer], wrong: { blocks: Block[]; kind: Misread }[] = [];
  const order: Misread[] = tier >= 5 ? ['once', 'outerCount', 'firstTurn', 'innerCount', 'firstLength', 'noGrow'] : tier >= 3 ? ['firstTurn', 'outerCount', 'firstLength', 'noGrow', 'innerCount', 'once'] : ['firstTurn', 'firstLength', 'noGrow', 'outerCount', 'innerCount', 'once'];
  for (const kind of order) {
    if (wrong.length === 3) break;
    const blocks = misreads[kind](program);
    const lines = blocks.length ? draw(blocks) : null;
    if (!lines || !lines.length || seen.some(s => samePicture(s, lines))) continue;
    wrong.push({ blocks, kind }); seen.push(lines);
  }
  if (wrong.length < 3) throw new Error(`Predict ${formatBlocks(program)}: only ${wrong.length} different misreadings`);
  const at = rotate % 4, all = [...wrong.map(w => w.blocks)], kinds = wrong.map(w => w.kind) as (Misread | 'answer')[];
  all.splice(at, 0, program); kinds.splice(at, 0, 'answer');
  return { blocks: all, answer: at, kinds };
}

export type DeepBuild = { kind: 'build'; step: number; family: string; tier: number; target: string; origin: [number, number]; min: number; tray: number; hash: string; alts: string[]; flat: number };
export type DeepPredict = { kind: 'predict'; step: number; family: string; tier: number; program: string; origin: [number, number]; min: number; hash: string; choices: string[]; answer: number; misreads: string[] };
export type DeepRow = DeepBuild | DeepPredict;
const difficulty = (p: Proved) => p.min * 20 + blockDepth(p.blocks) * 10 + flatCost(p.blocks) / 4;

export function generateDeep(used: Segment[][]): { steps: { build: DeepBuild[]; predict: DeepPredict[] }[]; lines: Segment[][] } {
  const steps: { build: DeepBuild[]; predict: DeepPredict[] }[] = [], taken = [...used];
  FAMILIES.forEach((families, step) => {
    const picked: Proved[] = [];
    for (const family of families) {
      let n = 0;
      const quota = family.quota;
      for (const blocks of family.pool) {
        if (n === quota) break;
        const proved = prove({ family: family.name, tier: 1, blocks, score: 0 } as Candidate, taken, DEEP_COUNTS, false);
        if (proved && flatCost(proved.blocks) <= 120) { picked.push(proved); taken.push(proved.lines); n++; }
      }
      if (n < quota) throw new Error(`Deep Water ${STEPS[step].name} ${family.name}: only ${n} of ${quota} certified pictures`);
    }
    const sorted = picked.sort((a, b) => difficulty(a) - difficulty(b));
    if (sorted.length !== 24) throw new Error(`Deep Water ${STEPS[step].name}: ${sorted.length} of 24 pictures`);
    const build: DeepBuild[] = [], predict: DeepPredict[] = [];
    sorted.forEach((p, i) => {
      const slot = Math.floor(i / 2), tier = 1 + Math.floor((slot * 6) / 12);
      if (i % 2 === 0) {
        // The shipped answer is always a fewest-blocks program, whichever way it was first written.
        const programs = [p.blocks, ...p.alts].filter(b => blockCost(b) === p.min), [answer, ...others] = programs;
        build.push({ kind: 'build', step, family: p.family, tier, target: formatBlocks(answer), origin: [p.origin.x, p.origin.y], min: p.min, tray: p.min + 1, hash: p.hash, alts: others.map(formatBlocks), flat: flatCost(p.blocks) });
      }
      else {
        const picks = choicesFor(p.blocks, tier, step * 5 + slot * 3 + 1);
        predict.push({ kind: 'predict', step, family: p.family, tier, program: formatBlocks(p.blocks), origin: [p.origin.x, p.origin.y], min: p.min, hash: p.hash, choices: picks.blocks.map(formatBlocks), answer: picks.answer, misreads: picks.kinds });
      }
    });
    steps.push({ build, predict });
  });
  return { steps, lines: taken };
}
