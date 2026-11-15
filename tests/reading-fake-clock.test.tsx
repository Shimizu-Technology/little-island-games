/**
 * R3-3(a): reading is never timed, checked by behaviour first. Each reading game is rendered inside the real School host
 * (LearnFrame, with the real store), then a minute of fake time passes with no press. Nothing may move: not the word or
 * page, not the round, not the saved revision, and no practice is credited. The Sound Boat word-parts board, which the
 * shipped registry cannot reach yet, gets the same check through the real factory with fixture words.
 */
import React, { createContext } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { holdFrames } from "./helpers/held-frames";
import { LearnFrame } from "../src/learn/LearnFrame";
import { StoreProvider, useStore } from "../src/state/Store";
import { emptySave, parseSave } from "../src/state/validation";
import { encodeSave, migrateProfiles } from "../src/state/profiles";
import { startSession } from "../src/learn/session";
import { engines } from "../src/learn/engines";
import { optionsAtLevel } from "../src/learn/levels";
import { boatComplete, boatExpected, boatMove, type BoatState } from "../src/learn/games/sound-boat/engine";
import { whichAnswer, whichPick, type WhichState } from "../src/learn/games/which-one/engine";
import { talePick, type TaleState } from "../src/learn/games/turtle-tales/engine";
import { partsMove, partsTask, type PartsState } from "../src/learn/games/sound-boat/parts";
import type { LearnId, LearnOptions, LearnSession } from "../src/learn/types";
beforeEach(holdFrames);

const db = vi.hoisted(() => ({ raw: null as string | null }));
const played = vi.hoisted(() => [] as string[]);
vi.mock("../src/state/storage", () => ({ storage: { get: async () => db.raw, set: async (s: string) => { db.raw = s; }, preserve: async () => {} } }));
vi.mock("react-native", () => {
  class Value { v: number; constructor(v: number) { this.v = v; } setValue(v: number) { this.v = v; } interpolate() { return this; } }
  const anim = () => ({ start() {}, stop() {} });
  return {
    ScrollView: "ScrollView", View: "View", Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios ?? o.default },
    useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }), AppState: { addEventListener: () => ({ remove() {} }) },
    Animated: { View: "AnimatedView", Value, timing: anim, spring: anim, sequence: anim, loop: anim, parallel: anim, delay: anim },
    StyleSheet: { create: (s: unknown) => s, absoluteFill: {}, hairlineWidth: 1 }, Text: "Text", Pressable: "Pressable",
  };
});
vi.mock("react-native-svg", () => Object.fromEntries([["default", "Svg"], ...["Circle", "Rect", "Path", "Ellipse", "G", "Line", "Polygon", "Polyline", "Text", "TSpan", "Defs", "LinearGradient", "RadialGradient", "Stop", "ClipPath", "Mask", "Use", "Symbol"].map((n) => [n, n])]));
// The real boards of the Reading island's games; every other game is a placeholder the host never shows here.
vi.mock("../src/learn/views", async () => {
  const real = { "sound-boat": await import("../src/learn/games/sound-boat/view"), "which-one": await import("../src/learn/games/which-one/view"), "turtle-tales": await import("../src/learn/games/turtle-tales/view"), "hafa-adai": await import("../src/learn/games/hafa-adai/view"), "letter-lagoon": await import("../src/learn/games/letter-lagoon/view"), "story-studio": await import("../src/learn/games/story-studio/view"), "word-workshop": await import("../src/learn/games/word-workshop/view") } as Record<string, { Board: unknown }>;
  return { views: new Proxy({}, { get: (_, id: string) => ({ Board: real[id]?.Board ?? "Board", Art: () => null }) }) };
});
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock("expo-router", () => ({ useIsFocused: () => true, router: { canGoBack: () => false, replace: vi.fn(), push: vi.fn() } }));
vi.mock("../src/components/ui", () => ({
  Button: "Button", Chip: "Chip", Heading: "Heading", Copy: "Copy", ToggleRow: "ToggleRow", GameHeader: "GameHeader", IconButton: "IconButton", PressableScale: "PressableScale",
  C: new Proxy({}, { get: () => "#000" }), styles: {},
  Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (visible ? React.createElement("SheetBody", null, children) : null),
}));
vi.mock("../src/components/Audio", () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play: (key: string) => { played.push(key); return true; }, stop: () => {} }), hasSpeech: () => true }));
vi.mock("../src/content/learnAudio", () => ({ learnSources: {} }));
vi.mock("../src/components/SaveStatus", () => ({ SaveStatus: () => null }));
vi.mock("../src/components/Match", () => ({ Scoreboard: () => null, PlayerNames: () => null }));
vi.mock("../src/components/feel", () => ({ feel: () => {} }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => true, easeOut: () => 0, nativeDriver: false }));
vi.mock("../src/components/Icon", () => ({ Icon: "Icon" }));
vi.mock("../src/personalization/LearnerChip", () => ({ LearnerChip: "LearnerChip" }));
vi.mock("../src/islander/Companion", () => ({ Companion: () => null, LearningCompanion: ({ children }: { children: React.ReactNode }) => children, PhoneLearningCompanion: "PhoneLearningCompanion", useCompanionReaction: () => ({ event: "entry", react: () => {} }) }));
vi.mock("../src/learn/LearnChrome", () => ({ IslandBackdrop: () => null, RoundProgress: () => null, subjectTheme: new Proxy({}, { get: () => ({}) }) }));
vi.mock("../src/learn/LearnArt", () => ({ LearnArt: () => null }));
vi.mock("../src/learn/Celebrate", () => ({ Celebrate: () => null }));
vi.mock("../src/learn/LevelPath", () => ({ LevelPath: () => null }));
vi.mock("../src/learn/art/Objects", () => ({ PictureObject: "PictureObject", ObjectGlyph: "ObjectGlyph", Scene: "Scene" }));
// Fixture words stand in for an admitted bank, so the Levels 4-5 word-parts board is reachable here too.
vi.mock("../src/learn/reading/admitted", async (real) => (await import("./helpers/fixture-door")).fixtureDoor(real));
// Fixture words are not published Challenge puzzles: the catalog stays as shipped.
vi.mock("../src/learn/games/sound-boat/challenge-content", async (real) => ({ ...((await real()) as object), soundBoatProduction: () => [] }));
vi.mock("../src/badges/ResultCard", () => ({ BadgeResultCard: () => null }));

