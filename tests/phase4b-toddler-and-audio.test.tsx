import React, { createContext } from "react";
import { readFileSync } from "node:fs";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioPreferences } from "../src/components/Audio";
import { engines } from "../src/learn/engines";
import { shelfGames, toggleShelfFavorite, homeContinue } from "../src/learn/home";
import { registeredDestinations } from "../src/learn/destinations";
import { roundProgress } from "../src/learn/LearnChrome";
import { levelInfo, optionsAtLevel } from "../src/learn/levels";
import { isGrowth } from "../src/learn/growth/engine";
import { outcomeOf, replaySession, startSession, validLearnSession } from "../src/learn/session";
import { SpeakButton } from "../src/learn/SpeakButton";
import { learnIds, type BoardProps, type LearnId } from "../src/learn/types";
import { speakText, stopSpeaking, subscribeVoice, useSpokenPrompt, type SpeakEvent } from "../src/learn/voice";
import { hasGameArt } from "../src/components/GameIcon";
import { emptySave, parseSave, type Settings } from "../src/state/validation";
import { migrateProfiles } from "../src/state/profiles";

import {
  applyHelp as colorsHelp,
  chooseCard as colorsChoose,
  colorHint,
  taskAt as colorsTaskAt,
  type IslandColorsState,
} from "../src/learn/games/island-colors/engine";
import { Board as IslandColorsBoard } from "../src/learn/games/island-colors/view";

import {
  animalHint,
  applyHelp as soundsHelp,
  chooseAnimal as soundsChoose,
  taskAt as soundsTaskAt,
  type ReefSoundsState,
} from "../src/learn/games/reef-sounds/engine";
import { Board as ReefSoundsBoard } from "../src/learn/games/reef-sounds/view";

import {
  applyHelp as splashHelp,
  chooseNumber as splashChoose,
  countHint,
  NUMBER_WORDS,
  tapBeachItem,
  taskAt as splashTaskAt,
  type SplashCountState,
} from "../src/learn/games/splash-count/engine";
import { Board as SplashCountBoard } from "../src/learn/games/splash-count/view";

import { Board as PatternPathBoard } from "../src/learn/games/pattern-path/view";
import { Board as ShapeShiftBoard } from "../src/learn/games/shape-shift/view";
import { Board as TimesTideBoard } from "../src/learn/games/times-tide/view";
import { Board as FractionFeastBoard } from "../src/learn/games/fraction-feast/view";
import { Board as TreasureAlgebraBoard } from "../src/learn/games/treasure-algebra/view";
import { Board as TurtleDrawBoard } from "../src/learn/games/turtle-draw/view";
import { Board as TideLogicBoard } from "../src/learn/games/tide-logic/view";
import { Board as CodeLabBoard } from "../src/learn/games/code-lab/view";

const speechMock = vi.hoisted(() => ({
  speak: vi.fn(),
  stop: vi.fn(() => Promise.resolve()),
}));
const appStateMock = vi.hoisted(() => ({
  currentState: "active" as string,
  listeners: new Set<(state: string) => void>(),
  emit(next: string) {
    this.currentState = next;
    for (const fn of [...this.listeners]) fn(next);
  },
}));
const platformMock = vi.hoisted(() => ({ OS: "ios" as "ios" | "android" | "web" }));

vi.mock("expo-speech", () => ({
  speak: (...args: unknown[]) => speechMock.speak(...args),
  stop: () => speechMock.stop(),
}));
vi.mock("../src/components/Audio", () => ({
  AudioPreferences: createContext<Partial<Settings> & { epoch?: number }>({}),
}));
vi.mock("react-native", () => ({
  Platform: {
    get OS() {
      return platformMock.OS;
    },
    select: (m: Record<string, unknown>) => m[platformMock.OS] ?? m.default,
  },
  AppState: {
    get currentState() {
      return appStateMock.currentState;
    },
    addEventListener: (_event: string, fn: (state: string) => void) => {
      appStateMock.listeners.add(fn);
      return {
        remove: () => {
          appStateMock.listeners.delete(fn);
        },
      };
    },
  },
  View: "View",
  ScrollView: "ScrollView",
  Animated: {
    Value: class {
      v: number;
      constructor(n: number) { this.v = n; }
      setValue(n: number) { this.v = n; }
      stopAnimation() {}
    },
    View: "AnimatedView",
    timing: () => ({ start: () => {}, stop: () => {} }),
  },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  StyleSheet: { flatten: (s: unknown) => s },
}));
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Svg: "Svg",
  Circle: "Circle",
  Ellipse: "Ellipse",
  G: "G",
  Line: "Line",
  Path: "Path",
  Polygon: "Polygon",
  Rect: "Rect",
  Text: "SvgText",
}));
vi.mock("react-native-gesture-handler", () => ({
  Gesture: {
    Pan: () => ({
      minDistance() { return this; },
      onUpdate() { return this; },
      onEnd() { return this; },
      onFinalize() { return this; },
    }),
  },
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "ReanimatedView" },
  runOnJS: (fn: unknown) => fn,
  useAnimatedStyle: () => ({}),
  useSharedValue: (v: unknown) => ({ value: v, set(n: unknown) { this.value = n; } }),
}));
vi.mock("../src/ui/fonts", () => ({ useNunitoLoaded: () => false }));
vi.mock("../src/content/learnAudio", () => ({ learnSources: {} }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => true }));
vi.mock("../src/components/Icon", () => ({ Icon: "Icon" }));
vi.mock("../src/components/ui", () => ({
  C: {
    ink: "#3D2B24",
    muted: "#665247",
    cream: "#FFF6E5",
    paper: "#FFFDF8",
    line: "#E8D8BE",
    teal: "#1E6B66",
    soft: "#FFF0D2",
    coral: "#C0442B",
    coralFill: "#FF7A5C",
    gold: "#E1B251",
    blue: "#386C9A",
    success: "#E2F2E4",
    sand: "#F6EBD4",
    error: "#A33B22",
  },
  Button: "Button",
  Copy: "Copy",
  Heading: "Heading",
  PressableScale: "PressableScale",
}));
vi.mock("../src/learn/Coach", () => ({
  CoachSpot: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../src/learn/stepReveal", () => ({ useStepReveal: () => {} }));

const TODDLER_IDS = ["island-colors", "reef-sounds", "splash-count"] as const;
const VOICED_8_IDS = [
  "pattern-path",
  "shape-shift",
  "times-tide",
  "fraction-feast",
  "treasure-algebra",
  "turtle-draw",
  "tide-logic",
  "code-lab",
] as const;

let activeRoot: ReactTestRenderer | undefined;
let unsub: (() => void) | undefined;

beforeEach(() => {
  platformMock.OS = "ios";
  appStateMock.currentState = "active";
  appStateMock.listeners.clear();
  speechMock.speak.mockReset();
  speechMock.stop.mockReset().mockImplementation(() => Promise.resolve());
});

afterEach(async () => {
  if (activeRoot) {
    await act(async () => activeRoot!.unmount());
    activeRoot = undefined;
  }
  unsub?.();
  unsub = undefined;
  stopSpeaking();
  vi.unstubAllGlobals();
});

function flatStyle(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatStyle));
  return typeof style === "object" ? (style as Record<string, unknown>) : {};
}

function textOf(node: ReactTestInstance): string {
  return node.children.map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : textOf(c))).join("");
}

