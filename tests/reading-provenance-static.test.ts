/**
 * R1a fix 4 (R4-1), the static backstop. The runtime brand (`tests/reading-provenance.test.tsx`) is the guard; this
 * checks the import graph around it, with every import path resolved and normalised the way Metro resolves it (never
 * by its spelling): who may load the inherited sources, who renders reading text, and that each renderer gets its
 * content from the provenance module. W1's shape and string checks (`scripts/words/shipping.mjs`) stay as further,
 * supplementary layers.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { engines } from "../src/learn/engines";
import { INHERITED_SOURCE_DIGESTS } from "../src/learn/reading/provenance";
import { appFiles, closure, edgesOf, renderers } from "./helpers/import-graph";
import { inheritedSourceFile } from "./helpers/inherited-sources";
import { files, reachable } from "./helpers/reading-clock";

const PROVENANCE = "src/learn/reading/provenance.ts", TASKS = "src/learn/reading/tasks.ts";
const SOURCES = Object.keys(INHERITED_SOURCE_DIGESTS).map(inheritedSourceFile).sort();
/**
 * Modules outside reading that still load an inherited source directly. Neither renders `ReadingText`, `TapWords` or a
 * reading board, and neither is reachable from one (checked below). Named here so any other importer fails.
 */
const NOT_READING: Record<string, string> = {
  "src/games/memory.ts": "Memory's CHamoru picture pack: matching cards, not a reading board",
  "src/learn/growth/literacy.ts": "the growth quiz's CHamoru answer choices, chosen by id from the source-backed list",
};
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

describe("only the provenance module loads an inherited reading source", () => {
  it("the sources are the pinned ones", () => {
    expect(SOURCES).toEqual(["src/learn/content/chamoru.ts", ...["clues", "ladders", "lagoon", "sentences", "stories", "studio", "words", "workshop"].map((n) => `src/learn/content/reading/${n}.ts`)].sort());
  });
  it("no other module loads one at run time, by any resolved path", () => {
    expect(importersOf(".", app, SOURCES)).toEqual([PROVENANCE, ...Object.keys(NOT_READING)].sort());
    // The two older non-reading importers load only the CHamoru list, and no reading route reaches them.
    for (const f of Object.keys(NOT_READING)) expect(edgesOf(".", f).filter((e) => e.to && SOURCES.includes(e.to)).map((e) => e.to), f).toEqual(["src/learn/content/chamoru.ts"]);
    const routes = Object.keys(engines).filter((id) => engines[id as keyof typeof engines].island === "reading").flatMap((id) => closure(".", `src/learn/games/${id}/view.tsx`));
    for (const f of Object.keys(NOT_READING)) expect(routes, f).not.toContain(f);
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
  it("a renamed or namespaced reader is found, with its props, and passing it as a value is flagged", () => {
    const found = renderers(root, appFiles(root, ["src"]), { "src/learn/kit/ReadingText.tsx": ["ReadingText"] });
    expect(found["src/learn/probe/render.tsx"].map((u) => u.props)).toEqual([["text"], ["record"], ["value"]]);
  });
});
