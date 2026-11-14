import React, { createContext } from "react";
import { readFileSync } from "node:fs";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { random } from "../src/games/types";
import { AudioPreferences } from "../src/components/Audio";
import { ChallengeBoard } from "../src/learn/games/sound-boat/challenge-view";
import { challengeEngine, type Action } from "../src/learn/games/sound-boat/challenge-engine";
import { PartsBoard } from "../src/learn/games/sound-boat/parts-view";
import { createParts, partsMove, partsTask, tasksOf, type PartsState } from "../src/learn/games/sound-boat/parts";
import { taskOfParts, type BuildTask } from "../src/learn/reading/build";
import type { PartsWord, WordBank } from "../src/learn/reading/records";

vi.mock("react-native", () => {
  class Value { v: number; constructor(v: number) { this.v = v; } setValue(v: number) { this.v = v; } interpolate() { return this; } }
  return { View: "div", ScrollView: "section", Animated: { View: "div", Value, timing: () => ({ start() {} }), spring: () => ({ start() {} }), sequence: () => ({ start() {}, stop() {} }) }, useWindowDimensions: () => ({ fontScale: 1 }) };
});
vi.mock("react-native-svg", () => ({ default: "svg", Circle: "circle", Rect: "rect", Path: "path", Ellipse: "ellipse", G: "g" }));
vi.mock("../src/components/ui", () => ({
  Button: (p: { children?: React.ReactNode; label?: string; onPress: () => void; disabled?: boolean }) => React.createElement("button", { accessibilityLabel: p.label, onPress: p.onPress, disabled: p.disabled } as never, p.children),
  IconButton: (p: { label: string; onPress: () => void; disabled?: boolean }) => React.createElement("button", { accessibilityLabel: p.label, onPress: p.onPress, disabled: p.disabled } as never),
  Copy: "p", Heading: "h2", PressableScale: "button",
  C: { ink: "#183F39", paper: "#fff", gold: "#C9A227", coral: "#E07A5F", muted: "#667", teal: "#246858", success: "#CDEAC0", line: "#DBE3DA", blue: "#386C9A" },
}));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => true, easeOut: () => 0, nativeDriver: false }));
vi.mock("../src/learn/stepReveal", () => ({ useStepReveal: () => undefined }));
vi.mock("../src/learn/art/Objects", () => ({ ObjectGlyph: "glyph", PictureObject: "picture" }));
const sound = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn() }));
vi.mock("../src/components/Audio", () => ({ AudioPreferences: createContext({ sound: true }), useSoundControls: () => sound }));

