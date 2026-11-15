/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { random } from "../src/games/types";
import { engine, boatBlanks, boatChoices, boatComplete, boatExpected, boatMove, type BoatState } from "../src/learn/games/sound-boat/engine";
import { Board } from "../src/learn/games/sound-boat/view";

vi.mock("react-native", () => {
  class Value { v: number; constructor(v: number) { this.v = v; } setValue(v: number) { this.v = v; } interpolate() { return this; } }
  return { View: "div", ScrollView: "section", Animated: { View: "div", Value, timing: () => ({ start() {} }), spring: () => ({ start() {} }), sequence: () => ({ start() {}, stop() {} }), loop: () => ({ start() {}, stop() {} }), parallel: () => ({ start() {}, stop() {} }) }, useWindowDimensions: () => ({ fontScale: 1 }) };
});
vi.mock("react-native-svg", () => ({ default: "svg", Circle: "circle", Rect: "rect", Path: "path", Ellipse: "ellipse", G: "g" }));
vi.mock("../src/components/ui", () => ({
  Button: (p: { children?: React.ReactNode; label?: string; onPress: () => void; disabled?: boolean }) => React.createElement("button", { accessibilityLabel: p.label, onPress: p.onPress, disabled: p.disabled } as never, p.children),
  IconButton: "iconbutton", Copy: "p", Heading: "h2", PressableScale: "tile",
  C: { ink: "#183F39", paper: "#fff", gold: "#C9A227", coral: "#E07A5F", muted: "#667", teal: "#246858", success: "#CDEAC0", line: "#DBE3DA", blue: "#386C9A" },
}));
vi.mock("../src/components/Icon", () => ({ Icon: "icon" }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => true, easeOut: () => 0, nativeDriver: false }));
vi.mock("../src/learn/stepReveal", () => ({ useStepReveal: () => undefined }));
vi.mock("../src/learn/Coach", () => ({ CoachSpot: (p: { children: React.ReactNode }) => p.children }));
vi.mock("../src/learn/art/Objects", () => ({ PictureObject: "picture", ObjectGlyph: "glyph" }));

const options = { mode: "solo", pace: "easy" } as const;
const fresh = (seed = 3): BoatState => engine.create(options as never, { skills: {}, rng: random(seed), starter: 0, today: 1 } as never) as BoatState;
const place = (s: BoatState) => boatMove(s, { type: "tile", tile: boatExpected(s) });
const wrongTile = (s: BoatState) => boatChoices(s).find((t) => t !== boatExpected(s))!;
const valid = (s: BoatState) => engine.validate(s, options as never);
const filledWord = (s: BoatState) => { let out = s; while (!boatComplete(out)) out = place(out); return out; };
/** A word with several blanks, for undoing one letter at a time. */
const several = (seed = 3): BoatState => { let s = fresh(seed); while (boatBlanks(s).length < 2) s = boatMove(filledWord(s), { type: "next" }); return s; };

describe("Levels 1-3 undo", () => {
  it("takes back the last placed letter, one at a time, and never more than was placed", () => {
    let s = several();
    const blanks = boatBlanks(s).length;
    expect(blanks).toBeGreaterThan(1);
    expect(boatMove(s, { type: "undo" })).toBe(s);
    const start = s;
    s = place(s);
    expect(s.filled).toBe(1);
    const back = boatMove(s, { type: "undo" });
    expect(back).toEqual(start);
    expect(boatMove(back, { type: "undo" })).toBe(back);
    for (let i = 0; i < 20; i++) s = boatMove(s, { type: "undo" });
    expect(s.filled).toBe(0);
  });
  it("keeps the save shape and every undone state validates", () => {
    let s = several(), keys = Object.keys(s).sort();
    expect(keys).toEqual(["assisted", "clean", "filled", "hint", "index", "ladders", "out", "pictures", "starter"]);
    while (s.filled < boatBlanks(s).length - 1) s = place(s);
    for (const next of [s, boatMove(s, { type: "undo" }), boatMove(boatMove(s, { type: "undo" }), { type: "undo" })]) {
      expect(Object.keys(next).sort()).toEqual(keys);
      expect(valid(next)).toBe(true);
    }
  });
  it("works on a built word until it sails, so a word with one blank can be taken back", () => {
    const first = fresh();
    expect(boatBlanks(first)).toHaveLength(1);
    const built = place(first);
    expect(boatComplete(built)).toBe(true);
    const back = boatMove(built, { type: "undo" });
    expect(back).toEqual(first);
    expect(valid(back)).toBe(true);
    expect(boatMove(back, { type: "next" })).toBe(back);
    // A word that has sailed is counted and stays: undo on the next word has nothing to take back.
    const sailed = boatMove(built, { type: "next" });
    expect(sailed.index).toBe(1);
    expect(boatMove(sailed, { type: "undo" })).toBe(sailed);
  });
  it("a one-letter ladder change can be taken back before it sails", () => {
    let s = fresh();
    while (!(s.index >= 4 && boatBlanks(s).length === 1)) s = boatMove(filledWord(s), { type: "next" });
    const built = place(s);
    expect(boatComplete(built)).toBe(true);
    expect(boatMove(built, { type: "undo" })).toEqual(s);
  });
  it("undo of a built word keeps a wrong tile counted", () => {
    const first = fresh(), wrong = boatMove(first, { type: "tile", tile: wrongTile(first) }), built = place(wrong);
    expect(built.assisted).toBe(true);
    const back = boatMove(built, { type: "undo" });
    expect(back).toMatchObject({ filled: 0, assisted: true, out: [] });
    expect(boatMove(place(back), { type: "next" }).clean).toEqual([false]);
  });
  it("does not erase an assist: a wrong tile or Help still makes the word helped, and a clean word stays clean", () => {
    let s = several();
    {
      const clean = place(s);
      expect(boatMove(clean, { type: "undo" }).assisted).toBe(false);
      const wrong = boatMove(clean, { type: "tile", tile: wrongTile(clean) });
      expect(wrong.assisted).toBe(true);
      expect(wrong.out.length).toBe(1);
      const undone = boatMove(wrong, { type: "undo" });
      expect(undone.assisted).toBe(true);
      expect(undone.out).toEqual([]);
      expect(valid(undone)).toBe(true);
    }
    s = boatMove(place(s), { type: "help" });
    expect(s.hint).toBe(true);
    const undone = boatMove(s, { type: "undo" });
    expect(undone).toMatchObject({ hint: false, assisted: true, filled: 0 });
    expect(valid(undone)).toBe(true);
    const finished = boatMove(filledWord(undone), { type: "next" });
    expect(finished.clean.at(-1)).toBe(false);
  });
  it("a word built with an undo but no wrong tile and no Help is still clean", () => {
    let s = several();
    s = boatMove(place(s), { type: "undo" });
    s = boatMove(filledWord(s), { type: "next" });
    expect(s.clean.at(-1)).toBe(true);
  });
});

