/** N1b fix round 2 (review P3-1): Bridge's optional height must not change the default drawing Shell Math already uses. */
import React from "react";
import { readFileSync } from "node:fs";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ View: "div" }));
vi.mock("react-native-svg", () => ({ default: "svg", Circle: "circle", G: "g", Line: "line", Path: "path", Text: "svgtext" }));
vi.mock("../src/components/ui", () => ({ C: { ink: "#000", teal: "#0a0", coral: "#a00" } }));
import { Bridge, type BridgeProps } from "../src/math/kit/ui/Bridge";

type Case = { props: BridgeProps; svg: { width: number; height: number; viewBox: string }; paths: string[]; circles: number[][] };
/** Rendered by program/4.0's Bridge before N1b (the generator is described in the fixture's `source`). */
const baseline = JSON.parse(readFileSync("tests/fixtures/n1b/bridge-default.json", "utf8")) as { cases: Case[] };

async function draw(props: BridgeProps) {
  let r: ReturnType<typeof create> | undefined;
  await act(async () => { r = create(<Bridge {...props} />); });
  const svg = r!.root.findByType("svg" as never);
  return { svg: { width: svg.props.width, height: svg.props.height, viewBox: svg.props.viewBox }, paths: r!.root.findAllByType("path" as never).map((n) => n.props.d), circles: r!.root.findAllByType("circle" as never).map((n) => [n.props.cx, n.props.cy, n.props.r]) };
}

it.each(baseline.cases.map((c, i) => [i, c] as const))("case %i: with no height, and with height 74, every path is byte-for-byte program/4.0's", async (_i, c) => {
  for (const props of [c.props, { ...c.props, height: 74 }]) {
    const now = await draw(props);
    expect(now.paths).toEqual(c.paths);
    expect(now.circles).toEqual(c.circles);
    expect(now.svg).toEqual(c.svg);
  }
});
it("the reviewer's case keeps its 30-pt rise: the second arc's control point is at y -22", async () => {
  const now = await draw({ width: 340, start: 8, hops: [10, 17], ten: 10, lo: 0, hi: 20 });
  expect(now.paths[2]).toBe("M170 38 Q224.6 -22 279.2 38");
});
it("only a smaller height fits the arcs inside it", async () => {
  const small = await draw({ width: 340, start: 8, hops: [10, 17], ten: 10, lo: 0, hi: 20, height: 64 });
  expect(small.svg.height).toBe(64);
  // The line sits 28 pt above the bottom (y 36); no arc's control point climbs above the top of the drawing.
  for (const d of small.paths.filter((p) => p.includes("Q"))) expect(Number(d.split(" ")[4])).toBeGreaterThanOrEqual(0);
});