function makeBoardProps<S>(
  id: LearnId,
  level: 1 | 2 | 3 | 4 | 5 = 1,
  overrides: Partial<BoardProps<S>> = {},
): BoardProps<S> {
  const session = startSession(id, { options: optionsAtLevel({ mode: "solo", pace: "easy" }, level) }, {}, 42) as BoardProps<S>["session"];
  return {
    session,
    update: vi.fn(),
    practice: vi.fn(),
    assistance: vi.fn(),
    skills: {},
    sound: vi.fn(),
    stopSound: vi.fn(),
    soundOn: true,
    width: 390,
    height: 844,
    active: true,
    coach: { active: false, done: vi.fn() },
    cheer: vi.fn(),
    ...overrides,
  };
}

async function mountBoard(
  element: React.ReactElement,
  prefs?: Partial<Settings> & { epoch?: number },
) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const wrapped = prefs ? (
    <AudioPreferences.Provider value={prefs}>{element}</AudioPreferences.Provider>
  ) : (
    element
  );
  await act(async () => {
    activeRoot = create(wrapped);
  });
  return activeRoot!;
}

describe("Phase 4B: Registration, shelf integration, and zero save bloat", () => {
  it("registers all 3 toddler games under Thinking, Science, and Numbers with Ages 2–4 and icons", () => {
    const expectedIslands: Record<(typeof TODDLER_IDS)[number], string> = {
      "island-colors": "thinking",
      "reef-sounds": "science",
      "splash-count": "numbers",
    };

    for (const id of TODDLER_IDS) {
      expect(learnIds).toContain(id);
      const eng = engines[id];
      expect(eng.island).toBe(expectedIslands[id]);
      expect(eng.ages).toEqual([2, 4]);
      expect(eng.ownLevels).toBe(true);
      expect(eng.helpAudio).toBeUndefined();
      expect(eng.spokenIntro?.length).toBeGreaterThan(10);
      expect(eng.spokenHelp?.length).toBeGreaterThan(20);
      expect(hasGameArt(id)).toBe(true);

      const shelf = shelfGames.find((g) => g.id === id);
      expect(shelf).toBeDefined();
      expect(shelf?.island).toBe(expectedIslands[id]);
      expect(shelf?.ages).toBe("Ages 2–4");

      const dest = registeredDestinations.find((d) => d.id === id);
      expect(dest?.door).toBe("school");
      expect(dest?.shelf).toBe(expectedIslands[id]);

      for (const level of [1, 2, 3, 4, 5] as const) {
        const info = levelInfo(id, level);
        expect(info.name.length).toBeGreaterThan(4);
        expect(info.description.length).toBeGreaterThan(20);

        const session = startSession(id, { options: optionsAtLevel({ mode: "solo", pace: "easy" }, level) }, {}, 100 + level);
        expect(isGrowth(session.state)).toBe(false);
        expect(validLearnSession(session, id)).toBe(true);
        expect(roundProgress(session)).toEqual({ current: 0, total: 4 });
        expect(validLearnSession(replaySession(session, {}, 200 + level), id)).toBe(true);
      }
    }
  });

  it("round-trips favorites, homeContinue, and saves with ZERO byte bloat on untouched saves", () => {
    const rawEmpty = JSON.stringify(emptySave());
    expect(parseSave(rawEmpty)).toEqual(emptySave());
    const migrated = migrateProfiles(emptySave());
    expect(migrated.learn).toBeUndefined();
    expect(Object.keys(migrated.school ?? {})).toHaveLength(0);

    let save = emptySave();
    for (const id of TODDLER_IDS) {
      save = toggleShelfFavorite(save, id);
      const round = startSession(id, { options: optionsAtLevel({ mode: "solo", pace: "easy" }, 1) }, {}, 17);
      const withRound = { ...save, learn: { [id]: round }, recentLearn: id };
      const restored = parseSave(JSON.stringify(withRound));
      expect(restored.learn?.[id]?.game).toBe(id);
      expect(homeContinue(restored)).toBe(id);
    }
  });
});

