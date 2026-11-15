import React, { createContext } from "react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";
import { random } from "../src/games/types";
import { challengeFor } from "../src/challenge/catalog";
import { engines } from "../src/learn/engines";
import { isGrowth } from "../src/learn/growth/engine";
import { optionsAtLevel, type LearningLevel } from "../src/learn/levels";
import { BuildBoat } from "../src/learn/games/sound-boat/BuildBoat";
import { ChallengeBoard } from "../src/learn/games/sound-boat/challenge-view";
import { challengeEngine, type Action } from "../src/learn/games/sound-boat/challenge-engine";
import { soundBoatProduction, soundBoatPuzzles } from "../src/learn/games/sound-boat/challenge-content";
import { registration as production } from "../src/learn/games/sound-boat/challenge";
import { PartsBoard } from "../src/learn/games/sound-boat/parts-view";
import { partsMove, partsTask, validParts, type PartsAction, type PartsState } from "../src/learn/games/sound-boat/parts";
import { INHERITED_SOURCE_DIGESTS, inheritedWords } from "../src/learn/reading/inherited";
import { INHERITED_SOURCE_DIR, inheritedSourceDigests, inheritedSourceFiles, inheritedSourceModules, sourceDigest } from "./helpers/inherited-sources";
import * as factory from "../src/learn/reading/tasks";
import { REFUSED_TASK_TEXT, admittedPartsTasks, admittedTask, isMinted, letterTaskById, partsTaskById, type MintedTask } from "../src/learn/reading/tasks";
import { fixtureRecords } from "./helpers/fixture-door";

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

/**
 * R3-1: the reading boundary is provenance. A task exists only when `src/learn/reading/tasks.ts` minted it, by id, from
 * the admitted registry or the pinned inherited words. This file runs against the real, shipped registry (no admitted
 * bank), so every task below that is not an inherited letters word is unadmitted, whatever shape it takes.
 */
let root: ReactTestRenderer | undefined;
const dev = globalThis as { __DEV__?: unknown };
const releaseMode = dev.__DEV__;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; dev.__DEV__ = releaseMode; sound.play.mockClear(); });
const mount = async (el: React.ReactElement) => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); await act(async () => { root = create(el); }); };
const texts = () => root!.root.findAllByType("p").map((p) => p.children.join(""));
const buttons = () => root!.root.findAllByType("button");
const at = (level: 4 | 5) => optionsAtLevel({ mode: "solo", pace: "easy" }, level as LearningLevel);

// Every representation from REVIEW-3 (r3-evidence/probes.append.mjs), evaluated as the reviewer wrote it. Each yields a
// word and its pieces that a hand-written consumer would turn into a task, which is what the boards below are given.
const reviewer: [string, string, (r: any) => { word: string; tiles: string[]; tray: string[] }][] = [
  ["one-field-task", `r={word:'sunset',tiles:['sun','set'],tray:['sun','set','sin','sit']}`, (r) => r],
  ["all-aliases", `r={term:'sunset',pieces:['sun','set'],decoys:['sin','sit']}`, (r) => ({ word: r.term, tiles: r.pieces, tray: [...r.pieces, ...r.decoys] })],
  ["nested-single-fields", `r={word:'sunset',bits:{chunks:['sun','set']},choices:{distractors:['sin','sit']}}`, (r) => ({ word: r.word, tiles: r.bits.chunks, tray: [...r.bits.chunks, ...r.choices.distractors] })],
  ["tuple-record", `r=['sunset',['sun','set'],['sin','sit']]`, (r) => ({ word: r[0], tiles: r[1], tray: [...r[1], ...r[2]] })],
  ["key-value-tuples", `r=Object.fromEntries([['word','sunset'],['chunks',['sun','set']],['distractors',['sin','sit']]])`, (r) => ({ word: r.word, tiles: r.chunks, tray: [...r.chunks, ...r.distractors] })],
  ["computed-concat", `r={['wo'+'rd']:'sunset',['chu'+'nks']:['sun','set'],['distr'+'actors']:['sin','sit']}`, (r) => ({ word: r.word, tiles: r.chunks, tray: [...r.chunks, ...r.distractors] })],
  ["escaped-json", `r=JSON.parse('{"word":"sunset","chunks":["sun","set"],"distractors":["sin","sit"]}')`, (r) => ({ word: r.word, tiles: r.chunks, tray: [...r.chunks, ...r.distractors] })],
  ["base64-json", `r=JSON.parse(atob('eyJ3b3JkIjoic3Vuc2V0IiwiY2h1bmtzIjpbInN1biIsInNldCJdLCJkaXN0cmFjdG9ycyI6WyJzaW4iLCJzaXQiXX0='))`, (r) => ({ word: r.word, tiles: r.chunks, tray: [...r.chunks, ...r.distractors] })],
  ["spread-record", `a={word:'sunset'};b={chunks:['sun','set']};c={distractors:['sin','sit']};r={...a,...b,...c}`, (r) => ({ word: r.word, tiles: r.chunks, tray: [...r.chunks, ...r.distractors] })],
  ["split-modules", `a={word:"sunset"};b={chunks:["sun","set"]};c={distractors:["sin","sit"]};r=Object.assign({},a,b,c)`, (r) => ({ word: r.word, tiles: r.chunks, tray: [...r.chunks, ...r.distractors] })],
  ["binaryish-asset", `r=JSON.parse(${JSON.stringify(JSON.stringify({ word: "sunset", chunks: ["sun", "set"], distractors: ["sin", "sit"] }))})`, (r) => ({ word: r.word, tiles: r.chunks, tray: [...r.chunks, ...r.distractors] })],
];
const forged = reviewer.map(([label, code, toTask]) => {
  const context: { r?: unknown; atob: (s: string) => string } = { atob: (s) => Buffer.from(s, "base64").toString("utf8") };
  runInNewContext(code, context);
  const { word, tiles, tray } = toTask(context.r);
  // Copied into this realm, exactly the fields the real task type has.
  return [label, { id: `r3-${label}`, word, level: 4, skill: "read.compound", tiles: [...tiles], tray: [...tray], alternates: [], cue: null } as unknown as MintedTask] as const;
});
const inherited = () => letterTaskById("w-cat")!;

