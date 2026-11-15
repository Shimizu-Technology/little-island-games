/**
 * R1a fix 4 (R4-1): one rule for all child-visible reading content. Every word, tray, sentence, passage and CHamoru
 * word a child reads resolves by id from the admitted registry (`reading/tasks.ts`) or the immutable inherited snapshot
 * (`reading/provenance.ts`), and is branded there. `ReadingText`, `TapWords` and every reading board refuse anything
 * else. These tests run the real host (LearnFrame with the real Store) and the real boards; the static backstop is
 * `tests/reading-provenance-static.test.ts`.
 */
import React, { createContext } from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LearnFrame } from "../src/learn/LearnFrame";
import { StoreProvider, useStore } from "../src/state/Store";
import { emptySave, parseSave } from "../src/state/validation";
import { encodeSave, migrateProfiles } from "../src/state/profiles";
import { startSession } from "../src/learn/session";
import { engines } from "../src/learn/engines";
import { optionsAtLevel } from "../src/learn/levels";
import { canonical } from "../src/puzzles/descriptor";
import { sha256Hex } from "../src/puzzles/sha256";
import { readingSpeech } from "../src/learn/kit/readingSpeech";
import { ReadingText } from "../src/learn/kit/ReadingText";
import { TapWords } from "../src/learn/reading/TapWords";
import { REFUSED_TASK_TEXT, admittedReading } from "../src/learn/reading/admit";
import * as provenance from "../src/learn/reading/provenance";
import { INHERITED_SOURCE_DIGESTS, chamoruRecord, inheritedSourceExports, isInheritedRecord, readingBank, readingLadder, readingPassage, readingPassages, readingSentence, readingSentences, readingWords, sourceBytes } from "../src/learn/reading/provenance";
import { letterTaskById } from "../src/learn/reading/tasks";
import { boatComplete, boatExpected, boatMove, boatWord, type BoatState } from "../src/learn/games/sound-boat/engine";
import { whichItem, type WhichState } from "../src/learn/games/which-one/engine";
import type { TaleState } from "../src/learn/games/turtle-tales/engine";
import type { IslandState } from "../src/learn/games/hafa-adai/engine";
import type { State as BoardState } from "../src/learn/games/letter-lagoon/puzzle";
import { SENTENCES } from "../src/learn/content/reading/sentences";
import { STORIES } from "../src/learn/content/reading/stories";
import { WORDS } from "../src/learn/content/reading/words";
import { LETTER_LAGOON_BANK } from "../src/learn/content/reading/lagoon";
import { chamoruWords } from "../src/learn/content/chamoru";
import { dataExports, inheritedSourceDigests, inheritedSourceFile, inheritedSourceFiles, inheritedSourceModules, sourceDigest } from "./helpers/inherited-sources";
import type { LearnId, LearnOptions, LearnSession } from "../src/learn/types";

const db = vi.hoisted(() => ({ raw: null as string | null }));
const played = vi.hoisted(() => [] as string[]);
/** While on, each game's producer hands its board an edited copy of the real record, the way REVIEW-4's patch did. */
const swap = vi.hoisted(() => ({ on: false, word: null as string | null }));
const SUNSET = "A sunset is red.";
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
vi.mock("../src/badges/ResultCard", () => ({ BadgeResultCard: () => null }));
// The producers each board reads from. With `swap.on` they hand the board an edited copy of the real record.
vi.mock("../src/learn/games/which-one/engine", async (real) => {
  const r = (await real()) as typeof import("../src/learn/games/which-one/engine");
  // REVIEW-4's legacy-producer.patch, on today's producer: spread the real sentence and replace its text.
  return { ...r, whichItem: (s: WhichState) => (swap.on ? { ...r.whichItem(s), text: JSON.parse('{"term":"A sunset is red."}').term as string } : r.whichItem(s)) };
});
vi.mock("../src/learn/games/turtle-tales/engine", async (real) => {
  const r = (await real()) as typeof import("../src/learn/games/turtle-tales/engine");
  return { ...r, tale: (s: { id: string }) => (swap.on ? { ...r.tale(s), pages: r.tale(s).pages.map((p) => ({ ...p, text: SUNSET })) } : r.tale(s)) };
});
vi.mock("../src/learn/games/sound-boat/engine", async (real) => {
  const r = (await real()) as typeof import("../src/learn/games/sound-boat/engine");
  return { ...r, boatWord: (s: BoatState) => (swap.on ? { ...r.boatWord(s), word: "sunset" } : r.boatWord(s)) };
});
const swapBank = vi.hoisted(() => (r: { bank: readonly (readonly { prompt: string }[])[] }) =>
  ({ ...r, get bank() { return swap.on ? r.bank.map((level) => level.map((t) => ({ ...t, prompt: "A sunset is red." }))) : r.bank; } }));