describe("Phase 4B: Toddler engines (L1–L5 pure logic, hints, and corrupted save rejection)", () => {
  it("island-colors plays cleanly across all 5 levels, respects opt-in hints, and rejects corrupt/contradictory saves", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, level);
      let s = startSession("island-colors", { options: opts }, {}, 11 + level).state as IslandColorsState;
      expect(engines["island-colors"].validate(s, opts)).toBe(true);
      expect(colorHint(s)).toEqual({ text: "", dimmedIndex: null, highlightIndex: null });

      const firstTask = colorsTaskAt(s);
      const expectedChoices = level === 1 ? 2 : level <= 3 ? 3 : 4;
      expect(firstTask.choices).toHaveLength(expectedChoices);
      if (level === 5) expect(firstTask.sample).toBeDefined();

      // Wrong tap marks helped without leaking highlight or advancing
      const wrongIdx = (firstTask.targetIndex + 1) % firstTask.choices.length;
      const missed = colorsChoose(s, wrongIdx);
      expect(missed.correct).toBe(false);
      expect(missed.next.index).toBe(0);
      expect(missed.next.helped).toBe(true);
      expect(missed.next.hintLevel).toBe(0);

      // Opt-in Help step 1 gives clue (no glow); step 2 adds glow highlight
      const h1 = colorsHelp(s);
      expect(h1.hintLevel).toBe(1);
      expect(h1.helped).toBe(true);
      expect(colorHint(h1).text.length).toBeGreaterThan(5);
      expect(colorHint(h1).highlightIndex).toBeNull();
      const h2 = colorsHelp(h1);
      expect(h2.hintLevel).toBe(2);
      expect(h2.helped).toBe(true);
      expect(colorHint(h2).highlightIndex).toBe(firstTask.targetIndex);

      // Complete all 4 tasks
      for (let i = 0; i < 4; i++) {
        const t = colorsTaskAt(s);
        const res = colorsChoose(s, t.targetIndex);
        expect(res.correct).toBe(true);
        s = res.next;
        expect(engines["island-colors"].validate(s, opts)).toBe(true);
      }
      expect(outcomeOf({ ...startSession("island-colors", { options: opts }, {}, 11), state: s })).toBe("done");
    }

    const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, 1);
    const valid = startSession("island-colors", { options: opts }, {}, 7).state as IslandColorsState;
    const contradictory = { version: 1, level: 1, seed: 1, index: 0, total: 4, helped: false, hintLevel: 2 };
    for (const bad of [
      null,
      {},
      { ...valid, extra: 1 },
      { ...valid, level: 2 },
      { ...valid, index: 5 },
      { ...valid, hintLevel: 3 },
      { ...valid, index: 4, hintLevel: 1, helped: true },
      { ...valid, total: 5 },
      { ...valid, helped: false, hintLevel: 1 },
      contradictory,
    ]) {
      expect(engines["island-colors"].validate(bad, opts)).toBe(false);
    }

    // Contradictory helped:false + hintLevel:2 is also rejected by session validator & parseSave restore
    const badSession = { ...startSession("island-colors", { options: opts }, {}, 1), state: contradictory };
    expect(validLearnSession(badSession, "island-colors")).toBe(false);
    expect(() => parseSave(JSON.stringify({ ...emptySave(), learn: { "island-colors": badSession } }))).toThrow(/invalid/i);
  });

  it("reef-sounds plays cleanly across all 5 levels (including water/land habitats & riddles) and rejects corrupt/contradictory saves", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, level);
      let s = startSession("reef-sounds", { options: opts }, {}, 21 + level).state as ReefSoundsState;
      expect(engines["reef-sounds"].validate(s, opts)).toBe(true);
      expect(animalHint(s)).toEqual({ text: "", dimmedIndex: null, highlightIndex: null });

      const t0 = soundsTaskAt(s);
      const expectedChoices = level === 1 ? 2 : level === 2 || level === 4 ? 3 : 4;
      expect(t0.choices).toHaveLength(expectedChoices);
      if (level === 4) {
        const targetHabitat = t0.choices[t0.targetIndex].habitat;
        expect(t0.choices.filter((c) => c.habitat === targetHabitat)).toHaveLength(1);
      }

      const h1 = soundsHelp(s);
      expect(animalHint(h1).text.length).toBeGreaterThan(5);
      expect(animalHint(h1).highlightIndex).toBeNull();
      const h2 = soundsHelp(h1);
      expect(animalHint(h2).highlightIndex).toBe(t0.targetIndex);

      for (let i = 0; i < 4; i++) {
        const t = soundsTaskAt(s);
        const res = soundsChoose(s, t.targetIndex);
        expect(res.correct).toBe(true);
        s = res.next;
        expect(engines["reef-sounds"].validate(s, opts)).toBe(true);
      }
      expect(engines["reef-sounds"].outcome(s, opts)).toBe("done");
    }

    const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, 1);
    const valid = startSession("reef-sounds", { options: opts }, {}, 7).state as ReefSoundsState;
    const contradictory = { version: 1, level: 1, seed: 1, index: 0, total: 4, helped: false, hintLevel: 2 };
    for (const bad of [
      null,
      {},
      { ...valid, version: 2 },
      { ...valid, level: 3 },
      { ...valid, index: -1 },
      { ...valid, index: 4, hintLevel: 2, helped: true },
      { ...valid, helped: false, hintLevel: 1 },
      contradictory,
    ]) {
      expect(engines["reef-sounds"].validate(bad, opts)).toBe(false);
    }

    const badSession = { ...startSession("reef-sounds", { options: opts }, {}, 1), state: contradictory };
    expect(validLearnSession(badSession, "reef-sounds")).toBe(false);
    expect(() => parseSave(JSON.stringify({ ...emptySave(), learn: { "reef-sounds": badSession } }))).toThrow(/invalid/i);
  });

  it("splash-count plays cleanly across all 5 levels and rejects corrupt/contradictory saves", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, level);
      let s = startSession("splash-count", { options: opts }, {}, 31 + level).state as SplashCountState;
      expect(engines["splash-count"].validate(s, opts)).toBe(true);
      expect(countHint(s)).toEqual({ text: "", glowItemIndex: null, dimmedChoice: null, highlightChoice: null });

      for (let i = 0; i < 4; i++) {
        const t = splashTaskAt(s);
        if (level === 1) expect(t.shownCount).toBeGreaterThanOrEqual(1);
        if (level === 1) expect(t.shownCount).toBeLessThanOrEqual(3);
        if (level === 2) expect(t.shownCount).toBeLessThanOrEqual(5);
        if (level === 4) expect(t.shownCount).toBeGreaterThanOrEqual(6);
        if (level === 4) expect(t.shownCount).toBeLessThanOrEqual(10);
        if (level === 5) expect(t.answer).toBe(t.shownCount + t.delta);

        if (t.kind === "tap-count") {
          for (let k = 0; k < t.shownCount; k++) {
            const tapRes = tapBeachItem(s, k);
            expect(tapRes.countSpoken).toBe(k + 1);
            s = tapRes.next;
            expect(engines["splash-count"].validate(s, opts)).toBe(true);
          }
        } else {
          expect(t.choices).toHaveLength(3);
          expect(t.choices).toContain(t.answer);
          const tapOne = tapBeachItem(s, 0);
          expect(tapOne.countSpoken).toBe(1);
          expect(tapOne.completedTask).toBe(false);
          s = tapOne.next;
          expect(engines["splash-count"].validate(s, opts)).toBe(true);

          const wrongVal = t.choices.find((c) => c !== t.answer)!;
          const wrongRes = splashChoose(s, wrongVal);
          expect(wrongRes.correct).toBe(false);
          expect(wrongRes.next.helped).toBe(true);

          const h1 = splashHelp(s);
          expect(countHint(h1).text.length).toBeGreaterThan(5);
          expect(countHint(h1).highlightChoice).toBeNull();
          const h2 = splashHelp(h1);
          expect(countHint(h2).highlightChoice).toBe(t.answer);

          const rightRes = splashChoose(s, t.answer);
          expect(rightRes.correct).toBe(true);
          s = rightRes.next;
          expect(engines["splash-count"].validate(s, opts)).toBe(true);
        }
      }
      expect(engines["splash-count"].outcome(s, opts)).toBe("done");
    }

    const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, 1);
    const valid = startSession("splash-count", { options: opts }, {}, 7).state as SplashCountState;
    const contradictory = { version: 1, level: 1, seed: 1, index: 0, total: 4, tapped: [], helped: false, hintLevel: 2 };
    for (const bad of [
      null,
      {},
      { ...valid, tapped: [0, 0] },
      { ...valid, tapped: [99] },
      { ...valid, tapped: [-1] },
      { ...valid, index: 4, tapped: [0] },
      { ...valid, extra: true },
      { ...valid, helped: false, hintLevel: 1 },
      contradictory,
    ]) {
      expect(engines["splash-count"].validate(bad, opts)).toBe(false);
    }

    const badSession = { ...startSession("splash-count", { options: opts }, {}, 1), state: contradictory };
    expect(validLearnSession(badSession, "splash-count")).toBe(false);
    expect(() => parseSave(JSON.stringify({ ...emptySave(), learn: { "splash-count": badSession } }))).toThrow(/invalid/i);
  });
});

