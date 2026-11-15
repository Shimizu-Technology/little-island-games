/**
 * R1a fix 4 (R4-1), the static backstop. The runtime brand (`tests/reading-provenance.test.tsx`) is the guard; this
 * checks the import graph around it, with every import path resolved and normalised the way Metro resolves it (never
 * by its spelling): who may load the inherited sources, who renders reading text, and that each renderer gets its
 * content from the provenance module. W1's shape and string checks (`scripts/words/shipping.mjs`) stay as further,
 * supplementary layers.
 *
 * R1a fix 5 (lead boundary decision): reading content as data must flow through `provenance.ts`. A new reading game
 * or board must use it, and this file enforces that for registered reading routes and every board LearnFrame can
 * select for them (including GrowthBoard). Hand-authored UI strings are covered by code review and W1's export string
 * scan, not by this file.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import ts from "typescript";
import { afterAll, describe, expect, it } from "vitest";
import { engines } from "../src/learn/engines";
import { growthTracks, readingGrowth } from "../src/learn/growth/content";
import { INHERITED_SOURCE_DIGESTS } from "../src/learn/reading/provenance";
import { appFiles, closure, edgesOf, renderers } from "./helpers/import-graph";
import { inheritedSourceFile } from "./helpers/inherited-sources";
import { files, reachable, resolveAll } from "./helpers/reading-clock";

const PROVENANCE = "src/learn/reading/provenance.ts", TASKS = "src/learn/reading/tasks.ts";
const SOURCES = Object.keys(INHERITED_SOURCE_DIGESTS).map(inheritedSourceFile).sort();
/**
 * Every module that loads `provenance.ts` at run time, reviewed. Reading content as data (lead, FIX-BRIEF-5) flows
 * through it: the reading games' producers and boards, the kit, and the growth tracks; and, outside the reading routes,
 * Memory's CHamoru pack, whose cards check the brand before drawing (lead addition to fix 5); and the Practice engine,
 * whose reading questions keep their branded record for the panel and the treasure chest to check (lead decision,
 * Option A). The named non-reading users are the lead's decision.
 */
const PROVENANCE_USERS: Record<string, string> = {
  "src/learn/games/hafa-adai/engine.ts": "Håfa Adai's CHamoru words, by id",
  "src/learn/games/hafa-adai/view.tsx": "Håfa Adai's board and last word, by id",
  "src/learn/games/letter-lagoon/engine.ts": "Letter Lagoon's bank",
  "src/learn/games/sound-boat/engine.ts": "Sound Boat's picture words and ladders, by id",
  "src/learn/games/sound-boat/view.tsx": "Sound Boat's ladders, by id",
  "src/learn/games/story-studio/engine.ts": "Story Studio's bank",
  "src/learn/games/turtle-tales/engine.ts": "Turtle Tales' passages, by id",
  "src/learn/games/which-one/engine.ts": "Which One's sentences, by id",
  "src/learn/games/word-workshop/engine.ts": "Word Workshop's bank",
  "src/learn/growth/content.ts": "the growth quiz's reading tracks",
  "src/learn/kit/reading.ts": "the kit's word bank",
  "src/learn/reading/admit.ts": "the brand check",
  "src/games/memory.ts": "Memory's CHamoru pack: cards name CHamoru ids and resolve them to branded records; MemoryCards checks them",
  "src/practice/engine.ts": "Practice's reading questions: each keeps its branded record (word, sentence or reading growth task); every Practice surface runs practiceAdmitted",
};
/** Named non-reading (lead decision, fix 5): maths facts and music, not reading content. */
const NON_READING: Record<string, string> = {
  "src/arcade/games/shell-song/engine.ts": "Shell Song: a music game; its picture prompts come from the pinned snapshot, but it draws pictures and plays notes, not reading text",
  "src/learn/games/quick-practice/engine.ts": "Quick Practice (School): maths facts; its growth stages are maths tracks",
};
/** The surfaces that draw Practice questions. Each runs `practiceAdmitted` before it shows, speaks or credits one. */
const PRACTICE_SURFACES: Record<string, string> = {
  "src/practice/PracticePanel.tsx": "the grown-up Practice panel (three questions before a game)",
  "src/arcade/Chest.tsx": "the Arcade treasure chest (one Practice question)",
};
/**
 * A source built from another source. The growth quiz's reading tracks take their CHamoru answer choices from the
 * source-backed list when the module loads; what it builds is pinned and baselined as a whole, CHamoru labels included.
 */
