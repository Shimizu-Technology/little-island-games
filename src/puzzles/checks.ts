import { measured, replayAttempt } from './attempt';
import { BOT_STEPS, botSteps, runBots, type BotRun } from './bots';
import { utf8Bytes } from '../state/saveBits';
import { canonical, decodeRow, deepFreeze, encodeRow, validCore } from './descriptor';
import { semanticHash } from './semantic';
import { sha256Hex } from './sha256';
import type { AttemptEvent, BandQuota, DescriptorCore, FamilySpec, Par, PuzzleAdapter } from './types';

export type Rejection = 'invalid-descriptor' | 'wrong-band' | 'row-round-trip' | 'too-large' | 'mutates-input' | 'nondeterministic' | 'engine-error'
  | 'unsolved' | 'solver-budget' | 'invalid-state' | 'witness-replay' | 'metric-missing' | 'witness-over-limit' | 'par-mismatch' | 'ambiguous' | 'count-disagrees' | 'count-budget'
  | 'trace-stalled' | 'trace-missing' | 'hint-route' | 'hint-leak' | 'hint-unproven' | 'claim-unproven' | 'bot-beat' | 'speech' | 'duplicate-exact' | 'duplicate-semantic';
/** Deep-frozen at runtime, so the proof always describes the bytes that get packed. */
export type CertifiedEntry<P = unknown> = {
  readonly core: Readonly<DescriptorCore<P>>;
  readonly row: string;
  readonly exactHash: string;
  readonly semanticHash: string;
  readonly witnessHash: string;
  readonly traceHash: string | null;
  readonly claimsHash: string | null;
  readonly solve: Readonly<{ metric: string; lower: number; upper: number; exact: boolean }>;
  readonly technique: string | null;
  readonly bots: readonly Readonly<BotRun>[];
};
export type CertifyContext = { budget: number; seenExact: Set<string>; seenSemantic: Set<string> };
export type CertifyResult<P> = { ok: true; entry: CertifiedEntry<P> } | { ok: false; reason: Rejection };

// Only `certify` can add here, so the packer cannot be handed an unproven entry or a swapped row.
const proven = new WeakMap<object, string>();
export const isCertified = (entry: { row: string }) => proven.get(entry) === entry.row;
const fail = (reason: Rejection) => ({ ok: false as const, reason });
const samePar = (a: Par | null, b: { metric: string; lower: number; upper: number; exact: boolean }) =>
  a === null || (a.metric === b.metric && a.lower === b.lower && a.upper === b.upper && a.exact === b.exact);

function hintRoute<P, S, A>(adapter: PuzzleAdapter<P, S, A>, d: DescriptorCore<P>) {
  const hint = adapter.hint;
  if (!hint) return true;
  let state = adapter.create(d);
  const events: AttemptEvent<A>[] = [];
  for (let i = 0; i < BOT_STEPS && !adapter.solved(state, d); i++) {
    const action = hint(state, d);
    if (action === null) return false;
    const next = adapter.reduce(state, action, d);
    if (next === state) return false;
    state = next;
    events.push(['a', action]);
  }
  if (adapter.needsCheck) events.push(['run']);
  const evidence = replayAttempt(adapter, d, events);
  return evidence?.outcome === 'solved' && evidence.withinLimits;
}

/**
 * Compares each hint with the hint given in every world the player could equally be in, at each state
 * along the hinted route, the witness and a wandering line. A family cannot pass by showing no worlds.
 */
function hiddenFinding<P, S, A>(adapter: PuzzleAdapter<P, S, A>, d: DescriptorCore<P>, witness: readonly A[]): Rejection | null {
  const { hint, hidden } = adapter;
  if (!hint) return null;
  if (!hidden || !hidden.twins(adapter.create(d), d).length) return 'hint-unproven';
  const compare = (s: S): Rejection | null => {
    const view = canonical(hidden.view(s, d)), shown = canonical(hint(s, d));
    for (const twin of hidden.twins(s, d)) {
      const other = deepFreeze(twin.descriptor);
      if (!validCore(other, adapter) || !adapter.validState(twin.state, other) || canonical(hidden.view(twin.state, other)) !== view) return 'hint-unproven';
      if (canonical(other) === canonical(d) && canonical(twin.state) === canonical(s)) return 'hint-unproven';
      if (canonical(hint(twin.state, other)) !== shown) return 'hint-leak';
    }
    return null;
  };
  const walk = (next: (s: S, step: number) => A | null | undefined): Rejection | null => {
    let state = adapter.create(d);
    for (let step = 0; step < botSteps(witness.length) && !adapter.solved(state, d); step++) {
      const finding = compare(state);
      if (finding) return finding;
      const action = next(state, step);
      if (action === null || action === undefined) return null;
      const moved = adapter.reduce(state, action, d);
      if (moved === state) return null;
      state = moved;
    }
    return null;
  };
  return walk(s => hint(s, d)) ?? walk((_, step) => witness[step]) ?? walk((s, step) => { const all = adapter.actions(s, d); return all[step % all.length]; });
}

