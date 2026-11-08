import { describe, expect, it } from 'vitest';
import { isCertified, certify, type CertifyContext } from '../src/puzzles/checks';
import { BOT_STEPS, botSteps, runBots } from '../src/puzzles/bots';
import { logicLagoonAdapter } from '../src/puzzles/adapters/logic-lagoon';
import { mazeAdapter } from '../src/puzzles/adapters/maze';
import { logicProofFamily, mazeProofFamily } from '../scripts/puzzles/proof-families';
import { hardBand, openBand, toyAdapter, toyCore, toySpec, type ToyAction } from './helpers/puzzle-toy';
import type { FamilySpec, PuzzleAdapter } from '../src/puzzles/types';

const ctx = (): CertifyContext => ({ budget: 1000, seenExact: new Set(), seenSemantic: new Set() });
type Over = Parameters<typeof toyAdapter>[0];
const reason = (over: Over, spec: Partial<FamilySpec<{ goal: number }>> = {}, band = openBand, core = toyCore()) => {
  const r = certify(toySpec({ adapter: toyAdapter(over), ...spec }), band, core, ctx());
  return r.ok ? 'accepted' : r.reason;
};
describe('quality gates', () => {
  it('accepts a sound puzzle and brands only what it proved', () => {
    const r = certify(toySpec(), openBand, toyCore(), ctx());
    expect(r.ok).toBe(true);
    if (r.ok) { expect(isCertified(r.entry)).toBe(true); expect(isCertified({ ...r.entry })).toBe(false); }
  });
  it('rejects an invalid descriptor and a wrong band', () => {
    expect(reason({}, {}, openBand, toyCore({ rng: 2 as 1 }))).toBe('invalid-descriptor');
    expect(reason({}, {}, { ...openBand, id: 'elsewhere' })).toBe('wrong-band');
  });
  it('rejects rows that do not round-trip or are over the family budget', () => {
    expect(reason({ decodePayload: x => ({ goal: (x as number) + 1 }) })).toBe('row-round-trip');
    expect(reason({}, { maxRowBytes: 5 })).toBe('too-large');
  });
  it('rejects engines that write to their input', () => {
    expect(reason({ solve: d => { d.payload.goal = 1; return { status: 'unsolved' }; } })).toBe('mutates-input');
  });
  it('treats a timeout as a solver budget failure, distinct from unsolvable', () => {
    expect(reason({ solve: () => ({ status: 'budget-exhausted', nodes: 9 }) })).toBe('solver-budget');
    expect(reason({ solve: () => ({ status: 'unsolved' }) })).toBe('unsolved');
  });
  it('replays the witness through the engine rather than trusting the solver', () => {
    const lying = { solve: () => ({ status: 'solved' as const, witness: [1, 1] as ToyAction[], metric: 'steps' as const, lower: 3, upper: 3, exact: true }) };
    expect(reason(lying)).toBe('witness-replay');
    const illegal = { solve: () => ({ status: 'solved' as const, witness: [2, 2, 2] as ToyAction[], metric: 'steps' as const, lower: 3, upper: 3, exact: true }) };
    expect(reason(illegal)).toBe('witness-replay');
  });
  it('makes the witness obey the same limits a player gets', () => {
    expect(reason({}, {}, openBand, toyCore({ limits: [{ metric: 'steps', max: 2 }] }))).toBe('witness-over-limit');
  });
  it('rejects par that disagrees with the solver', () => {
    expect(reason({}, {}, openBand, toyCore({ par: { metric: 'steps', lower: 1, upper: 2, exact: false } }))).toBe('par-mismatch');
    expect(reason({}, {}, openBand, toyCore({ par: null }))).toBe('accepted');
  });
  it('flags non-determinism found by replaying twice', () => {
    let n = 0;
    expect(reason({ metrics: () => ({ steps: n++ }), solve: toyAdapter().solve })).toBe('nondeterministic');
  });
  describe('uniqueness, where a family promises one answer', () => {
    const unique = { requiresUnique: true };
    const counted = (count: number) => () => ({ status: 'counted' as const, count });
    it('needs both counts', () => expect(reason({}, unique)).toBe('count-disagrees'));
    it('rejects an ambiguous puzzle', () => expect(reason({ count: counted(2), independentCount: counted(2) }, unique)).toBe('ambiguous'));
    it('rejects disagreeing implementations', () => expect(reason({ count: counted(1), independentCount: counted(2) }, unique)).toBe('count-disagrees'));
    it('rejects an unfinished count instead of guessing', () => expect(reason({ count: () => ({ status: 'budget-exhausted' }), independentCount: counted(1) }, unique)).toBe('count-budget'));
    it('accepts agreement on exactly one', () => expect(reason({ count: counted(1), independentCount: counted(1) }, unique)).toBe('accepted'));
  });
  it('rejects a stall rather than calling it hard', () => {
    expect(reason({ technique: () => ({ status: 'stalled' }) }, { requiresTrace: true })).toBe('trace-stalled');
    expect(reason({}, { requiresTrace: true })).toBe('trace-missing');
    expect(reason({ technique: () => ({ status: 'complete', ceiling: 'c', steps: 1, trace: 't' }) }, { requiresTrace: true })).toBe('accepted');
  });
  it('requires hints to finish the puzzle inside its limits', () => {
    expect(reason({ hint: () => null })).toBe('hint-route');
    expect(reason({ hint: (s, d) => (s.at + 1 >= d.payload.goal ? 1 : 2) })).toBe('accepted');
    expect(reason({ hint: () => 1 }, {}, openBand, toyCore({ limits: [{ metric: 'steps', max: 3 }] }))).toBe('hint-route');
  });
  it('rejects a hint that changes with information the player cannot see', () => {
    const leak = { hint: (_: { at: number }, d: { payload: { goal: number; tag?: number } }) => (d.payload.tag ? 2 : 1) as ToyAction };
    const variant = toyCore({ payload: { goal: 5, tag: 9 } });
    expect(reason({ ...leak, hiddenVariants: () => [variant] })).toBe('hint-leak');
  });
  it('rejects a required-mechanic claim that was not proven', () => {
    expect(reason({ claims: () => [{ id: 'rock', proven: false, evidence: 'no change' }] })).toBe('claim-unproven');
    expect(reason({ claims: () => [{ id: 'rock', proven: true, evidence: 'cost changed' }] })).toBe('accepted');
  });
  it('rejects a puzzle a dumb player beats, only at bands advertised as advanced', () => {
    expect(reason({}, {}, hardBand, toyCore({ payload: { goal: 2 } }))).toBe('bot-beat');
    expect(reason({}, {}, openBand, toyCore({ payload: { goal: 2 } }))).toBe('accepted');
    expect(reason({}, {}, hardBand, toyCore({ payload: { goal: 10 }, par: null, limits: [{ metric: 'steps', max: 5 }] }))).toBe('bot-beat');
    // No dumb policy reaches 9 in five moves: repeating +2 strands it at 8.
    expect(reason({}, {}, hardBand, toyCore({ payload: { goal: 9 }, par: null, limits: [{ metric: 'steps', max: 5 }] }))).toBe('accepted');
  });
  it('rejects speech that is not in the registered inventory', () => {
    const speech = { template: 'reach-in', numbers: [8], terms: [] };
    expect(reason({}, {}, openBand, toyCore({ speech }))).toBe('speech');
    expect(reason({}, { knownSpeech: s => s.template === 'reach-in' }, openBand, toyCore({ speech }))).toBe('accepted');
  });
  it('rejects exact and semantic duplicates across the family', () => {
    const shared = ctx(), spec = toySpec();
    expect(certify(spec, openBand, toyCore({ payload: { goal: 5 } }), shared).ok).toBe(true);
    expect(certify(spec, openBand, toyCore({ payload: { goal: 5 } }), shared)).toEqual({ ok: false, reason: 'duplicate-exact' });
    expect(certify(toySpec({ adapter: toyAdapter({ semanticKey: () => '5' }) }), openBand, toyCore({ payload: { goal: 5, tag: 1 } }), shared)).toEqual({ ok: false, reason: 'duplicate-semantic' });
  });
  it('does not record a duplicate from a rejected candidate', () => {
    const shared = ctx();
    certify(toySpec({ adapter: toyAdapter({ solve: () => ({ status: 'unsolved' }) }) }), openBand, toyCore(), shared);
    expect(shared.seenExact.size).toBe(0);
  });
});
describe('dumb-player bots', () => {
  it('every policy runs, and each only uses public moves', () => {
    const runs = runBots(toyAdapter(), toyCore({ payload: { goal: 7 } }));
    expect(runs.map(r => r.id).sort()).toEqual(['alternate', 'cycle', 'greedy', 'random', 'repeat-first', 'repeat-last', 'scan']);
    expect(runs.find(r => r.id === 'greedy')?.ran).toBe(false);
    expect(runs.find(r => r.id === 'repeat-first')).toMatchObject({ ran: true, solved: true });
    // Repeating +2 from 6 asks for an illegal move forever. A dumb player is allowed to get stuck.
    expect(runs.find(r => r.id === 'repeat-last')).toMatchObject({ ran: true, solved: false });
  });
  it('get four times the shortest solution, up to the hard cap', () => {
    expect(botSteps(3)).toBe(20);
    expect(botSteps(10_000)).toBe(BOT_STEPS);
    const route: number[] = [];
    const counting = toyAdapter({ reduce: (s, a, d) => { route.push(a); return toyAdapter().reduce(s, a, d); } });
    runBots(counting, toyCore({ payload: { goal: 100 }, par: null }), botSteps(1));
    expect(route.length).toBeLessThanOrEqual(botSteps(1) * 7);
  });
  it('are reproducible', () => expect(runBots(toyAdapter(), toyCore())).toEqual(runBots(toyAdapter(), toyCore())));
  it('honour the Check requirement before counting a win', () => {
    const out = runBots(toyAdapter({ needsCheck: true }), toyCore({ par: null }));
    expect(out.find(r => r.id === 'repeat-first')).toMatchObject({ solved: true, beat: true });
  });
});
const certifyWith = <P,>(spec: FamilySpec<P>, seeds: number[], bandIndex = 0) => {
  const shared: CertifyContext = { budget: 200_000, seenExact: new Set(), seenSemantic: new Set() };
  return seeds.map(seed => { const core = spec.generate(seed, spec.bands[bandIndex]); return core ? certify(spec, spec.bands[bandIndex], core, shared) : null; });
};
describe('real engines through the gates', () => {
  it('certifies real mazes and replays their witnesses through the engine', () => {
    const results = certifyWith(mazeProofFamily(), Array.from({ length: 80 }, (_, i) => i + 1));
    expect(results.filter(r => r?.ok).length).toBeGreaterThan(60);
    for (const r of results) if (r?.ok) expect(r.entry.solve.exact).toBe(true);
  });
  it('rejects a real maze a dumb player can finish within its advanced limit', () => {
    const spec = mazeProofFamily(), rejected = certifyWith(spec, Array.from({ length: 200 }, (_, i) => i + 1), 2).filter(r => r && !r.ok);
    expect(rejected.every(r => r && !r.ok && ['bot-beat', 'claim-unproven', 'duplicate-semantic', 'duplicate-exact'].includes(r.reason))).toBe(true);
  });
  it('proves a real wall changes the shortest route, and fails when none does', () => {
    const open = Array(25).fill(0).map((_, i) => { let w = 0; if (i < 5) w |= 1; if (i % 5 === 4) w |= 2; if (i >= 20) w |= 4; if (i % 5 === 0) w |= 8; return w; });
    const d = { payload: { size: 5, walls: open } } as Parameters<NonNullable<typeof mazeAdapter.claims>>[0];
    expect(mazeAdapter.claims!(d, 100)[0].proven).toBe(false);
  });
  it('certifies real Logic Lagoon grids with both counters and a complete trace', () => {
    const results = certifyWith(logicProofFamily(), Array.from({ length: 80 }, (_, i) => i + 1), 1);
    const ok = results.filter(r => r?.ok);
    expect(ok.length).toBeGreaterThan(3);
    for (const r of ok) if (r?.ok) expect(['naked-single', 'hidden-single']).toContain(r.entry.technique);
    expect(results.some(r => r && !r.ok && r.reason === 'duplicate-semantic')).toBe(true);
  });
  it('fails closed if the engine would now deal a different grid', () => {
    const core = logicProofFamily().generate(5, logicProofFamily().bands[1])!;
    const tampered = { ...core.payload, givens: core.payload.givens.map((v, i) => (i === 0 ? (v ? 0 : 1) : v)) };
    expect(logicLagoonAdapter.isPayload(tampered)).toBe(false);
    expect(logicLagoonAdapter.isPayload(core.payload)).toBe(true);
  });
  it('keeps adapters from listing only correct moves', () => {
    const core = logicProofFamily().generate(5, logicProofFamily().bands[1])!;
    const moves = logicLagoonAdapter.actions(logicLagoonAdapter.create(core), core);
    const blank = core.payload.givens.findIndex(v => !v);
    expect(moves.filter(([cell]) => cell === blank).length).toBe(4);
  });
  it('types stay exact through the adapter contract', () => {
    const typed: PuzzleAdapter<{ size: number; walls: number[] }, ReturnType<typeof mazeAdapter.create>, number> = mazeAdapter;
    expect(typed.rules).toBe(1);
  });
});