describe("the shipped registry has no admitted reading bank", () => {
  it("keeps Levels 4 and 5 on the older growth quiz and refuses any parts round", () => {
    const shipped = engines["sound-boat"];
    expect(shipped.nativeStages).toBe(false);
    for (const level of [4, 5] as const) expect(isGrowth(shipped.create(at(level), { skills: {}, rng: random(3), starter: 0, today: 1 }))).toBe(true);
    expect(shipped.validate({ kind: "parts" }, at(4))).toBe(false);
    expect(admittedPartsTasks()).toEqual([]);
  });
  it("a saved round naming fixture words is not a valid save, and moves on it change nothing", () => {
    const s = { kind: "parts", level: 4, ids: fixtureRecords.filter((r) => r.level === 4).slice(0, 6).map((r) => r.id), starter: 0, index: 0, answer: { draft: [], revision: 0, checkedRevision: null, checks: 0, misses: 0, solved: false, helped: false, needsVariant: false, last: null }, clean: [], heard: false } as PartsState;
    expect(validParts(s, 4)).toBe(false);
    expect(partsTask(s)).toBeNull();
    for (const a of [{ type: "edit", edit: ["a", 0] }, { type: "check" }, { type: "help" }, { type: "next" }] as PartsAction[]) expect(partsMove(s, a)).toBe(s);
  });
  it("has no Challenge", () => {
    expect(soundBoatProduction()).toEqual([]);
    expect(production.puzzles).toEqual([]);
    expect(production.catalog.banks.size).toBe(0);
    expect(production.catalog.dares.size).toBe(0);
    expect(challengeFor("sound-boat")).toBeUndefined();
  });
});

describe("the factory", () => {
  it("takes ids and levels, never record data", () => {
    expect(Object.keys(factory).sort()).toEqual(["REFUSED_TASK_TEXT", "admittedPartsTasks", "admittedTask", "isMinted", "letterTaskById", "partsTaskById", "partsTasksAt"]);
    for (const r of fixtureRecords.slice(0, 3)) {
      expect(partsTaskById(r)).toBeNull();
      expect(partsTaskById(r.id)).toBeNull();
      expect(letterTaskById(r)).toBeNull();
    }
    expect(letterTaskById(inheritedWords.records[0])).toBeNull();
  });
  it("mints each inherited word once, frozen, and nothing copied from a minted task is minted", () => {
    const t = inherited();
    expect(t.word).toBe("cat");
    expect(letterTaskById("w-cat")).toBe(t);
    expect(isMinted(t)).toBe(true);
    for (const copy of [{ ...t }, structuredClone(t), JSON.parse(JSON.stringify(t)), Object.assign({}, t), Object.create(t)]) expect(isMinted(copy)).toBe(false);
    expect(Object.isFrozen(t) && Object.isFrozen(t.tiles) && Object.isFrozen(t.tray) && Object.isFrozen(t.alternates)).toBe(true);
    expect(() => { (t as { word: string }).word = "sunset"; }).toThrow(TypeError);
    expect(() => { (t.tray as string[]).push("sin"); }).toThrow(TypeError);
    expect(t.word).toBe("cat");
  });
  it("in development a refused task throws a clear error; in a release it is refused quietly", () => {
    const [, t] = forged[0];
    expect(admittedTask(t, "probe")).toBe(false);
    dev.__DEV__ = true;
    expect(() => admittedTask(t, "probe")).toThrow(/probe was given a reading task that was not minted from an admitted record/);
    expect(admittedTask(inherited(), "probe")).toBe(true);
  });
});

