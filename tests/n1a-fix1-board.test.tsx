import React, { useEffect, useState } from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { random } from "../src/games/types";
import { optionsAtLevel } from "../src/learn/levelOptions";
import { StepReveal } from "../src/learn/stepReveal";
import type { BoardProps, LearnSession } from "../src/learn/types";
import { createShell, progress, shellMove, validShell, type ShellRound } from "../src/learn/games/shell-math/round2";
import { ShellBoard } from "../src/learn/games/shell-math/ShellBoard";
import { Workspace } from "../src/learn/games/shell-math/Workspace";
import { pictureFor } from "../src/learn/games/shell-math/picture";
import { Bridge, bridgeLabel } from "../src/math/kit/ui/Bridge";
import { NumberPad } from "../src/math/kit/ui/NumberPad";
import { TenFrame } from "../src/math/kit/ui/TenFrame";
import { LEVELS, candidates, initialWork, levelRoute, planFor, solveActs, type Level, type Problem } from "../src/math/kit";

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
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; viewport.fontScale = 1; vi.useRealTimers(); });
const calls = { assistance: 0 };

function Harness({ level, seed, onState, width = 340, reveal }: { level: Level; seed: number; onState: (s: ShellRound) => void; width?: number; reveal?: () => void }) {
  const options = optionsAtLevel({ mode: "solo", pace: "easy" }, level);
  const [session, setSession] = useState<LearnSession<ShellRound>>(() => ({ game: "shell-math", version: 1, id: "t-" + level, revision: 0, options, state: createShell(options, random(seed)) }));
  useEffect(() => { onState(session.state); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const props: BoardProps<ShellRound> = {
    session, active: true, soundOn: true, width, height: 700, skills: {},
    update: (state) => { onState(state); setSession((p) => ({ ...p, revision: p.revision + 1, state })); },
    practice: () => {}, notePractice: () => {}, assistance: () => { calls.assistance++; },
    sound: () => {}, stopSound: () => {}, cheer: () => {},
    coach: { active: false, done: () => {} },
  };
  return <StepReveal.Provider value={reveal ?? (() => {})}><ShellBoard {...props} /></StepReveal.Provider>;
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
const mount = async (level: Level, seed = 3, width = 340, reveal?: () => void) => {
  calls.assistance = 0;
  await act(async () => { root = create(<Harness level={level} seed={seed} width={width} reveal={reveal} onState={(s) => { latest = s; }} />); });
};
const typeNumber = async (n: number) => { for (const d of String(n)) await press(d); await press("Check my answer"); };
const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number);

/** One step the way a child would do it, using only the controls on screen. */
async function playStep(level: Level) {
  const p = progress(latest)!, step = p.plan![p.work.at];
  if (step.kind === "count") await press(/Count (on|back) one/);
  else if (step.kind === "trade") await press(step.dir === "make" ? "Make a ten" : "Open a ten");
  else if (step.kind === "fill") {
    const [side, n] = step.options[0], plural = n === 1 ? "shell" : "shells";
    await press(p.problem!.op === "add" ? `Move ${n} ${plural} from the ${side === 0 ? "second group to the first" : "first group to the second"}` : `Take away ${n} ${plural}`);
  } else if (step.kind === "number") { if (level >= 3) await typeNumber(step.value); else await press(`Choose ${step.value}`); }
}

describe("P1-1: every required shell choice is at least 44 pt, in both orientations", () => {
  const WIDTHS = [280, 300, 320, 340, 360, 390, 430, 520, 600, 700, 768, 844, 932, 1024];
  /** Fill-step problems at Level 4: add (two groups) and subtract (one frame holding the ones past ten). */
  const fills = (): { p: Problem; plan: ReturnType<typeof planFor> & object }[] => {
    const out: { p: Problem; plan: ReturnType<typeof planFor> & object }[] = [];
    for (const op of ["add", "subtract"] as const) for (const rung of [0, 1, 2, 3]) for (const p of candidates(4, op, rung).slice(0, 6)) out.push({ p, plan: planFor(p, "to-ten", "built")! });
    return out;
  };
  const pickable = () => root!.root.findAll((n) => (n.type as string) === "pressable" && /^(Move|Take away) /.test(String(n.props.accessibilityLabel)));
  const size = (n: ReactTestInstance) => { const body = n.findAll((c) => (c.type as string) === "div" && typeof c.props.style?.width === "number")[0].props.style; return { w: body.width as number, h: body.height as number, slop: n.props.hitSlop ?? 0 }; };

  it("addition and take-away choices are 44 pt cells that do not overlap, from a small phone to a large iPad", async () => {
    let seen = 0;
    for (const width of WIDTHS) for (const { p, plan } of fills().filter((_, i) => i % 5 === 0)) {
      const pic = pictureFor(4, p, levelRoute(4, p), plan, initialWork());
      await act(async () => { root = create(<Workspace pic={pic} width={width} onPick={p.op === "add" ? () => {} : undefined} onPickOnes={p.op === "subtract" ? () => {} : undefined} />); });
      const targets = pickable();
      expect(targets.length, `${width} ${JSON.stringify(p)}`).toBeGreaterThan(0);
      for (const t of targets) {
        const s = size(t);
        expect(Math.min(s.w, s.h), `${width} ${JSON.stringify(p)} ${t.props.accessibilityLabel}`).toBeGreaterThanOrEqual(44);
        expect(s.slop, "neighbouring shells must not overlap").toBeFalsy();
        seen++;
      }
      await act(async () => root!.unmount()); root = undefined;
    }
    expect(seen).toBeGreaterThan(200);
  });

  it("the two groups stack on a narrow window, so the larger cells still fit the screen width", async () => {
    const p: Problem = { op: "add", a: 8, b: 3, unknown: "result" }, plan = planFor(p, "to-ten", "built")!;
    const pic = pictureFor(4, p, "to-ten", plan, initialWork());
    await act(async () => { root = create(<Workspace pic={pic} width={320} onPick={() => {}} />); });
    const frames = root!.root.findAllByType(TenFrame);
    expect(frames.length).toBe(2);
    for (const f of frames) expect(5 * f.props.cell + 12).toBeLessThanOrEqual(320);
  });

  it("the Level 4 board offers them at the phone width the review used", async () => {
    await mount(4, 3, 340);
    const targets = pickable();
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) expect(size(t).w).toBeGreaterThanOrEqual(44);
  });
});

describe("P1-2: a fresh entry at the largest text size brings the board into view", () => {
  const layout = async () => {
    const holder = root!.root.findAll((n) => (n.type as string) === "div" && typeof n.props.onLayout === "function");
    expect(holder.length).toBeGreaterThan(0);
    await act(async () => { holder[0].props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 340, height: 600 } } }); });
    await act(async () => { vi.advanceTimersByTime(400); });
  };
  it("asks the frame to reveal the board once it has laid out, at accessibility sizes", async () => {
    vi.useFakeTimers();
    viewport.fontScale = 3;
    const reveal = vi.fn();
    await mount(3, 3, 340, reveal);
    expect(reveal).not.toHaveBeenCalled();
    await layout();
    expect(reveal).toHaveBeenCalled();
  });
  it("does nothing at default or large-but-standard text sizes", async () => {
    vi.useFakeTimers();
    for (const fontScale of [1, 1.3]) {
      viewport.fontScale = fontScale;
      const reveal = vi.fn();
      await mount(3, 3, 340, reveal);
      const holder = root!.root.findAll((n) => (n.type as string) === "div" && typeof n.props.onLayout === "function");
      for (const h of holder) await act(async () => { h.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 340, height: 600 } } }); });
      await act(async () => { vi.advanceTimersByTime(400); });
      expect(reveal).not.toHaveBeenCalled();
      await act(async () => root!.unmount()); root = undefined;
    }
  });
  it("stops repositioning once the child has made a move", async () => {
    vi.useFakeTimers();
    viewport.fontScale = 3;
    const reveal = vi.fn();
    await mount(3, 3, 340, reveal);
    await playStep(3);
    // The frame's own step reveal answers the move; entry must add nothing after it.
    const afterMove = reveal.mock.calls.length;
    await layout();
    expect(reveal.mock.calls.length).toBe(afterMove);
  });
  it("caps the question, the step prompt and the equation only at accessibility sizes", async () => {
    const heads = () => root!.root.findAll((n) => (n.type as string) === "span" && n.props.accessibilityRole === "header");
    await mount(3);
    expect(heads()[0].props.maxFontSizeMultiplier).toBeUndefined();
    await act(async () => root!.unmount()); root = undefined;
    viewport.fontScale = 3;
    await mount(3);
    expect(heads()[0].props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
    const equation = root!.root.findAll((n) => (n.type as string) === "span" && /\?$/.test(String(n.props.accessibilityLabel)));
    expect(equation[0].props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
  });
});