const fixture = JSON.parse(readFileSync("tests/fixtures/reading/sound-boat-parts.fixture.json", "utf8")) as WordBank<PartsWord>;
const tasks = tasksOf(fixture.records);
let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.useRealTimers(); sound.play.mockClear(); });
const mount = async (el: React.ReactElement) => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); await act(async () => { root = create(el); }); };
const buttons = () => root!.root.findAllByType("button");
const named = (text: string) => buttons().find((b) => String(b.props.accessibilityLabel ?? "") === text || b.children.join("") === text || (text.startsWith("Piece ") || text.startsWith("Box ")) && new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(,|$)`).test(String(b.props.accessibilityLabel ?? "")));
const press = async (text: string) => act(async () => { const b = named(text); expect(b, text).toBeDefined(); b!.props.onPress(); });
const texts = () => root!.root.findAllByType("p").map((p) => p.children.join(""));
const labels = () => buttons().map((b) => String(b.props.accessibilityLabel ?? ""));
const task = (id: string): BuildTask => taskOfParts(fixture.records.find((r) => r.id === id)!);
const baseProps = { active: true, width: 335, soundOn: true };

it("the Challenge board shows every tray piece, sends add and remove, and gates Check on a full word", async () => {
  const t = task("fx-sunset"), send = vi.fn();
  let s = challengeEngine.create(t, { version: 1 }, { supportOff: false, ownRead: false });
  await mount(<ChallengeBoard state={s} dispatch={send} {...baseProps} />);
  for (const piece of t.tray) expect(labels().some((l) => l === `Piece ${piece}`), piece).toBe(true);
  expect(named("Check")!.props.disabled).toBe(true);
  await press(`Piece ${t.tray[1]}`);
  expect(send).toHaveBeenLastCalledWith(["a", 1]);
  s = challengeEngine.step(s, ["a", 1], t)!.state;
  s = challengeEngine.step(s, ["a", 0], t)!.state;
  await act(async () => root!.update(<ChallengeBoard state={s} dispatch={send} {...baseProps} />));
  expect(named("Check")!.props.disabled).toBe(false);
  await press("Check");
  expect(send).toHaveBeenLastCalledWith(["k"]);
  await press(`Box 1, ${t.tray[1]}`);
  expect(send).toHaveBeenLastCalledWith(["x", 0]);
});

it("marks nothing right or wrong before Check, and says only that the word is still there after a miss", async () => {
  const t = task("fx-sunset"), send = vi.fn();
  let s = challengeEngine.create(t, { version: 1 }, { supportOff: false, ownRead: false });
  const wrong = [...t.tiles].reverse(), used: number[] = [];
  for (const piece of wrong) { const i = t.tray.findIndex((p, k) => p === piece && !used.includes(k)); used.push(i); s = challengeEngine.step(s, ["a", i], t)!.state; }
  await mount(<ChallengeBoard state={s} dispatch={send} {...baseProps} />);
  expect(labels().join("|")).not.toMatch(/does not fit|right|wrong|try this one/i);
  s = challengeEngine.step(s, ["k"], t)!.state;
  await act(async () => root!.update(<ChallengeBoard state={s} dispatch={send} {...baseProps} />));
  expect(texts().join(" ")).toContain("Not quite yet. Your answer is still here.");
  expect(labels().join("|")).not.toMatch(/does not fit|try this one/i);
  expect(named("Check")?.props.disabled ?? true).toBe(true);
});

it("Help lights the next piece and names a piece that does not fit, only once asked", async () => {
  const t = task("fx-making"), send = vi.fn();
  let s = challengeEngine.create(t, { version: 1 }, { supportOff: false, ownRead: false });
  s = challengeEngine.step(s, ["h"], t)!.state;
  await mount(<ChallengeBoard state={s} dispatch={send} {...baseProps} />);
  const need = t.tray.indexOf(t.tiles[0]);
  expect(labels()).toContain(`Piece ${t.tray[need]}, try this one`);
  const wrong = t.tray.findIndex((p) => !t.tiles.includes(p));
  s = challengeEngine.step(s, ["a", wrong], t)!.state;
  await act(async () => root!.update(<ChallengeBoard state={s} dispatch={send} {...baseProps} />));
  expect(labels().some((l) => l.includes("does not fit yet"))).toBe(true);
  expect(named("Help: show the next piece")!.props.disabled).toBe(true);
});

it("hearing the word again plays it and tells the replay", async () => {
  const t = task("fx-sunset"), send = vi.fn();
  const s = challengeEngine.create(t, { version: 1 }, { supportOff: false, ownRead: true });
  await mount(<ChallengeBoard state={s} dispatch={send} {...baseProps} />);
  await press("Hear the word again");
  expect(sound.play).toHaveBeenCalledWith("sound-boat-word-sunset");
  expect(send).toHaveBeenCalledWith(["r"] satisfies Action);
});

it("a Challenge with sound off shows the word, and an inactive board sends nothing", async () => {
  const t = task("fx-sunset"), send = vi.fn();
  const s = challengeEngine.create(t, { version: 1 }, { supportOff: false, ownRead: false });
  await mount(<AudioPreferences.Provider value={{ sound: false }}><ChallengeBoard state={s} dispatch={send} active={false} width={335} /></AudioPreferences.Provider>);
  expect(texts()).toContain("sunset");
  await press(`Piece ${t.tray[0]}`);
  expect(send).not.toHaveBeenCalled();
});

function schoolProps(level: 4 | 5, session: Partial<{ revision: number }> = {}) {
  let state = createParts(level, tasks, { skills: {}, rng: random(5), starter: 0, today: 1 });
  const update = vi.fn((next: PartsState) => { state = next; });
  const practice = vi.fn(), assistance = vi.fn(), sound = vi.fn(), cheer = vi.fn();
  const props = () => ({
    session: { game: "sound-boat" as const, version: 1 as const, id: "r1", revision: session.revision ?? 1, options: { mode: "solo" as const, pace: "easy" as const, stage: level === 4 ? ("stretch" as const) : ("deep" as const) }, state },
    skills: {}, update, practice, assistance, sound, stopSound: vi.fn(), soundOn: true, width: 335, height: 800, active: true,
    coach: { active: false, done: vi.fn() }, cheer, tasks,
  });
  return { props, update, practice, assistance, sound, cheer, get state() { return state; } };
}

it("the School board builds, checks, and waits for Sail on: nothing advances by itself", async () => {
  vi.useFakeTimers();
  const h = schoolProps(4), p0 = h.props();
  await mount(<PartsBoard {...p0} />);
  expect(root!.root.findAllByProps({ accessibilityLabel: "The boat has sailed 0 of 6 steps to the island" }).length).toBeGreaterThan(0);
  const t = partsTask(h.state, tasks), used: number[] = [];
  for (const piece of t.tiles) { const i = t.tray.findIndex((x, k) => x === piece && !used.includes(k)); used.push(i); await press(`Piece ${t.tray[i]}`); await act(async () => root!.update(<PartsBoard {...h.props()} />)); }
  await press("Check");
  expect(h.state.answer.solved).toBe(true);
  expect(h.practice).toHaveBeenCalledTimes(1);
  expect(h.practice).toHaveBeenCalledWith(t.skill, true);
  expect(h.cheer).toHaveBeenCalledTimes(1);
  expect(h.cheer).toHaveBeenCalledWith("right", "sound-boat-parts-built");
  await act(async () => root!.update(<PartsBoard {...h.props()} />));
  expect(named("Sail on")).toBeDefined();
  const before = h.update.mock.calls.length;
  await act(async () => { vi.advanceTimersByTime(120_000); });
  expect(h.update.mock.calls.length).toBe(before);
  expect(h.state.index).toBe(0);
  await press("Sail on");
  expect(h.state.index).toBe(1);
  expect(h.state.clean).toEqual([true]);
});

it("practice and a cheer fire once, on the Check that solves the word, and a miss replays the word", async () => {
  const h = schoolProps(5);
  await mount(<PartsBoard {...h.props()} />);
  const t = partsTask(h.state, tasks), used: number[] = [];
  const wrong = [...t.tiles].reverse();
  for (const piece of wrong) { const i = t.tray.findIndex((x, k) => x === piece && !used.includes(k)); used.push(i); await press(`Piece ${t.tray[i]}`); await act(async () => root!.update(<PartsBoard {...h.props()} />)); }
  if (wrong.join() === t.tiles.join()) return;
  await press("Check");
  expect(h.state.answer.misses).toBe(1);
  expect(h.sound).toHaveBeenCalledWith(`sound-boat-word-${t.word}`, true);
  expect(h.practice).not.toHaveBeenCalled();
  expect(h.cheer).not.toHaveBeenCalled();
  expect(h.assistance).toHaveBeenCalled();
});

it("every text caps its growth so a piece never breaks mid-word at the largest sizes", async () => {
  const h = schoolProps(5);
  await mount(<PartsBoard {...h.props()} />);
  const pieces = root!.root.findAllByType("p").filter((p) => typeof p.props.maxFontSizeMultiplier === "number");
  expect(pieces.length).toBeGreaterThan(5);
  for (const p of pieces) expect(p.props.maxFontSizeMultiplier).toBeGreaterThanOrEqual(1);
});

it("a finished round shows the island and a restored round does not speak by itself", async () => {
  let s = createParts(4, tasks, { skills: {}, rng: random(2), starter: 0, today: 1 });
  for (let i = 0; i < 6; i++) {
    const t = partsTask(s, tasks), used: number[] = [];
    for (const piece of t.tiles) { const k = t.tray.findIndex((x, j) => x === piece && !used.includes(j)); used.push(k); s = partsMove(s, { type: "edit", edit: ["a", k] }, tasks); }
    s = partsMove(partsMove(s, { type: "check" }, tasks), { type: "next" }, tasks);
  }
  const h = schoolProps(4);
  await mount(<PartsBoard {...{ ...h.props(), session: { ...h.props().session, state: s } }} />);
  expect(root!.root.findAllByType("h2").map((x) => x.children.join(""))).toContain("The boat reached the island!");
  vi.useFakeTimers();
  const restored = schoolProps(4, { revision: 3 });
  await act(async () => root!.unmount());
  root = undefined;
  await mount(<PartsBoard {...restored.props()} />);
  await act(async () => { vi.advanceTimersByTime(5000); });
  expect(restored.sound).not.toHaveBeenCalled();
});
