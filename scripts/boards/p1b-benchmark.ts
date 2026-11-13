// P1b evidence: Fishing Nets Challenge revision 2, Hidden Canoes Challenge revision 3, and the
// cost of the three puzzle banks. Writes one JSON file. Run:
//   node --import ./scripts/puzzles/register.mjs scripts/boards/p1b-benchmark.ts <out.json>
//   node --jitless --import ./scripts/puzzles/register.mjs scripts/boards/p1b-benchmark.ts <out.json> --timing-only
// Host timings are Node on this machine (--jitless stands in for Hermes). They are not iPad numbers.
import { writeFileSync } from "node:fs";
import { bench, policyPlayer, summarize, type BenchGame, type Player } from "../../src/playPolicies/benchmark";
import { policyById, policyRandom } from "../../src/playPolicies/policies";
import { canoesView, openView } from "../../src/playPolicies/views";
import type { PolicyTask } from "../../src/playPolicies/types";
import * as nets from "../../src/board/fishing-nets/engine";
import * as canoes from "../../src/board/hidden-canoes/engine";
import { rng, type Position } from "../../src/board/types";
import { NetsTable, positionOf as netsStart } from "../../src/board/fishing-nets/chains";
import { netsPuzzles } from "../../src/board/fishing-nets/challenge";
import { CanoesHeatmap } from "../../src/playPolicies/canoesHeatmap";
import { canoesPuzzles } from "../../src/board/hidden-canoes/challenge";
import { coconutPuzzles, coconutTacticsEngine } from "../../src/board/coconut-drop/challenge";
import { answers } from "../../src/board/coconut-drop/tactics";

const P = (id: string) => policyById(id)!;
const out = process.argv[2];
if (!out) throw new Error("Give an output path.");
const timingOnly = process.argv.includes("--timing-only");
const evidence: Record<string, unknown> = { generated: new Date().toISOString(), node: process.version, execArgv: process.execArgv };
const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
const stats = (ms: number[]) => ({ count: ms.length, p50: +q(ms, 0.5).toFixed(2), p95: +q(ms, 0.95).toFixed(2), max: +Math.max(...ms).toFixed(2) });
/** Whole decision, and the longest 128-unit step (one slice step in the app). */
function time(task: () => PolicyTask) {
  const t = performance.now(),
    k = task();
  let worstStep = 0;
  while (!k.done) {
    const s = performance.now();
    k.step(128);
    worstStep = Math.max(worstStep, performance.now() - s);
  }
  k.move();
  return { whole: performance.now() - t, worstStep };
}

// Decision timing over seeded games.
const netsMs: number[] = [],
  netsStep: number[] = [];
for (const size of [3, 4, 5])
  for (let g = 0; g < 12; g++) {
    const random = rng(g * 977 + size);
    let s: Position = nets.create(g, size, (g % 2) as 0 | 1);
    while (s.outcome === null) {
      if (nets.legal(s).length <= 14) {
        const p = s,
          r = time(() => P("fishing-nets/challenge@2").choose(openView("fishing-nets", p), policyRandom(1, p.moves.length, p.turn)));
        netsMs.push(r.whole);
        netsStep.push(r.worstStep);
      }
      const grab = nets.scoring(s),
        quiet = nets.safe(s);
      const pool = grab.length ? grab : quiet.length ? quiet : nets.legal(s);
      s = nets.move(s, pool[Math.floor(random() * pool.length)]);
    }
  }
const canoesMs: number[] = [],
  canoesStep: number[] = [];
for (let g = 1; g <= 20; g++) {
  const random = rng(g * 131);
  let s = canoes.create(g, 6, 0);
  while (s.outcome === null) {
    const p = s,
      r = time(() => P("hidden-canoes/challenge@3").choose(canoesView(p, p.turn), policyRandom(1, p.moves.length, p.turn)));
    canoesMs.push(r.whole);
    canoesStep.push(r.worstStep);
    const legal = canoes.legal(s);
    s = canoes.move(s, legal[Math.floor(random() * legal.length)]);
  }
}
evidence.decisionHost = {
  netsChallenge2: { decisions: stats(netsMs), worst128Step: stats(netsStep), note: "Only decisions with 14 or fewer ropes open; above that it is revision 1's rule of thumb." },
  canoesChallenge3: { decisions: stats(canoesMs), worst128Step: stats(canoesStep) },
};
// Puzzle cost: first Nets exact table, first Canoes heatmap, and a full Coconut answer line.
const tables = netsPuzzles.map((p) => {
  const t = performance.now();
  new NetsTable(netsStart(p.descriptor));
  return performance.now() - t;
});
const maps = canoesPuzzles.map((p) => {
  const t = performance.now();
  new CanoesHeatmap(p.descriptor.chart).run();
  return performance.now() - t;
});
const coconutLines = coconutPuzzles.map((p) => {
  const d = p.descriptor,
    t = performance.now();
  coconutTacticsEngine.step(coconutTacticsEngine.create(d, { version: 1 }, { supportOff: false, ownRead: false }), ["d", answers(d)[0]], d);
  return performance.now() - t;
});
evidence.puzzleHost = { netsTableBuild: stats(tables), canoesHeatmap: stats(maps), coconutFirstAnswerStep: stats(coconutLines) };

