/**
 * Checkers revision 1 (timed) against revision 2 (node budget, no clock).
 *   node --import ./scripts/puzzles/register.mjs scripts/boards/checkers-budget.ts [games] [out.json]
 * Add --jitless to stand in for a slow interpreter (Hermes on an older iPad).
 * Reports: how often the 8 ms clock changed revision 1's move on this machine, and
 * head-to-head results of each revision against the same opponents.
 */
import { writeFileSync } from "node:fs";
import {
  applyCheckers,
  archivedCheckersChoice,
  checkersMoves,
  CheckersSearch,
  createCheckers,
  type CheckersMove,
  type CheckersState,
  type Position,
} from "../../src/games/checkers";
import { defaultOptions, random } from "../../src/games/types";
import { checkersPolicyById } from "../../src/playPolicies/policies";

const games = Number(process.argv[2] ?? 40),
  out = process.argv[3];
type Strength = "growing" | "challenge";
const difficulty = { growing: "medium", challenge: "hard" } as const;
const same = (a: CheckersMove | null, b: CheckersMove | null) => JSON.stringify(a) === JSON.stringify(b);
const stateAt = (p: Position, strength: Strength): CheckersState => ({
  ...createCheckers({ ...defaultOptions, difficulty: difficulty[strength] }),
  policy: undefined,
  position: p,
});
function budgeted(p: Position, strength: Strength) {
  const search = new CheckersSearch(p, "classic", checkersPolicyById(`checkers/${strength}@2`)!.limits!);
  const start = performance.now();
  while (!search.step(1 << 20));
  return { move: search.move(), nodes: search.nodes, ms: performance.now() - start };
}
async function timed(p: Position, strength: Strength) {
  const start = performance.now();
  const move = await archivedCheckersChoice(stateAt(p, strength));
  return { move, ms: performance.now() - start };
}
/** Revision 1 with a stopped clock: what it would play if the 8 ms never ran out. */
async function unclocked(p: Position, strength: Strength) {
  const now = Date.now;
  Date.now = () => 0;
  try {
    return await archivedCheckersChoice(stateAt(p, strength));
  } finally {
    Date.now = now;
  }
}
type Player = (p: Position) => Promise<CheckersMove | null>;
const randomPlayer = (seed: number): Player => {
  const r = random(seed);
  return async (p) => {
    const m = checkersMoves(p);
    return m.length ? m[Math.floor(r() * m.length)] : null;
  };
};
async function play(red: Player, blue: Player, opening: number, headStart = false) {
  let p = createCheckers({ ...defaultOptions, checkersHeadStart: headStart ? 1 : undefined }).position;
  // A short seeded random opening gives distinct games.
  const r = random(opening * 7919 + 1);
  for (let i = 0; i < 4 && !p.outcome; i++) {
    const m = checkersMoves(p);
    p = applyCheckers(p, m[Math.floor(r() * m.length)]);
  }
  for (let ply = 0; ply < 200 && !p.outcome; ply++) {
    const m = await (p.turn === 1 ? red : blue)(p);
    if (!m) break;
    p = applyCheckers(p, m);
  }
  return p.outcome ?? "unfinished";
}
const main = async () => {
  const report: Record<string, unknown> = { games, jitless: process.execArgv.includes("--jitless"), node: process.version };
  // 1. Decision agreement on positions from seeded games.
  const corpus: Position[] = [];
  for (let g = 0; g < games; g++) {
    const r = random(g * 104729 + 17);
    let p = createCheckers(defaultOptions).position;
    for (let ply = 0; ply < 60 && !p.outcome; ply++) {
      if (ply % 6 === 3) corpus.push(p);
      const m = checkersMoves(p);
      p = applyCheckers(p, m[Math.floor(r() * m.length)]);
    }
  }
  for (const strength of ["growing", "challenge"] as const) {
    let agreeTimed = 0,
      agreeUnclocked = 0,
      maxNodes = 0;
    const ms1: number[] = [],
      ms2: number[] = [];
    for (const p of corpus) {
      const b = budgeted(p, strength),
        t = await timed(p, strength),
        u = await unclocked(p, strength);
      if (same(b.move, t.move)) agreeTimed++;
      if (same(b.move, u)) agreeUnclocked++;
      maxNodes = Math.max(maxNodes, b.nodes);
      ms1.push(t.ms);
      ms2.push(b.ms);
    }
    const pct = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(q * xs.length))];
    report[strength] = {
      positions: corpus.length,
      sameAsRevision1OnThisClock: agreeTimed,
      sameAsRevision1WithoutClock: agreeUnclocked,
      maxNodes,
      revision1Ms: { p50: pct(ms1, 0.5), p95: pct(ms1, 0.95), max: Math.max(...ms1) },
      revision2ComputeMs: { p50: pct(ms2, 0.5), p95: pct(ms2, 0.95), max: Math.max(...ms2) },
    };
    console.log(strength, report[strength]);
  }
  // 2. Head to head: each revision as blue against a random red, then revision 2 against revision 1.
  for (const strength of ["growing", "challenge"] as const) {
    const tally = async (blue: (seed: number) => Player, red: (seed: number) => Player) => {
      const t: Record<string, number> = { red: 0, blue: 0, draw: 0, unfinished: 0 };
      for (let g = 0; g < games; g++) t[await play(red(g), blue(g), g)]++;
      return t;
    };
    const r1: Player = async (p) => (await timed(p, strength)).move;
    const r2: Player = async (p) => budgeted(p, strength).move;
    const h2h = {
      revision1VsRandom: await tally(() => r1, randomPlayer),
      revision2VsRandom: await tally(() => r2, randomPlayer),
      revision2BlueVsRevision1Red: await tally(() => r2, () => r1),
      revision1BlueVsRevision2Red: await tally(() => r1, () => r2),
    };
    report[`${strength}HeadToHead`] = h2h;
    console.log(strength, h2h);
  }
  // 3. The declared head start: a Growing stand-in for the child (red) against the Challenge rival (blue).
  const standIn: Player = async (p) => budgeted(p, "growing").move,
    ray: Player = async (p) => budgeted(p, "challenge").move;
  const headStart: Record<string, Record<string, number>> = {};
  for (const [name, on] of [["none", false], ["onePieceFewer", true]] as const) {
    const t: Record<string, number> = { red: 0, blue: 0, draw: 0, unfinished: 0 };
    for (let g = 0; g < games; g++) t[await play(standIn, ray, g, on)]++;
    headStart[name] = t;
  }
  report.headStartGrowingStandInVsChallenge = headStart;
  console.log("head start", headStart);
  if (out) writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
};
void main();