vi.mock("../src/learn/games/letter-lagoon/engine", async (real) => swapBank((await real()) as never));
vi.mock("../src/learn/games/story-studio/engine", async (real) => swapBank((await real()) as never));
vi.mock("../src/learn/games/word-workshop/engine", async (real) => swapBank((await real()) as never));
// A word looked up by spelling (Sound Boat's ladder: the word she is changing) handed over as an edited copy.
vi.mock("../src/learn/kit/reading", async (real) => {
  const r = (await real()) as typeof import("../src/learn/kit/reading");
  return { ...r, wordEntry: (w: string) => (swap.word !== null && w.toLowerCase() === swap.word ? { ...r.wordEntry(w)! } : r.wordEntry(w)) };
});
vi.mock("../src/learn/reading/provenance", async (real) => {
  const r = (await real()) as typeof import("../src/learn/reading/provenance");
  return { ...r, chamoruRecord: (id: unknown) => (swap.on && r.chamoruRecord(id) ? { ...r.chamoruRecord(id)!, term: "Sunset" } : r.chamoruRecord(id)) };
});

const dev = globalThis as { __DEV__?: unknown };
const releaseMode = dev.__DEV__;
let root: ReactTestRenderer | undefined;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined; swap.on = false; swap.word = null; dev.__DEV__ = releaseMode; played.length = 0;
  vi.useRealTimers(); vi.unstubAllGlobals();
});
const words = (node: ReactTestInstance | ReactTestRenderer = root!) =>
  ("root" in node ? node.root : node).findAll((n) => String(n.type) === "Copy" || String(n.type) === "Heading").map((n) => n.children.filter((c) => typeof c === "string").join(""));
const shownText = () => words().join(" ");

