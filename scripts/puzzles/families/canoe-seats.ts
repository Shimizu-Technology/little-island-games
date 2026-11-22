import { canoeSeatsAdapter, depthHolds, minimal, rungRules, semanticKey } from '../../../src/puzzles/adapters/canoe-seats';
import { attrOf, chainsAlone, countBySearch, countSeatings, grade, holdsAt, items, POOLS, UNARY, validPuzzle, type CanoePuzzle, type Clue, type Kind } from '../../../src/learn/games/canoe-seats/rules';
import { createRng, type Rng } from '../../../src/puzzles/rng';
import { parFrom } from '../../../src/puzzles/solver';
import { fnv1a32 } from '../../../src/puzzles/today';
import type { BandQuota, DescriptorCore, FamilySpec } from '../../../src/puzzles/types';

/**
 * Rungs from the validated audit ladder (v3 master-audit puzzles, "Canoe Seats"). Each rung names
 * the clue kinds it may use; `teach` lists the kinds it introduces, which get their own teaching rows.
 */
export const rungs = {
  a: { n: 2, attrs: 1, kinds: ['at'], teach: ['at'] },
  b: { n: 3, attrs: 1, kinds: ['at', 'end', 'next', 'ahead'], teach: ['ahead', 'next', 'end'] },
  c: { n: 4, attrs: 1, kinds: ['at', 'end', 'next', 'far', 'ahead'], teach: ['far'] },
  d: { n: 5, attrs: 1, kinds: ['end', 'mid', 'next', 'far', 'ahead', 'gap'], teach: ['gap', 'mid'] },
  e: { n: 5, attrs: 1, kinds: ['end', 'mid', 'next', 'far', 'ahead', 'gap'], teach: ['whatif'] },
  f: { n: 4, attrs: 2, kinds: ['at', 'end', 'same', 'diff', 'next', 'far', 'ahead'], teach: ['same', 'diff'] },
  g: { n: 5, attrs: 2, kinds: ['same', 'diff', 'end', 'next', 'far', 'ahead', 'gap'], teach: [] },
  h: { n: 5, attrs: 3, kinds: ['same', 'diff', 'end', 'mid', 'next', 'far', 'ahead', 'gap'], teach: [] },
} as const satisfies Record<string, { n: number; attrs: number; kinds: readonly Kind[]; teach: readonly (Kind | 'whatif')[] }>;
export type Rung = keyof typeof rungs;
/** One seed in eight makes a teaching row while a rung has kinds to teach. */
const TEACH_EVERY = 8;

