import {
  accepts, answerOf, attrOf, chainsAlone, clueToken, countBySearch, countSeatings, emptySeating, grade, items, litCount, nextPlacement, perms, place,
  puzzleTuple, tuplePuzzle, UNARY, validPuzzle, validSeating, type CanoePuzzle, type Grade, type Kind, type Seating,
} from '../../learn/games/canoe-seats/rules';
import { exactKeys, plain } from '../../state/saveBits';
import { sha256Hex } from '../sha256';
import type { Claim, DescriptorCore, PuzzleAdapter, SolveResult, TechniqueResult } from '../types';

/**
 * Pack tuple: [seats, attributes, cast digits, clues] (see `puzzleTuple`). An action is one
 * placement: `item * 8 + seat + 1`, or `item * 8` to send the item back to the shore.
 */
export type CanoeState = { pos: Seating };
export type CanoeAction = number;
type D = DescriptorCore<CanoePuzzle>;

export const encodeAction = (item: number, seat: number) => item * 8 + seat + 1;
export const decodeAction = (a: number) => ({ item: Math.floor(a / 8), seat: (a % 8) - 1 });
export const isPlacement = (a: unknown): a is number => Number.isInteger(a) && (a as number) >= 0 && (a as number) < 15 * 8 && (a as number) % 8 <= 5;

/** What each rung promises, proven per entry. Tiers come from the person-style grader. */
export const rungRules: Record<string, { tiers: readonly number[]; maxClues: number; minSteps: number; minWhatIfs: number; whatIf: 'never' | 'needed' | 'either' }> = {
  a: { tiers: [0], maxClues: 1, minSteps: 0, minWhatIfs: 0, whatIf: 'never' },
  b: { tiers: [0, 1], maxClues: 2, minSteps: 0, minWhatIfs: 0, whatIf: 'never' },
  c: { tiers: [1], maxClues: 4, minSteps: 8, minWhatIfs: 0, whatIf: 'never' },
  d: { tiers: [1], maxClues: 6, minSteps: 14, minWhatIfs: 0, whatIf: 'never' },
  e: { tiers: [2], maxClues: 6, minSteps: 14, minWhatIfs: 1, whatIf: 'needed' },
  f: { tiers: [1, 2], maxClues: 8, minSteps: 16, minWhatIfs: 0, whatIf: 'either' },
  g: { tiers: [2, 3], maxClues: 11, minSteps: 30, minWhatIfs: 2, whatIf: 'needed' },
  h: { tiers: [2, 3], maxClues: 13, minSteps: 45, minWhatIfs: 3, whatIf: 'needed' },
};
export const ceilings = ['direct', 'chain', 'what-if', 'what-if-twice'] as const;

const solve = (p: CanoePuzzle, budget: number): SolveResult<CanoeAction> => {
  const r = countSeatings(p, 1, Math.max(budget, 4_000_000));
  if (r.status !== 'counted') return { status: 'budget-exhausted', nodes: budget };
  if (!r.first) return { status: 'unsolved' };
  const answer = r.first;
  // Each item placed once, straight to its seat: no route can use fewer placements than there are items.
  return { status: 'solved', witness: answer.map((s, i) => encodeAction(i, s)), metric: 'placements', lower: items(p), upper: items(p), exact: true };
};
/** Concrete names, in any order: the dock order and clue order are only how the puzzle is shown. */
export function semanticKey(p: CanoePuzzle): string {
  const name = (i: number) => `${attrOf(p, i)}:${p.cast[i]}`;
  const tokens = p.clues.map(c => {
    const sym = c.k === 'next' || c.k === 'far' || c.k === 'gap' || c.k === 'same' || c.k === 'diff';
    const pair = c.y === undefined ? [name(c.x)] : sym ? [name(c.x), name(c.y)].sort() : [name(c.x), name(c.y)];
    return `${c.k}(${pair.join(',')}${c.s !== undefined ? `@${c.s}` : ''})`;
  }).sort();
  const cast = Array.from({ length: p.attrs }, (_, a) => p.cast.slice(a * p.n, (a + 1) * p.n).sort((x, y) => x - y).join('')).join('/');
  return `${p.n}x${p.attrs}|${cast}|${tokens.join(';')}`;
}
/** Every clue is needed: without any one of them, more than one seating fits. */
export function minimal(p: CanoePuzzle): boolean {
  return p.clues.every((_, i) => {
    const rest = { ...p, clues: p.clues.filter((__, j) => j !== i) };
    const r = countSeatings(rest, 2);
    return r.status === 'counted' && r.count >= 2;
  });
}
/** Teaching rows show one new kind of clue, and everything else is a plain seat clue. */
export const teachKind = (template: string): Kind | 'whatif' | null => template.startsWith('teach-') ? template.slice(6) as Kind | 'whatif' : null;
/**
 * The rung's depth promise. A teaching row for a new kind of clue is meant to be easy: beside plain
 * seat clues it may be solved directly, so it keeps only the rung's ceiling and its "what if" rule.
 */
