// Board policy benchmark. Writes one JSON evidence file. Run:
//   node --import ./scripts/puzzles/register.mjs scripts/boards/benchmark.ts <out.json>
// Host timings are Node on this machine. They are not iPad numbers.
import { writeFileSync } from "node:fs";
import { bench, coconutTactician, pitsGreedy, policyPlayer, summarize, type BenchGame, type Player } from "../../src/playPolicies/benchmark";
import { pitsChallengeLimits, pitsRules, policyById } from "../../src/playPolicies/policies";
import { IterativeSearch } from "../../src/playPolicies/search";
import * as pits from "../../src/board/shell-pits/engine";
import type { Position } from "../../src/board/types";

const P = (id: string) => policyById(id)!;
const out = process.argv[2];
if (!out) throw new Error("Give an output path.");
const evidence: Record<string, unknown> = { generated: new Date().toISOString(), node: process.version };

// BD-06: the four opening cases and the 144-prefix corpus, before and after.
const corpus = (rival: Player) => bench({ game: "shell-pits", subject: pitsGreedy, rival, openingPlies: [2, 4, 6], seeds: 12, maxPlies: 200 });
const four = (rival: Player) => bench({ game: "shell-pits", subject: pitsGreedy, rival, openingPlies: [0], seeds: 1 });
const before = corpus(policyPlayer("shell-pits", P("shell-pits/challenge@1"))),
  after = corpus(policyPlayer("shell-pits", P("shell-pits/challenge@2")));
const flips = after.flatMap((a, i) => (a.result !== before[i].result ? [{ starter: a.starter, greedySeat: a.subject, openingPlies: a.openingPlies, seed: a.seed, before: before[i].result, after: a.result }] : []));
evidence.pitsOpeningCases = {
  challenge1: four(policyPlayer("shell-pits", P("shell-pits/challenge@1"))).map((r) => ({ starter: r.starter, greedySeat: r.subject, greedy: r.result })),
  challenge2: four(policyPlayer("shell-pits", P("shell-pits/challenge@2"))).map((r) => ({ starter: r.starter, greedySeat: r.subject, greedy: r.result })),
};
evidence.pitsCorpus = { note: "Results are the greedy player's.", challenge1: summarize(before), challenge2: summarize(after), flips };

// Host timing for one Challenge decision, every decision of the corpus games.
const nodes: number[] = [], ms: number[] = [];
let incomplete = 0;
for (const row of after) {
  let s: Position = pits.create(row.seed, 6, row.starter);
  for (const m of row.moves) {
    if (s.turn !== row.subject) {
      const t = performance.now();
      const r = new IterativeSearch({ ...s, moves: [] }, pitsRules, pitsChallengeLimits).run();
      ms.push(performance.now() - t);
      nodes.push(r.nodes);
      if (!r.complete) incomplete++;
    }
    s = pits.move(s, m);
  }
}
const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
evidence.pitsChallengeHost = {
  decisions: nodes.length,
  incompleteDepth8: incomplete,
  nodes: { p50: q(nodes, 0.5), p95: q(nodes, 0.95), max: Math.max(...nodes) },
  ms: { p50: +q(ms, 0.5).toFixed(2), p95: +q(ms, 0.95).toFixed(2), max: +Math.max(...ms).toFixed(2) },
  note: "Node.js JIT on the development Mac. The iPad mini (6th generation) runs Hermes and still needs a device measurement.",
};

// PP-01: head starts. A Growing-strength stand-in plays the Challenge rival.
const head: Record<string, unknown>[] = [];
const run = (game: BenchGame, subjectName: string, subject: Player, rival: string, edges: number[], extra: Partial<Parameters<typeof bench>[0]> = {}) => {
  for (const edge of edges) head.push({ game, subject: subjectName, rival, edge, ...extra, ...summarize(bench({ game, subject, rival: policyPlayer(game, P(rival), 11), openingPlies: [2, 4, 6], seeds: 12, edge, ...extra })) });
};
run("shell-pits", "greedy", pitsGreedy, "shell-pits/challenge@2", [0, 4, 8]);
run("shell-pits", "growing@1", policyPlayer("shell-pits", P("shell-pits/growing@1")), "shell-pits/challenge@2", [0, 4, 8]);
run("coconut-drop", "tactician", coconutTactician, "coconut-drop/challenge@1", [0, 1], { openingPlies: [2, 4], seeds: 8 });
run("coconut-drop", "growing@1", policyPlayer("coconut-drop", P("coconut-drop/growing@1")), "coconut-drop/challenge@1", [0, 1], { openingPlies: [2, 4], seeds: 8 });
for (const size of [3, 4, 5]) run("fishing-nets", "growing@1", policyPlayer("fishing-nets", P("fishing-nets/growing@1")), "fishing-nets/challenge@1", size === 3 ? [0, 1, 2] : [0, 2, 3], { size });
run("hidden-canoes", "growing@2", policyPlayer("hidden-canoes", P("hidden-canoes/growing@2"), 7), "hidden-canoes/challenge@2", [0, 1, 2], { openingPlies: [1], seeds: 60, boardSeed: (s) => s * 101 + 5 });
evidence.headStarts = head.map(({ boardSeed: _b, ...rest }) => rest);
writeFileSync(out, JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify({ opening: evidence.pitsOpeningCases, corpus: evidence.pitsCorpus, host: evidence.pitsChallengeHost }, null, 1));