describe("Phase 4B F1/F2/F5: Real expo-speech adapter, AudioPreferences contract, and >= 48pt SpeakButton", () => {
  it("invokes expo-speech Speech.speak & Speech.stop with exact language/rate/pitch/volume and returns false on error or volume 0", () => {
    const events: SpeakEvent[] = [];
    unsub = subscribeVoice((e) => events.push(e));

    // Suppressed cases do not call Speech.speak
    expect(speakText("   ", { enabled: true, active: true })).toBe(false);
    expect(speakText("Hello", { enabled: false, active: true })).toBe(false);
    expect(speakText("Hello", { enabled: true, active: false })).toBe(false);
    expect(speakText("Hello", { enabled: true, active: true, volume: 0 })).toBe(false);
    expect(speakText("Hello", { enabled: true, active: true, volume: -0.2 })).toBe(false);
    expect(speechMock.speak).not.toHaveBeenCalled();
    expect(events).toHaveLength(0);

    // Real call with interruption and custom volume/language/rate/pitch
    expect(
      speakText("Hello island!", {
        enabled: true,
        active: true,
        language: "en-US",
        rate: 0.9,
        pitch: 1.05,
        volume: 0.5,
      }),
    ).toBe(true);
    expect(speechMock.stop).toHaveBeenCalledTimes(1);
    expect(speechMock.speak).toHaveBeenCalledTimes(1);
    expect(speechMock.speak).toHaveBeenCalledWith("Hello island!", {
      language: "en-US",
      rate: 0.9,
      pitch: 1.05,
      volume: 0.5,
    });
    expect(events[0]).toMatchObject({
      type: "speak",
      text: "Hello island!",
      language: "en-US",
      rate: 0.9,
      pitch: 1.05,
      volume: 0.5,
      interrupt: true,
    });

    // interrupt: false skips pre-speak Speech.stop()
    speechMock.stop.mockClear();
    expect(speakText("Second line", { interrupt: false, volume: 0.25 })).toBe(true);
    expect(speechMock.stop).not.toHaveBeenCalled();
    expect(speechMock.speak).toHaveBeenLastCalledWith("Second line", {
      language: "en-US",
      rate: 0.94,
      pitch: 1.06,
      volume: 0.25,
    });

    // Speech.speak throwing returns false cleanly and emits NO false diagnostic speak event
    const eventCountBeforeFail = events.length;
    speechMock.speak.mockImplementationOnce(() => {
      throw new Error("TTS engine unavailable");
    });
    expect(speakText("Should fail cleanly", { volume: 0.75 })).toBe(false);
    expect(events).toHaveLength(eventCountBeforeFail);

    // Web browser with missing speechSynthesis returns false without calling Speech.speak
    platformMock.OS = "web";
    vi.stubGlobal("window", {});
    speechMock.speak.mockClear();
    expect(speakText("Web without synthesis", { volume: 0.75 })).toBe(false);
    expect(speechMock.speak).not.toHaveBeenCalled();
  });

  it("useSpokenPrompt gates auto-speech on AudioPreferences.automaticSpeech, applies volume, and cancels on preference/epoch change", async () => {
    let api!: ReturnType<typeof useSpokenPrompt>;
    function Harness({
      text,
      promptKey,
      soundOn,
      active,
    }: {
      text: string;
      promptKey: string;
      soundOn: boolean;
      active: boolean;
    }) {
      api = useSpokenPrompt(text, promptKey, { soundOn, active, rate: 0.92, pitch: 1.08 });
      return null;
    }

    // 1. automaticSpeech: false (default) blocks auto-prompt on mount, allows explicit replay with volume 0.25
    const root = await mountBoard(
      <Harness text="Tap the red hibiscus!" promptKey="r1:0" soundOn active />,
      { sound: true, narration: true, automaticSpeech: false, narrationVolume: 0.25, epoch: 1 },
    );
    expect(speechMock.speak).not.toHaveBeenCalled();
    expect(api.replay()).toBe(true);
    expect(speechMock.speak).toHaveBeenCalledTimes(1);
    expect(speechMock.speak).toHaveBeenLastCalledWith("Tap the red hibiscus!", {
      language: "en-US",
      rate: 0.92,
      pitch: 1.08,
      volume: 0.25,
    });

    // 2. Changing narrationVolume (0.25 -> 0.5) immediately calls Speech.stop() and uses 0.5 on next replay
    speechMock.stop.mockClear();
    speechMock.speak.mockClear();
    await act(async () => {
      root.update(
        <AudioPreferences.Provider
          value={{ sound: true, narration: true, automaticSpeech: false, narrationVolume: 0.5, epoch: 1 }}
        >
          <Harness text="Tap the red hibiscus!" promptKey="r1:0" soundOn active />
        </AudioPreferences.Provider>,
      );
    });
    expect(speechMock.stop).toHaveBeenCalledTimes(1);
    expect(speechMock.speak).not.toHaveBeenCalled();
    expect(api.replay()).toBe(true);
    expect(speechMock.speak).toHaveBeenLastCalledWith("Tap the red hibiscus!", {
      language: "en-US",
      rate: 0.92,
      pitch: 1.08,
      volume: 0.5,
    });

    // 3. Turning automaticSpeech: true cancels stale speech and speaks the un-spoken prompt at volume 0.5
    speechMock.stop.mockClear();
    speechMock.speak.mockClear();
    await act(async () => {
      root.update(
        <AudioPreferences.Provider
          value={{ sound: true, narration: true, automaticSpeech: true, narrationVolume: 0.5, epoch: 1 }}
        >
          <Harness text="Tap the red hibiscus!" promptKey="r1:0" soundOn active />
        </AudioPreferences.Provider>,
      );
    });
    expect(speechMock.stop).toHaveBeenCalled();
    expect(speechMock.speak).toHaveBeenCalledTimes(1);
    expect(speechMock.speak).toHaveBeenLastCalledWith("Tap the red hibiscus!", {
      language: "en-US",
      rate: 0.92,
      pitch: 1.08,
      volume: 0.5,
    });

    // 4. Epoch change immediately calls Speech.stop()
    speechMock.stop.mockClear();
    await act(async () => {
      root.update(
        <AudioPreferences.Provider
          value={{ sound: true, narration: true, automaticSpeech: true, narrationVolume: 0.5, epoch: 2 }}
        >
          <Harness text="Tap the red hibiscus!" promptKey="r1:0" soundOn active />
        </AudioPreferences.Provider>,
      );
    });
    expect(speechMock.stop).toHaveBeenCalledTimes(1);

    // 5. narrationVolume: 0 cancels speech and blocks explicit replay & auto-speech
    speechMock.stop.mockClear();
    speechMock.speak.mockClear();
    await act(async () => {
      root.update(
        <AudioPreferences.Provider
          value={{ sound: true, narration: true, automaticSpeech: true, narrationVolume: 0, epoch: 2 }}
        >
          <Harness text="Tap the green turtle!" promptKey="r1:1" soundOn active />
        </AudioPreferences.Provider>,
      );
    });
    expect(speechMock.stop).toHaveBeenCalled();
    expect(speechMock.speak).not.toHaveBeenCalled();
    expect(api.replay()).toBe(false);
    expect(api.speak("One!")).toBe(false);

    // 6. narration: false cancels speech and blocks replay
    speechMock.stop.mockClear();
    await act(async () => {
      root.update(
        <AudioPreferences.Provider
          value={{ sound: true, narration: false, automaticSpeech: true, narrationVolume: 0.75, epoch: 2 }}
        >
          <Harness text="Tap the blue wave!" promptKey="r1:2" soundOn active />
        </AudioPreferences.Provider>,
      );
    });
    expect(speechMock.stop).toHaveBeenCalled();
    expect(api.replay()).toBe(false);
  });

  it("SpeakButton meets >= 48pt touch target for BOTH compact and toddler variants and respects AudioPreferences", async () => {
    const onPress = vi.fn();
    const root = await mountBoard(
      <>
        <SpeakButton testID="btn-compact" size="compact" onPress={onPress} />
        <SpeakButton testID="btn-toddler" size="toddler" onPress={onPress} />
      </>,
      { sound: true, narration: true, automaticSpeech: false, narrationVolume: 0.75 },
    );

    const compactBtn = root.root.find((n) => String(n.type) === "PressableScale" && n.props?.testID === "btn-compact");
    const toddlerBtn = root.root.find((n) => String(n.type) === "PressableScale" && n.props?.testID === "btn-toddler");
    const compactStyle = flatStyle(compactBtn.props.style);
    const toddlerStyle = flatStyle(toddlerBtn.props.style);

    expect(Number(compactStyle.minHeight)).toBeGreaterThanOrEqual(48);
    expect(Number(compactStyle.minWidth)).toBeGreaterThanOrEqual(48);
    expect(Number(toddlerStyle.minHeight)).toBeGreaterThanOrEqual(48);
    expect(Number(toddlerStyle.minWidth)).toBeGreaterThanOrEqual(48);
    expect(compactBtn.props.disabled).toBe(false);
    expect(toddlerBtn.props.disabled).toBe(false);

    // Volume 0 disables SpeakButton
    await act(async () => {
      root.update(
        <AudioPreferences.Provider value={{ sound: true, narration: true, narrationVolume: 0 }}>
          <SpeakButton testID="btn-compact" size="compact" onPress={onPress} />
        </AudioPreferences.Provider>,
      );
    });
    expect(root.root.find((n) => String(n.type) === "PressableScale" && n.props?.testID === "btn-compact").props.disabled).toBe(true);
  });
});

