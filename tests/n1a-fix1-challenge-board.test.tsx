import React, { createContext, useEffect, useState } from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChallengeBoard } from "../src/learn/games/shell-math/challenge-view";
import { registration } from "../src/learn/games/shell-math/challenge";
import { challengeEngine, type Action, type State } from "../src/learn/games/shell-math/challenge-engine";
import { shellPuzzles } from "../src/learn/games/shell-math/challenge-content";
import { waysOf, type Descriptor } from "../src/learn/games/shell-math/challenge-task";
import { pictureFor } from "../src/learn/games/shell-math/picture";
import { problemOf } from "../src/learn/games/shell-math/round2";
import { bridgeLabel } from "../src/math/kit/ui/Bridge";
import { NumberPad } from "../src/math/kit/ui/NumberPad";
import { solveActs, type Level } from "../src/math/kit";
import { emptyChallenge, type ChallengeSession } from "../src/state/challenge";

vi.mock("react-native", () => ({ View: "div", ScrollView: "section", Pressable: "pressable", Animated: { Value: class { setValue() {} interpolate() { return 0; } }, View: "div", timing: () => ({ start() {}, stop() {} }), sequence: () => ({ start() {}, stop() {} }), createAnimatedComponent: (c: unknown) => c }, Platform: { OS: "ios" }, useWindowDimensions: () => ({ fontScale: 1, width: 393, height: 852 }), StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => s }, AccessibilityInfo: { isReduceMotionEnabled: async () => true, addEventListener: () => ({ remove() {} }) } }));
vi.mock("react-native-svg", () => ({ default: "svg", Circle: "circle", Rect: "rect", Path: "path", G: "g", Line: "line", Text: "svgtext", Ellipse: "ellipse" }));
vi.mock("../src/components/Text", () => ({ Text: "span" }));
vi.mock("../src/components/ui", () => ({ Button: "button", Copy: "p", PressableScale: "button", C: { ink: "#183F39", muted: "#64716C", cream: "#FCFAF4", paper: "#FFF", line: "#DBE3DA", teal: "#246858", soft: "#E5EFE5", coral: "#C56D50", gold: "#E1B251", blue: "#386C9A", success: "#E3EFE3", sand: "#F0F1E8", error: "#9C432D" } }));
vi.mock("../src/learn/AnswerTile", () => ({ AnswerTile: (p: { label: string; onPress: () => void; disabled?: boolean; children: React.ReactNode }) => React.createElement("button", { accessibilityLabel: p.label, onPress: p.onPress, disabled: p.disabled }, p.children) }));
vi.mock("../src/learn/Coach", () => ({ CoachSpot: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("../src/components/feel", () => ({ feel: () => {} }));
vi.mock("../src/components/Audio", () => ({ AudioPreferences: createContext({ sound: true }), useSoundControls: () => ({ play: () => true, stop: () => {} }), hasSpeech: () => false }));

let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; });
const sent: Action[] = [];
const refused: Action[] = [];
let latest: State;
let session: ChallengeSession | null = null;
function Harness({ d }: { d: Descriptor }) {
  const [s, setS] = useState<State>(() => challengeEngine.create(d, { version: 1 }, { supportOff: false, ownRead: false }));
  useEffect(() => { latest = s; });
  const dispatch = (a: Action) => {
    sent.push(a);
    // The same action goes through the registered game, so the saved evidence is what the board's player did.
    const saved = session ? registration.move(session, a) : null;
    if (saved) session = saved; else refused.push(a);
    const next = challengeEngine.step(s, a, d);
    if (next) setS(next.state);
  };
  return <ChallengeBoard state={s} dispatch={dispatch} active width={340} />;
}
const text = (n: ReactTestInstance): string => n.children.map((c) => (typeof c === "string" ? c : text(c))).join("");
const buttons = () => root!.root.findAll((n) => ((n.type as string) === "button" || (n.type as string) === "pressable") && typeof n.props.onPress === "function");
const label = (n: ReactTestInstance) => n.props.accessibilityLabel ?? text(n);
const press = async (name: string | RegExp) => {
  const hit = buttons().find((b) => (typeof name === "string" ? label(b) === name : name.test(label(b))) && !b.props.disabled);
  expect(hit, `button ${String(name)} among ${buttons().map(label).join(" | ")}`).toBeDefined();
  await act(async () => { hit!.props.onPress(); });
};
const mount = async (puzzle: (typeof shellPuzzles)[number], way = 0) => {
  sent.length = 0; refused.length = 0;
  session = registration.start(puzzle.ref, "a", "fix1-board", emptyChallenge(), { supportOff: false, ownRead: false }, []);
  await act(async () => { root = create(<Harness d={puzzle.descriptor} />); });
  if (latest.way === null) {
    const choices = buttons().filter((b) => /\. /.test(label(b)));
    await act(async () => { choices[way].props.onPress(); });
  }
};
const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number);
const typeNumber = async (n: number) => { for (const ch of String(n)) await press(ch); await press("Check my answer"); };
const doAct = async (a: ReturnType<typeof solveActs>[number]) => {
  if (a[0] === "n") await typeNumber(a[1]);
  else if (a[0] === "m") await press(`Move ${a[2]} ${a[2] === 1 ? "shell" : "shells"} from the ${a[1] === 0 ? "second group to the first" : "first group to the second"}`);
  else if (a[0] === "t") await press(/Make a ten|Open a ten/);
  else if (a[0] === "c") await press(/Count (on|back) one/);
};
const fact = (level: Level, n: number) => shellPuzzles.filter((p) => p.ref.bank === 420 + level - 1 && p.descriptor.t === "fact")[n];