describe("every REVIEW-3 representation is refused by the real boards", () => {
  it("covers every representation the reviewer probed", () => {
    expect(forged.map(([label]) => label)).toEqual(["one-field-task", "all-aliases", "nested-single-fields", "tuple-record", "key-value-tuples", "computed-concat", "escaped-json", "base64-json", "spread-record", "split-modules", "binaryish-asset"]);
    for (const [label, t] of forged) expect([label, t.word, t.tiles]).toEqual([label, "sunset", ["sun", "set"]]);
  });
  for (const [label, t] of forged) {
    it(`${label}: the Challenge board shows no word and no piece, and nothing is sent, replayed or solved`, async () => {
      const dispatch = vi.fn(), s = challengeEngine.create(t, { version: 1 }, { supportOff: false, ownRead: true });
      await mount(<ChallengeBoard state={s} dispatch={dispatch} active width={335} />);
      expect(texts()).toEqual([REFUSED_TASK_TEXT]);
      expect(JSON.stringify(root!.toJSON())).not.toMatch(/sunset|"sun"|"set"|"sin"|"sit"|Piece|Box/);
      expect(buttons()).toEqual([]);
      for (const a of [["a", 0], ["a", 1], ["k"], ["h"], ["r"], ["z"]] as Action[]) expect(challengeEngine.step(s, a, t)).toBeNull();
      expect(challengeEngine.inspect({ ...s, answer: { ...s.answer, solved: true } }, t).solved).toBe(false);
      expect(challengeEngine.validInitial({ version: 1 }, t)).toBe(false);
      expect(dispatch).not.toHaveBeenCalled();
      expect(sound.play).not.toHaveBeenCalled();
    });
    it(`${label}: the word board refuses it before drawing anything, and its handlers never run`, async () => {
      const on = vi.fn();
      await mount(<BuildBoat task={t} draft={[0, 1]} helped={false} solved={true} missed={false} canCheck onAdd={on} onRemove={on} onCheck={on} onHelp={on} onReset={on} onHear={on} sound={on} soundOn={false} width={335} prompt="Build it" done={<p>Sail on</p>} />);
      expect(texts()).toEqual([REFUSED_TASK_TEXT]);
      expect(JSON.stringify(root!.toJSON())).not.toMatch(/sunset|Sail on|Build it/);
      expect(on).not.toHaveBeenCalled();
    });
    it(`${label}: it never becomes a Challenge puzzle, and in development it throws`, () => {
      expect(soundBoatPuzzles([t])).toEqual([]);
      expect(soundBoatPuzzles([inherited(), t]).map((p) => p.descriptor)).toEqual([inherited()]);
      dev.__DEV__ = true;
      expect(() => soundBoatPuzzles([t])).toThrow(/not minted from an admitted record/);
      expect(() => challengeEngine.create(t, { version: 1 }, { supportOff: false, ownRead: false })).toThrow(/not minted/);
      expect(() => BuildBoat({ task: t, draft: [], helped: false, solved: false, missed: false, canCheck: false, onAdd: vi.fn(), onRemove: vi.fn(), onCheck: vi.fn(), onHelp: vi.fn(), onReset: vi.fn(), onHear: vi.fn(), sound: vi.fn(), soundOn: false, width: 335, prompt: "" })).toThrow(/not minted/);
    });
  }
  it("the School board for a round whose words are not admitted shows the fallback, says nothing and credits nothing", async () => {
    vi.useFakeTimers();
    const update = vi.fn(), practice = vi.fn(), cheer = vi.fn(), say = vi.fn();
    const state = { kind: "parts", level: 4, ids: forged.slice(0, 6).map(([, t]) => t.id), starter: 0, index: 0, answer: { draft: [0, 1], revision: 2, checkedRevision: null, checks: 0, misses: 0, solved: false, helped: false, needsVariant: false, last: null }, clean: [], heard: false } as PartsState;
    const session = { game: "sound-boat" as const, version: 1 as const, id: "forged", revision: 0, options: { mode: "solo" as const, pace: "easy" as const, stage: "stretch" as const }, state };
    await mount(<PartsBoard session={session} skills={{}} update={update} practice={practice} assistance={vi.fn()} sound={say} stopSound={vi.fn()} soundOn width={335} height={800} active coach={{ active: false, done: vi.fn() }} cheer={cheer} />);
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(texts()).toEqual([REFUSED_TASK_TEXT]);
    expect(buttons()).toEqual([]);
    expect([update, practice, cheer, say].every((f) => f.mock.calls.length === 0)).toBe(true);
    vi.useRealTimers();
  });
  it("a minted inherited word still draws (the control)", async () => {
    const t = inherited();
    await mount(<BuildBoat task={t} draft={[]} helped={false} solved={false} missed={false} canCheck={false} onAdd={vi.fn()} onRemove={vi.fn()} onCheck={vi.fn()} onHelp={vi.fn()} onReset={vi.fn()} onHear={vi.fn()} sound={vi.fn()} soundOn={false} width={335} prompt="Build it" />);
    expect(texts()).toContain("cat");
    expect(buttons().length).toBeGreaterThanOrEqual(t.tray.length);
  });
});

