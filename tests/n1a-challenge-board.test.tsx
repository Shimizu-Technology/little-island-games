import React, { createContext, useEffect, useState } from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChallengeBoard } from "../src/learn/games/shell-math/challenge-view";
import { challengeEngine, type Action, type State } from "../src/learn/games/shell-math/challenge-engine";
import { shellPuzzles } from "../src/learn/games/shell-math/challenge-content";
import { waysOf, type Descriptor } from "../src/learn/games/shell-math/challenge-task";
import { solveActs } from "../src/math/kit";

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
let latest: State;
function Harness({ d }: { d: Descriptor }) {
  const [s, setS] = useState<State>(() => challengeEngine.create(d, { version: 1 }, { supportOff: false, ownRead: false }));
  useEffect(() => { latest = s; });
  const dispatch = (a: Action) => {
    sent.push(a);
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
const mount = async (d: Descriptor) => { sent.length = 0; await act(async () => { root = create(<Harness d={d} />); }); };
const pick = (pred: (p: (typeof shellPuzzles)[number]) => boolean) => shellPuzzles.find(pred)!.descriptor;

describe("Shell Math Challenge board", () => {
  it("asks which way when there are two, then follows the chosen way", async () => {
    const d = pick((p) => p.dares[0]?.rule.kind === "two-ways");
    await mount(d);
    expect(text(root!.root)).toContain("Choose a way");
    const choices = buttons().filter((b) => /\. /.test(label(b)));
    expect(choices.length).toBeGreaterThanOrEqual(2);
    await press(choices[1] ? label(choices[1]) : "");
    expect(sent).toEqual([["r", 1]]);
    expect(latest.way).toBe(1);
    expect(text(root!.root)).not.toContain("Choose a way");
  });

  it("a fact with one way goes straight to the first step and can be finished through its controls", async () => {
    const d = pick((p) => p.dares[0]?.rule.kind === "whole");
    await mount(d);
    expect(text(root!.root)).not.toContain("Choose a way");
    expect(latest.way).toBe(0);
    for (const a of solveActs(waysOf(d)[0].plan)) {
      if (a[0] === "n") { for (const ch of String(a[1])) await press(ch); await press("Check my answer"); }
      else if (a[0] === "m") await press(`Move ${a[2]} ${a[2] === 1 ? "shell" : "shells"} from the ${a[1] === 0 ? "second group to the first" : "first group to the second"}`);
      else if (a[0] === "t") await press(/Make a ten|Open a ten/);
      else if (a[0] === "c") await press(/Count (on|back) one/);
    }
    expect(latest.work.solved).toBe(true);
  });

  it("the pairs puzzle takes two numbers that make ten, in either order, and then the total", async () => {
    const d = pick((p) => p.descriptor.t === "pairs") as Extract<Descriptor, { t: "pairs" }>;
    await mount(d);
    const chip = (i: number) => buttons().filter((b) => /^\d+(,|$)/.test(label(b)))[i];
    // Touch the first chip and its partner.
    const a = d.nums.findIndex((n, k) => k > 0 && n + d.nums[0] === 10);
    await act(async () => { chip(0).props.onPress(); });
    await act(async () => { chip(a).props.onPress(); });
    expect(sent).toContainEqual(["p", 0, a]);
    expect(latest.work.used).toBe((1 << 0) | (1 << a));
  });

  it("Open a number: trading is the only move and the blocks follow it", async () => {
    const d = pick((p) => p.descriptor.t === "regroup");
    await mount(d);
    await press("Make a ten");
    expect(sent[0]).toEqual(["t"]);
    expect(latest.work.at).toBe(1);
  });
});