describe("P1-3: VoiceOver never hears an answer before the screen shows it", () => {
  /** Labels that count shells or blocks that are drawn describe the picture itself; every other label must not run ahead of it. */
  const DRAWN = /^(Frame \d|First group|Second group|\d+ tens? and|\d+ shells?$|Move \d|Take away \d)/;
  const labels = () => root!.root.findAll((n) => typeof n.props.accessibilityLabel === "string").map((n) => String(n.props.accessibilityLabel)).filter((l) => !DRAWN.test(l));
  const drawn = () => root!.root.findAll((n) => ["span", "p", "button", "svgtext"].includes(n.type as string)).map(text).join(" ");
  const steps = (p: ReturnType<typeof progress>) => (p!.plan ?? []).slice(p!.work.at).flatMap((s) => (s.kind === "number" ? [s.value] : []));

  it("Bridge: the spoken line is the drawn line, hop by hop", async () => {
    for (let made = 0; made <= 2; made++) {
      await act(async () => { root = create(<Bridge width={320} start={9} hops={[10, 12]} ten={10} lo={0} hi={20} made={made} />); });
      const spoken = root!.root.findByProps({ accessible: true }).props.accessibilityLabel;
      expect(spoken).toBe(bridgeLabel(9, [10, 12], made));
      expect(nums(spoken)).toEqual([9, 10, 12].slice(0, made + 1));
      await act(async () => root!.unmount()); root = undefined;
    }
    expect(bridgeLabel(9, [10, 12], 0)).not.toMatch(/10|12/);
  });

  it.each(LEVELS)("level %i: before each step is answered, no label carries a number that is neither drawn nor already given", async (level) => {
    for (const seed of [3, 4]) {
      await mount(level, seed);
      for (let guard = 0; guard < 80 && latest.index < 5; guard++) {
        const p = progress(latest)!;
        if (!p.work.solved) {
          const hidden = steps(p);
          const onScreen = new Set(nums(drawn()));
          const spoken = new Set(labels().flatMap(nums));
          for (const n of hidden) if (!onScreen.has(n)) expect(spoken.has(n), `level ${level} seed ${seed} step ${p.work.at}: "${labels().filter((l) => nums(l).includes(n)).join(" | ")}" tells ${n}`).toBe(false);
          // The number line says exactly what it draws.
          const pic = pictureFor(level, p.problem!, levelRoute(level, p.problem!), p.plan!, p.work);
          const line = root!.root.findAll((n) => typeof n.props.accessibilityLabel === "string" && /^Number line/.test(n.props.accessibilityLabel));
          if (pic.line) expect(line.map((n) => n.props.accessibilityLabel)).toEqual([bridgeLabel(pic.line.start, pic.line.hops, pic.line.made)]);
        }
        if (p.work.solved) await press(latest.index === 4 ? "Finish round" : "Next question");
        else await playStep(level);
      }
      await act(async () => root!.unmount()); root = undefined;
    }
  });
});