describe("P1-3 in Challenge: no label runs ahead of what is drawn", () => {
  const DRAWN = /^(Frame \d|First group|Second group|\d+ tens? and|\d+ shells?$|Move \d|Take away \d)/;
  const spoken = () => root!.root.findAll((n) => typeof n.props.accessibilityLabel === "string").map((n) => String(n.props.accessibilityLabel)).filter((l) => !DRAWN.test(l));
  const drawn = () => root!.root.findAll((n) => ["span", "p", "button", "svgtext"].includes(n.type as string)).map(text).join(" ");

  it.each([3, 4, 5] as Level[])("level %i facts, every way, every step", async (level) => {
    for (const n of [0, 1, 2]) {
      const puzzle = fact(level, n), d = puzzle.descriptor;
      if (d.t !== "fact") continue;
      for (let way = 0; way < waysOf(d).length; way++) {
        await mount(puzzle, way);
        const plan = waysOf(d)[way].plan, acts = solveActs(plan);
        for (let k = 0; k <= acts.length; k++) {
          if (!latest.work.solved) {
            const w = latest.work, hidden = plan.slice(w.at).flatMap((s) => (s.kind === "number" ? [s.value] : []));
            const onScreen = new Set(nums(drawn())), said = new Set(spoken().flatMap(nums));
            for (const v of hidden) if (!onScreen.has(v)) expect(said.has(v), `level ${level} puzzle ${n} way ${way} step ${w.at}: ${spoken().filter((l) => nums(l).includes(v)).join(" | ")}`).toBe(false);
            const pic = pictureFor(d.level, problemOf(d.item), d.ways[way], plan, w);
            const lines = spoken().filter((l) => /^Number line/.test(l));
            expect(lines).toEqual(pic.line ? [bridgeLabel(pic.line.start, pic.line.hops, pic.line.made)] : []);
          }
          if (k < acts.length) await doAct(acts[k]);
        }
        expect(latest.work.solved).toBe(true);
        await act(async () => root!.unmount()); root = undefined;
      }
    }
  });

  it("Find the missing number: the line draws and speaks only the hops already made", async () => {
    const puzzle = shellPuzzles.find((p) => p.descriptor.t === "missing")!, d = puzzle.descriptor as Extract<Descriptor, { t: "missing" }>;
    await mount(puzzle);
    const ten = d.known + (10 - (d.known % 10)), acts = solveActs(waysOf(d)[0].plan);
    for (let k = 0; k <= acts.length; k++) {
      if (!latest.work.solved) {
        const lines = spoken().filter((l) => /^Number line/.test(l));
        expect(lines).toEqual([bridgeLabel(d.known, [ten, d.total], Math.min(latest.work.at, 2))]);
        if (latest.work.at === 0) expect(lines[0]).not.toContain(String(d.total));
      }
      if (k < acts.length) await doAct(acts[k]);
    }
  });
});

describe("P2-5 in Challenge: the pad cannot produce a number the puzzle refuses, and a refusal is visible", () => {
  const firstNumberStep = async (level: Level) => {
    const puzzle = fact(level, 0), d = puzzle.descriptor;
    await mount(puzzle);
    const plan = waysOf(d)[latest.way!].plan, i = plan.findIndex((s) => s.kind === "number");
    for (const a of solveActs(plan.slice(0, i))) await doAct(a);
  };
  it("typing 999 stops at 99, says why, and the miss that follows is recorded by the registered game", async () => {
    await firstNumberStep(4);
    for (const ch of "999") await press(ch);
    expect(text(root!.root)).toContain("Answers go up to 100");
    await press("Check my answer");
    expect(sent.at(-1)).toEqual(["n", 99]);
    expect(refused).toEqual([]);
    expect(text(root!.root)).toContain("Not quite");
    expect(latest.work.wrong).toBe(1);
  });
  it("a number past 100 that reaches the board anyway is refused in words, never silently dropped", async () => {
    await firstNumberStep(4);
    const before = sent.length;
    await act(async () => { root!.root.findByType(NumberPad).props.onSubmit(999); });
    expect(sent.length).toBe(before);
    expect(text(root!.root)).toContain("Answers go up to 100");
  });
});

describe("P2-2 in Challenge: Undo", () => {
  it("is offered after an accepted step, reverses it, and the finished puzzle's cost still includes both moves", async () => {
    const puzzle = fact(4, 0), d = puzzle.descriptor;
    await mount(puzzle);
    expect(buttons().some((b) => label(b) === "Undo")).toBe(false);
    const acts = solveActs(waysOf(d)[latest.way!].plan);
    await doAct(acts[0]);
    expect(buttons().some((b) => label(b) === "Undo")).toBe(true);
    await press("Undo");
    expect(sent.at(-1)).toEqual(["u"]);
    expect(latest.work.at).toBe(0);
    expect(latest.work.moves).toBe(2);
    expect(refused).toEqual([]);
    for (const a of acts) await doAct(a);
    expect(latest.work.solved).toBe(true);
    expect(buttons().some((b) => label(b) === "Undo")).toBe(false);
    expect(session!.result).not.toBeNull();
    expect(session!.result!.cost).toBe(acts.length + 2);
  });
});