describe("the inherited sources are pinned, and the snapshot is a frozen copy", () => {
  it("each source matches its pin, hashed independently, and every data export it has is pinned", () => {
    expect(inheritedSourceDigests()).toEqual(INHERITED_SOURCE_DIGESTS);
    expect(inheritedSourceFiles()).toEqual(Object.keys(INHERITED_SOURCE_DIGESTS).filter((n) => n !== "chamoru").map((n) => `${n}.ts`).sort());
    for (const [name, mod] of Object.entries(inheritedSourceModules)) expect(inheritedSourceExports()[name as provenance.SourceName], name).toEqual(dataExports(mod));
    for (const [name, mod] of Object.entries(inheritedSourceModules)) expect(sha256Hex(sourceBytes(mod)), name).toBe(sourceDigest(mod));
    for (const name of Object.keys(INHERITED_SOURCE_DIGESTS)) expect(inheritedSourceFile(name)).toMatch(/^src\/learn\/content\//);
  });
  it("adding, dropping or changing one word in any source changes its digest, so the pin fails", () => {
    const m = inheritedSourceModules as Record<string, any>;
    const changed = [
      ["words", { ...m.words, WORDS: [...m.words.WORDS, { ...m.words.WORDS[0], word: "sunset" }] }],
      ["words", { ...m.words, WORDS: m.words.WORDS.slice(1) }],
      ["sentences", { ...m.sentences, SENTENCES: [...m.sentences.SENTENCES, { ...m.sentences.SENTENCES[0], id: "extra" }] }],
      ["stories", { ...m.stories, STORIES: m.stories.STORIES.map((t: any, i: number) => (i ? t : { ...t, title: `${t.title}!` })) }],
      ["clues", { ...m.clues, PICTURE_WORDS: { ...m.clues.PICTURE_WORDS, easy: [...m.clues.PICTURE_WORDS.easy, "sunset"] } }],
      ["clues", { ...m.clues, LEGACY_WARMUP_WORDS: new Set([...m.clues.LEGACY_WARMUP_WORDS, "sunset"]) }],
      ["ladders", { ...m.ladders, LADDERS: [...m.ladders.LADDERS, m.ladders.LADDERS[0]] }],
      ["lagoon", { ...m.lagoon, LETTER_LAGOON_BANK: m.lagoon.LETTER_LAGOON_BANK.map((l: any[], i: number) => (i ? l : [{ ...l[0], prompt: "Find S" }, ...l.slice(1)])) }],
      ["studio", { ...m.studio, STORY_STUDIO_BANK: m.studio.STORY_STUDIO_BANK.map((l: any[], i: number) => (i ? l : [...l, l[0]])) }],
      ["workshop", { ...m.workshop, WORD_WORKSHOP_BANK: m.workshop.WORD_WORKSHOP_BANK.map((l: any[], i: number) => (i ? l : l.slice(1))) }],
      ["chamoru", { ...m.chamoru, chamoruWords: m.chamoru.chamoruWords.map((w: any, i: number) => (i ? w : { ...w, term: "Sunset" })) }],
    ] as const;
    for (const [name, mod] of changed) expect(sourceDigest(mod), name).not.toBe(INHERITED_SOURCE_DIGESTS[name]);
  });
  it("the moved banks are exactly what the games built in code at 396dcda4, so saved rounds keep their indexes", () => {
    // The canonical hashes of `bank` as letter-lagoon/, story-studio/ and word-workshop/engine.ts computed it before the move.
    expect(sha256Hex(canonical(readingBank("letter-lagoon")))).toBe("17df4dfa631c4a103e3b26181fb6043a3363102a8a53eda452bcd6a3317723a4");
    expect(sha256Hex(canonical(readingBank("story-studio")))).toBe("71ad40031d7a3791ba3a42897632283e639635ffd3352322f4257f1735619160");
    expect(sha256Hex(canonical(readingBank("word-workshop")))).toBe("fd8830b624f771f66190e211a493fd38c9abf13cea42b181bf18b4fd8da98c20");
  });
  it("the moved speech keys are still the registered lines for their text", () => {
    for (const level of readingBank("story-studio").slice(0, 2)) for (const t of level) {
      expect(t.audio, t.prompt).toBe(readingSpeech(t.clue));
      for (const card of [...t.answer, ...t.extras]) expect(t.cardAudio?.[card], card).toBe(readingSpeech(card));
    }
    for (const level of readingBank("word-workshop")) for (const t of level) if (t.completedWord) expect(t.completedAudio, t.completedWord).toBe(readingSpeech(t.completedWord));
  });
  it("every record is a deep-frozen copy, branded only here; copies of it are not branded", () => {
    const records = [readingWords()[0], readingSentences()[0], readingPassages()[0], readingPassages()[0].pages[0], readingLadder("easy-0")!, readingBank("letter-lagoon")[4][0], readingBank("story-studio")[3][0], readingBank("word-workshop")[0][0], chamoruRecord("colors.red")!];
    const live = [WORDS[0], SENTENCES[0], STORIES[0], STORIES[0].pages[0], undefined, LETTER_LAGOON_BANK[4][0], undefined, undefined, chamoruWords[1]];
    records.forEach((r, i) => {
      expect(isInheritedRecord(r), String(i)).toBe(true);
      expect(r, String(i)).not.toBe(live[i]);
      if (live[i]) expect(r, String(i)).toEqual(live[i]);
      const deep = (v: unknown): boolean => typeof v !== "object" || v === null || (Object.isFrozen(v) && Object.values(v).every(deep));
      expect(deep(r), String(i)).toBe(true);
      for (const copy of [{ ...r }, structuredClone(r), JSON.parse(JSON.stringify(r)), Object.assign({}, r), Object.create(r)]) expect(isInheritedRecord(copy), String(i)).toBe(false);
    });
    expect(() => { (readingSentences()[0] as { text: string }).text = SUNSET; }).toThrow(TypeError);
    expect(() => { (readingWords() as unknown[]).push({ word: "sunset" }); }).toThrow(TypeError);
    expect(() => { (readingBank("letter-lagoon")[0] as unknown[]).push({ prompt: SUNSET }); }).toThrow(TypeError);
    for (const s of [SUNSET, "cat", null, undefined, 1, ["cat"]]) expect(isInheritedRecord(s)).toBe(false);
  });
  it("lookups take ids, never record data", () => {
    const s = readingSentences()[0];
    expect(readingSentence(s.id)).toBe(s);
    for (const forged of [s, { ...s }, { id: s.id }, [s.id], { toString: () => s.id }]) expect(readingSentence(forged)).toBeUndefined();
    expect(readingPassage(readingPassages()[0])).toBeUndefined();
    expect(chamoruRecord({ id: "colors.red" })).toBeUndefined();
  });
  it("changing the live sources after the check changes nothing a child is shown", () => {
    const s = readingSentences()[0], w = readingWords()[0], p = readingPassages()[0].pages[0], t = readingBank("letter-lagoon")[0][0], c = chamoruRecord("colors.red")!;
    const before = [s.text, w.word, p.text, t.prompt, c.term];
    const live = { s: SENTENCES.find((x) => x.id === s.id)!, w: WORDS.find((x) => x.word === w.word)! as { word: string }, p: STORIES[0].pages[0], t: LETTER_LAGOON_BANK[0][0], c: chamoruWords.find((x) => x.id === "colors.red")! as { term: string } };
    const old = [live.s.text, live.w.word, live.p.text, live.t.prompt, live.c.term];
    try {
      live.s.text = SUNSET; live.w.word = "sunset"; live.p.text = SUNSET; live.t.prompt = SUNSET; live.c.term = "Sunset";
      (SENTENCES as unknown[]).push({ ...s, id: "reviewer-extra", text: SUNSET });
      expect(inheritedSourceDigests()).not.toEqual(INHERITED_SOURCE_DIGESTS);
      expect([readingSentence(s.id)!.text, readingWords()[0].word, readingPassages()[0].pages[0].text, readingBank("letter-lagoon")[0][0].prompt, chamoruRecord("colors.red")!.term]).toEqual(before);
      expect(readingSentence("reviewer-extra")).toBeUndefined();
      expect(readingSentences().some((x) => x.text === SUNSET)).toBe(false);
    } finally {
      SENTENCES.pop();
      [live.s.text, live.w.word, live.p.text, live.t.prompt, live.c.term] = old as [string, string, string, string, string];
    }
    expect(inheritedSourceDigests()).toEqual(INHERITED_SOURCE_DIGESTS);
  });
  it("a source that no longer matches its pin when the app loads gives nothing; in development loading throws", async () => {
    const extra = async (real: () => Promise<unknown>) => {
      const r = (await real()) as typeof import("../src/learn/content/reading/sentences");
      return { ...r, SENTENCES: [...r.SENTENCES, { ...r.SENTENCES[0], id: "reviewer-extra", text: SUNSET }] };
    };
    vi.resetModules();
    vi.doUnmock("../src/learn/reading/provenance");
    vi.doMock("../src/learn/content/reading/sentences", extra);
    const quiet = await import("../src/learn/reading/provenance");
    expect(quiet.readingSentences()).toEqual([]);
    expect(quiet.readingSentence("reviewer-extra")).toBeUndefined();
    expect(quiet.readingWords().length).toBe(readingWords().length);
    const which = await import("../src/learn/games/which-one/engine");
    const admit = await import("../src/learn/reading/admit");
    expect(admit.admittedReading(which.whichItem({ ids: [readingSentences()[0].id], index: 0 } as WhichState), "probe")).toBe(false);
    dev.__DEV__ = true;
    vi.resetModules();
    vi.doMock("../src/learn/content/reading/sentences", extra);
    await expect(import("../src/learn/reading/provenance")).rejects.toThrow(/inherited reading source "sentences" no longer matches its pinned digest/);
    vi.doUnmock("../src/learn/content/reading/sentences");
  });
});

describe("ReadingText and TapWords print only branded records", () => {
  const sentence = () => readingSentences()[0];
  it("REVIEW-4's probe: a new renderer handing ReadingText a raw string is refused", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const raw = JSON.parse('{"term":"A sunset is red."}').term as never;
    const onWord = vi.fn();
    await act(async () => { root = create(<ReadingText record={raw} onWord={onWord} />); });
    expect(words()).toEqual([REFUSED_TASK_TEXT]);
    expect(root!.root.findAll((n) => String(n.type) === "PressableScale")).toEqual([]);
    expect(onWord).not.toHaveBeenCalled();
    dev.__DEV__ = true;
    expect(() => ReadingText({ record: raw, onWord })).toThrow(/ReadingText was given reading content that did not come from an admitted or pinned inherited record/);
  });
  it("copies, spreads and hand-made records are refused by both; branded records and minted tasks print", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const s = sentence();
    for (const forged of [{ ...s }, { ...s, text: SUNSET }, structuredClone(s), { id: "x", text: SUNSET }, { word: "sunset" }]) {
      await act(async () => { root = create(<ReadingText record={forged as never} onWord={vi.fn()} />); });
      expect(words()).toEqual([REFUSED_TASK_TEXT]);
      await act(async () => root!.unmount());
      await act(async () => { root = create(<TapWords record={forged as never} sound={vi.fn()} soundOn />); });
      expect(words()).toEqual([REFUSED_TASK_TEXT]);
      await act(async () => root!.unmount());
    }
    await act(async () => { root = create(<ReadingText record={s} onWord={vi.fn()} />); });
    expect(words().join(" ")).toBe(s.text);
    await act(async () => root!.unmount());
    await act(async () => { root = create(<TapWords record={letterTaskById("w-cat")!} end="!" sound={vi.fn()} soundOn />); });
    expect(words()).toEqual(["cat!"]);
    await act(async () => root!.unmount());
    await act(async () => { root = create(<TapWords record={readingWords()[0]} sound={vi.fn()} soundOn />); });
    expect(words()).toEqual([readingWords()[0].word]);
    root!.unmount(); root = undefined;
    expect(admittedReading(s, "probe") && admittedReading(letterTaskById("w-cat"), "probe")).toBe(true);
  });
});