const BUILT_FROM: Record<string, string> = { "src/learn/growth/literacy.ts": "src/learn/content/chamoru.ts" };
/** The components that print reading content, and the modules that define them. */
const READERS = {
  "src/learn/kit/ReadingText.tsx": ["ReadingText"],
  "src/learn/reading/TapWords.tsx": ["TapWords"],
  "src/learn/games/letter-lagoon/ReadingBoard.tsx": ["ReadingBoard"],
  "src/learn/games/sound-boat/BuildBoat.tsx": ["BuildBoat"],
};
/**
 * Every module that renders one of them, reviewed. Each gets its content from the provenance module (or, for the
 * word-parts boards, from the task factory), and the component it renders checks the brand before drawing.
 */
const RENDERERS: Record<string, string> = {
  "src/learn/reading/TapWords.tsx": "prints its record through ReadingText",
  "src/learn/games/which-one/view.tsx": "Which One's sentence, by saved id; the board checks it before drawing",
  "src/learn/games/turtle-tales/view.tsx": "Turtle Tales' page, by saved id; the board checks the tale and page before drawing",
  "src/learn/games/sound-boat/view.tsx": "Sound Boat Levels 1-3's word, by saved id; the board checks it (and the ladder's previous word)",
  "src/learn/games/sound-boat/BuildBoat.tsx": "a minted task's finished word, after BuildBoat's own check",
  "src/learn/games/sound-boat/parts-view.tsx": "Levels 4-5 draw a minted task through BuildBoat",
  "src/learn/games/sound-boat/challenge-view.tsx": "the Challenge draws a minted task through BuildBoat",
  "src/learn/games/letter-lagoon/view.tsx": "Letter Lagoon's pinned bank through ReadingBoard",
  "src/learn/games/story-studio/view.tsx": "Story Studio's pinned bank through ReadingBoard",
  "src/learn/games/word-workshop/view.tsx": "Word Workshop's pinned bank through ReadingBoard",
};
/** The reading boards: each Reading island game's view, and where its brand check sits. */
const BOARDS: Record<string, string> = {
  "hafa-adai": "src/learn/games/hafa-adai/view.tsx",
  "letter-lagoon": "src/learn/games/letter-lagoon/ReadingBoard.tsx",
  "sound-boat": "src/learn/games/sound-boat/view.tsx",
  "story-studio": "src/learn/games/letter-lagoon/ReadingBoard.tsx",
  "turtle-tales": "src/learn/games/turtle-tales/view.tsx",
  "which-one": "src/learn/games/which-one/view.tsx",
  "word-workshop": "src/learn/games/letter-lagoon/ReadingBoard.tsx",
};
/**
 * Free creative text a child writes is not instructional content and needs no record. No reading game has any today:
 * Story Studio builds sentences from cards, it has no typing. A future one is named here, with a test, before it ships.
 */
