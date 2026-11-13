// Finds certified Fishing Nets chain endings. Run:
//   node --import ./scripts/puzzles/register.mjs scripts/boards/nets-chains.ts [--show] [--write]
// Deterministic. Every ending is a legal game through the real engine, circle to move, and:
// circle can win with best play, while the 3.0 Challenge habits (grab every box, then hand
// over the shortest chain) and plain greed both fail against the exact defence.
import { writeFileSync } from "node:fs";
import { rng, type Position } from "../../src/board/types";
import { choose, create, legal, move, safe, scoring } from "../../src/board/fishing-nets/engine";
import { chainRopes, defend, lesson, NetsTable, validDescriptor, winningTotals, type Descriptor, type Theme } from "../../src/board/fishing-nets/chains";

const random = rng(20261113);
const pick = <T>(a: readonly T[]) => a[Math.floor(random() * a.length)];
/** Family play: take a box, else a rope that gives nothing away, else anything. */
function playout(size: number): Position[] {
  let p = create(0, size, 0);
  const seen: Position[] = [];
  while (p.outcome === null) {
    if (p.turn === 0 && legal(p).length <= chainRopes) seen.push(p);
    const grab = scoring(p),
      quiet = safe(p).filter((e) => !grab.includes(e));
    p = move(p, grab.length && random() < 0.9 ? pick(grab) : quiet.length ? pick(quiet) : pick(legal(p)));
  }
  return seen;
}
type Habit = (p: Position) => number;
const habits: Record<string, Habit> = {
  challenge: (p) => choose(p, "challenge")!,
  greedy: (p) => scoring(p)[0] ?? safe(p)[0] ?? legal(p)[0],
};
function finish(p: Position, table: NetsTable, circle: Habit): Position {
  let s = p;
  while (s.outcome === null) s = s.turn === 0 ? move(s, circle(s)) : defend(s, table).position;
  return s;
}
/** Circle declines a box: ties a rope that closes nothing while one that closes a box is open. */
const declines = (p: Position, rope: number) => scoring(p).length > 0 && !scoring(p).includes(rope);
function bestLine(p: Position, table: NetsTable): { line: number[]; declined: boolean; end: Position } {
  let s = p,
    declined = false;
  const line: number[] = [];
  while (s.outcome === null) {
    if (s.turn === 1) {
      s = defend(s, table).position;
      continue;
    }
    const rope = table.best(s)[0];
    if (declines(s, rope)) declined = true;
    line.push(rope);
    s = move(s, rope);
  }
  return { line, declined, end: s };
}
const show = (p: Position) => {
  const n = p.size,
    rows: string[] = [];
  for (let r = 0; r <= n; r++) {
    let h = "";
    for (let c = 0; c < n; c++) h += "+" + (p.board[r * n + c] !== -1 ? "---" : "   ");
    rows.push("   " + h + "+");
    if (r === n) break;
    let v = "";
    for (let c = 0; c <= n; c++) {
      v += p.board[n * (n + 1) + r * (n + 1) + c] !== -1 ? "|" : " ";
      if (c < n) v += p.marks[r * n + c] === 0 ? " O " : p.marks[r * n + c] === 1 ? " X " : "   ";
    }
    rows.push("   " + v);
  }
  return rows.join("\n");
};
type Found = { d: Descriptor; open: number; winners: number; declined: boolean; theme: Theme; size: number; best: number; total: number };
const found: Found[] = [];
const seen = new Set<string>();
for (const size of [3, 4] as const)
  for (let game = 0; game < 1500; game++) {
    // One ending per game, with the most ropes still open.
    let taken = false;
    for (const p of playout(size)) {
      if (taken) break;
      const k = `${size}:${p.board.join()}:${p.marks.join()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const open = legal(p).length;
      if (open < 5 || open > chainRopes) continue;
      // Chain endings only: every rope left gives something away.
      if (safe(p).some((e) => !scoring(p).includes(e))) continue;
      if (Math.abs(p.scores[0] - p.scores[1]) > 2) continue;
      const table = new NetsTable(p);
      if (table.margin(p) <= 0) continue;
      if (Object.values(habits).some((h) => finish(p, table, h).outcome === 0)) continue;
      const winners = legal(p).filter((e) => {
        const after = move(p, e);
        return table.margin(after.turn === 1 ? defend(after, table).position : after) > 0;
      }).length;
      if (winners > 2) continue;
      const d: Descriptor = { version: 1, size, moves: [...p.moves] };
      if (!validDescriptor(d)) continue;
      const { declined } = bestLine(p, table),
        taught = lesson(d);
      if (!taught) continue;
      found.push({ d, open, winners, declined, theme: taught.theme, size, best: table.bestBoxes(p), total: size * size });
      taken = true;
    }
  }
/** Twelve: six 3x3 then six 4x4, fewest ropes first, three of each theme per size. */
function pickSome(size: 3 | 4): Found[] {
  const list = found.filter((f) => f.size === size).sort((a, b) => a.open - b.open || a.d.moves.join().localeCompare(b.d.moves.join()));
  const out: Found[] = [];
  for (const want of ["leave-two", "middle-two", "leave-two", "middle-two", "leave-two", "middle-two"] as Theme[]) {
    const f = list.find((x) => !out.includes(x) && x.theme === want && !out.some((o) => o.open === x.open && o.theme === x.theme)) ?? list.find((x) => !out.includes(x) && x.theme === want);
    if (f) out.push(f);
  }
  return out.sort((a, b) => a.open - b.open);
}
const bank = [...pickSome(3), ...pickSome(4)];
console.log(`candidates ${found.length} (3x3 ${found.filter((f) => f.size === 3).length}, declined ${found.filter((f) => f.declined).length})`);
for (const f of bank) {
  const p = create(0, f.size, 0);
  let s = p;
  for (const m of f.d.moves) s = move(s, m);
  const table = new NetsTable(s);
  const { line, end } = bestLine(s, table);
  // What each circle rope in the best line does: c = closes a box, dK = declines and leaves K for Ray, gK = gives K away.
  const steps: string[] = [];
  let q = s;
  while (q.outcome === null) {
    if (q.turn === 1) { const r = defend(q, table); steps.push(`R${r.position.scores[1] - q.scores[1]}`); q = r.position; continue; }
    const rope = table.best(q)[0], after = move(q, rope);
    if (after.turn === 0) steps.push("c");
    else { const r = defend(after, table); const k = r.position.scores[1] - after.scores[1]; steps.push(declines(q, rope) ? `d${k}` : `g${k}`); }
    q = after;
  }
  console.log("   steps " + steps.join(" "));
  console.log(`${f.theme} ${f.size}x${f.size} open ${f.open} winners ${f.winners} declined ${f.declined} score ${s.scores.join("-")} best ${f.best}/${f.total} line ${line.join(",")} final ${end.scores.join("-")}`);
  if (process.argv.includes("--show")) console.log(show(s));
}
if (bank.length !== 12) throw new Error(`Only ${bank.length} endings found.`);
if (process.argv.includes("--write")) writeFileSync(
    "src/board/fishing-nets/chains.json",
    JSON.stringify(bank.map((f) => ({ ending: f.d, theme: f.theme, best: f.best, short: winningTotals(f.d).some((n) => n < f.best) }))) + "\n"
  );