export function depthHolds(band: string, template: string, g: Grade | null, clues: number): boolean {
  const rule = rungRules[band];
  if (!rule || !g || clues > rule.maxClues) return false;
  const taught = teachKind(template);
  if (taught && taught !== 'whatif') return g.tier <= Math.max(...rule.tiers);
  return rule.tiers.includes(g.tier) && g.steps >= rule.minSteps && g.whatIfs >= rule.minWhatIfs;
}
function claims(d: D): Claim[] {
  const p = d.payload, rule = rungRules[d.band], exhaustive = countSeatings(p, 2), g = grade(p);
  const universe = perms(p.n).length ** p.attrs;
  const one = exhaustive.status === 'counted' && exhaustive.count === 1 && exhaustive.seatings === universe;
  const out: Claim[] = [
    { id: 'exhaustive-unique', proven: one, evidence: exhaustive.status === 'counted' ? `fits:${exhaustive.count}/${exhaustive.seatings}` : 'budget' },
    { id: 'grader-agrees', proven: one && !!g && g.answer.join() === (exhaustive.status === 'counted' ? exhaustive.first?.join() : ''), evidence: g ? `tier:${g.tier}` : 'stalled' },
    { id: 'every-clue-needed', proven: minimal(p), evidence: `clues:${p.clues.length}` },
  ];
  if (rule) {
    out.push({ id: 'rung-depth', proven: depthHolds(d.band, d.template, g, p.clues.length), evidence: g ? `tier:${g.tier}/steps:${g.steps}/what-if:${g.whatIfs}` : 'stalled' });
    if (rule.whatIf === 'needed') out.push({ id: 'needs-what-if', proven: !chainsAlone(p), evidence: 'chaining the clues alone stalls' });
    if (rule.whatIf === 'never') out.push({ id: 'no-what-if', proven: chainsAlone(p), evidence: 'chaining the clues finishes' });
  }
  const taught = teachKind(d.template);
  if (taught && taught !== 'whatif') out.push({ id: `teaches-${taught}`, proven: p.clues.filter(c => c.k === taught).length === 1 && p.clues.every(c => c.k === taught || c.k === 'at'), evidence: p.clues.map(clueToken).join(',') });
  return out;
}
function technique(d: D): TechniqueResult {
  const g = grade(d.payload);
  return g ? { status: 'complete', ceiling: ceilings[g.tier], steps: g.steps, trace: g.trace } : { status: 'stalled' };
}
export const canoeSeatsAdapter: PuzzleAdapter<CanoePuzzle, CanoeState, CanoeAction> = {
  engine: 'canoe-seats', rules: 1, needsCheck: true,
  isPayload: (x): x is CanoePuzzle => plain(x) && exactKeys(x, ['n', 'attrs', 'cast', 'clues']) && Array.isArray(x.cast) && Array.isArray(x.clues)
    && x.clues.every(c => plain(c) && Object.keys(c).every(k => ['k', 'x', 'y', 's'].includes(k))) && validPuzzle(x as CanoePuzzle) && tuplePuzzle(puzzleTuple(x as CanoePuzzle)) !== null,
  isAction: isPlacement,
  encodePayload: puzzleTuple,
  decodePayload: tuplePuzzle,
  create: d => ({ pos: emptySeating(d.payload) }),
  validState: (x, d): x is CanoeState => plain(x) && exactKeys(x, ['pos']) && validSeating(d.payload, x.pos),
  reduce: (s, a, d) => {
    const { item, seat } = decodeAction(a), pos = place(d.payload, s.pos, item, seat);
    return pos === s.pos ? s : { pos };
  },
  actions: (s, d) => {
    const out: number[] = [];
    for (let i = 0; i < items(d.payload); i++) for (let seat = -1; seat < d.payload.n; seat++) if (s.pos[i] !== seat) out.push(encodeAction(i, seat));
    return out;
  },
  solved: (s, d) => accepts(d.payload, s.pos),
  metrics: (_, actions) => ({ placements: actions.length }),
  solve: (d, budget) => solve(d.payload, budget),
  semanticKey: d => semanticKey(d.payload),
  // The strongest public signal a player can have: how many clue cards are lit.
  progress: (s, d) => litCount(d.payload, s.pos),
  solutionHash: (s, d) => sha256Hex(`canoe|${puzzleTuple(d.payload).join('|')}|${s.pos.join()}`),
  hint: (s, d) => { const next = nextPlacement(d.payload, s.pos); return next ? encodeAction(next.item, next.seat) : null; },
  count: (d, cap, budget) => { const r = countSeatings(d.payload, cap, Math.max(budget, 4_000_000)); return r.status === 'counted' ? { status: 'counted', count: r.count } : r; },
  independentCount: (d, cap, budget) => countBySearch(d.payload, cap, budget),
  technique,
  claims,
};
export { answerOf, UNARY };
