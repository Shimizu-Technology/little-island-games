import { describe, expect, it } from 'vitest';
import { isCertified, certify, type CertifyContext } from '../src/puzzles/checks';
import { BOT_STEPS, botSteps, runBots } from '../src/puzzles/bots';
import { logicLagoonAdapter } from '../src/puzzles/adapters/logic-lagoon';
import { mazeAdapter } from '../src/puzzles/adapters/maze';
import { logicProofFamily, mazeProofFamily } from '../scripts/puzzles/proof-families';
import { splitPacks } from '../scripts/puzzles/pipeline';
import { hardBand, openBand, toyAdapter, toyCore, toySpec, type ToyAction, type ToyPayload, type ToyState } from './helpers/puzzle-toy';
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
  describe('R11: hints may not use hidden information anywhere', () => {
    const hiddenWorld = toyCore({ payload: { goal: 5, tag: 9 } });
    const sameWorld = { view: (s: ToyState) => s, twins: (s: ToyState) => [{ state: s, descriptor: hiddenWorld }] };
    const hiddenFamily = { hiddenInformation: true };
    it('rejects a hint that changes with information the player cannot see', () => {
      expect(reason({ hint: (_, d) => (d.payload.tag ? 2 : 1), hidden: sameWorld }, hiddenFamily)).toBe('hint-leak');
    });
    it('rejects a leak that only starts on a later hint', () => {
      expect(reason({ hint: (s, d) => (s.at === 0 ? 1 : d.payload.tag ? 2 : 1), hidden: sameWorld }, hiddenFamily)).toBe('hint-leak');
    });
    it('checks states off the hinted route too', () => {
      const offRoute = (s: ToyState, d: { payload: ToyPayload }): ToyAction => (s.at % 2 ? (d.payload.tag ? 2 : 1) : s.at === 4 ? 1 : 2);
      expect(reason({ hint: offRoute, hidden: sameWorld }, hiddenFamily)).toBe('hint-leak');
    });
    it('accepts hints that only use the public view', () => {
      expect(reason({ hint: () => 1, hidden: sameWorld }, hiddenFamily)).toBe('accepted');
    });
    it('does not skip the gate when a hidden family supplies no twins', () => {
      expect(reason({ hint: () => 1 }, hiddenFamily)).toBe('hint-unproven');
      expect(reason({ hint: () => 1, hidden: { view: s => s, twins: () => [] } }, hiddenFamily)).toBe('hint-unproven');
    });
    it('refuses twins that prove nothing', () => {
      expect(reason({ hint: () => 1, hidden: { view: s => s, twins: (s, d) => [{ state: s, descriptor: d }] } }, hiddenFamily)).toBe('hint-unproven');
      expect(reason({ hint: () => 1, hidden: { view: (s, d) => [s.at, d.payload.tag ?? 0], twins: sameWorld.twins } }, hiddenFamily)).toBe('hint-unproven');
      expect(reason({ hint: () => 1, hidden: { view: s => s, twins: () => [{ state: { at: 0.5 }, descriptor: hiddenWorld }] } }, hiddenFamily)).toBe('hint-unproven');
    });
    it('leaves families with nothing hidden, or no hints, alone', () => {
      expect(reason({ hint: () => 1 })).toBe('accepted');
      expect(reason({}, hiddenFamily)).toBe('accepted');
    });
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
describe('R3: a certificate cannot be altered', () => {
  type Writable = { row: string; witnessHash: string; solve: { upper: number }; bots: { beat: boolean }[]; core: { payload: { goal: number } } };
  const certified = () => {
    const r = certify(toySpec(), openBand, toyCore(), ctx());
    if (!r.ok) throw new Error(r.reason);
    return r.entry;
  };
  it('freezes the row, its hashes and every nested proof fact', () => {
    const entry = certified(), open = entry as unknown as Writable, row = entry.row;
    expect(() => { open.row = '[1,"a","t",999]'; }).toThrow(TypeError);
    expect(() => { open.witnessHash = 'x'; }).toThrow(TypeError);
    expect(() => { open.solve.upper = 1; }).toThrow(TypeError);
    expect(() => { open.bots[0].beat = true; }).toThrow(TypeError);
    expect(() => open.bots.push({ beat: true })).toThrow(TypeError);
    expect(() => { open.core.payload.goal = 1; }).toThrow(TypeError);
    expect(entry.row).toBe(row);
    expect(splitPacks([entry], 80)[0][0].row).toBe(row);
  });
  it('does not let a look-alike borrow the brand', () => {
    const entry = certified();
    expect(() => splitPacks([{ ...entry, row: '[1,"a","t",999]' }], 80)).toThrow(/certified/);
  });
});
describe('R4: missing measurements fail closed', () => {
  it('rejects a limit on a metric the adapter does not report', () => {
    expect(reason({}, {}, openBand, toyCore({ limits: [{ metric: 'cards', max: 1 }] }))).toBe('metric-missing');
  });
  it('rejects a par or scored objective in a metric the adapter does not report', () => {
    const cards = { solve: () => ({ status: 'solved' as const, witness: [2, 2, 1] as ToyAction[], metric: 'cards' as const, lower: 3, upper: 3, exact: true }) };
    expect(reason(cards, {}, openBand, toyCore({ par: { metric: 'cards', lower: 3, upper: 3, exact: true } }))).toBe('metric-missing');
    expect(reason(cards, {}, openBand, toyCore({ par: null }))).toBe('metric-missing');
  });
  it.each([['negative', -1], ['fractional', 1.5], ['not a number', Number.NaN], ['infinite', Number.POSITIVE_INFINITY]])('rejects a %s measurement', (_, steps) => {
    expect(reason({ metrics: () => ({ steps }) }, {}, openBand, toyCore({ par: null }))).toBe('metric-missing');
  });
  it('checks solver bounds against the measured witness even with no par on the descriptor', () => {
    const claim = (lower: number, upper: number, exact: boolean) => ({ solve: () => ({ status: 'solved' as const, witness: [2, 2, 1] as ToyAction[], metric: 'steps' as const, lower, upper, exact }) });
    expect(reason(claim(1, 1, true), {}, openBand, toyCore({ par: null }))).toBe('par-mismatch');
    expect(reason(claim(4, 4, true), {}, openBand, toyCore({ par: null }))).toBe('par-mismatch');
    expect(reason(claim(2, 3, true), {}, openBand, toyCore({ par: null }))).toBe('par-mismatch');
    expect(reason(claim(2, 3, false), {}, openBand, toyCore({ par: null }))).toBe('accepted');
  });
});
describe('R5: certified means the engine accepts its own states', () => {
  it('rejects a puzzle whose opening state fails the validator', () => {
    expect(reason({ validState: (x): x is ToyState => false })).toBe('invalid-state');
  });
  it('rejects a witness that walks through an invalid state', () => {
    expect(reason({ validState: (x): x is ToyState => (x as ToyState).at < 3 })).toBe('witness-replay');
  });
  it('rejects a state only a wandering player would reach', () => {
    expect(reason({ validState: (x): x is ToyState => (x as ToyState).at % 2 === 0 || (x as ToyState).at === 5 })).toBe('invalid-state');
  });
  const roundTrip = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
  describe('maze validator', () => {
    const family = mazeProofFamily(), core = Array.from({ length: 40 }, (_, i) => family.generate(i + 1, family.bands[0])!).find(c => c.payload.walls[0] & 2 || c.payload.walls[0] & 4)!;
    const start = mazeAdapter.create(core), step = mazeAdapter.actions(start, core)[0], moved = mazeAdapter.reduce(start, step, core);
    const size = core.payload.size, blocked = core.payload.walls[0] & 2 ? 1 : size;
    it('accepts legal states through a JSON round trip', () => {
      const solved = (mazeAdapter.solve(core, 20_000) as { witness: number[] }).witness.reduce((s, a) => mazeAdapter.reduce(s, a, core), start);
      for (const s of [start, moved, solved]) expect(mazeAdapter.validState(roundTrip(s), core)).toBe(true);
    });
    it.each<[string, () => unknown]>([
      ['a step through a wall', () => ({ ...start, path: [0, blocked] })],
      ['a jump between far cells', () => ({ ...start, path: [0, size * size - 1] })],
      ['a path that does not start at the entrance', () => ({ ...moved, path: moved.path.slice(1) })],
      ['an empty path', () => ({ ...start, path: [] })],
      ['a cell off the board', () => ({ ...start, path: [0, -1] })],
      ['a retraced step the engine would have undone', () => ({ ...moved, path: [0, step, 0] })],
      ['different walls', () => ({ ...start, walls: start.walls.map((w, i) => (i ? w : w ^ 1)) })],
      ['a different size', () => ({ ...start, size: size + 1 })],
      ['a different seed', () => ({ ...start, seed: start.seed + 1 })],
      ['another game', () => ({ ...start, game: 'tic' })],
      ['an unknown field', () => ({ ...start, extra: 1 })],
      ['a non-object', () => 7],
    ])('rejects %s', (_, corrupt) => expect(mazeAdapter.validState(corrupt(), core)).toBe(false));
  });
  describe('Logic Lagoon validator', () => {
    const family = logicProofFamily(), core = family.generate(5, family.bands[1])!;
    const start = logicLagoonAdapter.create(core), blank = core.payload.givens.findIndex(v => !v), given = core.payload.givens.findIndex(Boolean);
    const moved = logicLagoonAdapter.reduce(start, [blank, 1], core), cells = core.payload.givens.length;
    const entriesWith = (cell: number, value: number) => Array.from({ length: cells }, (_, i) => (i === cell ? value : 0));
    it('accepts legal states through a JSON round trip, including a finished round', () => {
      const witness = (logicLagoonAdapter.solve(core, 20_000) as { witness: (readonly [number, number])[] }).witness;
      const solved = witness.reduce((s, a) => logicLagoonAdapter.reduce(s, a, core), start);
      expect(logicLagoonAdapter.solved(solved, core)).toBe(true);
      for (const s of [start, moved, solved]) expect(logicLagoonAdapter.validState(roundTrip(s), core)).toBe(true);
    });
    it.each<[string, () => unknown]>([
      ['an entry over a given', () => ({ ...start, entries: entriesWith(given, 1) })],
      ['an entry above the grid size', () => ({ ...start, entries: entriesWith(blank, 9) })],
      ['too many entries', () => ({ ...start, entries: [...entriesWith(blank, 1), 0] })],
      ['entries left on a finished round', () => ({ ...start, index: core.payload.index + 1, entries: entriesWith(blank, 1) })],
      ['another round', () => ({ ...start, index: core.payload.index + 2 })],
      ['another level', () => ({ ...start, level: core.payload.level + 1 })],
      ['another seed', () => ({ ...start, seed: core.payload.seed + 1 })],
      ['a changed total', () => ({ ...start, total: 3 })],
      ['a non-boolean help flag', () => ({ ...start, helped: 'no' })],
      ['an unknown field', () => ({ ...start, extra: 1 })],
      ['null', () => null],
    ])('rejects %s', (_, corrupt) => expect(logicLagoonAdapter.validState(corrupt(), core)).toBe(false));
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
    // Six policies have no progress heuristic to call; each plays once and is then replayed once.
    expect(route.length).toBeLessThanOrEqual(botSteps(1) * 6 * 2);
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

describe('F4 round-two proof regressions', () => {
  it.each([[NaN,NaN],[-1,3],[0,Infinity],[0,3.5],[0,4097],[4,3]])('R2-2 rejects invalid solver bounds %s/%s without a par', (lower,upper) => {
    expect(reason({solve:()=>({status:'solved',witness:[2,2,1],metric:'steps',lower,upper,exact:lower===upper})}, {}, openBand, toyCore({par:null}))).toBe('par-mismatch');
  });
  it.each(['root','nested container'])('R2-3 deeply freezes a shallow-frozen %s', place => {
    const core=toyCore({speech:{template:'say',numbers:[1],terms:[]}}); Object.freeze(place==='root'?core:core.speech);
    const r=certify(toySpec({knownSpeech:()=>true}),openBand,core,ctx()); expect(r.ok).toBe(true);
    if(r.ok){expect(Object.isFrozen(r.entry.core.payload)).toBe(true);expect(Object.isFrozen(r.entry.core.speech!.numbers)).toBe(true);expect(()=>{r.entry.core.payload.goal=999;}).toThrow();expect(()=>r.entry.core.speech!.numbers.push(9)).toThrow();}
  });
  it('R2-4 rejects a JSON-round-tripped path continuing past the exit',()=>{
    const core={...toyCore(),payload:{size:3,walls:[9,1,3,8,0,2,12,4,6]}};
    const start=mazeAdapter.create(core), path=[0,1,2,5,8,7,6,3];
    const real=path.slice(1).reduce((s,a)=>mazeAdapter.reduce(s,a,core),start);
    expect(real.path).toEqual([0,1,2,5,8]);
    expect(mazeAdapter.validState(JSON.parse(JSON.stringify({...start,path})),core)).toBe(false);
    expect(mazeAdapter.validState(JSON.parse(JSON.stringify(real)),core)).toBe(true);
  });
});