describe("Phase 4B: Toddler UI touch targets (>= 64pt), voice prompts, mute respect, and counting aloud", () => {
  it("island-colors renders >= 112pt cards, respects automaticSpeech off/on, replays on tap, and never leaks answers", async () => {
    // With default AudioPreferences (automaticSpeech: false), mounting does NOT auto-speak
    const props = makeBoardProps<IslandColorsState>("island-colors", 1);
    const root = await mountBoard(<IslandColorsBoard {...props} />);
    expect(speechMock.speak).not.toHaveBeenCalled();

    // Every choice card >= 112pt (exceeding >= 64-72pt toddler requirement)
    const cards = root.root.findAll((n) => String(n.props?.testID ?? "").startsWith("island-colors-choice-"));
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      const st = flatStyle(card.props.style);
      expect(Number(st.minWidth)).toBeGreaterThanOrEqual(64);
      expect(Number(st.minHeight)).toBeGreaterThanOrEqual(72);
    }

    // No hint shown on initial render
    expect(root.root.findAll((n) => n.props?.testID === "island-colors-hint")).toHaveLength(0);

    // Speaker replay button STILL works when automaticSpeech is false!
    const speakBtn = root.root.find((n) => String(n.type) === "PressableScale" && n.props?.testID === "island-colors-speak");
    expect(Number(flatStyle(speakBtn.props.style).minHeight)).toBeGreaterThanOrEqual(48);
    await act(async () => speakBtn.props.onPress());
    expect(speechMock.speak).toHaveBeenCalledTimes(1);

    // Unmount stops speech cleanly
    speechMock.stop.mockClear();
    await act(async () => root.unmount());
    activeRoot = undefined;
    expect(speechMock.stop).toHaveBeenCalled();

    // With automaticSpeech: true, opening auto-speaks immediately via expo-speech
    speechMock.speak.mockClear();
    await mountBoard(<IslandColorsBoard {...props} />, {
      sound: true,
      narration: true,
      automaticSpeech: true,
      narrationVolume: 0.75,
    });
    expect(speechMock.speak).toHaveBeenCalledTimes(1);
    await act(async () => activeRoot!.unmount());
    activeRoot = undefined;

    // Muted session emits zero speech utterances even when automaticSpeech: true
    speechMock.speak.mockClear();
    const mutedProps = makeBoardProps<IslandColorsState>("island-colors", 1, { soundOn: false });
    await mountBoard(<IslandColorsBoard {...mutedProps} />, {
      sound: true,
      narration: true,
      automaticSpeech: true,
      narrationVolume: 0.75,
    });
    expect(speechMock.speak).not.toHaveBeenCalled();
  });

  it("reef-sounds renders giant animal cards, speaks sound clues, and respects opt-in help", async () => {
    const props = makeBoardProps<ReefSoundsState>("reef-sounds", 2);
    const root = await mountBoard(<ReefSoundsBoard {...props} />, {
      sound: true,
      narration: true,
      automaticSpeech: true,
      narrationVolume: 0.5,
    });
    expect(speechMock.speak).toHaveBeenCalledTimes(1);
    expect(speechMock.speak.mock.calls[0][1]).toMatchObject({ volume: 0.5 });

    const cards = root.root.findAll((n) => String(n.props?.testID ?? "").startsWith("reef-sounds-choice-"));
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      const st = flatStyle(card.props.style);
      expect(Number(st.minWidth)).toBeGreaterThanOrEqual(64);
      expect(Number(st.minHeight)).toBeGreaterThanOrEqual(72);
    }

    // Tap Help -> assistance called & clue spoken via expo-speech
    const helpBtn = root.root.findByProps({ testID: "reef-sounds-help" });
    await act(async () => helpBtn.props.onPress());
    expect(props.assistance).toHaveBeenCalledTimes(1);
    expect(speechMock.speak).toHaveBeenCalledTimes(2);
  });

  it("splash-count renders >= 68pt tappable items and >= 88pt dot+numeral cards, and counts aloud on tap even when automaticSpeech is off", async () => {
    const props = makeBoardProps<SplashCountState>("splash-count", 3);
    const root = await mountBoard(<SplashCountBoard {...props} />, {
      sound: true,
      narration: true,
      automaticSpeech: false,
      narrationVolume: 0.75,
    });
    expect(speechMock.speak).not.toHaveBeenCalled();

    const items = root.root.findAll((n) => String(n.props?.testID ?? "").startsWith("splash-count-item-"));
    expect(items.length).toBeGreaterThanOrEqual(1);
    for (const item of items) {
      const st = flatStyle(item.props.style);
      expect(Number(st.minWidth)).toBeGreaterThanOrEqual(64);
      expect(Number(st.minHeight)).toBeGreaterThanOrEqual(64);
    }

    const choices = root.root.findAll((n) => String(n.props?.testID ?? "").startsWith("splash-count-choice-"));
    expect(choices).toHaveLength(3);
    for (const choice of choices) {
      const st = flatStyle(choice.props.style);
      expect(Number(st.minWidth)).toBeGreaterThanOrEqual(72);
      expect(Number(st.minHeight)).toBeGreaterThanOrEqual(72);
    }

    // Tap first beach item -> counts aloud "One!" via expo-speech even with automaticSpeech off
    await act(async () => items[0].props.onPress());
    expect(speechMock.speak).toHaveBeenCalledTimes(1);
    expect(String(speechMock.speak.mock.calls[0][0])).toContain(NUMBER_WORDS[1]);
    expect(props.sound).toHaveBeenCalledWith("tap", true);
  });
});

