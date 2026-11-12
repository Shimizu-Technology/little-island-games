// Generates the certified Shell Pits endgame bank. Run:
//   node --import ./scripts/puzzles/register.mjs scripts/boards/pits-tactics.ts [--write]
// Deterministic: the same seed always yields the same file.
import { writeFileSync } from "node:fs";
import { rng } from "../../src/board/types";
import { legal, move } from "../../src/board/shell-pits/engine";
import { canWinWith, captures, INF, positionOf, Solver, validDescriptor, type Descriptor, type Objective } from "../../src/board/shell-pits/tactics";

const random = rng(20261110);
const pick = (n: number) => Math.floor(random() * n);
function candidate(): number[] {
  const board = Array(14).fill(0),
    mine = 2 + pick(7),
    theirs = 2 + pick(7);
  for (let i = 0; i < mine; i++) board[pick(6)]++;
  for (let i = 0; i < theirs; i++) board[7 + pick(6)]++;
  const rest = 48 - mine - theirs,
    lead = pick(9) - 6;
  board[6] = Math.floor(rest / 2) + lead;
  board[13] = rest - board[6];
  return board;
}
/** What a child grabbing shells would sow first: most store shells, then an extra turn. */
function greedy(board: number[]): number {
  const p = positionOf(board);
  return [...legal(p)].sort((a, b) => {
    const v = (m: number) => {
      const n = move(p, m);
      return (n.board[6] - p.board[6]) * 10 + Number(n.turn === 0) * 3;
    };
    return v(b) - v(a) || a - b;
  })[0];
}
const tierOf = (par: number) => (par <= 2 ? 1 : par === 3 ? 2 : par === 4 ? 3 : par <= 6 ? 4 : 0);
const wanted = 4;
const chosen: Record<number, (Descriptor & { greedyFails: boolean; firstMoves: number })[]> = { 1: [], 2: [], 3: [], 4: [] };
const seen = new Set<string>();
let tried = 0;
while (Object.values(chosen).some((list) => list.length < wanted) && tried < 400000) {
  tried++;
  const board = candidate(),
    k = board.join();
  if (seen.has(k)) continue;
  seen.add(k);
  const p = positionOf(board),
    moves = legal(p);
  if (moves.length < 2) continue;
  const solver = new Solver(6),
    par = solver.value(p);
  if (par >= INF) continue;
  const tier = tierOf(par);
  if (!tier || chosen[tier].length >= wanted) continue;
  const winning = moves.filter((m) => {
    const v = solver.value(move(p, m));
    return v < INF && v + 1 === par;
  });
  // A real puzzle: the grab doesn't win, and most first sows don't either.
  const greedyFails = !winning.includes(greedy(board));
  if (!greedyFails || winning.length > 1 || winning.length === moves.length) continue;
  // Instant game-ending sweeps are not tactics.
  if (par === 1 && move(p, winning[0]).outcome !== null && !captures(p, winning[0]) && tier === 1 && chosen[1].length >= 2) continue;
  const objectives = (["capture", "one-turn"] as Objective[]).filter((o) => canWinWith(p, par, o));
  const d: Descriptor = { version: 1, board, par, objectives };
  if (!validDescriptor(d)) throw new Error("Invalid generated descriptor.");
  // Keep a mix: each tier wants at least one capture line and, where possible, one single-turn line.
  const list = chosen[tier],
    hasCapture = list.some((x) => x.objectives.includes("capture")),
    hasOneTurn = list.some((x) => x.objectives.includes("one-turn"));
  if (list.length === wanted - 1 && !hasCapture && !objectives.includes("capture")) continue;
  if (list.length === wanted - 2 && !hasOneTurn && !objectives.includes("one-turn") && tier <= 3 && tried < 300000) continue;
  list.push({ ...d, greedyFails, firstMoves: moves.length });
}
const out = [1, 2, 3, 4].flatMap((t) => chosen[t].map(({ greedyFails: _g, firstMoves: _f, ...d }) => d));
console.log(`tried ${tried}`);
for (const t of [1, 2, 3, 4]) for (const d of chosen[t]) console.log(t, d.par, d.objectives.join("+") || "-", d.board.join(" "));
if (process.argv.includes("--write")) writeFileSync("src/board/shell-pits/tactics.json", JSON.stringify(out, null, 1) + "\n");