const READING: LearnId[] = (Object.keys(engines) as LearnId[]).filter((id) => engines[id].island === "reading").sort();
const level = (n: 1 | 4 | 5): LearnOptions => optionsAtLevel({ mode: "solo", pace: "easy" }, n);
/** The moment most worth checking: a word or page already right, waiting for her press. */
function waiting(id: LearnId, session: LearnSession): LearnSession {
  if (id === "sound-boat" && session.options.stage) {
    let s = session.state as PartsState;
    const t = partsTask(s)!, used: number[] = [];
    for (const piece of t.tiles) { const k = t.tray.findIndex((x, j) => x === piece && !used.includes(j)); used.push(k); s = partsMove(s, { type: "edit", edit: ["a", k] }); }
    s = partsMove(s, { type: "check" });
    expect(s.answer.solved).toBe(true);
    return { ...session, state: s };
  }
  if (id === "sound-boat") {
    let s = session.state as BoatState;
    while (!boatComplete(s)) s = boatMove(s, { type: "tile", tile: boatExpected(s) });
    return { ...session, state: s };
  }
  if (id === "which-one") { const s = session.state as WhichState; return { ...session, state: whichPick(s, whichAnswer(s)) }; }
  if (id === "turtle-tales") { const s = session.state as TaleState; return { ...session, state: talePick(s, s.sides[0]) }; }
  return session;
}

let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); played.length = 0; });
function Ready({ id }: { id: LearnId }) { const s = useStore(); return s.ready ? <LearnFrame id={id} /> : null; }
const savedNow = () => parseSave(db.raw!);

describe("a reading game inside the School host, left alone for a minute", () => {
  it("covers every Reading island game in the registry", () => {
    expect(READING).toEqual(expect.arrayContaining(["hafa-adai", "letter-lagoon", "sound-boat", "turtle-tales", "which-one"]));
  });
  const cases: [string, LearnId, LearnOptions][] = [...READING.map((id) => [id, id, level(1)] as [string, LearnId, LearnOptions]), ["sound-boat word parts, Level 4", "sound-boat", level(4)], ["sound-boat word parts, Level 5", "sound-boat", level(5)]];
  it.each(cases)("%s: no word, page or round moves, the save does not change, and nothing is credited", async (_, id, options) => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers();
    const save = migrateProfiles(emptySave());
    const session = waiting(id, { ...startSession(id, { options }, {}, 7), learner: "family" } as LearnSession);
    if (options.stage) expect((session.state as PartsState).kind).toBe("parts");
    save.learn = { [id]: session };
    db.raw = encodeSave(save);
    const before = savedNow();
    await act(async () => { root = create(<StoreProvider><Ready id={id} /></StoreProvider>, { createNodeMock: () => ({ scrollTo: () => {} }) }); });
    for (let i = 0; i < 50 && !root!.root.findAll((n) => String(n.type) === "GameHeader").length; i++) await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(root!.root.findAll((n) => String(n.type) === "GameHeader").length, "the host rendered").toBeGreaterThan(0);
    expect(root!.root.findAll((n) => String(n.type) === "Board"), "the game's real board is shown").toEqual([]);
    const shown = root!.toJSON();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    const after = savedNow();
    expect(after.learn?.[id]?.state).toEqual(before.learn?.[id]?.state);
    expect(after.learn?.[id]?.revision).toBe(before.learn?.[id]?.revision);
    expect(after.skills).toEqual(before.skills);
    expect(after.learning).toEqual(before.learning);
    expect(root!.toJSON()).toEqual(shown);
    // The minute really ran the board's own timers: Sound Boat spoke its word on its speech timer, and still waited.
    if (id === "sound-boat") expect(played.some((k) => k.startsWith("sound-boat-word-")), played.join()).toBe(true);
  });
});