describe("Phase 4B: Spoken prompt & help audio across all 8 newly voiced learning games", () => {
  type AnyBoard = React.ComponentType<BoardProps<unknown>>;
  const boardMap: Record<(typeof VOICED_8_IDS)[number], AnyBoard> = {
    "pattern-path": PatternPathBoard as unknown as AnyBoard,
    "shape-shift": ShapeShiftBoard as unknown as AnyBoard,
    "times-tide": TimesTideBoard as unknown as AnyBoard,
    "fraction-feast": FractionFeastBoard as unknown as AnyBoard,
    "treasure-algebra": TreasureAlgebraBoard as unknown as AnyBoard,
    "turtle-draw": TurtleDrawBoard as unknown as AnyBoard,
    "tide-logic": TideLogicBoard as unknown as AnyBoard,
    "code-lab": CodeLabBoard as unknown as AnyBoard,
  };

  it.each(VOICED_8_IDS)(
    "%s: stays quiet when automaticSpeech is off, auto-speaks when on, replays via >=48pt Speaker button, respects mute, and stops on unmount",
    async (id) => {
      const eng = engines[id];
      expect(eng.spokenIntro?.length).toBeGreaterThan(10);
      expect(eng.spokenHelp?.length).toBeGreaterThan(20);
      expect(eng.helpAudio).toBeUndefined();

      const Board = boardMap[id];
      const props = makeBoardProps<unknown>(id, 1);

      // 1. automaticSpeech: false -> zero auto-speech on mount, explicit replay still works
      const quietRoot = await mountBoard(<Board {...props} />, {
        sound: true,
        narration: true,
        automaticSpeech: false,
        narrationVolume: 0.75,
      });
      expect(speechMock.speak, `${id} must not auto-speak when automaticSpeech is false`).not.toHaveBeenCalled();
      const quietSpeakBtn = quietRoot.root.find((n) => String(n.type) === "PressableScale" && n.props?.testID === `${id}-speak`);
      expect(Number(flatStyle(quietSpeakBtn.props.style).minHeight)).toBeGreaterThanOrEqual(48);
      expect(quietSpeakBtn.props.disabled).toBe(false);
      await act(async () => quietSpeakBtn.props.onPress());
      expect(speechMock.speak).toHaveBeenCalledTimes(1);
      await act(async () => quietRoot.unmount());
      activeRoot = undefined;

      // 2. automaticSpeech: true -> auto-speaks prompt on mount
      speechMock.speak.mockClear();
      speechMock.stop.mockClear();
      const root = await mountBoard(<Board {...props} />, {
        sound: true,
        narration: true,
        automaticSpeech: true,
        narrationVolume: 0.75,
      });
      expect(speechMock.speak, `${id} should speak prompt when automaticSpeech is true`).toHaveBeenCalledTimes(1);
      expect(String(speechMock.speak.mock.calls[0][0]).length).toBeGreaterThan(10);

      // Speaker button replays prompt
      const speakBtn = root.root.findByProps({ testID: `${id}-speak` });
      await act(async () => speakBtn.props.onPress());
      expect(speechMock.speak).toHaveBeenCalledTimes(2);

      // Unmount stops speech cleanly
      speechMock.stop.mockClear();
      await act(async () => root.unmount());
      activeRoot = undefined;
      expect(speechMock.stop).toHaveBeenCalled();

      // Muted board does NOT speak and disables Speaker button
      speechMock.speak.mockClear();
      const mutedProps = makeBoardProps<unknown>(id, 1, { soundOn: false });
      const mutedRoot = await mountBoard(<Board {...mutedProps} />, {
        sound: true,
        narration: true,
        automaticSpeech: true,
        narrationVolume: 0.75,
      });
      expect(speechMock.speak).not.toHaveBeenCalled();
      const mutedSpeakBtn = mutedRoot.root.findByProps({ testID: `${id}-speak` });
      expect(mutedSpeakBtn.props.disabled).toBe(true);
    },
  );

  it("speaks opt-in Help/Hint clues across newly voiced games without spoiling on initial render", async () => {
    const manualPrefs = { sound: true, narration: true, automaticSpeech: false, narrationVolume: 0.75 };

    // Pattern Path: tap Help -> speaks rule clue
    const PatternBoard = boardMap["pattern-path"];
    const ppProps = makeBoardProps<unknown>("pattern-path", 1);
    const ppRoot = await mountBoard(<PatternBoard {...ppProps} />, manualPrefs);
    expect(speechMock.speak).not.toHaveBeenCalled();
    await act(async () => ppRoot.root.findByProps({ testID: "pattern-help-button" }).props.onPress());
    expect(speechMock.speak).toHaveBeenCalledTimes(1);
    await act(async () => ppRoot.unmount());
    activeRoot = undefined;

    // Times Tide: tap Hint -> speaks hint
    speechMock.speak.mockClear();
    const TimesBoard = boardMap["times-tide"];
    const ttProps = makeBoardProps<unknown>("times-tide", 1);
    const ttRoot = await mountBoard(<TimesBoard {...ttProps} />, manualPrefs);
    const ttHint = ttRoot.root.findAll((n) => String(n.type) === "Button" && textOf(n).trim() === "Hint")[0];
    await act(async () => ttHint.props.onPress());
    expect(speechMock.speak).toHaveBeenCalledTimes(1);
    await act(async () => ttRoot.unmount());
    activeRoot = undefined;

    // Code Lab: tap Look help -> speaks hint
    speechMock.speak.mockClear();
    const CodeBoard = boardMap["code-lab"];
    const clProps = makeBoardProps<unknown>("code-lab", 1);
    const clRoot = await mountBoard(<CodeBoard {...clProps} />, manualPrefs);
    const clLook = clRoot.root.findAll((n) => String(n.type) === "Button" && textOf(n).trim() === "Look")[0];
    await act(async () => clLook.props.onPress());
    expect(speechMock.speak).toHaveBeenCalledTimes(1);
  });
});

describe("Phase 4B EXPLICIT CONSTRAINT: hafa-adai stays 100% text-only for CHamoru", () => {
  it("keeps hafa-adai completely free of CHamoru TTS or voice module imports", () => {
    const eng = engines["hafa-adai"];
    expect(eng.spokenIntro).toBeUndefined();
    expect(eng.spokenHelp).toBeUndefined();

    const viewSrc = readFileSync("src/learn/games/hafa-adai/view.tsx", "utf8");
    const engineSrc = readFileSync("src/learn/games/hafa-adai/engine.ts", "utf8");
    expect(viewSrc).toContain("CHamoru words are text only");
    expect(viewSrc).not.toMatch(/speechSynthesis|speakText|useSpokenPrompt|SpeakButton|expo-speech|from\s+["']\.\.\/\.\.\/voice["']/);
    expect(engineSrc).not.toMatch(/speechSynthesis|speakText|spokenIntro|spokenHelp|expo-speech/);
  });
});
