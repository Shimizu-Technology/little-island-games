import { integer } from "../types";
import { CanoesHeatmap } from "../../playPolicies/canoesHeatmap";

/**
 * Hidden Canoes deduction scenarios. A scenario is a public chart only: the spaces
 * already searched (1 open water, 2 a canoe space) and the known fleet of 3, 2 and 2.
 * There is no hidden fleet in it, so every answer follows from the chart, and a mark
 * can only come from a deduction, never from a lucky guess.
 * - sure: find every space that holds a canoe in every way the fleet could fit.
 * - water: find every space that no way of fitting the fleet covers.
 * - best: find the space the most ways cover.
 */
export type Ask = "sure" | "water" | "best";
export type Descriptor = {
  version: 1;
  ask: Ask;
  /** 36 cells, row by row from A1: 0 not searched, 1 open water, 2 canoe space. */
  chart: number[];
  /** How many spaces answer it. Certified against the heatmap by tests. */
  count: number;
};
export type Facts = { layouts: number; cover: readonly number[]; answers: number[] };
const facts = new Map<string, Facts>();
/** The chart's heatmap and answers, counted once per scenario. */
export function factsFor(d: Pick<Descriptor, "ask" | "chart">): Facts {
  const id = `${d.ask}:${d.chart.join("")}`;
  let f = facts.get(id);
  if (!f) {
    const map = new CanoesHeatmap(d.chart).run(),
      open = d.chart.flatMap((v, i) => (v ? [] : [i])),
      top = Math.max(...open.map((c) => map.cover[c]));
    const answers =
      d.ask === "sure"
        ? open.filter((c) => map.layouts > 0 && map.cover[c] === map.layouts)
        : d.ask === "water"
          ? open.filter((c) => map.cover[c] === 0)
          : open.filter((c) => map.cover[c] === top && top > 0);
    facts.set(id, (f = { layouts: map.layouts, cover: map.cover, answers }));
  }
  return f;
}
export function validDescriptor(v: unknown): v is Descriptor {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const d = v as Record<string, unknown>;
  return (
    Object.keys(d).sort().join() === "ask,chart,count,version" &&
    d.version === 1 &&
    (d.ask === "sure" || d.ask === "water" || d.ask === "best") &&
    Array.isArray(d.chart) &&
    d.chart.length === 36 &&
    d.chart.every((c) => c === 0 || c === 1 || c === 2) &&
    (d.chart as number[]).filter((c) => c === 2).length < 7 &&
    integer(d.count, 1, 4) &&
    (d.ask !== "best" || d.count === 1)
  );
}
