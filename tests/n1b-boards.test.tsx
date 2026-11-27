import React, { useEffect, useState } from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { random } from "../src/games/types";
import { optionsAtLevel } from "../src/learn/levelOptions";
import type { BoardProps, LearnSession } from "../src/learn/types";
import { LEVELS, bestJump, jumpText, type Level } from "../src/math/kit";
import { answerOf } from "../src/learn/games/quick-practice/items";
import { QuickBoard } from "../src/learn/games/quick-practice/QuickBoard";
import { createQuick, quickProgress, validQuick, type QuickRound } from "../src/learn/games/quick-practice/round2";
import { HopBoard } from "../src/learn/games/number-hop/HopBoard";
import { roundProgress } from "../src/learn/LearnChrome";
import { countResult, hopOf, landingOf } from "../src/learn/games/number-hop/items";
import { createHop, hopProgress, validHop2, type HopRound } from "../src/learn/games/number-hop/round2";

vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));
const viewport = vi.hoisted(() => ({ fontScale: 1, width: 393 }));
vi.mock("react-native", () => ({ View: "div", ScrollView: "section", Pressable: "pressable", Animated: { Value: class { setValue() {} interpolate() { return 0; } }, View: "div", timing: () => ({ start() {}, stop() {} }), sequence: () => ({ start() {}, stop() {} }), createAnimatedComponent: (c: unknown) => c }, Platform: { OS: "ios" }, useWindowDimensions: () => ({ fontScale: viewport.fontScale, width: viewport.width, height: 852 }), StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => s }, AccessibilityInfo: { isReduceMotionEnabled: async () => true, addEventListener: () => ({ remove() {} }) } }));
vi.mock("react-native-svg", () => ({ default: "svg", Circle: "circle", Rect: "rect", Path: "path", G: "g", Line: "line", Text: "svgtext", Ellipse: "ellipse" }));
vi.mock("../src/components/Text", () => ({ Text: "span" }));
vi.mock("../src/components/ui", () => ({ Button: "button", Copy: "p", PressableScale: "button", C: { ink: "#183F39", muted: "#64716C", cream: "#FCFAF4", paper: "#FFF", line: "#DBE3DA", teal: "#246858", soft: "#E5EFE5", coral: "#C56D50", gold: "#E1B251", blue: "#386C9A", success: "#E3EFE3", sand: "#F0F1E8", error: "#9C432D" } }));
vi.mock("../src/learn/AnswerTile", () => ({ AnswerTile: (p: { label: string; onPress: () => void; disabled?: boolean; selected?: boolean; children: React.ReactNode }) => React.createElement("button", { accessibilityLabel: p.label, onPress: p.onPress, disabled: p.disabled, selected: p.selected }, p.children) }));
vi.mock("../src/learn/Coach", () => ({ CoachSpot: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("../src/components/Audio", () => ({ hasSpeech: () => false }));
vi.mock("../src/components/feel", () => ({ feel: () => {} }));

let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; viewport.fontScale = 1; viewport.width = 393; });
const calls = { practice: [] as [string, boolean][], assistance: 0, cheer: 0 };

function Harness<S>({ game, start, Board, onState }: { game: "quick-practice" | "number-hop"; start: () => LearnSession<S>; Board: (p: BoardProps<S>) => React.ReactElement | null; onState: (s: S) => void }) {
  const [session, setSession] = useState<LearnSession<S>>(start);
  useEffect(() => { onState(session.state); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const props: BoardProps<S> = {
    session, active: true, soundOn: true, width: Math.min(viewport.width - 32, 700), height: 700, skills: {},
    update: (state) => { onState(state); setSession((p) => ({ ...p, revision: p.revision + 1, state })); },
    practice: (skill, ok) => { calls.practice.push([skill, ok]); },
    notePractice: () => {}, assistance: () => { calls.assistance++; },
    sound: () => {}, stopSound: () => {}, cheer: () => { calls.cheer++; },
    coach: { active: false, done: () => {} },
  };
  void game;
  return <Board {...props} />;
}
const text = (n: ReactTestInstance): string => n.children.map((c) => (typeof c === "string" ? c : text(c))).join("");
const buttons = () => root!.root.findAll((n) => ((n.type as string) === "button" || (n.type as string) === "pressable") && typeof n.props.onPress === "function");
const label = (n: ReactTestInstance) => n.props.accessibilityLabel ?? text(n);
const has = (name: string | RegExp) => buttons().some((b) => (typeof name === "string" ? label(b) === name : name.test(label(b))) && !b.props.disabled);
const press = async (name: string | RegExp) => {
  const hit = buttons().find((b) => (typeof name === "string" ? label(b) === name : name.test(label(b))) && !b.props.disabled);
  expect(hit, `button ${String(name)} among ${buttons().map(label).join(" | ")}`).toBeDefined();
  await act(async () => { hit!.props.onPress(); });
};
const typeNumber = async (n: number) => { for (const d of String(n)) await press(d); await press("Check my answer"); };
const screen = () => text(root!.root);

let quick: QuickRound, hop: HopRound;
const quickOptions = (level: Level) => ({ ...optionsAtLevel({ mode: "solo", pace: "easy" }, level), mathOperation: "mixed" as const });
async function mountQuick(level: Level, seed = 3) {
  calls.practice = []; calls.assistance = 0; calls.cheer = 0;
  const options = quickOptions(level);
  await act(async () => {
    root = create(<Harness<QuickRound> game="quick-practice" Board={QuickBoard} onState={(s) => { quick = s; }}
      start={() => ({ game: "quick-practice", version: 1, id: `q-${level}`, revision: 0, options, state: createQuick(options, random(seed)) })} />);
  });
}
async function mountHop(level: Level, seed = 3) {
  calls.practice = []; calls.assistance = 0; calls.cheer = 0;
  const options = quickOptions(level);
  await act(async () => {
    root = create(<Harness<HopRound> game="number-hop" Board={HopBoard} onState={(s) => { hop = s; }}
      start={() => ({ game: "number-hop", version: 1, id: `h-${level}`, revision: 0, options, state: createHop(options, random(seed)) })} />);
  });
}
async function answerQuick(level: Level) {
  const ans = answerOf(quick.items[quickProgress(quick)!.cur]);
  if (level >= 3) await typeNumber(ans); else await press(`Choose ${ans}`);
}
/** Plays the puzzle on screen with only the controls the board shows, in the fewest jumps. */
async function playHop() {
  const p = hopProgress(hop)!, i = p.item!;
  if (i[0] === 0) {
    for (let k = 0; k < i[3]; k++) await press(i[1] === 0 ? "Hop forward one" : "Hop back one");
    await press(`Choose ${countResult(i)}`);
  } else if (i[0] === 2) await typeNumber(i[1]);
  else {
    const h = hopOf(i, hop.level);
    for (let guard = 0; guard < 30 && !hop.solved; guard++) {
      const pz = hopProgress(hop)!.puzzle!;
      const j = bestJump(h, pz.kind === 1 ? pz.work.at : h.start)!;
      await press(`Jump ${j > 0 ? "forward" : "back"} ${Math.abs(j)}`);
    }
  }
}

describe("Quick Practice board", () => {
  it.each(LEVELS)("level %i: a child finishes the whole round with only the controls on screen", async (level) => {
    await mountQuick(level);
    expect(screen()).toContain("Question 1 of 3");
    for (let q = 0; q < 3; q++) {
      await answerQuick(level);
      expect(quick.solved).toBe(true);
      expect(screen()).toContain("You found it!");
      await press(q === 2 ? "Finish round" : "Next question");
    }
    expect(quick.index).toBe(3);
    expect(validQuick(quick, quickOptions(level))).toBe(true);
    expect(screen()).toContain("All 3 questions done");
    expect(calls.assistance).toBe(0);
    expect(calls.practice.every(([, ok]) => ok)).toBe(true);
  });
  it("a typed miss shows how the missed one works and puts a new question in its place", async () => {
    await mountQuick(4);
    const first = quick.items[0], ans = answerOf(first);
    await typeNumber(ans + 1);
    expect(calls.assistance).toBe(1);
    expect(quick.tries[0]).toBe(1);
    expect(quick.items[0]).not.toEqual(first);
    expect(screen()).toContain("Not quite.");
    expect(screen()).toContain(`= ${ans}.`);
    expect(screen()).toContain("Here is a new question like it.");
    await answerQuick(4);
    expect(calls.practice.at(-1)).toEqual(["num.missing-to-100", false]);
    expect(screen()).toContain("We worked it out together.");
  });
  it("the frame's journey bar keeps three parts after a miss brings a fresh question (found on device: it read 0/4)", async () => {
    await mountQuick(4);
    await typeNumber(answerOf(quick.items[0]) + 1);
    expect(quick.items).toHaveLength(3);
    expect(quick.tries[0]).toBe(1);
    expect(roundProgress({ game: "quick-practice", version: 1, id: "x", revision: 1, options: quickOptions(4), state: quick })).toEqual({ current: 0, total: 3 });
    expect(roundProgress({ game: "number-hop", version: 1, id: "y", revision: 1, options: quickOptions(4), state: createHop(quickOptions(4), random(2)) })).toEqual({ current: 0, total: 5 });
  });
  it("the 10th and 11th misses on screen still show the worked answer and a new question (review P2-1)", async () => {
    await mountQuick(3, 7);
    for (let k = 1; k <= 11; k++) {
      const q = quick.items[0], ans = answerOf(q);
      await typeNumber(ans + 1);
      if (k >= 10) {
        expect(screen()).toContain("Not quite.");
        expect(screen()).toContain(`= ${ans}.`);
        expect(screen()).toContain("Here is a new question like it.");
        expect(quick.items[0]).not.toEqual(q);
      }
    }
    expect(quick.tries[0]).toBe(11);
  });
  it("Help climbs a ladder from the engine and fills the pad on the last step; Show choices gives three tiles", async () => {
    await mountQuick(3);
    const ans = answerOf(quick.items[0]);
    await press("Help");
    expect(screen()).toMatch(/Take|Count up|Put the|What goes/);
    await press("More help");
    expect(screen()).toContain(String(ans));
    await press("Fill it in");
    expect(screen()).toContain("Tap Go to check it.");
    await press("Check my answer");
    expect(quick.solved).toBe(true);
    await press("Next question");
    await press("Show choices");
    expect(buttons().filter((b) => /^Choose \d+$/.test(label(b)))).toHaveLength(3);
  });
  it("a story question shows the story, hides the number sentence until it is solved, then shows it", async () => {
    await mountQuick(5);
    await answerQuick(5); await press("Next question");
    await answerQuick(5); await press("Next question");
    const story = quick.items[quickProgress(quick)!.cur];
    expect(story[0]).toBe(3);
    expect(screen()).toContain("How many");
    expect(screen()).not.toContain("= ?");
    await answerQuick(5);
    expect(screen()).toContain(`= ${answerOf(story)}`);
  });
  it("at AX5 Help moves beside the other supports and the words are capped", async () => {
    viewport.fontScale = 3.12;
    await mountQuick(4);
    const heading = root!.root.find((n) => n.props.accessibilityRole === "header");
    expect(heading.props.maxFontSizeMultiplier).toBe(1.5);
    expect(has("Help")).toBe(true);
    viewport.fontScale = 1;
  });
});

describe("Number Hop board", () => {
  it.each(LEVELS)("level %i: a child finishes the whole round with only the controls on screen, in the fewest jumps", async (level) => {
    await mountHop(level);
    expect(screen()).toContain("Puzzle 1 of 5");
    for (let q = 0; q < 5; q++) {
      await playHop();
      expect(hop.solved, JSON.stringify(hop.items[q])).toBe(true);
      await press(q === 4 ? "Finish round" : "Next puzzle");
    }
    expect(hop.index).toBe(5);
    expect(validHop2(hop, quickOptions(level))).toBe(true);
    expect(hopProgress(hop)!.helped).toEqual([false, false, false, false, false]);
    expect(calls.assistance).toBe(0);
    expect(calls.practice).toHaveLength(5);
    expect(calls.practice.every(([, ok]) => ok)).toBe(true);
  });
  it("landing in more jumps than the fewest says so, offers a fresh try, and a try in par counts", async () => {
    await mountHop(3);
    const h = hopOf(hop.items[0], 3), step = h.target > h.start ? 1 : -1;
    expect(screen()).toContain(`Get from ${h.start} to ${h.target}.`);
    for (let k = 0; k < Math.abs(h.target - h.start); k++) await press(`Jump ${step > 0 ? "forward" : "back"} 1`);
    const par = (hopProgress(hop)!.puzzle as { par: number }).par;
    expect(screen()).toContain(`It can be done in ${par}.`);
    await press(`Try for ${par} jumps`);
    expect(hop.solved).toBe(false);
    await playHop();
    expect(screen()).toContain("the fewest!");
    await press("Next puzzle");
    expect(calls.practice).toEqual([["num.hop-choose", true]]);
  });
  it("Help marks the next fewest-path jump on its button and on the line; moving on after it is helped work", async () => {
    await mountHop(4);
    const h = hopOf(hop.items[0], 4), j = bestJump(h, h.start)!;
    await press("Help");
    expect(screen()).toContain(`Try ${jumpText(j)} on the way to ${h.target}.`);
    const hot = buttons().filter((b) => b.props.accessibilityState?.selected);
    expect(hot.map(label)).toEqual([`Jump forward ${j}`]);
    expect(calls.assistance).toBe(1);
    await playHop();
    await press("Next puzzle");
    expect(calls.practice).toEqual([["num.hop-skip", false]]);
  });
  it("Undo takes a jump back and Start again clears the path; jumps off the line are not offered", async () => {
    await mountHop(5);
    const h = hopOf(hop.items[0], 5);
    await press(/Jump forward 10/);
    expect(hopProgress(hop)!.puzzle!.kind === 1 && (hopProgress(hop)!.puzzle!.work as { path: readonly number[] }).path).toEqual([10]);
    await press("Undo");
    expect((hopProgress(hop)!.puzzle!.work as { path: readonly number[] }).path).toEqual([]);
    await press(/Jump forward 1$/); await press(/Jump forward 1$/);
    await press("Start again");
    expect((hopProgress(hop)!.puzzle!.work as { at: number }).at).toBe(h.start);
    for (const b of buttons().filter((x) => /^Jump /.test(label(x)))) {
      const j = Number(label(b).replace(/\D+/g, "")) * (/back/.test(label(b)) ? -1 : 1);
      expect(!!b.props.disabled).toBe(h.start + j < h.lo || h.start + j > h.hi);
    }
  });
  it("an unknown start is typed on the pad, and the line does not show the start before Help", async () => {
    await mountHop(5);
    for (let q = 0; q < 3; q++) { await playHop(); await press("Next puzzle"); }
    const i = hop.items[3];
    expect(screen()).toContain(`landed on ${landingOf(i)}`);
    // No line before Help, so nothing on it can give the start away; Help's second stage draws the jumps back.
    const lines = () => root!.root.findAll((n) => typeof n.props.accessibilityLabel === "string" && n.props.accessibilityLabel.startsWith("Number line"));
    expect(lines()).toHaveLength(0);
    expect(screen()).not.toContain(` ${i[1]} `);
    await press("Help"); await press("More help");
    expect(lines()).toHaveLength(1);
    // Drawn back from the landing, the way the working reads.
    expect(lines()[0].props.accessibilityLabel).toContain(`Back from ${landingOf(i)}:`);
    expect(lines()[0].props.accessibilityLabel).toContain(`to ${i[1]}.`);
    await typeNumber(i[1] + 1);
    expect(screen()).toContain("Not quite. Try again, or tap Help.");
    await typeNumber(i[1]);
    expect(screen()).toContain(`It started on ${i[1]}.`);
  });
  it("jump buttons are big targets on the smallest phone, and at AX5 every control stays on the board", async () => {
    viewport.width = 320;
    await mountHop(5);
    const keys = buttons().filter((b) => /^Jump /.test(label(b)));
    expect(keys).toHaveLength(4);
    // One row sharing the width: 4 keys on a 320-pt phone's board (about 264 pt inside) still clear 56 pt each.
    for (const k of keys) { expect(k.props.style.flex).toBe(1); expect(k.props.style.minWidth).toBeGreaterThanOrEqual(56); expect(k.props.style.minHeight).toBeGreaterThanOrEqual(60); }
    expect(4 * 56 + 3 * 8).toBeLessThanOrEqual(320 - 32 - 24);
    await act(async () => root!.unmount()); root = undefined;
    viewport.fontScale = 3.12; viewport.width = 393;
    await mountHop(4);
    expect(has("Help")).toBe(true);
    const jumpText0 = root!.root.findAll((n) => (n.type as string) === "span" && /^\+\d+$/.test(text(n)));
    expect(jumpText0.every((n) => n.props.maxFontSizeMultiplier === 1.4)).toBe(true);
    // A key's sign and number never break across lines (native AX5: "−10" wrapped on the highlighted key).
    await act(async () => root!.unmount()); root = undefined;
    await mountHop(5);
    const labels = root!.root.findAll((n) => (n.type as string) === "span" && /^[+−]\d+$/.test(text(n)));
    expect(labels).toHaveLength(4);
    for (const l of labels) expect(l.props).toMatchObject({ numberOfLines: 1, adjustsFontSizeToFit: true });
  });
});