const FREE_TEXT_EXEMPT: Record<string, string> = {};
const CHECK = /\b(?:admittedReading|admittedTask)\(/;

const app = appFiles(".");
const importersOf = (root: string, all: readonly string[], targets: readonly string[]) =>
  all.filter((f) => edgesOf(root, f).some((e) => e.to && !e.typeOnly && targets.includes(e.to))).sort();

/** The School host. Every board it can select for a reading route is inventoried from here, not from a list of views. */
const HOST = "src/learn/LearnFrame.tsx";
const GROWTH_BOARD = "src/learn/growth/Board.tsx";
/**
 * What LearnFrame draws from a game, growth, reading or kit module, reviewed: `view.Board` is each game's own board
 * (BOARDS above); the rest are named by the module and component they resolve to.
 */
const HOST_BOARDS: Record<string, string> = {
  "view.Board": "each game's own board (BOARDS)",
  [`${GROWTH_BOARD}#GrowthBoard`]: "Levels 4-5 growth sessions; a reading track's questions are checked before anything is drawn",
  "src/learn/games/hafa-adai/view.tsx#LastPicnicWord": "Håfa Adai's last tapped word; checks the CHamoru record before drawing",
};
const hostTree = () => ts.createSourceFile(HOST, readFileSync(HOST, "utf8"), ts.ScriptTarget.Latest, true);
/** A name LearnFrame uses, resolved through its imports to `file#export`, or its own text when it is not imported. */
const hostName = (text: string) => {
  const [head, ...rest] = text.split(".");
  for (const e of edgesOf(".", HOST)) for (const b of e.bindings) if (e.to && b.local === head) return rest.length ? `${e.to}#${b.imported}.${rest.join(".")}` : `${e.to}#${b.imported}`;
  return text;
};
/** The components the host's `Board` can be: every leaf of the expression it is declared as. */
function hostBoardChoices(): string[] {
  const tree = hostTree(), out: string[] = [];
  const leaves = (e: ts.Expression): void => {
    if (ts.isParenthesizedExpression(e)) return leaves(e.expression);
    if (ts.isConditionalExpression(e)) { leaves(e.whenTrue); leaves(e.whenFalse); return; }
    if (ts.isBinaryExpression(e) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(e.operatorToken.kind)) { leaves(e.left); leaves(e.right); return; }
    out.push(hostName(e.getText(tree)));
  };
  const visit = (n: ts.Node) => { if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === "Board" && n.initializer) leaves(n.initializer); ts.forEachChild(n, visit); };
  visit(tree);
  return [...new Set(out)].sort();
}
/** Every JSX element the host draws, resolved through its imports. */
function hostElements(): string[] {
  const tree = hostTree(), out = new Set<string>();
  const visit = (n: ts.Node) => { if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) out.add(hostName(n.tagName.getText(tree))); ts.forEachChild(n, visit); };
  visit(tree);
  return [...out].sort();
}
/** Each registered reading route and every board the host can select for it. */
function readingRoutes(): { id: string; boards: string[] }[] {
  return Object.keys(engines).filter((id) => engines[id as keyof typeof engines].island === "reading").sort().map((id) => ({
    id,
    // The game's own board (where its view's brand check sits), GrowthBoard when the game has a growth track, and
    // Håfa Adai's last word (in its view, which is its board).
    boards: [BOARDS[id] ?? `src/learn/games/${id}/view.tsx`, ...(growthTracks[id as keyof typeof growthTracks] ? [GROWTH_BOARD] : [])],
  }));
}