describe("P2-2: the board's Undo", () => {
  it("appears after an accepted step, steps back, and the child finishes without a Reset", async () => {
    for (const level of [3, 4, 5] as Level[]) {
      await mount(level, 3);
      expect(buttons().some((b) => label(b) === "Undo")).toBe(false);
      await playStep(level);
      expect(buttons().some((b) => label(b) === "Undo")).toBe(true);
      const at = progress(latest)!.work.at;
      await press("Undo");
      expect(progress(latest)!.work.at).toBe(at - 1);
      expect(latest.history.at(-1)).toEqual(["u"]);
      expect(progress(latest)!.work.helped).toBe(false);
      expect(validShell(latest, optionsAtLevel({ mode: "solo", pace: "easy" }, level))).toBe(true);
      for (let g = 0; g < 20 && !progress(latest)!.work.solved; g++) await playStep(level);
      expect(latest.solved).toBe(true);
      expect(buttons().some((b) => label(b) === "Undo")).toBe(false);
      await act(async () => root!.unmount()); root = undefined;
    }
  });
  it("is still reachable at accessibility sizes", async () => {
    viewport.fontScale = 3;
    await mount(3, 3);
    await playStep(3);
    await press("Undo");
    expect(progress(latest)!.work.at).toBe(0);
  });
});

