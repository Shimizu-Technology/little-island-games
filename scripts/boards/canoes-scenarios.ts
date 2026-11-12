// Finds certified Hidden Canoes deduction scenarios. Run:
//   node --import ./scripts/puzzles/register.mjs scripts/boards/canoes-scenarios.ts [--show] [--write]
// Deterministic. Each chart comes from a real fleet searched part way, then the fleet is
// thrown away: a scenario keeps only the public chart, and its answers come from the heatmap.
import { writeFileSync } from "node:fs";
import { rng } from "../../src/board/types";
import { coordinate, create } from "../../src/board/hidden-canoes/engine";
import { factsFor, validDescriptor, type Ask, type Descriptor } from "../../src/board/hidden-canoes/scenarios";

const random = rng(20261114);
const pick = <T>(a: readonly T[]) => a[Math.floor(random() * a.length)];
const neighbours = (i: number) => [i - 6, i + 6, i % 6 ? i - 1 : -1, i % 6 < 5 ? i + 1 : -1].filter((n) => n >= 0 && n < 36);
/** A family searcher: next to a find most of the time, otherwise anywhere. */
function chartAfter(seed: number, searches: number): number[] {
  const fleet = create(seed).board.slice(36, 72),
    chart = Array(36).fill(0);
  for (let k = 0; k < searches; k++) {
    const open = chart.flatMap((v, i) => (v ? [] : [i])),
      near = open.filter((i) => neighbours(i).some((n) => chart[n] === 2));
    const cell = near.length && random() < 0.7 ? pick(near) : pick(open);
    chart[cell] = fleet[cell] ? 2 : 1;
    if (chart.filter((v) => v === 2).length >= 6) break;
  }
  return chart;
}
type Found = { d: Descriptor; layouts: number; hits: number; misses: number; margin: number; lone: boolean };
/** A space boxed in by open water and the edge: too small for any canoe. */
const lone = (chart: number[], i: number) => neighbours(i).every((n) => chart[n] === 1) && neighbours(i).length >= 2;
const found: Record<Ask, Found[]> = { sure: [], water: [], best: [] };
const seen = new Set<string>();
for (let seed = 1; seed <= 4000; seed++) {
  const chart = chartAfter(seed, 6 + Math.floor(random() * 14)),
    key = chart.join("");
  if (seen.has(key)) continue;
  seen.add(key);
  const hits = chart.filter((v) => v === 2).length,
    misses = chart.filter((v) => v === 1).length;
  if (hits >= 7 || hits < 1) continue;
  for (const ask of ["sure", "water", "best"] as Ask[]) {
    const f = factsFor({ ask, chart });
    if (f.layouts < 2) continue;
    const count = f.answers.length;
    if (ask !== "best" && (count < 1 || count > 3)) continue;
    if (ask === "best" && count !== 1) continue;
    let margin = 0;
    if (ask === "best") {
      const rest = chart.flatMap((v, i) => (v || i === f.answers[0] ? [] : [f.cover[i]]));
      margin = f.cover[f.answers[0]] / Math.max(1, ...rest);
      // A sure space is a different puzzle: the best chance must still be a chance.
      if (margin < 1.15 || f.cover[f.answers[0]] === f.layouts) continue;
    }
    // A water answer that is just a lone gap between misses is fine at first; keep a mix.
    const d: Descriptor = { version: 1, ask, chart, count };
    if (!validDescriptor(d)) continue;
    found[ask].push({ d, layouts: f.layouts, hits, misses, margin, lone: f.answers.every((c) => lone(chart, c)) });
  }
}
const order = (a: Found, b: Found) => a.hits + a.misses - (b.hits + b.misses) || a.d.chart.join("").localeCompare(b.d.chart.join(""));
const choose = (list: Found[], n: number, keep: (f: Found) => boolean) => {
  const out: Found[] = [];
  for (const f of [...list].sort(order)) if (out.length < n && keep(f) && !out.some((o) => o.d.chart.join() === f.d.chart.join())) out.push(f);
  return out;
};
const bank = [
  ...choose(found.sure, 1, (f) => f.d.count === 1 && f.hits === 1 && f.misses >= 3),
  ...choose(found.sure, 2, (f) => f.d.count === 1 && f.hits === 2 && f.misses >= 3),
  ...choose(found.water, 2, (f) => f.d.count === 1 && f.lone && f.misses >= 5),
  ...choose(found.water, 1, (f) => f.d.count <= 2 && !f.lone && f.hits >= 2),
  ...choose(found.best, 3, (f) => f.misses >= 6 && f.hits >= 1),
  ...choose(found.sure, 3, (f) => f.d.count >= 2 && f.hits >= 3),
].map((f) => f.d);
console.log(`candidates sure ${found.sure.length}, water ${found.water.length}, best ${found.best.length}`);
for (const d of bank) {
  const f = factsFor(d);
  console.log(d.ask, d.count, "layouts", f.layouts, "answers", f.answers.map(coordinate).join(" "));
  if (process.argv.includes("--show"))
    for (let r = 0; r < 6; r++)
      console.log("   " + d.chart.slice(r * 6, r * 6 + 6).map((v, c) => (f.answers.includes(r * 6 + c) ? "?" : v === 2 ? "C" : v === 1 ? "o" : ".")).join(" "));
}
if (bank.length !== 12) throw new Error(`Only ${bank.length} scenarios found.`);
if (process.argv.includes("--write")) writeFileSync("src/board/hidden-canoes/scenarios.json", JSON.stringify(bank) + "\n");