describe("only the provenance module loads an inherited reading source", () => {
  it("the sources are the pinned ones", () => {
    expect(SOURCES).toEqual(["src/learn/content/chamoru.ts", "src/learn/growth/literacy.ts", ...["clues", "ladders", "lagoon", "sentences", "stories", "studio", "words", "workshop"].map((n) => `src/learn/content/reading/${n}.ts`)].sort());
  });
  it("no other module loads one at run time, by any resolved path", () => {
    expect(importersOf(".", app, SOURCES)).toEqual([PROVENANCE, ...Object.keys(BUILT_FROM)].sort());
    // The growth reading source loads only the CHamoru list, and only the provenance module loads it.
    for (const [f, from] of Object.entries(BUILT_FROM)) {
      expect(edgesOf(".", f).filter((e) => e.to && !e.typeOnly && SOURCES.includes(e.to)).map((e) => e.to), f).toEqual([from]);
      expect(importersOf(".", app, [f]), f).toEqual([PROVENANCE]);
    }
  });
  it("every module that loads the provenance module is reviewed: reading, Memory's CHamoru pack, Practice, or named non-reading", () => {
    const users = importersOf(".", app, [PROVENANCE]), reviewed = { ...PROVENANCE_USERS, ...NON_READING };
    expect(users.filter((f) => !Object.hasOwn(reviewed, f))).toEqual([]);
    for (const f of Object.keys(PROVENANCE_USERS)) expect(users, f).toContain(f);
    for (const f of [...Object.keys(PROVENANCE_USERS), ...Object.keys(NON_READING)]) expect(existsSync(f), f).toBe(true);
    // Every module that makes Practice questions draws them, and each checks every question it draws.
    const practice = app.filter((f) => edgesOf(".", f).some((e) => e.to === "src/practice/engine.ts" && e.bindings.some((b) => ["createPracticeRound", "createPracticeSession", "*"].includes(b.imported))));
    expect(practice).toEqual(Object.keys(PRACTICE_SURFACES).sort());
    for (const f of practice) expect(readFileSync(f, "utf8"), f).toMatch(/practiceAdmitted\(/);
    // Practice questions carry records, not text: no question type has a `text` field.
    expect(readFileSync("src/practice/engine.ts", "utf8")).not.toMatch(/kind: "(?:growth|word|sentence)"; [^}]*\btext: string/);
    // Memory loads the CHamoru list only through provenance, and its cards check the brand before drawing.
    expect(edgesOf(".", "src/games/memory.ts").filter((e) => e.to && SOURCES.includes(e.to))).toEqual([]);
    expect(readFileSync("src/screens/classics/MemoryCards.tsx", "utf8")).toMatch(/admittedReading\(ch\.word, "Memory's CHamoru cards"\)/);
    // MemoryCards is the only module that turns a card into its CHamoru word.
    expect(app.filter((f) => edgesOf(".", f).some((e) => e.to === "src/games/memory.ts" && e.bindings.some((b) => b.imported === "chamoruCard" || b.imported === "*")))).toEqual(["src/screens/classics/MemoryCards.tsx"]);
    // Quick Practice's growth tracks are maths, not reading.
    expect(Object.keys(growthTracks)).toContain("quick-practice");
    expect(readingGrowth("quick-practice")).toBe(false);
  });
  it("no import that names an inherited source fails to resolve", () => {
    const unresolved = app.flatMap((f) => edgesOf(".", f).filter((e) => !e.to && /content\/+(?:\.\/)*(?:reading|chamoru)/.test(e.spec) && (e.spec.startsWith(".") || e.spec.startsWith("@/"))).map((e) => `${f} -> ${e.spec}`));
    expect(unresolved).toEqual([]);
  });
  it("only the provenance module brands inherited records, and only the factory mints tasks", () => {
    const sets = app.filter((f) => /\b(?:known|made)\.add\(|new WeakSet/.test(readFileSync(f, "utf8")) && /reading/.test(f));
    expect(sets).toEqual([PROVENANCE, TASKS]);
    const p = readFileSync(PROVENANCE, "utf8"), t = readFileSync(TASKS, "utf8");
    expect(p.split("known.add(").length).toBe(2);
    expect(p).toMatch(/^const known = new WeakSet<object>\(\);$/m);
    expect(p).not.toMatch(/export (?:const|let|function) (?:known|brand|pinned|snapshot|SOURCES)\b/);
    expect(t.split("made.add(").length).toBe(2);
  });
});

describe("every reading renderer gets its content from the provenance module", () => {
  const found = renderers(".", app, READERS);
  /** A reader checks the brand itself, or prints only through a reader that does (TapWords through ReadingText). */
  const checked = (file: string): boolean => CHECK.test(readFileSync(file, "utf8")) || (!!found[file] && found[file].every((u) => u.component.split("#")[0] !== file && checked(u.component.split("#")[0])));
  it("the modules that render reading text are the reviewed ones", () => {
    expect(Object.keys(found).sort()).toEqual(Object.keys(RENDERERS).sort());
  });
  it("each passes a record, never text, and never passes a reader around as a value", () => {
    for (const [file, uses] of Object.entries(found)) for (const u of uses) {
      expect(u.props, `${file} ${u.component}`).not.toContain("text");
      expect(u.props, `${file} ${u.component}`).not.toContain("value");
      // A board spreads its board props into ReadingBoard; a reader's record is always named.
      if (/ReadingText|TapWords/.test(u.component)) {
        expect(u.props, `${file} ${u.component}`).not.toContain("...spread");
        expect(u.props, `${file} ${u.component}`).toContain("record");
      }
    }
  });
  it("each loads the provenance module or the task factory, and what it renders checks the brand", () => {
    for (const file of Object.keys(RENDERERS)) {
      const loads = closure(".", file);
      expect(loads.includes(PROVENANCE) || loads.includes(TASKS), file).toBe(true);
      for (const u of found[file]) expect(checked(u.component.split("#")[0]), u.component).toBe(true);
    }
  });
  it("every Reading island game's board is reviewed, loads the provenance module and checks the brand", () => {
    const reading = Object.keys(engines).filter((id) => engines[id as keyof typeof engines].island === "reading").sort();
    expect(reading).toEqual(Object.keys(BOARDS).sort());
    for (const id of reading) {
      expect(closure(".", `src/learn/games/${id}/view.tsx`), id).toContain(PROVENANCE);
      expect(closure(".", `src/learn/games/${id}/view.tsx`), id).toContain(BOARDS[id]);
      expect(readFileSync(BOARDS[id], "utf8"), id).toMatch(CHECK);
    }
  });
});

describe("R5-1: every board the School host can select for a reading route", () => {
  it("the host's Board is a game's own board or GrowthBoard, nothing else", () => {
    expect(hostBoardChoices()).toEqual([`${GROWTH_BOARD}#GrowthBoard`, "view.Board"].sort());
  });
  it("everything the host draws from a game, growth, reading or kit module is a reviewed board", () => {
    const drawn = hostElements().filter((x) => /^src\/learn\/(?:games|growth|reading|kit)\//.test(x) || x.startsWith("view.") || x === "Board");
    expect(drawn).toEqual(["Board", "src/learn/games/hafa-adai/view.tsx#LastPicnicWord", "view.Art"]);
    // `Board` is the choice above; `view.Art` is the game's picture, with no text.
    for (const x of [...hostBoardChoices(), ...drawn.filter((d) => d.includes("#"))]) expect(Object.keys(HOST_BOARDS), x).toContain(x);
  });
  it("each reading route's boards, GrowthBoard included, load the provenance module and check the brand", () => {
    const routes = readingRoutes();
    expect(routes.filter((r) => r.boards.includes(GROWTH_BOARD)).map((r) => r.id)).toEqual(["hafa-adai", "sound-boat", "turtle-tales", "which-one"]);
    for (const { id, boards } of routes) for (const board of boards) {
      expect(closure(".", board), `${id} ${board}`).toContain(PROVENANCE);
      expect(readFileSync(board, "utf8"), `${id} ${board}`).toMatch(CHECK);
    }
    // GrowthBoard checks every question of a reading track, and is the only module that draws the literacy visual.
    expect(readFileSync(GROWTH_BOARD, "utf8")).toMatch(/!readingGrowth\(session\.game\) \|\| questions\.every\(\(x\) => admittedReading\(/);
    expect(Object.keys(renderers(".", app, { "src/learn/growth/LiteracyVisual.tsx": ["LiteracyVisual"] }))).toEqual([GROWTH_BOARD]);
  });
  it("no reviewed reading module has a platform variant the inventory would miss", () => {
    const reviewed = [PROVENANCE, TASKS, HOST, GROWTH_BOARD, "src/learn/growth/LiteracyVisual.tsx", "src/learn/growth/content.ts", "src/learn/reading/admit.ts", ...SOURCES, ...Object.keys(READERS), ...Object.keys(RENDERERS), ...Object.values(BOARDS)];
    const variants = [...new Set(reviewed)].flatMap((f) => [".ios", ".android", ".native", ".web"].map((p) => f.replace(/(\.[cm]?[jt]sx?)$/, `${p}$1`))).filter((f) => existsSync(f));
    expect(variants).toEqual([]);
  });
  it("no reading game's engine builds reading strings from an inherited source: they ask the provenance module by id", () => {
    for (const id of Object.keys(BOARDS)) {
      const engine = `src/learn/games/${id}/engine.ts`;
      expect(edgesOf(".", engine).filter((e) => e.to === PROVENANCE).length, engine).toBe(1);
      expect(edgesOf(".", engine).some((e) => e.to && SOURCES.includes(e.to)), engine).toBe(false);
    }
  });
  it("free creative text: no reading module takes typing, and nothing is exempt", () => {
    expect(FREE_TEXT_EXEMPT).toEqual({});
    const reached = reachable(".", Object.keys(BOARDS).flatMap((id) => files(`src/learn/games/${id}`)), ["src/learn/generated/views.ts", "src/learn/generated/engines.ts", "src/challenge/registry.generated.ts"]);
    const typing = reached.filter((f) => /\bTextInput\b/.test(readFileSync(f, "utf8")) && !Object.hasOwn(FREE_TEXT_EXEMPT, f));
    expect(typing).toEqual([]);
  });
});

// Proof the checks resolve paths instead of matching their spelling: a synthetic tree reaches the sources every way.
describe("the static checks resolve every import form", () => {
  const root = mkdtempSync(join(tmpdir(), "li-reading-provenance-"));
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  const put = (name: string, text: string) => { mkdirSync(dirname(join(root, name)), { recursive: true }); writeFileSync(join(root, name), text); };
  put("src/learn/content/reading/sentences.ts", "export const SENTENCES = [];");
  put("src/learn/reading/provenance.ts", 'import { SENTENCES } from "../content/reading/sentences"; export const all = SENTENCES;');
  put("src/learn/kit/ReadingText.tsx", "export function ReadingText() { return null; }");
  const forms: Record<string, string> = {
    "dotdot.ts": 'import { SENTENCES } from "../content/reading/../reading/sentences";',
    "dot.ts": 'import { SENTENCES } from "./../content/./reading/sentences";',
    "ext.ts": 'import { SENTENCES } from "../content/reading/sentences.ts";',
    "alias.ts": 'import { SENTENCES } from "@/learn/content/reading/sentences";',
    "reexport.ts": 'export * from "../content/reading/sentences";',
    "require.ts": 'const s = require("../content/reading/sentences");',
    "lazy.ts": 'const s = () => import("../content/reading/sentences");',
    "equals.ts": 'import s = require("../content/reading/sentences");',
    "default.ts": 'import all from "../content/reading/sentences";',
    "folder/index.ts": 'export { SENTENCES } from "../../content/reading/sentences";',
  };
  for (const [name, text] of Object.entries(forms)) put(`src/learn/probe/${name}`, text);
  put("src/learn/probe/typed.ts", 'import type { X } from "../content/reading/sentences";');
  put("src/learn/probe/viafolder.ts", 'import { SENTENCES } from "./folder";');
  put("src/learn/probe/render.tsx", 'import { ReadingText as Shown } from "../kit/ReadingText"; import * as kit from "../kit/ReadingText"; export const a = () => <Shown text="sunset" />; export const b = () => <kit.ReadingText record={x} />; export const c = Shown;');
  it("every runtime import of a source is found however it is spelled, and a type-only import is not", () => {
    const found = importersOf(root, appFiles(root, ["src"]), ["src/learn/content/reading/sentences.ts"]);
    expect(found).toEqual(["src/learn/reading/provenance.ts", ...Object.keys(forms).map((n) => `src/learn/probe/${n}`)].sort());
    expect(closure(root, "src/learn/probe/viafolder.ts")).toContain("src/learn/content/reading/sentences.ts");
  });
  // REVIEW-5's graph probe, inverted: a reader re-exported through a barrel is found, and every platform variant counts.
  put("src/reader.tsx", "export function ReadingText() { return null; }");
  put("src/barrel.ts", 'export { ReadingText } from "./reader";');
  put("src/board.tsx", 'import { ReadingText } from "./barrel"; export const Board = () => <ReadingText record={x} />;');
  put("src/source.ts", "export const v = 0;");
  put("src/source.ios.ts", "export const v = 1;");
  put("src/use.ts", 'import { v } from "./source"; export const w = v;');
  // Every other re-export form.
  put("src/star.ts", 'export * from "./barrel";');
  put("src/nsbarrel.ts", 'export * as kit from "./reader";');
  put("src/local.ts", 'import { ReadingText as R } from "./reader"; export { R as Shown }; export default R;');
  put("src/forms.tsx", 'import { ReadingText } from "./star"; import { kit } from "./nsbarrel"; import { Shown } from "./local"; import Def from "./local"; import * as all from "./nsbarrel"; export const a = () => <ReadingText text="a" />; export const b = () => <kit.ReadingText text="b" />; export const c = () => <Shown text="c" />; export const d = () => <Def text="d" />; export const e = () => <all.kit.ReadingText text="e" />; export const f = all.kit.ReadingText;');
  it("REVIEW-5's probe: a reader through a barrel is a renderer, and an import names every platform variant", () => {
    const found = renderers(root, appFiles(root, ["src"]), { "src/reader.tsx": ["ReadingText"] });
    expect(found["src/board.tsx"]).toEqual([{ component: "src/reader.tsx#ReadingText", props: ["record"] }]);
    expect(found["src/forms.tsx"].map((u) => u.props)).toEqual([["text"], ["text"], ["text"], ["text"], ["text"], ["value"]]);
    expect(Object.keys(found).sort()).toEqual(["src/board.tsx", "src/forms.tsx"]);
    expect(resolveAll(root, "src/use.ts", "./source")).toEqual(["src/source.ts", "src/source.ios.ts"]);
    expect(edgesOf(root, "src/use.ts").map((e) => e.to)).toEqual(["src/source.ts", "src/source.ios.ts"]);
    expect(closure(root, "src/use.ts")).toEqual(["src/source.ios.ts", "src/source.ts", "src/use.ts"]);
  });
  it("a renamed or namespaced reader is found, with its props, and passing it as a value is flagged", () => {
    const found = renderers(root, appFiles(root, ["src"]), { "src/learn/kit/ReadingText.tsx": ["ReadingText"] });
    expect(found["src/learn/probe/render.tsx"].map((u) => u.props)).toEqual([["text"], ["record"], ["value"]]);
  });
});

/**
 * R5-3: every freeze and brand clause of the reading boundary, each either killed by a named app mutant in
 * `scripts/words/mutation.mjs` or a documented equivalent, with the reason. A new clause fails until it is listed.
 */
const BOUNDARY: { file: string; clause: string; mutant?: string; equivalent?: string }[] = [
  { file: PROVENANCE, clause: "return deepFreeze(JSON.parse(bytes));", mutant: "snapshot deep-frozen" },
  { file: PROVENANCE, clause: "for (const r of records) known.add(r);", mutant: "records branded" },
  { file: PROVENANCE, clause: "Object.freeze(Array.isArray(bank) && bank.length === 5", mutant: "exported bank containers frozen" },
  { file: PROVENANCE, clause: "bank.map((level: Task[]) => brand(level))", mutant: "bank tasks branded" },
  { file: PROVENANCE, clause: "[[], [], [], [], []].map((l) => Object.freeze(l))", equivalent: "the refused-bank fallback: runs only after the digest check has refused the bank (its own mutant), and holds no task" },
  { file: PROVENANCE, clause: "for (const track of Object.values(stages)) brand(track.questions);", mutant: "growth questions branded" },
  { file: PROVENANCE, clause: "return all ?? Object.freeze({});", equivalent: "the refused-growth fallback: an empty object, used only after the digest check refused the source; GrowthBoard refuses any unbranded reading question regardless" },
  { file: PROVENANCE, clause: "const snapshot = Object.freeze({", equivalent: "a private module constant, never exported; every value a lookup returns is frozen by its own clause" },
  { file: PROVENANCE, clause: 'words: brand<ReadingWord>(pinned("words")?.WORDS ?? []),', mutant: "words branded" },
  { file: PROVENANCE, clause: 'sentences: brand<ReadingSentence>(pinned("sentences")?.SENTENCES ?? []),', mutant: "sentences branded" },
  { file: PROVENANCE, clause: "passages: brand<ReadingPassage>(stories?.STORIES ?? []),", mutant: "passages branded" },
  { file: PROVENANCE, clause: "brand<ReadingPage>((stories?.STORIES ?? []).flatMap((t: Tale) => t.pages))", mutant: "passage pages branded" },
  { file: PROVENANCE, clause: 'ladders: brand<ReadingLadder>(pinned("ladders")?.LADDERS ?? []),', mutant: "ladders branded" },
  { file: PROVENANCE, clause: "deepFreeze({ easy: [], medium: [], hard: [] })", equivalent: "the refused-clues fallback: empty lists, used only after the digest check refused the source" },
  { file: PROVENANCE, clause: "banks: Object.freeze({", equivalent: "a private field of the private snapshot; readingBank returns each bank, which is frozen by its own clause" },
  { file: PROVENANCE, clause: 'chamoru: brand<ChamoruRecord>(pinned("chamoru")?.chamoruWords ?? []),', mutant: "CHamoru words branded" },
  { file: TASKS, clause: "for (const part of [t.tiles, t.tray, ...t.alternates, t.alternates]) Object.freeze(part);", mutant: "minted pieces frozen" },
  { file: TASKS, clause: "if (t.cue) Object.freeze(t.cue);", mutant: "minted cue frozen" },
  { file: TASKS, clause: "  Object.freeze(t);", mutant: "minted task frozen" },
  { file: TASKS, clause: "made.add(t);", mutant: "minted only from a door" },
  { file: "src/learn/reading/inherited.ts", clause: "export const inheritedWords: WordBank<LetterWord> = deepFreeze({", mutant: "inherited words frozen" },
];
describe("R5-3: every freeze and brand clause is a mutant or a documented equivalent", () => {
  const CLAUSE = /Object\.freeze\(|deepFreeze\(|\bbrand(?:<[A-Za-z]+>)?\(|known\.add\(|made\.add\(/g;
  const mutation = readFileSync("scripts/words/mutation.mjs", "utf8");
  it("each listed clause occurs once, and is a named app mutant or has a reason", () => {
    for (const b of BOUNDARY) {
      expect(readFileSync(b.file, "utf8").split(b.clause).length, b.clause).toBe(2);
      expect(!!b.mutant !== !!b.equivalent, b.clause).toBe(true);
      if (b.mutant) expect(mutation, b.mutant).toContain(`'${b.mutant}'`);
      if (b.equivalent) expect(b.equivalent.length, b.clause).toBeGreaterThan(40);
    }
  });
  it("no freeze or brand clause in the boundary modules is missing from the list", () => {
    for (const file of [...new Set(BOUNDARY.map((b) => b.file))]) {
      const text = readFileSync(file, "utf8");
      const spans = BOUNDARY.filter((b) => b.file === file).map((b) => [text.indexOf(b.clause), text.indexOf(b.clause) + b.clause.length]);
      // The brand function's own declaration is not a clause.
      const unlisted = [...text.matchAll(CLAUSE)].filter((m) => !spans.some(([a, z]) => m.index! >= a && m.index! < z) && !/^function brand/.test(text.slice(text.lastIndexOf("\n", m.index!) + 1)) && !/^import /.test(text.slice(text.lastIndexOf("\n", m.index!) + 1)));
      expect(unlisted.map((m) => text.slice(text.lastIndexOf("\n", m.index!) + 1, text.indexOf("\n", m.index!)).trim()), file).toEqual([]);
    }
  });
});
