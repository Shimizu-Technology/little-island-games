// Generates the certified Coconut Drop puzzle bank. Run:
//   node --import ./scripts/puzzles/register.mjs scripts/boards/coconut-puzzles.ts [--write]
// Deterministic: the same seed always yields the same file. Every puzzle is a legal opening
// played through the real engine, so it replays from an empty board.
import { writeFileSync } from "node:fs";
import { rng, type Position } from "../../src/board/types";
import { create, legal, lines, move } from "../../src/board/coconut-drop/engine";
import { answers, positionOf, threats, validDescriptor, winsNow, type Descriptor, type Kind } from "../../src/board/coconut-drop/tactics";

const random = rng(20261112);
const pick = <T>(a: readonly T[]) => a[Math.floor(random() * a.length)];
/** A plausible family game: take a four, block a four, don't drop under the other side's four. */
function playout(): Position[] {
  let p = move(move(create(0, 7, 0), pick([2, 3, 3, 4])), pick([2, 3, 4]));
  const seen: Position[] = [];
  for (let ply = 2; ply < 36 && p.outcome === null; ply++) {
    if (p.turn === 0) seen.push(p);
    const now = winsNow(p);
    if (now.length) break;
    const block = threats(p);
    const careless = p.turn === 1 && random() < 0.25;
    const safe = legal(p).filter((c) => !threats(move(p, c)).length || careless);
    const choice = block.length && !careless ? block[0] : pick(safe.length ? safe : legal(p));
    p = move(p, choice);
  }
  return seen;
}
/** Which way the winning four runs, for variety. */
function direction(p: Position, column: number): "row" | "column" | "slant" {
  const after = move(p, column),
    cell = after.board.findIndex((v, i) => v !== p.board[i]);
  const line = lines.find((l) => l.includes(cell) && l.every((i) => after.board[i] === p.turn))!;
  const d = line[1] - line[0];
  return d === 1 ? "row" : d === 7 ? "column" : "slant";
}
type Found = Descriptor & { look: string; answer: number; pieces: number };
const found: Record<Kind, Found[]> = { win: [], block: [], fork: [] };
const seen = new Set<string>();
for (let game = 0; game < 2500; game++) {
  for (const p of playout()) {
    const k = p.board.join();
    if (seen.has(k) || p.moves.length < 6) continue;
    seen.add(k);
    const now = winsNow(p),
      danger = threats(p);
    let kind: Kind | null = null;
    if (now.length === 1) kind = "win";
    else if (!now.length && danger.length === 1) kind = "block";
    else if (!now.length && !danger.length) kind = "fork";
    if (!kind) continue;
    const d: Descriptor = { version: 1, kind, moves: [...p.moves], par: kind === "fork" ? 2 : 1 };
    if (!validDescriptor(d)) continue;
    const a = answers(d, p);
    if (a.length !== 1) continue;
    if (kind === "fork") {
      // A real fork: two ways to finish four at once, and nothing quicker.
      const after = move(p, a[0]);
      if (winsNow({ ...after, turn: 0 }).length < 2) continue;
    }
    const look = kind === "win" ? direction(p, a[0]) : kind === "block" ? direction({ ...p, turn: 1 }, a[0]) : "fork";
    found[kind].push({ ...d, look, answer: a[0], pieces: p.moves.length });
  }
}
/** Eight per kind: different answer columns and directions, fewest pieces first. */
function choose(list: Found[], kind: Kind): Descriptor[] {
  const out: Found[] = [],
    sorted = [...list].sort((a, b) => a.pieces - b.pieces || a.moves.join().localeCompare(b.moves.join()));
  const quota = { row: 3, column: kind === "win" ? 1 : 2, slant: 3, fork: 8 } as Record<string, number>;
  const used = (look: string) => out.filter((x) => x.look === look).length;
  const column = (c: number) => out.filter((x) => x.answer === c).length;
  for (const pass of [0, 1, 2])
    for (const f of sorted) {
      if (out.length >= 8 || out.includes(f)) continue;
      if (pass === 0 && (used(f.look) >= quota[f.look] || column(f.answer) >= 1 || f.pieces < 10 || f.pieces > 24)) continue;
      if (pass === 1 && (used(f.look) >= quota[f.look] + 1 || column(f.answer) >= 2 || f.pieces < 8)) continue;
      out.push(f);
    }
  return out.sort((a, b) => a.pieces - b.pieces).map(({ look: _l, answer: _a, pieces: _p, ...d }) => d);
}
const bank = [...choose(found.win, "win"), ...choose(found.block, "block"), ...choose(found.fork, "fork")];
console.log(`candidates win ${found.win.length}, block ${found.block.length}, fork ${found.fork.length}`);
for (const d of bank) {
  const p = positionOf(d);
  console.log(d.kind, d.moves.length, "answer", answers(d).join(), d.moves.join(""));
  if (process.argv.includes("--show"))
    for (let r = 0; r < 6; r++) console.log("   " + p.board.slice(r * 7, r * 7 + 7).map((v) => (v === 0 ? "O" : v === 1 ? "X" : ".")).join(" "));
}
if (bank.length !== 24) throw new Error(`Only ${bank.length} puzzles found.`);
if (process.argv.includes("--write")) writeFileSync("src/board/coconut-drop/puzzles.json", JSON.stringify(bank) + "\n");