describe("the playable floor and slot arithmetic, through the real factory", () => {
  const withDoor = async (records: readonly unknown[]) => {
    vi.resetModules();
    vi.doMock("../src/learn/reading/admitted", async (real) => (await import("./helpers/fixture-door")).fixtureDoor(real, records));
    const out = { engine: await import("../src/learn/games/sound-boat/engine"), content: await import("../src/learn/games/sound-boat/challenge-content"), tasks: await import("../src/learn/reading/tasks") };
    vi.doUnmock("../src/learn/reading/admitted");
    return out;
  };
  it("a bank below the floor does not switch the new board on; the full fixture does", async () => {
    expect((await withDoor([])).engine.engine.nativeStages).toBe(false);
    const short = [...fixtureRecords.filter((r) => r.level === 4).slice(0, 11), ...fixtureRecords.filter((r) => r.level === 5)];
    expect((await withDoor(short)).engine.engine.nativeStages).toBe(false);
    expect((await withDoor(fixtureRecords)).engine.engine.nativeStages).toBe(true);
  });
  it("inherited words mint only while they match their pinned digest", async () => {
    vi.resetModules();
    vi.doMock("../src/learn/reading/inherited", async (real) => ({ ...((await real()) as object), INHERITED_DIGEST: "0".repeat(64) }));
    const tampered = await import("../src/learn/reading/tasks");
    vi.doUnmock("../src/learn/reading/inherited");
    expect(tampered.letterTaskById("w-cat")).toBeNull();
    dev.__DEV__ = true;
    vi.resetModules();
    vi.doMock("../src/learn/reading/inherited", async (real) => ({ ...((await real()) as object), INHERITED_DIGEST: "0".repeat(64) }));
    const loud = await import("../src/learn/reading/tasks");
    vi.doUnmock("../src/learn/reading/inherited");
    expect(() => loud.letterTaskById("w-cat")).toThrow(/no longer match their pinned digest/);
  });
  it("only the first 25 words of a level get a dare, and every word is its own puzzle", async () => {
    const base = fixtureRecords[0];
    const { content, tasks } = await withDoor(Array.from({ length: 60 }, (_, i) => ({ ...base, id: `x${i}`, word: `sunset${i}` })));
    const many = content.soundBoatPuzzles(tasks.admittedPartsTasks());
    expect(many.length).toBe(60);
    expect(many.filter((p) => p.dares.length).length).toBe(25);
    expect(new Set(many.map((p) => p.ref.hash)).size).toBe(60);
  });
});