// ---- Every reading game in the real School host, opened from a save. ----
const READING: LearnId[] = (Object.keys(engines) as LearnId[]).filter((id) => engines[id].island === "reading").sort();
const level1 = (_: LearnId): LearnOptions => optionsAtLevel({ mode: "solo", pace: "easy" }, 1);
function Ready({ id }: { id: LearnId }) { const s = useStore(); return s.ready ? <LearnFrame id={id} /> : null; }
const savedNow = () => parseSave(db.raw!);
/** A saved round for each game; Sound Boat's word is built, so it prints the word to tap. */
function savedRound(id: LearnId, revision: number): LearnSession {
  const session = { ...startSession(id, { options: level1(id) }, {}, 11), learner: "family", revision } as LearnSession;
  if (id !== "sound-boat") return session;
  let s = session.state as BoatState;
  while (!boatComplete(s)) s = boatMove(s, { type: "tile", tile: boatExpected(s) });
  return { ...session, state: s };
}
/** What the board must print for this saved round, resolved by its saved ids from the snapshot. */
function expected(id: LearnId, state: unknown): string {
  if (id === "which-one") return readingSentence((state as WhichState).ids[0])!.text;
  if (id === "turtle-tales") return readingPassage((state as TaleState).id)!.pages[0].text;
  if (id === "hafa-adai") return chamoruRecord((state as IslandState).items[0])!.english.split(" / ")[0];
  if (id === "sound-boat") return `${boatWord(state as BoatState).word}!`;
  const s = state as BoardState;
  return readingBank(id as provenance.BankGame)[s.level - 1][s.ids[0]].prompt;
}
/** Each game's saved round keeps the shape it has always had: ids, never record copies. */
const SHAPES: Record<string, string> = {
  "hafa-adai": "activity,items,starter,taps",
  "letter-lagoon": "clean,helped,hint,ids,index,level,miss,placed,starter,version",
  "sound-boat": "assisted,clean,credit,filled,hint,index,ladders,out,pictures,starter",
  "story-studio": "clean,helped,hint,ids,index,level,miss,placed,starter,version",
  "turtle-tales": "clean,heard,id,page,sides,solved,starter,wrong",
  "which-one": "clean,ids,index,orders,solved,starter,tried,wrong",
  "word-workshop": "clean,helped,hint,ids,index,level,miss,placed,starter,version",
};
async function open(id: LearnId, session: LearnSession) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  const save = migrateProfiles(emptySave());
  save.learn = { [id]: session };
  db.raw = encodeSave(save);
  await act(async () => { root = create(<StoreProvider><Ready id={id} /></StoreProvider>, { createNodeMock: () => ({ scrollTo: () => {} }) }); });
  for (let i = 0; i < 50 && !root!.root.findAll((n) => String(n.type) === "GameHeader").length; i++) await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(root!.root.findAll((n) => String(n.type) === "GameHeader").length, "the host rendered").toBeGreaterThan(0);
  expect(root!.root.findAll((n) => String(n.type) === "Board"), "the game's real board is shown").toEqual([]);
}

