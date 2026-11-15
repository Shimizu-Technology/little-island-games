import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { engines } from "../src/learn/engines";
import { clockUses, files, reachable, type ClockUse } from "./helpers/reading-clock";

/**
 * Reading is never timed and never rewards speed. The reading routes are found from the registry (every game on the
 * Reading island and every game that uses the reading kit), and the check follows every local module they can reach,
 * so a timer in a shared hook, a kit component or a platform file is found as surely as one in the game's own folder.
 */
const KIT = ["src/learn/reading", "src/learn/kit/ReadingText.tsx", "src/learn/kit/reading.ts", "src/learn/kit/readingSpeech.ts", "scripts/dev/sound-boat-entry.tsx"];
const usesReadingKit = /from\s+["'][^"']*(?:kit\/reading|kit\/ReadingText|kit\/readingSpeech|learn\/reading|\.\.\/\.\.\/reading)[^"']*["']/;
type Registry = Readonly<Record<string, { island: string }>>;
/** The game directories that hold reading routes: the Reading island's games plus every game that imports the kit. */
export function readingGameDirs(registry: Registry = engines, root = "."): string[] {
  const dirs = new Set<string>(), games = join(root, "src/learn/games");
  for (const [id, engine] of Object.entries(registry)) if (engine.island === "reading" && existsSync(join(games, id))) dirs.add(`src/learn/games/${id}`);
  for (const dir of readdirSync(games)) {
    const path = join(games, dir);
    if (statSync(path).isDirectory() && files(path).some((f) => usesReadingKit.test(readFileSync(f, "utf8")))) dirs.add(`src/learn/games/${dir}`);
  }
  return [...dirs].sort();
}
const entriesOf = (root: string, roots: readonly string[]) => roots.filter((r) => existsSync(join(root, r))).flatMap((r) => files(join(root, r)).map((f) => f.slice(root === "." ? 0 : root.length + 1)));
const graph = reachable(".", entriesOf(".", [...readingGameDirs(), ...KIT]));
const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Every clock a reading route can reach, one reviewed call each. A key binds the file, the kind and the exact call
 * (with the declaration of a callback passed by name), so any edit to one of these needs a fresh look. No interval,
 * animation frame or countdown is allowed at all, and nothing here may save or advance a word.
 */
const ALLOWED: Record<string, string> = {
  "src/learn/games/sound-boat/view.tsx#timeout#67af351516a9": "speech: the ladder cue plays a beat after a ladder word opens",
  "src/learn/games/sound-boat/view.tsx#timeout#0251204bc5cb": "speech: the word is spoken after the ladder cue; it only marks the word as spoken",
  "src/learn/games/sound-boat/view.tsx#timeout#8c624a145557": "speech: the word is spoken once a fresh round's goal has played; it only marks the word as spoken",
  "src/learn/games/sound-boat/parts-view.tsx#timeout#49e8d59a0df7": "speech: Levels 4-5 speak the word after the spoken goal; it only marks the word as spoken",
  "src/learn/games/hafa-adai/view.tsx#timeout#f0c4f2d70473": "speech: the prompt plays after the spoken goal on a fresh board",
  "src/components/sheetPresence.ts#timeout#1ffa1fa371db": "motion: a closed sheet lets go of the shared sheet hold after its slide settles",
  "src/components/stillPress.ts#timeout#ba13f7f4e36a": "touch: forgets a finished gesture after the press handler ran, so a cancelled drag cannot linger",
  "src/components/ui.tsx#animation-callback#b6409fa10fbe": "motion: a sheet unmounts once its closing slide finishes",
  "src/games/types.ts#clock#d8171d118e19": "identity: a new session id, never shown or compared",
  "src/learn/skills.ts#clock#d8171d118e19": "calendar: the day number for spaced review between sessions, never time on a task",
  "src/puzzles/loader.ts#clock#0ee5d327e4f3": "loading: the puzzle loader's own work budget while it reads packs",
  "src/puzzles/loader.ts#clock#d8171d118e19": "loading: the same budget where performance is unavailable",
  "src/puzzles/loader.ts#timeout#6fd3d1889302": "loading: yields to the UI between pack reads",
};
const unallowed = (uses: readonly ClockUse[]) => uses.filter((u) => !Object.hasOwn(ALLOWED, u.key));
const progress = /\bupdate\(|boatMove|partsMove|dispatch\(|onNext|advance|\.next\(/;

describe("no clock is reachable from a reading route", () => {
  it("finds the reading routes from the registry, not a list in this file", () => {
    const dirs = readingGameDirs();
    for (const id of ["sound-boat", "which-one", "turtle-tales", "hafa-adai"]) expect(dirs, id).toContain(`src/learn/games/${id}`);
    for (const [id, engine] of Object.entries(engines)) if (engine.island === "reading") expect(dirs, `Reading island game ${id}`).toContain(`src/learn/games/${id}`);
    for (const f of ["which-one/view.tsx", "turtle-tales/view.tsx", "src/components/ui.tsx", "src/learn/skills.ts"]) expect(graph.some((g) => g.endsWith(f)), f).toBe(true);
    expect(graph.length).toBeGreaterThan(60);
  });
  it("every clock reachable from a reading route is a reviewed call", () => {
    const uses = clockUses(".", graph);
    expect(unallowed(uses).map((u) => `${u.key} ${u.text.slice(0, 160)}`)).toEqual([]);
    expect(Object.keys(ALLOWED).filter((key) => !uses.some((u) => u.key === key)), "stale allowance").toEqual([]);
    expect(uses.filter((u) => u.kind === "interval" || u.kind === "frame")).toEqual([]);
    for (const u of uses) expect(u.text, u.key).not.toMatch(progress);
    for (const f of graph) expect(code(readFileSync(f, "utf8")), f).not.toMatch(/countdown|stopwatch|timeLimit|secondsLeft|elapsed/i);
  });
  it("no pure module that holds game state uses a timer at all", () => {
    for (const name of ["parts.ts", "engine.ts", "challenge-engine.ts", "challenge-content.ts"]) expect(code(readFileSync(join("src/learn/games/sound-boat", name), "utf8")), name).not.toMatch(/setTimeout|setInterval/);
    for (const f of files("src/learn/reading").filter((f) => !f.endsWith(".tsx"))) expect(code(readFileSync(f, "utf8")), f).not.toMatch(/setTimeout|setInterval/);
  });
  it("saved round state carries no time", async () => {
    const { validParts } = await import("../src/learn/games/sound-boat/parts");
    expect(validParts({ kind: "parts", level: 4, ids: [], starter: 0, index: 0, answer: {}, clean: [], heard: false, elapsedMs: 1 }, 4, new Map())).toBe(false);
    for (const f of graph.filter((f) => /sound-boat\/(?:parts|challenge-engine|engine)\.ts$/.test(f))) expect(code(readFileSync(f, "utf8")), f).not.toMatch(/\b(?:time|ms|clock|duration)\s*:/i);
  });
});

// Mutation proof: a synthetic future reading game reaches a timer only through shared code, in every way an import can.
describe("the clock check follows shared code", () => {
  const root = mkdtempSync(join(tmpdir(), "li-reading-clock-"));
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  const put = (name: string, text: string) => {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), text);
  };
  put("src/learn/games/future/view.tsx", [
    'import { advance } from "../../reviewer-shared/advance";',
    'export * from "@/learn/reviewer-shared/alias";',
    'import "../../reviewer-shared/platform";',
    'const later = () => import("../../reviewer-shared/lazy");',
    'const old = require("../../reviewer-shared/old");',
    "export const Board = ({ next }: { next: () => void }) => advance(next);",
  ].join("\n"));
  put("src/learn/reviewer-shared/advance.ts", "export const advance = (next: () => void) => setTimeout(next, 1400);");
  put("src/learn/reviewer-shared/alias.ts", "export const tick = (next: () => void) => setInterval(next, 1000);");
  put("src/learn/reviewer-shared/platform.ios.ts", "export const frame = (next: () => void) => requestAnimationFrame(next);");
  put("src/learn/reviewer-shared/lazy.ts", "export const fade = (a: { start(f: () => void): void }, next: () => void) => a.start(() => next());");
  put("src/learn/reviewer-shared/old.ts", "export const stamp = () => Date.now();");
  put("src/learn/reviewer-shared/unused.ts", "export const never = () => setTimeout(() => {}, 1);");
  const dirs = readingGameDirs({ future: { island: "reading" } }, root);
  const reached = reachable(root, entriesOf(root, dirs));
  it("registers the future game from the registry and reaches every shared module it imports", () => {
    expect(dirs).toEqual(["src/learn/games/future"]);
    for (const f of ["advance.ts", "alias.ts", "platform.ios.ts", "lazy.ts", "old.ts"]) expect(reached, f).toContain(`src/learn/reviewer-shared/${f}`);
    expect(reached).not.toContain("src/learn/reviewer-shared/unused.ts");
  });
  it("reports every clock in that shared code as unreviewed", () => {
    const kinds = unallowed(clockUses(root, reached)).map((u) => `${u.file.split("/").at(-1)}:${u.kind}`).sort();
    expect(kinds).toEqual(["advance.ts:timeout", "alias.ts:interval", "lazy.ts:animation-callback", "old.ts:clock", "platform.ios.ts:frame"]);
  });
  it("an allowed speech timer that is changed to advance the word loses its allowance", () => {
    const view = readFileSync("src/learn/games/sound-boat/view.tsx", "utf8");
    const changed = view.replace("spoken.current = key;\n      sound(wordAudio(word.word), true);", "spoken.current = key;\n      sound(wordAudio(word.word), true);\n      update(boatMove(s, { type: \"next\" }));");
    expect(changed).not.toBe(view);
    put("src/learn/games/sound-boat/view.tsx", changed);
    const uses = clockUses(root, ["src/learn/games/sound-boat/view.tsx"]);
    expect(unallowed(uses).length).toBe(2);
    expect(uses.filter((u) => progress.test(u.text)).length).toBe(2);
  });
});