/** The eight quality gates that can run by machine, for one candidate. Gates 7 and 8 finish in receipts. */
export function certify<P>(spec: FamilySpec<P>, band: BandQuota, candidate: DescriptorCore<P>, ctx: CertifyContext): CertifyResult<P> {
  const adapter = spec.adapter;
  // Gate 1: bounded decode, exact versions, round trip, immutability and deterministic replay.
  if (!validCore(candidate, adapter)) return fail('invalid-descriptor');
  if (candidate.band !== band.id) return fail('wrong-band');
  let row: string, exact: string;
  try {
    row = encodeRow(candidate, adapter);
    const decoded = decodeRow<P>(row, candidate.band, adapter);
    exact = canonical(candidate);
    if (!decoded || canonical(decoded) !== exact) return fail('row-round-trip');
  } catch { return fail('row-round-trip'); }
  if (utf8Bytes(row) > spec.maxRowBytes) return fail('too-large');
  const before = exact;
  const d = deepFreeze(candidate);
  // Gate 5 runs first: identity is cheap, and it spares duplicates the solver and the bots.
  let semantic: string;
  try { semantic = semanticHash(adapter.semanticKey(d)); } catch { return fail('engine-error'); }
  const exactHash = sha256Hex(`exact|${exact}`);
  if (ctx.seenExact.has(exactHash)) return fail('duplicate-exact');
  if (ctx.seenSemantic.has(semantic)) return fail('duplicate-semantic');
  let solved;
  try {
    // Solving frozen input turns any write into a thrown TypeError, which is the mutation signal.
    solved = adapter.solve(d, ctx.budget);
    if (canonical(d) !== before) return fail('mutates-input');
  } catch (error) { return fail(error instanceof TypeError ? 'mutates-input' : 'engine-error'); }
  // Gate 2: a witness through the real engine, then an independent count where one answer is promised.
  if (solved.status === 'budget-exhausted') return fail('solver-budget');
  if (solved.status === 'unsolved') return fail('unsolved');
  const events: AttemptEvent<unknown>[] = solved.witness.map(a => ['a', a] as const);
  if (adapter.needsCheck) events.push(['run']);
  let first, second;
  try {
    if (!adapter.validState(adapter.create(d), d)) return fail('invalid-state');
    first = replayAttempt(adapter, d, events);
    second = replayAttempt(adapter, d, events);
  } catch { return fail('engine-error'); }
  if (!first || first.outcome !== 'solved' || first.failedChecks) return fail('witness-replay');
  if (!second) return fail('nondeterministic');
  // Every limit and the solver's own metric must really be measured, or there is nothing to compare.
  const required = [...d.limits.map(l => l.metric), solved.metric];
  for (const { metrics } of [first, second]) if (!Object.values(metrics).every(measured) || !required.every(m => measured(metrics[m]))) return fail('metric-missing');
  if (canonical(first) !== canonical(second)) return fail('nondeterministic');
  if (!first.withinLimits) return fail('witness-over-limit');
  const claimedPar = { metric: solved.metric, lower: solved.lower, upper: solved.upper, exact: solved.exact }, cost = first.metrics[solved.metric]!;
  if (!samePar(d.par, claimedPar) || solved.exact !== (solved.lower === solved.upper) || cost < solved.lower || cost > solved.upper) return fail('par-mismatch');
  if (spec.requiresUnique) {
    const one = adapter.count?.(d, 2, ctx.budget), two = adapter.independentCount?.(d, 2, ctx.budget);
    if (!one || !two) return fail('count-disagrees');
    if (one.status !== 'counted' || two.status !== 'counted') return fail('count-budget');
    if (one.count !== two.count) return fail('count-disagrees');
    if (one.count !== 1) return fail('ambiguous');
  }
  // Gate 3: a complete no-guess trace at the advertised ceiling, and hints that finish within the limits.
  let technique = null, traceHash = null;
  if (spec.requiresTrace) {
    const trace = adapter.technique?.(d, ctx.budget);
    if (!trace) return fail('trace-missing');
    if (trace.status === 'stalled') return fail('trace-stalled');
    technique = trace.ceiling;
    traceHash = sha256Hex(trace.trace);
  }
  try {
    if (!hintRoute(adapter, d)) return fail('hint-route');
    if (spec.hiddenInformation || adapter.hidden) {
      const finding = hiddenFinding(adapter, d, solved.witness);
      if (finding) return fail(finding);
    }
  } catch { return fail('engine-error'); }
  // Gate 4: a "required" claim needs its counterfactual.
  const claims = adapter.claims?.(d, ctx.budget) ?? null;
  if (claims?.some(c => !c.proven)) return fail('claim-unproven');
  // Dumb players run on every entry; only advanced bands reject when one succeeds.
  let bots;
  try { bots = runBots(adapter, d, botSteps(solved.witness.length)); } catch { return fail('engine-error'); }
  if (bots.some(b => !b.legal)) return fail('invalid-state');
  if (band.advanced && bots.some(b => b.beat)) return fail('bot-beat');
  if (d.speech ? !spec.knownSpeech?.(d.speech) : false) return fail('speech');
  // Recorded only now, so a rejected candidate never blocks a later one.
  ctx.seenExact.add(exactHash);
  ctx.seenSemantic.add(semantic);
  const entry: CertifiedEntry<P> = deepFreeze({ core: d, row, exactHash, semanticHash: semantic, witnessHash: sha256Hex(canonical(solved.witness)),
    traceHash, claimsHash: claims ? sha256Hex(canonical(claims)) : null, solve: claimedPar, technique, bots });
  proven.set(entry, row);
  return { ok: true, entry };
}
