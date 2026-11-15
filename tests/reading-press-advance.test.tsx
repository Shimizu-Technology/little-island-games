import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { random } from "../src/games/types";
import { engine as whichEngine } from "../src/learn/games/which-one/engine";
import { Board as WhichBoard } from "../src/learn/games/which-one/view";
import { whichAnswer, whichNext, whichPick, type WhichState } from "../src/learn/games/which-one/engine";
import { engine as taleEngine, talePick, taleTurnPage, type TaleState } from "../src/learn/games/turtle-tales/engine";
import { Board as TaleBoard } from "../src/learn/games/turtle-tales/view";

vi.mock("react-native", () => {
  class Value { v: number; constructor(v: number) { this.v = v; } setValue(v: number) { this.v = v; } interpolate() { return this; } }
  return { View: "div", ScrollView: "section", Animated: { View: "div", Value, timing: () => ({ start() {} }), spring: () => ({ start() {} }), sequence: () => ({ start() {}, stop() {} }), loop: () => ({ start() {}, stop() {} }), parallel: () => ({ start() {}, stop() {} }) }, useWindowDimensions: () => ({ fontScale: 1 }) };
});
vi.mock("react-native-svg", () => ({ default: "svg", Circle: "circle", Rect: "rect", Path: "path", Ellipse: "ellipse", G: "g" }));
vi.mock("../src/components/ui", () => ({
  Button: (p: { children?: React.ReactNode; onPress: () => void; disabled?: boolean }) => React.createElement("button", { onPress: p.onPress, disabled: p.disabled } as never, p.children),
  Copy: "p", Heading: "h2", PressableScale: "card",
  C: { ink: "#183F39", paper: "#fff", gold: "#C9A227", coral: "#E07A5F", muted: "#667", teal: "#246858", success: "#CDEAC0", line: "#DBE3DA", blue: "#386C9A" },
}));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => true, easeOut: () => 0, nativeDriver: false }));
vi.mock("../src/learn/stepReveal", () => ({ useStepReveal: () => undefined }));
vi.mock("../src/learn/Coach", () => ({ CoachSpot: (p: { children: React.ReactNode }) => p.children }));
vi.mock("../src/learn/art/Objects", () => ({ PictureObject: "picture", Scene: "scene" }));
vi.mock("../src/learn/kit/ReadingText", () => ({ ReadingText: "reading" }));

let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.useRealTimers(); });
const mount = async (el: React.ReactElement) => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); await act(async () => { root = create(el); }); };
const next = (text: string) => root!.root.findAllByType("button").find((b) => b.children.join("") === text);
const ctx = { skills: {}, rng: random(5), starter: 0 as const, today: 1 };
const props = (state: unknown, update: (s: any) => void) => ({
  session: { state, options: { mode: "solo", pace: "easy" }, names: undefined } as never, update, practice: vi.fn(), assistance: vi.fn(), skills: {}, sound: vi.fn(), stopSound: vi.fn(), soundOn: true,
  width: 335, height: 800, active: true, coach: { active: false, done: vi.fn() }, cheer: vi.fn(),
});
const whichState = (index = 0): WhichState => {
  let s = whichEngine.create({ pace: "easy", mode: "solo" } as never, ctx as never);
  for (let i = 0; i < index; i++) s = whichNext(whichPick(s, whichAnswer(s)));
  return s;
};

it("Which One waits for the child: a solved sentence never advances on its own, and Next does", async () => {
  vi.useFakeTimers();
  const update = vi.fn();
  const state = whichEngine.create({ pace: "easy", mode: "solo" } as never, ctx as never);
  const right = whichPick(state, whichAnswer(state));
  expect(right.solved).toBe(true);
  await mount(<WhichBoard {...props(right, update)} />);
  await act(async () => { vi.advanceTimersByTime(60_000); });
  expect(update).not.toHaveBeenCalled();
  expect(next("Next")).toBeDefined();
  await act(async () => next("Next")!.props.onPress());
  expect(update).toHaveBeenCalledTimes(1);
  expect(update).toHaveBeenCalledWith(whichNext(right));
});

it("Which One resumes on a solved sentence with Next waiting, keeps its save shape, and says Finish on the last", async () => {
  const update = vi.fn(), s = whichState(2), right = whichPick(s, whichAnswer(s));
  expect(Object.keys(right).sort()).toEqual(["clean", "ids", "index", "orders", "solved", "starter", "tried", "wrong"]);
  expect(whichEngine.validate(right, { pace: "easy" } as never)).toBe(true);
  await mount(<WhichBoard {...props(right, update)} />);
  expect(next("Next")).toBeDefined();
  expect(next("Finish")).toBeUndefined();
  const seventh = whichState(7), last = whichPick(seventh, whichAnswer(seventh));
  await act(async () => root!.update(<WhichBoard {...props(last, update)} />));
  expect(next("Finish")).toBeDefined();
  const third = whichState(2);
  await act(async () => root!.update(<WhichBoard {...props(whichPick(third, (whichAnswer(third) + 1) % 3), update)} />));
  expect(next("Next")).toBeUndefined();
});

const taleState = (): TaleState => taleEngine.create({ pace: "easy", mode: "solo" } as never, ctx as never) as TaleState;

it("Turtle Tales waits for the child: a solved page never turns on its own, and the button does", async () => {
  vi.useFakeTimers();
  const update = vi.fn(), s = taleState(), right = talePick(s, s.sides[0]);
  expect(right.solved).toBe(true);
  await mount(<TaleBoard {...props(right, update)} />);
  await act(async () => { vi.advanceTimersByTime(60_000); });
  expect(update).not.toHaveBeenCalled();
  expect(next("Turn the page")).toBeDefined();
  await act(async () => next("Turn the page")!.props.onPress());
  expect(update).toHaveBeenCalledTimes(1);
  expect(update).toHaveBeenCalledWith(taleTurnPage(right));
});

it("Turtle Tales resumes a solved page with its button, keeps its save shape, and offers nothing before the pick", async () => {
  const update = vi.fn(), s = taleState(), right = talePick(s, s.sides[0]);
  expect(Object.keys(right).sort()).toEqual(["clean", "heard", "id", "page", "sides", "solved", "starter", "wrong"]);
  expect(taleEngine.validate(right, { pace: "easy" } as never)).toBe(true);
  await mount(<TaleBoard {...props(s, update)} />);
  expect(next("Turn the page")).toBeUndefined();
  await act(async () => root!.update(<TaleBoard {...props(right, update)} />));
  expect(next("Turn the page")).toBeDefined();
});
