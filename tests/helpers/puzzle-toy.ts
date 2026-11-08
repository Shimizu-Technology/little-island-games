import type { BandQuota, DescriptorCore, FamilySpec, PuzzleAdapter } from '../../src/puzzles/types';

/** A tiny puzzle: count up to `goal` using +1 or +2. Tests swap single methods to break one gate at a time. */
export type ToyPayload = { goal: number; tag?: number };
export type ToyState = { at: number };
export type ToyAction = 1 | 2;
export type ToyAdapter = PuzzleAdapter<ToyPayload, ToyState, ToyAction>;
export const toyAdapter = (over: Partial<ToyAdapter> = {}): ToyAdapter => ({
  engine: 'toy', rules: 1, needsCheck: false,
  isPayload: (x): x is ToyPayload => Number.isInteger((x as ToyPayload)?.goal) && (x as ToyPayload).goal > 0,
  isAction: (x): x is ToyAction => x === 1 || x === 2,
  encodePayload: p => (p.tag === undefined ? p.goal : [p.goal, p.tag]),
  decodePayload: x => (typeof x === 'number' ? { goal: x } : Array.isArray(x) ? { goal: x[0], tag: x[1] } : null),
  create: () => ({ at: 0 }),
  validState: (x): x is ToyState => Number.isInteger((x as ToyState)?.at),
  reduce: (s, a, d) => (s.at + a > d.payload.goal ? s : { at: s.at + a }),
  actions: (s, d) => (s.at === d.payload.goal ? [] : [1, 2]),
  solved: (s, d) => s.at === d.payload.goal,
  metrics: (_, actions) => ({ steps: actions.length }),
  solve: (d, budget) => {
    if (budget < 1) return { status: 'budget-exhausted', nodes: budget };
    const n = Math.ceil(d.payload.goal / 2), witness: ToyAction[] = Array(Math.floor(d.payload.goal / 2)).fill(2);
    if (d.payload.goal % 2) witness.push(1);
    return { status: 'solved', witness, metric: 'steps', lower: n, upper: n, exact: true };
  },
  semanticKey: d => String(d.payload.tag ?? d.payload.goal),
  ...over,
});
export const toyCore = (over: Partial<DescriptorCore<ToyPayload>> = {}): DescriptorCore<ToyPayload> => {
  const goal = over.payload?.goal ?? 5, n = Math.ceil(goal / 2);
  return { format: 1, seed: goal, rng: 1, band: 'open', layout: 'a', template: 'x', payload: { goal }, objectives: [], limits: [], par: { metric: 'steps', lower: n, upper: n, exact: true }, teaches: [], speech: null, ...over };
};
export const openBand: BandQuota = { id: 'open', target: 8, floor: 1, advanced: false };
export const hardBand: BandQuota = { id: 'open', target: 8, floor: 1, advanced: true };
export const toySpec = (over: Partial<FamilySpec<ToyPayload>> = {}): FamilySpec<ToyPayload> => ({
  id: 'toy', adapter: toyAdapter(), bands: [openBand], provenance: { source: 'original', note: 'test' }, review: { ids: [], complete: false }, maxRowBytes: 200, requiresUnique: false, requiresTrace: false, hiddenInformation: false, sources: [],
  generate: seed => toyCore({ seed, payload: { goal: (seed % 40) + 1 }, layout: seed % 2 ? 'a' : 'b', template: `t${seed % 4}` }),
  ...over,
});
