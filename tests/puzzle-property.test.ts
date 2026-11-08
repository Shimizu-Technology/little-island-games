import { describe, expect, it } from 'vitest';
import { certify, type CertifyContext } from '../src/puzzles/checks';
import { logicProofFamily, mazeProofFamily } from '../scripts/puzzles/proof-families';
import type { FamilySpec } from '../src/puzzles/types';

const COUNT = 10_000;
/** Bounded seed fixtures, per the test plan. Every outcome must be a named accept or reject, never a crash. */
function sweep<P>(spec: FamilySpec<P>, bandIndex: number) {
  const band = spec.bands[bandIndex], ctx: CertifyContext = { budget: 200_000, seenExact: new Set(), seenSemantic: new Set() };
  const outcomes: Record<string, number> = {};
  for (let seed = 1; seed <= COUNT; seed++) {
    const core = spec.generate(seed, band);
    const key = core ? (() => { const r = certify(spec, band, core, ctx); return r.ok ? 'ok' : r.reason; })() : 'construction';
    outcomes[key] = (outcomes[key] ?? 0) + 1;
  }
  return outcomes;
}
describe('10,000 candidates per adapter', () => {
  it('real mazes: certified or rejected for a named reason', () => {
    const outcomes = sweep(mazeProofFamily(), 0);
    // 5×5 perfect mazes collapse under symmetry, so roughly 57% of seeds are new puzzles.
    expect(outcomes.ok).toBeGreaterThan(5000);
    expect(outcomes['duplicate-semantic']).toBeGreaterThan(1000);
    for (const key of Object.keys(outcomes)) expect(['ok', 'duplicate-semantic', 'duplicate-exact', 'claim-unproven']).toContain(key);
  }, 600_000);
  it('real Logic Lagoon grids: the engine repeats itself, and the gates notice', () => {
    const outcomes = sweep(logicProofFamily(), 1);
    expect(outcomes.ok).toBeGreaterThan(0);
    expect(outcomes['duplicate-semantic']).toBeGreaterThan(5000);
    for (const key of Object.keys(outcomes)) expect(['ok', 'duplicate-semantic', 'duplicate-exact', 'construction', 'trace-stalled']).toContain(key);
  }, 600_000);
});