describe("every reading game resumes from an id-based save and shows the snapshot record", () => {
  it("covers every Reading island game in the registry", () => {
    expect(READING).toEqual(["hafa-adai", "letter-lagoon", "sound-boat", "story-studio", "turtle-tales", "which-one", "word-workshop"]);
  });
  it.each(READING)("%s: the save keeps ids in its old shape, loads, and the board prints the record for those ids", async (id) => {
    const session = savedRound(id, 1);
    expect(Object.keys(session.state as object).sort().join(","), "saved shape").toBe(SHAPES[id]);
    const encoded = encodeSave({ ...migrateProfiles(emptySave()), learn: { [id]: session } });
    expect(encoded).not.toContain('"scenes"');
    const restored = parseSave(encoded).learn?.[id];
    expect(restored?.state).toEqual(session.state);
    expect(engines[id].validate(restored!.state, restored!.options)).toBe(true);
    await open(id, session);
    expect(shownText()).toContain(expected(id, session.state));
    expect(shownText()).not.toContain(REFUSED_TASK_TEXT);
  });
});

describe("a producer that hands a board an edited copy is refused: no word, no speech, no credit", () => {
  // A restored round (revision 1) speaks nothing at all; a fresh one (revision 0) may hear only the host's own spoken
  // introduction of the game, never a word from the board.
  it.each(READING.flatMap((id) => [[id, 1], [id, 0]] as [LearnId, number][]))("%s: the board shows the fallback and nothing moves, is spoken or credited for a minute (saved at revision %i)", async (id, revision) => {
    const session = savedRound(id, revision);
    swap.on = true;
    await open(id, session);
    const before = savedNow();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(words()).toContain(REFUSED_TASK_TEXT);
    // The board itself refused, before drawing anything: not only ReadingText's own second check.
    expect(root!.root.findAll((n) => n.props.testID === "reading-content-refused" || n.props.testID === "reading-task-refused").length).toBeGreaterThan(0);
    expect(root!.root.findAll((n) => n.props.testID === "reading-text-refused")).toEqual([]);
    expect(root!.root.findAll((n) => ["Scene", "PictureObject", "ObjectGlyph", "Chip"].includes(String(n.type)))).toEqual([]);
    expect(shownText()).not.toMatch(/sunset/i);
    expect(shownText()).not.toContain(expected(id, session.state));
    expect(played, played.join()).toEqual(revision === 0 && engines[id].introAudio ? [engines[id].introAudio] : []);
    const after = savedNow();
    expect(after.learn?.[id]?.state).toEqual(before.learn?.[id]?.state);
    expect(after.learn?.[id]?.revision).toBe(before.learn?.[id]?.revision);
    expect(after.skills).toEqual(before.skills);
    expect(after.learning).toEqual(before.learning);
  });
  it("sound-boat: a ladder whose previous word is an edited copy is refused too", async () => {
    let session = savedRound("sound-boat", 1);
    let s = session.state as BoatState;
    // Sail through the four picture words to the first ladder rung, whose previous word is printed above the boat.
    while (s.index < 5) { while (!boatComplete(s)) s = boatMove(s, { type: "tile", tile: boatExpected(s) }); if (s.index < 5) s = boatMove(s, { type: "next" }); }
    session = { ...session, state: s };
    const ladder = readingLadder(s.ladders[0])!;
    expect(boatWord(s).word).toBe(ladder.words[2]);
    await open("sound-boat", session);
    expect(shownText()).not.toContain(REFUSED_TASK_TEXT);
    await act(async () => root!.unmount()); root = undefined; played.length = 0;
    swap.word = ladder.words[1];
    await open("sound-boat", session);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(root!.root.findAll((n) => n.props.testID === "reading-task-refused").length).toBe(1);
    expect(played, played.join()).toEqual([]);
  });
  it("the same Which One round without the swap shows its sentence (the control)", async () => {
    const session = savedRound("which-one", 1);
    await open("which-one", session);
    expect(shownText()).toContain(readingSentence((session.state as WhichState).ids[0])!.text);
    expect(shownText()).not.toMatch(/sunset/i);
  });
  it("in development the swapped producer throws instead of drawing", () => {
    swap.on = true;
    dev.__DEV__ = true;
    const state = savedRound("which-one", 1).state as WhichState;
    expect(() => admittedReading(whichItem(state), "Which One")).toThrow(/Which One was given reading content that did not come from an admitted or pinned inherited record/);
  });
});

describe("live inherited data changed after the check", () => {
  it("the real Which One and Turtle Tales boards still print the snapshot", async () => {
    const which = savedRound("which-one", 1), tale = savedRound("turtle-tales", 1);
    const sid = (which.state as WhichState).ids[0], tid = (tale.state as TaleState).id;
    const liveSentence = SENTENCES.find((s) => s.id === sid)!, livePage = STORIES.find((t) => t.id === tid)!.pages[0];
    const old = [liveSentence.text, livePage.text];
    try {
      liveSentence.text = SUNSET; livePage.text = SUNSET;
      await open("which-one", which);
      expect(shownText()).toContain(readingSentence(sid)!.text);
      expect(shownText()).not.toMatch(/sunset/i);
      await act(async () => root!.unmount()); root = undefined;
      await open("turtle-tales", tale);
      expect(shownText()).toContain(readingPassage(tid)!.pages[0].text);
      expect(shownText()).not.toMatch(/sunset/i);
    } finally {
      [liveSentence.text, livePage.text] = old;
    }
  });
});
