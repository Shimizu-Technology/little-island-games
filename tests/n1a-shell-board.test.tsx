import React, { useEffect, useState } from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { random } from "../src/games/types";
import { optionsAtLevel } from "../src/learn/levelOptions";
import type { BoardProps, LearnSession } from "../src/learn/types";
import { createShell, progress, validShell, type ShellRound } from "../src/learn/games/shell-math/round2";
import { ShellBoard } from "../src/learn/games/shell-math/ShellBoard";
import { LEVELS, type Level } from "../src/math/kit";

const viewport = vi.hoisted(() => ({ fontScale: 1 }));
vi.mock("react-native", () => ({ View: "div", ScrollView: "section", Pressable: "pressable", Animated: { Value: class { setValue() {} interpolate() { return 0; } }, View: "div", timing: () => ({ start() {}, stop() {} }), sequence: () => ({ start() {}, stop() {} }), createAnimatedComponent: (c: unknown) => c }, Platform: { OS: "ios" }, useWindowDimensions: () => ({ fontScale: viewport.fontScale, width: 393, height: 852 }), StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => s }, AccessibilityInfo: { isReduceMotionEnabled: async () => true, addEventListener: () => ({ remove() {} }) } }));
vi.mock("react-native-svg", () => ({ default: "svg", Circle: "circle", Rect: "rect", Path: "path", G: "g", Line: "line", Text: "svgtext", Ellipse: "ellipse" }));
vi.mock("../src/components/Text", () => ({ Text: "span" }));
vi.mock("../src/components/ui", () => ({ Button: "button", Copy: "p", PressableScale: "button", C: { ink: "#183F39", muted: "#64716C", cream: "#FCFAF4", paper: "#FFF", line: "#DBE3DA", teal: "#246858", soft: "#E5EFE5", coral: "#C56D50", gold: "#E1B251", blue: "#386C9A", success: "#E3EFE3", sand: "#F0F1E8", error: "#9C432D" } }));
vi.mock("../src/learn/AnswerTile", () => ({ AnswerTile: (p: { label: string; onPress: () => void; disabled?: boolean; children: React.ReactNode }) => React.createElement("button", { accessibilityLabel: p.label, onPress: p.onPress, disabled: p.disabled }, p.children) }));
vi.mock("../src/learn/Coach", () => ({ CoachSpot: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("../src/components/Audio", () => ({ hasSpeech: (k: string) => k === "math-add-3-4-result" }));
vi.mock("../src/components/feel", () => ({ feel: () => {} }));

let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; viewport.fontScale = 1; });
const calls = { practice: [] as [string, boolean][], assistance: 0, cheer: 0, sounds: [] as string[] };

function Harness({ level, seed, onState }: { level: Level; seed: number; onState: (s: ShellRound) => void }) {
  const options = optionsAtLevel({ mode: "solo", pace: "easy" }, level);
  const [session, setSession] = useState<LearnSession<ShellRound>>(() => ({ game: "shell-math", version: 1, id: "t-" + level, revision: 0, options, state: createShell(options, random(seed)) }));
  useEffect(() => { onState(session.state); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const props: BoardProps<ShellRound> = {
    session, active: true, soundOn: true, width: 340, height: 700, skills: {},
    update: (state) => { onState(state); setSession((p) => ({ ...p, revision: p.revision + 1, state })); },
    practice: (skill, ok) => { calls.practice.push([skill, ok]); },
    notePractice: () => {}, assistance: () => { calls.assistance++; },
    sound: (k) => { calls.sounds.push(k); }, stopSound: () => {}, cheer: () => { calls.cheer++; },
    coach: { active: false, done: () => {} },
  };
  return <ShellBoard {...props} />;
}
const text = (n: ReactTestInstance): string => n.children.map((c) => (typeof c === "string" ? c : text(c))).join("");
const buttons = () => root!.root.findAll((n) => ((n.type as string) === "button" || (n.type as string) === "pressable") && typeof n.props.onPress === "function");
const label = (n: ReactTestInstance) => n.props.accessibilityLabel ?? text(n);
const press = async (name: string | RegExp) => {
  const hit = buttons().find((b) => (typeof name === "string" ? label(b) === name : name.test(label(b))) && !b.props.disabled);
  expect(hit, `button ${String(name)} among ${buttons().map(label).join(" | ")}`).toBeDefined();
  await act(async () => { hit!.props.onPress(); });
};
let latest: ShellRound;
const mount = async (level: Level, seed = 3) => {
  calls.practice = []; calls.assistance = 0; calls.cheer = 0; calls.sounds = [];
  await act(async () => { root = create(<Harness level={level} seed={seed} onState={(s) => { latest = s; }} />); });
};
const typeNumber = async (n: number) => { for (const d of String(n)) await press(d); await press("Check my answer"); };

/** Plays one step the way a child would, using only what the board shows. */
async function playStep(level: Level) {
  const p = progress(latest)!, step = p.plan![p.work.at];
  if (step.kind === "count") await press(/Count (on|back) one/);
  else if (step.kind === "trade") await press(step.dir === "make" ? "Make a ten" : "Open a ten");
  else if (step.kind === "fill") {
    const [side, n] = step.options[0], plural = n === 1 ? "shell" : "shells";
    await press(p.problem!.op === "add" ? `Move ${n} ${plural} from the ${side === 0 ? "second group to the first" : "first group to the second"}` : `Take away ${n} ${plural}`);
  }
  else if (step.kind === "number") { if (level >= 3) await typeNumber(step.value); else await press(`Choose ${step.value}`); }
}

describe("Shell Math board", () => {
  it.each(LEVELS)("level %i: a child can finish the whole round with only the controls on screen", async (level) => {
    await mount(level);
    const first = text(root!.root);
    expect(first).toContain("Question 1 of 5");
    for (let q = 0; q < 5; q++) {
      for (let guard = 0; guard < 20 && !progress(latest)!.work.solved; guard++) await playStep(level);
      expect(latest.solved, JSON.stringify({ q, h: latest.history, i: latest.items[q] })).toBe(true);
      await press(q === 4 ? "Finish round" : "Next question");
    }
    expect(latest.index).toBe(5);
    expect(validShell(latest, optionsAtLevel({ mode: "solo", pace: "easy" }, level))).toBe(true);
    expect(text(root!.root)).toContain("All 5 questions explored");
    expect(progress(latest)!.helped).toEqual([false, false, false, false, false]);
    expect(calls.assistance).toBe(0);
    expect(calls.practice).toHaveLength(5);
    expect(calls.practice.every(([, ok]) => ok)).toBe(true);
    expect(calls.cheer).toBe(5);
  });

  it("a miss is answered gently, marks the round helped, and the next try goes through", async () => {
    await mount(3);
    const step = progress(latest)!.plan![0] as { value: number };
    await typeNumber(step.value === 9 ? 8 : step.value + 1);
    expect(text(root!.root)).toContain("Not quite");
    expect(calls.assistance).toBeGreaterThan(0);
    expect(latest.wrong).not.toBeNull();
    await typeNumber(step.value);
    expect(progress(latest)!.work.at).toBe(1);
    expect(text(root!.root)).not.toContain("Not quite");
  });

  it("Help climbs three stages and the third fills the pad; Choices swap the pad for three tiles", async () => {
    await mount(3);
    const step = progress(latest)!.plan![0] as { value: number };
    await press("Help"); expect(text(root!.root)).toContain("Look at the empty spaces");
    await press("More help"); expect(text(root!.root)).toContain(`The number is ${step.value}`);
    await press("Fill it in"); expect(text(root!.root)).toContain("Tap Go");
    await act(async () => { await Promise.resolve(); });
    expect(root!.root.findAll((n) => n.type === "span").map(text)).toContain(String(step.value));
    expect(calls.assistance).toBeGreaterThanOrEqual(3);
    await press("Show choices");
    expect(buttons().filter((b) => /^Choose \d+$/.test(label(b)))).toHaveLength(3);
    expect(buttons().find((b) => label(b) === "Check my answer")).toBeUndefined();
  });

  it("after a problem is solved it offers a second way, then Next", async () => {
    await mount(3);
    for (let g = 0; g < 10 && !latest.solved; g++) await playStep(3);
    expect(latest.solved).toBe(true);
    await press("Show a second way");
    expect(text(root!.root)).toContain("Another way");
    expect(buttons().some((b) => label(b) === "Next question")).toBe(true);
  });

  it("level 1 and 2 answers are three tiles, never a typed pad", async () => {
    for (const level of [1, 2] as const) {
      await mount(level);
      for (let g = 0; g < 4; g++) { const p = progress(latest)!; if (p.plan![p.work.at].kind === "number") break; await playStep(level); }
      expect(buttons().filter((b) => /^Choose \d+$/.test(label(b)))).toHaveLength(3);
      expect(buttons().find((b) => label(b) === "Check my answer")).toBeUndefined();
      await act(async () => root!.unmount()); root = undefined;
    }
  });

  it("keeps Help in the header at normal sizes and below the pad at accessibility sizes", async () => {
    const order = () => buttons().map(label);
    await mount(3);
    expect(order().indexOf("Help")).toBeGreaterThanOrEqual(0);
    expect(order().indexOf("Help")).toBeLessThan(order().indexOf("1"));
    await act(async () => root!.unmount()); root = undefined;
    viewport.fontScale = 2;
    await mount(3);
    expect(order().filter((l) => l === "Help")).toHaveLength(1);
    expect(order().indexOf("Help")).toBeGreaterThan(order().indexOf("Check my answer"));
  });

  it("only offers Hear when a clip exists for the exact equation", async () => {
    await mount(1, 3);
    expect(buttons().some((b) => label(b) === "Hear")).toBe(false);
  });
});