let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; });
const buttons = () => root!.root.findAllByType("button");
const named = (label: string) => buttons().find((b) => b.props.accessibilityLabel === label);
function props(state: BoatState) {
  let current = state;
  const update = vi.fn((n: BoatState) => { current = n; });
  const practice = vi.fn(), assistance = vi.fn(), sound = vi.fn(), cheer = vi.fn();
  const make = () => ({
    session: { game: "sound-boat", version: 1, id: "u1", revision: 1, options, state: current } as any,
    skills: {}, update: update as any, practice, assistance, sound, stopSound: vi.fn(), soundOn: true, width: 335, height: 800, active: true,
    coach: { active: false, done: vi.fn() }, cheer,
  });
  return { make, update, practice, assistance, sound, cheer, get state() { return current; } };
}

describe("the Levels 1-3 board", () => {
  it("offers Undo beside Help: disabled with nothing placed, taking back the last letter without scoring it", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const s0 = several();
    const h = props(s0);
    await act(async () => { root = create(<Board {...(h.make() as any)} />); });
    expect(named("Undo: take back the last letter")!.props.disabled).toBe(true);
    const placed = place(s0);
    await act(async () => root!.update(<Board {...({ ...h.make(), session: { ...h.make().session, state: placed } } as any)} />));
    const undo = named("Undo: take back the last letter")!;
    expect(undo.props.disabled).toBe(false);
    await act(async () => undo.props.onPress());
    expect(h.state).toEqual(s0);
    expect(h.practice).not.toHaveBeenCalled();
    expect(h.cheer).not.toHaveBeenCalled();
    expect(h.assistance).not.toHaveBeenCalled();
    expect(h.sound).toHaveBeenCalledWith("tap");
  });
  it("Undo stays beside Sail on once the word is built, and a word is credited once, when it sails", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const s0 = several(5), h = props(s0);
    await act(async () => { root = create(<Board {...(h.make() as any)} />); });
    let s = s0;
    while (boatBlanks(s).length - s.filled > 1) s = place(s);
    await act(async () => root!.update(<Board {...({ ...h.make(), session: { ...h.make().session, state: s } } as any)} />));
    expect(named("Undo: take back the last letter")!.props.disabled).toBe(s.filled === 0);
    const finish = place(s);
    await act(async () => root!.update(<Board {...({ ...h.make(), session: { ...h.make().session, state: finish } } as any)} />));
    expect(boatComplete(finish)).toBe(true);
    const undo = named("Undo: take back the last letter")!;
    expect(undo.props.disabled).toBeFalsy();
    expect(h.practice).not.toHaveBeenCalled();
    await act(async () => undo.props.onPress());
    expect(h.state).toEqual(s);
    expect(h.practice).not.toHaveBeenCalled();
  });
  it("the first word's single letter can be undone and rebuilt, and practice is credited once on Sail on", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const first = fresh(7), built = place(first), h = props(built);
    await act(async () => { root = create(<Board {...(h.make() as any)} />); });
    const sail = () => buttons().find((b) => b.props.children === "Sail on")!;
    expect(sail()).toBeDefined();
    await act(async () => named("Undo: take back the last letter")!.props.onPress());
    expect(h.state).toEqual(first);
    await act(async () => root!.update(<Board {...({ ...h.make(), session: { ...h.make().session, state: built } } as any)} />));
    expect(h.practice).not.toHaveBeenCalled();
    await act(async () => sail().props.onPress());
    expect(h.practice).toHaveBeenCalledTimes(1);
    expect(h.practice).toHaveBeenCalledWith(expect.any(String), true);
    expect(h.state.index).toBe(1);
  });
});
