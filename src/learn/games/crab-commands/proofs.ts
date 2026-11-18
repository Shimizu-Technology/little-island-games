import { decodeProgram, type PackedProgram } from '../../program/codec';
import type { Program } from '../../program/model';
import { commands, solved, start, step, walkerKey, type Command, type Level, type Walker } from './engine';
import { programCodes } from './program';
import { blockBest, flatBest, nesting, REPEAT_COUNTS, runNodes, type Sim } from './search';
import proof from './school-content.json';

/** One crab on one beach, as the search sees it: the very step() a run uses. */
export const crabSim = (l: Level): Sim<Walker> => ({
  start: start(l),
  step: (w, c) => { const n = step(l, w, programCodes[c]); return n.bump ? null : n; },
  won: w => solved(l, w),
  key: walkerKey,
  // The very sensor the K7 adapter gives If blocked: an edge or a sandcastle straight ahead.
  blocked: w => step(l, w, 'forward').bump,
});
export const codes = (cards: readonly Command[]) => cards.map(c => programCodes.indexOf(c));
/** Fewest flat cards with these cards (Walk and Turn, or with Again ×2 as well). */
export const flatCards = (l: Level, cards: readonly Command[] = commands(l.pace)) => flatBest(crabSim(l), codes(cards))?.cards ?? null;
/** What Level 5 rests on: the tray is below every flat plan, with or without Again, and a block plan fits. */
export function gradeLoops(l: Level, nest = 2) {
  const sim = crabSim(l), walk = codes(commands('medium'));
  const flat = flatCards(l, commands('medium')), again = flatCards(l, commands('hard'));
  const search = blockBest(sim, walk, Math.max(0, (flat ?? 1) - 1), { nest });
  return { flat, again, blocks: search.best, witness: search.witness, depth: search.witness ? nesting(search.witness) : 0, exhausted: search.exhausted };
}
/** Plausible wrong counts: other Repeat counts on the witness's outer loop that run without a bump but miss. */
export function decoys(l: Level, witness: Program): number {
  const sim = crabSim(l), at = witness.body.findIndex(n => n.kind === 'repeat');
  if (at < 0) return 0;
  return REPEAT_COUNTS.filter(times => {
    const outer = witness.body[at];
    if (outer.kind !== 'repeat' || times === outer.times) return false;
    const r = runNodes(sim, sim.start, witness.body.map((n, i) => (i === at ? { ...outer, times } : n)));
    return r !== null && !r.won;
  }).length;
}
type Proof = { solutions?: PackedProgram[] };
/** Certified Level 5 winners baked beside each beach, used by the block hint. */
export function loopSolutions(l: Level): Program[] {
  const entry = (proof as unknown as { proof?: Record<string, Proof> }).proof?.[l.id];
  return (entry?.solutions ?? []).map(p => decodeProgram(p)).filter((p): p is Program => !!p);
}