/** Every true clue of the allowed kinds about this answer, in a fixed order. */
export function trueClues(base: CanoePuzzle, answer: readonly number[], kinds: readonly Kind[]): Clue[] {
  const out: Clue[] = [], total = items(base);
  const push = (c: Clue) => { if (validPuzzle({ ...base, clues: [c] }) && holdsAt(c, base.n, answer[c.x], c.y === undefined ? 0 : answer[c.y])) out.push(c); };
  for (let x = 0; x < total; x++) {
    for (const k of kinds) if (UNARY.has(k)) push(k === 'at' ? { k, x, s: answer[x] } : { k, x });
    for (let y = 0; y < total; y++) if (y !== x) for (const k of kinds) if (!UNARY.has(k) && (k === 'ahead' || x < y)) push({ k, x, y });
  }
  return out;
}
const unique = (base: CanoePuzzle, clues: Clue[]) => { const r = countBySearch({ ...base, clues }, 2); return r.status === 'counted' && r.count === 1; };
/** Adds true clues until one seating is left, then removes every clue the rest already imply. */
function settle(rng: Rng, base: CanoePuzzle, pool: readonly Clue[], keep: readonly Clue[] = []): Clue[] | null {
  let chosen = [...keep];
  if (!unique(base, chosen)) for (const c of pool) { chosen.push(c); if (unique(base, chosen)) break; }
  if (!unique(base, chosen)) return null;
  for (const c of rng.shuffle(chosen)) {
    if (keep.includes(c)) continue;
    const rest = chosen.filter(x => x !== c);
    if (rest.length && unique(base, rest)) chosen = rest;
  }
  return chosen;
}
function draw(rng: Rng, band: Rung): { base: CanoePuzzle; answer: number[] } {
  const r = rungs[band], cast: number[] = [], answer: number[] = [];
  for (let a = 0; a < r.attrs; a++) {
    cast.push(...rng.shuffle(Array.from({ length: POOLS[a] }, (_, i) => i)).slice(0, r.n));
    answer.push(...rng.shuffle(Array.from({ length: r.n }, (_, i) => i)));
  }
  return { base: { n: r.n, attrs: r.attrs, cast, clues: [] }, answer };
}
/** The structure a person would recognise after renaming every friend, hat and fruit. */
function structure(p: CanoePuzzle, answer: readonly number[]): string {
  const rel = (i: number) => `${attrOf(p, i)}@${answer[i]}`;
  return p.clues.map(c => `${c.k}:${rel(c.x)}:${c.y === undefined ? '' : rel(c.y)}`).sort().join('|');
}
export function generateCanoe(seed: number, band: Rung): DescriptorCore<CanoePuzzle> | null {
  const rng = createRng(seed), r = rungs[band], rule = rungRules[band];
  const teachList = r.teach as readonly (Kind | 'whatif')[];
  const teach = teachList.length && seed % TEACH_EVERY === 0 ? teachList[Math.floor(seed / TEACH_EVERY) % teachList.length] : null;
  const { base, answer } = draw(rng, band);
  let clues: Clue[] | null;
  if (teach && teach !== 'whatif' && teach !== 'at') {
    // One clue of the new kind, made necessary, and only plain seat clues beside it.
    const own = rng.shuffle(trueClues(base, answer, [teach]))[0];
    if (!own) return null;
    clues = settle(rng, base, rng.shuffle(trueClues(base, answer, ['at'])), [own]);
    if (clues && !minimal({ ...base, clues })) return null;
  } else clues = settle(rng, base, rng.shuffle(trueClues(base, answer, r.kinds)));
  if (!clues || clues.length > rule.maxClues) return null;
  // A teaching row for "what if" is the smallest kind of what-if puzzle.
  if (teach === 'whatif' && clues.length > 4) return null;
  // Past the first rungs a regular puzzle uses at least two kinds of clue, so it never repeats one idea.
  if (!teach && band !== 'a' && new Set(clues.map(c => c.k)).size < 2) return null;
  const payload: CanoePuzzle = { ...base, clues: rng.shuffle(clues) };
  const exhaustive = countSeatings(payload, 2);
  if (exhaustive.status !== 'counted' || exhaustive.count !== 1) return null;
  // The first two rungs have only a handful of shapes, so their buckets also count who is in the canoe.
  const shape = band === 'a' || band === 'b' ? semanticKey(payload) : structure(payload, answer);
  const template = teach ? `teach-${teach}` : `t${fnv1a32(shape) % 8}`;
  if (!depthHolds(band, template, grade(payload), clues.length)) return null;
  if (rule.whatIf === 'needed' && chainsAlone(payload)) return null;
  if (rule.whatIf === 'never' && !chainsAlone(payload)) return null;
  const total = items(payload), bow = payload.cast[answer.indexOf(0)];
  return {
    format: 1, seed, rng: 1, band, layout: `bow-${bow}`, template, payload, objectives: [],
    limits: rungFamilyBand(band).advanced ? [{ metric: 'placements', max: total }] : [], par: parFrom('placements', total, total),
    teaches: teach ? [teach] : [], speech: null,
  };
}
const bands: BandQuota[] = [
  { id: 'a', target: 96, floor: 48, advanced: false },
  { id: 'b', target: 200, floor: 80, advanced: false },
  { id: 'c', target: 400, floor: 100, advanced: false },
  { id: 'd', target: 600, floor: 100, advanced: false },
  { id: 'e', target: 800, floor: 120, advanced: true },
  { id: 'f', target: 600, floor: 100, advanced: true },
  { id: 'g', target: 800, floor: 120, advanced: true },
  { id: 'h', target: 512, floor: 100, advanced: true },
];
const rungFamilyBand = (id: string) => bands.find(b => b.id === id)!;
export const canoeSeatsFamily: FamilySpec<CanoePuzzle> = {
  id: 'canoe-seats',
  adapter: canoeSeatsAdapter,
  sources: ['src/learn/games/canoe-seats/rules.ts', 'src/puzzles/adapters/canoe-seats.ts', 'scripts/puzzles/families/canoe-seats.ts'],
  bands,
  provenance: { source: 'original', note: 'Random seatings from a fixed RNG, clues added until one seating fits and then trimmed so every clue is needed. Each is proved unique by checking every seating, and graded by a separate person-style solver that must reach the same answer. No puzzle from any existing game.' },
  review: { ids: [], complete: false },
  maxRowBytes: 384,
  requiresUnique: true,
  requiresTrace: true,
  hiddenInformation: false,
  generate: (seed, band) => generateCanoe(seed, band.id as Rung),
};
