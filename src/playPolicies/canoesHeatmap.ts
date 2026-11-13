import { fleet } from "../board/hidden-canoes/engine";

/**
 * Placement heatmap for Hidden Canoes, from one chart only: the cells a seat has
 * searched (1 open water, 2 a canoe space) and the known fleet of 3, 2 and 2. It
 * counts every fleet layout where misses stay open water and every find is covered,
 * and how many of those layouts cover each cell. Nothing else is read, so the
 * hidden fleet can never change the answer.
 *
 * Cells are bits: 0-31 in `lo`, 32-35 in `hi`. The two short canoes look the same
 * on a chart, so each pair of short placements is counted once; every layout is
 * counted the same number of times, so the shares are exact.
 */
type Mask = readonly [number, number];
const bit = (cell: number): Mask => (cell < 32 ? [(1 << cell) >>> 0, 0] : [0, 1 << (cell - 32)]);
const or = (a: Mask, b: Mask): Mask => [(a[0] | b[0]) >>> 0, a[1] | b[1]];
const meets = (a: Mask, b: Mask) => (a[0] & b[0]) !== 0 || (a[1] & b[1]) !== 0;
const within = (a: Mask, b: Mask) => ((a[0] & b[0]) >>> 0) === a[0] && (a[1] & b[1]) === a[1];

/** Every straight placement of one canoe that avoids the chart's open water. */
export function placements(length: number, searched: readonly number[]): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < 36; i++)
    for (const d of [1, 6]) {
      const cells = Array.from({ length }, (_, j) => i + j * d);
      if (cells.every((p) => p < 36 && (d !== 1 || Math.floor(p / 6) === Math.floor(i / 6)) && searched[p] !== 1))
        out.push(cells);
    }
  return out;
}
export class CanoesHeatmap {
  /** Fleet layouts that fit the chart, once counting is done. */
  layouts = 0;
  /** Layouts covering each cell, once counting is done. */
  readonly cover = Array<number>(36).fill(0);
  /** Pairs of placements looked at so far: the unit of work for slices. */
  work = 0;
  private readonly long: number[][];
  private readonly short: number[][];
  private readonly longMask: Mask[];
  private readonly shortMask: Mask[];
  private readonly hits: Mask;
  private readonly longCount: number[];
  private readonly shortCount: number[];
  private a = 0;
  private x = 0;
  private finished = false;
  constructor(searched: readonly number[]) {
    if (fleet.join() !== "3,2,2") throw new Error("The heatmap counts the 3, 2, 2 fleet.");
    const mask = (cells: number[]) => cells.reduce<Mask>((m, c) => or(m, bit(c)), [0, 0]);
    this.long = placements(3, searched);
    this.short = placements(2, searched);
    this.longMask = this.long.map(mask);
    this.shortMask = this.short.map(mask);
    this.hits = mask(searched.flatMap((v, i) => (v === 2 ? [i] : [])));
    this.longCount = Array(this.long.length).fill(0);
    this.shortCount = Array(this.short.length).fill(0);
    if (!this.long.length || this.short.length < 2) this.close();
  }
  get done() {
    return this.finished;
  }
  /** Looks at about `quota` more pairs of placements. True once every layout is counted. */
  step(quota: number): boolean {
    const { longMask, shortMask, hits, longCount, shortCount } = this,
      n = shortMask.length;
    for (let work = 0; !this.finished && work < quota; work++) {
      const a = longMask[this.a],
        x = shortMask[this.x];
      this.work++;
      if (!meets(a, x)) {
        const ax = or(a, x);
        for (let y = this.x + 1; y < n; y++) {
          const b = shortMask[y];
          if (meets(ax, b) || !within(hits, or(ax, b))) continue;
          this.layouts++;
          longCount[this.a]++;
          shortCount[this.x]++;
          shortCount[y]++;
        }
      }
      if (++this.x >= n) {
        this.x = 0;
        if (++this.a >= longMask.length) this.close();
      }
    }
    return this.finished;
  }
  private close() {
    this.finished = true;
    this.long.forEach((cells, i) => cells.forEach((c) => (this.cover[c] += this.longCount[i])));
    this.short.forEach((cells, i) => cells.forEach((c) => (this.cover[c] += this.shortCount[i])));
  }
  /** Runs straight through; for tests and scripts. */
  run(): this {
    while (!this.step(1 << 16));
    return this;
  }
}
/** Unsearched cells covered by the most layouts, in cell order. Empty when nothing fits. */
export function likeliest(map: CanoesHeatmap, searched: readonly number[]): number[] {
  if (!map.layouts) return [];
  const open = map.cover.map((n, c) => (searched[c] ? -1 : n)),
    top = Math.max(...open);
  return top > 0 ? open.flatMap((n, c) => (n === top ? [c] : [])) : [];
}