if (!timingOnly) {
  // Strength: new revision against the old, both starters, both seats, seeded openings.
  const strength: Record<string, unknown>[] = [];
  for (const size of [3, 4, 5])
    strength.push({
      game: "fishing-nets",
      size,
      subject: "fishing-nets/challenge@2",
      rival: "fishing-nets/challenge@1",
      ...summarize(bench({ game: "fishing-nets", size, subject: policyPlayer("fishing-nets", P("fishing-nets/challenge@2")), rival: policyPlayer("fishing-nets", P("fishing-nets/challenge@1")), openingPlies: [0, 2, 4, 6], seeds: 12 })),
    });
  let w = 0,
    l = 0,
    games = 0;
  const searches: Record<string, number[]> = { "hidden-canoes/challenge@2": [], "hidden-canoes/challenge@3": [] };
  for (let board = 1; board <= 120; board++) {
    const rows = bench({ game: "hidden-canoes", subject: policyPlayer("hidden-canoes", P("hidden-canoes/challenge@3"), board), rival: policyPlayer("hidden-canoes", P("hidden-canoes/challenge@2"), board), openingPlies: [0], seeds: 1, boardSeed: () => board });
    for (const r of rows) {
      games++;
      if (r.result === "win") w++;
      if (r.result === "loss") l++;
    }
    // Solo: searches each policy needs to find all seven spaces of one fleet.
    for (const id of Object.keys(searches)) {
      const player = policyPlayer("hidden-canoes", P(id), board);
      let s = canoes.create(board, 6, 0),
        n = 0;
      while (s.scores[0] < 7 && n < 36) {
        const m = player({ ...s, turn: 0 })!;
        s = { ...canoes.move({ ...s, turn: 0 }, m), turn: 0, outcome: null };
        n++;
      }
      searches[id].push(n);
    }
  }
  const mean = (a: number[]) => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
  strength.push({ game: "hidden-canoes", subject: "hidden-canoes/challenge@3", rival: "hidden-canoes/challenge@2", games, win: w, loss: l, boards: 120 });
  evidence.strength = strength;
  evidence.canoesSoloSearches = Object.fromEntries(Object.entries(searches).map(([id, a]) => [id, { boards: a.length, mean: mean(a), p50: q(a, 0.5), max: Math.max(...a) }]));
  // PP-01 head starts against the new Challenge rivals, as docs/BOARD_POLICIES.md reports them.
  const head: Record<string, unknown>[] = [];
  const run = (game: BenchGame, subjectName: string, subject: Player, rival: string, edges: number[], extra: Partial<Parameters<typeof bench>[0]> = {}) => {
    for (const edge of edges) head.push({ game, subject: subjectName, rival, edge, size: extra.size, ...summarize(bench({ game, subject, rival: policyPlayer(game, P(rival), 11), openingPlies: [2, 4, 6], seeds: 12, edge, ...extra })) });
  };
  for (const size of [3, 4, 5]) run("fishing-nets", "growing@1", policyPlayer("fishing-nets", P("fishing-nets/growing@1")), "fishing-nets/challenge@2", size === 3 ? [0, 1, 2] : [0, 2, 3], { size });
  run("hidden-canoes", "growing@2", policyPlayer("hidden-canoes", P("hidden-canoes/growing@2"), 7), "hidden-canoes/challenge@3", [0, 1, 2], { openingPlies: [1], seeds: 60, boardSeed: (s) => s * 101 + 5 });
  evidence.headStarts = head;
}
writeFileSync(out, JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence, null, 1));
