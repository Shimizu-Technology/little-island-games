import type { PuzzleRef } from '../state/challenge';

export type { PuzzleRef };
export const METRICS = ['cards', 'steps', 'placements', 'loads', 'turns'] as const;
export type Metric = (typeof METRICS)[number];
export type Metrics = Partial<Record<Metric, number>>;
export type Limit = { metric: Metric; max: number };
/** `exact` is true only when the certified bounds agree. A witnessed upper bound is a budget, never "the best". */
export type Par = { metric: Metric; lower: number; upper: number; exact: boolean };
export type Speech = { template: string; numbers: number[]; terms: string[] };

/** Everything except the catalog position. Banks assign the ref when an entry is packed. */
export type DescriptorCore<P> = {
  format: 1;
  seed: number; // provenance only: the explicit payload is the puzzle
  rng: 1;
  band: string;
  layout: string; // never twice in a row inside a pack
  template: string; // at most 25% of a band
  payload: P;
  objectives: string[];
  limits: Limit[];
  par: Par | null;
  teaches: string[];
  speech: Speech | null;
};
export type PuzzleDescriptor<P> = DescriptorCore<P> & { ref: PuzzleRef };

export type SolveResult<A> =
  | { status: 'solved'; witness: A[]; metric: Metric; lower: number; upper: number; exact: boolean }
  /** Only after the whole space was searched. A timeout is always `budget-exhausted`. */
  | { status: 'unsolved' }
  | { status: 'budget-exhausted'; nodes: number };
export type CountResult = { status: 'counted'; count: number } | { status: 'budget-exhausted' };
/** A complete no-guess trace, or a stall. A stall is never an adult difficulty label. */
export type TechniqueResult = { status: 'complete'; ceiling: string; steps: number; trace: string } | { status: 'stalled' };
/** A claim such as "this rock matters", proven by comparing against the puzzle with the thing removed. */
export type Claim = { id: string; proven: boolean; evidence: string };

export type AttemptEvent<A> = readonly ['a', A] | readonly ['run'] | readonly ['help'] | readonly ['reset'];
export type AttemptEvidence = {
  outcome: 'solved' | 'not-yet';
  metrics: Metrics;
  withinLimits: boolean;
  runs: number;
  failedChecks: number;
  resets: number;
  helpUsed: boolean;
  /** No solution help and no failed whole-answer Check. Solo or Together is a launch fact the caller knows. */
  independent: boolean;
  solution: string | null;
};

/**
 * Binds one real engine to the kit. Every method must call the engine's pure rules, so hints,
 * solvers and completion cannot disagree. F2's generated Registry binds these exact three types.
 */
export type PuzzleAdapter<P, S, A> = {
  engine: string;
  rules: number;
  /** True when a solved board still needs the player's explicit whole-answer Check. */
  needsCheck: boolean;
  isPayload(x: unknown): x is P;
  isAction(x: unknown): x is A;
  /** Documented compact tuple form of the payload, as stored in a pack row. */
  encodePayload(p: P): unknown;
  decodePayload(x: unknown): P | null;
  create(d: DescriptorCore<P>): S;
  validState(x: unknown, d: DescriptorCore<P>): x is S;
  /** Must return the same state object for an illegal or no-op action. */
  reduce(s: S, a: A, d: DescriptorCore<P>): S;
  /** Public legal choices. Never filtered by the hidden answer. */
  actions(s: S, d: DescriptorCore<P>): readonly A[];
  solved(s: S, d: DescriptorCore<P>): boolean;
  metrics(s: S, actions: readonly A[], d: DescriptorCore<P>): Metrics;
  solve(d: DescriptorCore<P>, budget: number): SolveResult<A>;
  semanticKey(d: DescriptorCore<P>): string;
  /** Replaces runs of unsubmitted edits with one canonical draft action. Must keep the rest of the log. */
  coalesce?(events: readonly AttemptEvent<A>[]): AttemptEvent<A>[] | null;
  progress?(s: S, d: DescriptorCore<P>): number; // public information only, for the greedy bot
  solutionHash?(s: S, d: DescriptorCore<P>): string;
  hint?(s: S, d: DescriptorCore<P>): A | null;
  /** Variants with the same public view. A hint may not depend on what differs between them. */
  hiddenVariants?(d: DescriptorCore<P>): DescriptorCore<P>[];
  count?(d: DescriptorCore<P>, cap: number, budget: number): CountResult;
  independentCount?(d: DescriptorCore<P>, cap: number, budget: number): CountResult;
  technique?(d: DescriptorCore<P>, budget: number): TechniqueResult;
  claims?(d: DescriptorCore<P>, budget: number): Claim[];
};
// Adapters vary per engine, so collections of them can only name the kit's common surface.
export type AnyAdapter = PuzzleAdapter<any, any, any>;

export type BandQuota = { id: string; target: number; floor: number; /** dumb bots may not meet this band's objective */ advanced: boolean };
export type Provenance = { source: 'original' | 'reviewed'; note: string; vocabulary?: string };
/** Review is recorded, never assumed. A bank is not shippable until review IDs exist. */
export type ReviewStatus = { ids: string[]; complete: boolean };
export type FamilySpec<P = unknown> = {
  id: string;
  /** Files whose hash identifies the generator in each receipt. */
  sources: string[];
  adapter: PuzzleAdapter<P, any, any>;
  bands: BandQuota[];
  provenance: Provenance;
  review: ReviewStatus;
  /** Byte-model budget for one encoded row. Checked against the real packs. */
  maxRowBytes: number;
  requiresUnique: boolean;
  requiresTrace: boolean;
  /** Registered templates, for bank validation. Absent means descriptors must carry no speech. */
  knownSpeech?: (speech: Speech) => boolean;
  generate(seed: number, band: BandQuota): DescriptorCore<P> | null;
};