describe("P2-4: the prompt after choosing the other ten", () => {
  it("8 + 3 with seven shells moved from the first group leaves a prompt about that move", async () => {
    await mount(4, 3);
    const p = progress(latest)!;
    expect(p.problem).toMatchObject({ op: "add", a: 8, b: 3 });
    await press("Move 7 shells from the first group to the second");
    expect(text(root!.root)).toContain("8 to add, 7 done. How many left?");
    expect(text(root!.root)).not.toContain("3 to add, 2 done");
  });
});

describe("P2-5: the pad cannot type past the range, and says so", () => {
  const typed = () => root!.root.findAll((n) => (n.type as string) === "span").map(text);
  it("stops at 100, shows why, and a refused digit is never submitted", async () => {
    const submit = vi.fn();
    await act(async () => { root = create(<NumberPad resetKey="a" width={340} onSubmit={submit} />); });
    const tap = async (k: string) => act(async () => { root!.root.findAll((n) => (n.type as string) === "button" && n.props.accessibilityLabel === k)[0].props.onPress(); });
    await tap("1"); await tap("0"); await tap("1");
    expect(typed()).toContain("10");
    expect(text(root!.root)).toContain("Answers go up to 100");
    await tap("Check my answer");
    expect(submit).toHaveBeenCalledExactlyOnceWith(10);
    await tap("1"); await tap("0"); await tap("0");
    expect(typed()).toContain("100");
    expect(text(root!.root)).not.toContain("Answers go up to 100");
  });
  it("a pad given a smaller range stops at it", async () => {
    await act(async () => { root = create(<NumberPad resetKey="a" width={340} max={20} onSubmit={() => {}} />); });
    const tap = async (k: string) => act(async () => { root!.root.findAll((n) => (n.type as string) === "button" && n.props.accessibilityLabel === k)[0].props.onPress(); });
    await tap("2"); await tap("5");
    expect(typed()).toContain("2");
    expect(typed()).not.toContain("25");
  });
  it("in School, typing past 100 in Level 5 shows the range and leaves the round alone", async () => {
    await mount(5, 3);
    for (let g = 0; g < 6 && progress(latest)!.plan![progress(latest)!.work.at].kind !== "number"; g++) await playStep(5);
    const before = latest.history.length;
    for (const d of "999") await press(d);
    expect(text(root!.root)).toContain("Answers go up to 100");
    await press("Check my answer");
    expect(latest.history.length).toBeGreaterThanOrEqual(before);
    expect(latest.history.every((a) => a[0] !== "n" || (a[1] as number) <= 100)).toBe(true);
  });
});

void shellMove; void solveActs; void TenFrame;