describe("every other inherited reading source is pinned to its shipped data", () => {
  it("each module under src/learn/content/reading matches its pinned digest, and there are no others", () => {
    expect(inheritedSourceFiles()).toEqual(Object.keys(INHERITED_SOURCE_DIGESTS).map((n) => `${n}.ts`).sort());
    expect(inheritedSourceDigests()).toEqual(INHERITED_SOURCE_DIGESTS);
  });
  it("adding, dropping or changing one word changes the digest, so the pin fails", () => {
    const { sentences, stories, words, clues, ladders } = inheritedSourceModules as Record<string, any>;
    const changed = [
      ["words", { ...words, WORDS: [...words.WORDS, { ...words.WORDS[0], word: "sunset" }] }],
      ["words", { ...words, WORDS: words.WORDS.slice(1) }],
      ["sentences", { ...sentences, SENTENCES: [...sentences.SENTENCES, { ...sentences.SENTENCES[0], id: "extra" }] }],
      ["stories", { ...stories, STORIES: stories.STORIES.map((t: any, i: number) => (i ? t : { ...t, title: `${t.title}!` })) }],
      ["clues", { ...clues, PICTURE_WORDS: { ...clues.PICTURE_WORDS, easy: [...clues.PICTURE_WORDS.easy, "sunset"] } }],
      ["clues", { ...clues, LEGACY_WARMUP_WORDS: new Set([...clues.LEGACY_WARMUP_WORDS, "sunset"]) }],
      ["ladders", { ...ladders, LADDERS: [...ladders.LADDERS, ladders.LADDERS[0]] }],
    ] as const;
    for (const [name, mod] of changed) expect(sourceDigest(mod), name).not.toBe(INHERITED_SOURCE_DIGESTS[name]);
  });
  it("the modules that read inherited reading data are the ones that always have", () => {
    const readers = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? readers(p) : /\.[jt]sx?$/.test(n) && readFileSync(p, "utf8").includes("content/reading/") ? [p] : []; });
    expect(readers("src").sort()).toEqual(["src/arcade/games/shell-song/engine.ts", "src/learn/games/sound-boat/engine.ts", "src/learn/games/sound-boat/view.tsx", "src/learn/games/turtle-tales/engine.ts", "src/learn/games/which-one/engine.ts", "src/learn/kit/reading.ts", "src/learn/reading/inherited.ts", "src/practice/engine.ts"]);
    expect(INHERITED_SOURCE_DIR).toBe("src/learn/content/reading");
  });
});

// A static supplement to the runtime checks above. TypeScript's MintedTask type is a reminder; these are the guards.
describe("the import graph", () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : /\.[cm]?[jt]sx?$/.test(n) ? [p] : []; });
  const app = [...walk("src"), ...walk("content"), ...walk("modules").filter((f) => !f.includes("/node_modules/"))];
  const specifiers = (file: string): string[] => {
    const tree = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true), out: string[] = [];
    const visit = (n: ts.Node) => {
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteralLike(n.moduleSpecifier)) out.push(n.moduleSpecifier.text);
      if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === "require")) && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0])) out.push(n.arguments[0].text);
      ts.forEachChild(n, visit);
    };
    visit(tree);
    return out;
  };
  const importers = (pattern: RegExp) => app.filter((f) => specifiers(f).some((s) => pattern.test(s))).sort();
  it("only the factory imports the admitted door or the inherited words", () => {
    expect(importers(/(?:^|\/)admitted(?:\/index)?$/)).toEqual(["src/learn/reading/tasks.ts"]);
    expect(importers(/(?:^|\/)inherited(?:\.ts)?$/)).toEqual(["src/learn/reading/tasks.ts"]);
    expect(importers(/(?:^|\/)tests\/fixtures\//)).toEqual([]);
  });
  it("only the factory adds to the minted set", () => {
    const source = readFileSync("src/learn/reading/tasks.ts", "utf8");
    expect(source.split("made.add(").length).toBe(2);
    expect(source).toMatch(/^const made = new WeakSet<object>\(\);$/m);
    expect(source).not.toMatch(/export (?:const|let|function) (?:made|seal|partsTaskOf|letterTaskOf)\b/);
  });
  it("every module that takes a reading task from outside checks it was minted", () => {
    // Modules that name the task type, and modules that draw a task they were handed (a prop or a saved id).
    const users = app.filter((f) => f !== "src/learn/reading/tasks.ts" && /\b(?:MintedTask|BuildTask)\b/.test(readFileSync(f, "utf8"))).sort();
    const drawers = app.filter((f) => /\bpartsTask\(|\bs\.task\b|<BuildBoat\b/.test(readFileSync(f, "utf8"))).sort();
    const checked = ["src/learn/games/sound-boat/BuildBoat.tsx", "src/learn/games/sound-boat/challenge-content.ts", "src/learn/games/sound-boat/challenge-engine.ts", "src/learn/games/sound-boat/challenge-view.tsx", "src/learn/games/sound-boat/parts-view.tsx", "src/learn/games/sound-boat/parts.ts"];
    // build.ts defines the type and its pure rules; it holds no task of its own.
    expect([...new Set([...users, ...drawers])].sort()).toEqual(["src/learn/reading/build.ts", ...checked].sort());
    for (const f of checked) expect(readFileSync(f, "utf8"), f).toMatch(/\b(?:admittedTask|isMinted)\(/);
  });
});
