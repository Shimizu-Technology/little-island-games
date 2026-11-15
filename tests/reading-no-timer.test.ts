import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { engines } from "../src/learn/engines";
import { CLOCK_OWNERS, clockUses, files, reachable, type ClockUse } from "./helpers/reading-clock";

/**
 * Reading is never timed and never rewards speed. The reading routes are found from the registry (every game on the
 * Reading island and every game that uses the reading kit), and the check follows every local module they can reach,
 * so a timer in a shared hook, a kit component or a platform file is found as surely as one in the game's own folder.
 */
const KIT = ["src/learn/reading", "src/learn/kit/ReadingText.tsx", "src/learn/kit/reading.ts", "src/learn/kit/readingSpeech.ts"];
/** The School route and its host frame: every reading game is played inside them. */
const HOST = ["src/app/learn.tsx", "src/learn/LearnFrame.tsx"];
/** Generated registries reach every game in the app. Their own text is checked; their imports are not followed, because every reading game is an entry above. */
const STOP = ["src/learn/generated/views.ts", "src/learn/generated/engines.ts", "src/challenge/registry.generated.ts"];
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
const graph = reachable(".", entriesOf(".", [...readingGameDirs(), ...KIT, ...HOST]), STOP);
/** Reading code itself (the games' folders and the kit): no interval or animation frame here at all. */
const readingCode = (f: string) => readingGameDirs().some((d) => f.startsWith(`${d}/`)) || KIT.some((k) => f === k || f.startsWith(`${k}/`));
const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Every clock a reading route can reach, one reviewed call each, including the School host (the route and LearnFrame)
 * and the shared code they load. A key binds the file, the kind, the call, the whole function it sits in and every
 * local declaration that function uses, followed through each name (a prop, a wrapper, a ref, an import), so editing
 * any of them needs a fresh look. A clock used any way other than a direct call is never allowed. No interval or
 * animation frame may sit in reading code itself, and nothing here may save or advance a word: the fake-clock tests
 * (`tests/reading-fake-clock.test.tsx`) prove that by running every reading game in the real host for a minute.
 */
const ALLOWED: Record<string, string> = {
  // Reading games
  "src/learn/games/sound-boat/view.tsx#timeout#69bba69223f8": "speech: the ladder cue plays a beat after a ladder word opens (only for an admitted word)",
  "src/learn/games/sound-boat/view.tsx#timeout#95a49a1c0b65": "speech: the word is spoken after the ladder cue; it only marks the word as spoken (only for an admitted word)",
  "src/learn/games/sound-boat/view.tsx#timeout#5344b8df2aa8": "speech: the word is spoken once a fresh round's goal has played; it only marks the word as spoken (only for an admitted word)",
  "src/learn/games/sound-boat/parts-view.tsx#timeout#7aebd69cb4eb": "speech: Levels 4-5 speak the word after the spoken goal; it only marks the word as spoken",
  "src/learn/games/hafa-adai/view.tsx#timeout#ec801aefa0a1": "speech: the prompt plays after the spoken goal on a fresh board (only for admitted words)",
  // The School host. Its one timer lives in frameClocks.ts; each call is keyed by the call and the callbacks it passes.
  "src/learn/frameClocks.ts#timeout#1cd8eeffd6b0": "speech: speakAfter runs the line it is given once, after a beat",
  "src/learn/LearnFrame.tsx#clock-call#0f53e5ac1fcf": "speech: the cheer line plays after a right answer's sound, only if the same feedback is still showing",
  "src/learn/LearnFrame.tsx#clock-call#e3dd1c9ffd2f": "speech: a game's spoken introduction starts a beat after the board opens",
  "src/learn/Celebrate.tsx#animation-callback#e00a488244ba": "motion: the celebration hides itself once its animation finishes",
  "src/islander/Companion.tsx#interval#f282c4bcf6ee": "motion: the companion's idle picture frames; it changes only which picture shows, never the board",
  "src/islander/Companion.tsx#timeout#9a1382a92c37": "motion: the companion settles back to waiting after a reaction",
  "src/components/sheetPresence.ts#timeout#b4135a55719a": "motion: a closed sheet lets go of the shared sheet hold after its slide settles",
  "src/components/stillPress.ts#timeout#37fd4906b347": "touch: forgets a finished gesture after the press handler ran, so a cancelled drag cannot linger",
  "src/components/ui.tsx#animation-callback#b942901d0acd": "motion: a sheet unmounts once its closing slide finishes",
  // Ids, seeds and calendar days: read once, never shown, never time on a task
  "src/games/types.ts#clock#b42bb04d953d": "identity: a new session id",
  "src/learn/session.ts#clock#f9db8a2716c5": "identity: the default seed for a new School round",
  "src/learn/session.ts#clock#8f242f299c02": "identity: the default seed for Play again",
  "src/learn/skills.ts#clock#642a7bc66f28": "calendar: the day number for spaced review between sessions, never time on a task",
  "src/cove/catalog.ts#clock#b32e36a7807a": "calendar: which weekday a given civil date is, for the Cove's weekly pick",
  "src/board/index.ts#clock#9519936a8fe7": "identity: the default seed for a new board game (reached through shared save types)",
  "src/cards/engine.ts#clock#3dd0bff2053b": "identity: the default seed and id for a new card game (reached through shared save types)",
  "src/mystery/engine.ts#clock#bd0727cb96f7": "identity: the default seed and id for a new mystery game (reached through shared save types)",
  "src/party/engine.ts#clock#c78e582a03a0": "identity: the id for a new party game (reached through shared save types)",
  "src/racer/engine.ts#clock#bb9f1116e3a8": "identity: the id for a new race (reached through shared save types)",
  "src/games/checkers.ts#clock#2ab59c5d9e8c": "computer player: the checkers search's own time slice (reached through shared save types)",
  "src/games/checkers.ts#clock#3dd954d18c92": "computer player: the checkers search's own time slice",
  "src/games/checkers.ts#clock#53c2158fd2c9": "computer player: the checkers search's own deadline",
  "src/games/checkers.ts#timeout#750b4307f3e0": "computer player: the checkers search yields to the UI between slices",
  // The save layer. The Store's clocks live in storeClocks.ts; each call is keyed by the call and the callbacks it passes.
  "src/state/storeClocks.ts#clock#36edcca9d727": "saving: launchClock reads now, for the slow-open notice",
  "src/state/storeClocks.ts#timeout#4ba80e9fe26c": "saving: slowOpenNotice runs the notice it is given once",
  "src/state/storeClocks.ts#timeout#a1b62377dcdd": "saving: flushDeadline settles false after the wait",
  "src/state/storeClocks.ts#clock#997b6a443ed2": "identity: newLearnerId",
  "src/state/storeClocks.ts#timeout#1b792359fa87": "saving: restorePause waits a moment",
  "src/state/Store.tsx#clock-call#ce6386e04c95": "saving: when the saved games began to open, and how long they have taken, for the slow-open notice",
  "src/state/Store.tsx#clock-call#dcd6d8607905": "saving: notes when saved games are slow to open; it never touches a round",
  "src/state/Store.tsx#clock-call#fd543a8b4e9c": "identity: a new learner's id",
  "src/state/Store.tsx#clock-call#fa3a27752b25": "saving: stops waiting for a backup write after a few seconds",
  "src/state/Store.tsx#clock-call#a2170e194cc9": "saving: waits for a restore to finish before selecting nobody",
  "src/state/backup.web.ts#timeout#3fd4c79152fa": "saving: frees a downloaded backup's link after the download starts (web)",
  "src/state/challengeDrafts.ts#clock#bc23d840d940": "identity: a new save revision id",
  "src/state/launchLog.ts#clock#2b61720b9db2": "saving: the time a launch note was written, for a grown-up's support log",
  "src/state/recoveryKey.ts#clock#481dd718aa14": "identity: a recovery copy's storage key",
  "src/cove/local.ts#clock#ac020aafc002": "identity: a preserved Cove save's storage key",
  // Loading
  "src/puzzles/loader.ts#clock#3d7f795bf00e": "loading: the puzzle loader's own work budget while it reads packs",
  "src/puzzles/loader.ts#clock#856b03804128": "loading: the same budget where performance is unavailable",
  "src/puzzles/loader.ts#timeout#30447514ada1": "loading: yields to the UI between pack reads",
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
    expect(uses.filter((u) => u.kind === "reference"), "a clock used other than by a direct call").toEqual([]);
    expect(uses.filter((u) => (u.kind === "interval" || u.kind === "frame") && readingCode(u.file)).map((u) => u.key)).toEqual([]);
    for (const u of uses) expect(u.call, u.key).not.toMatch(progress);
    for (const f of graph) expect(code(readFileSync(f, "utf8")), f).not.toMatch(/countdown|stopwatch|timeLimit|secondsLeft|elapsed/i);
  });
  it("no pure module that holds game state uses a timer at all", () => {
    for (const name of ["parts.ts", "engine.ts", "challenge-engine.ts", "challenge-content.ts"]) expect(code(readFileSync(join("src/learn/games/sound-boat", name), "utf8")), name).not.toMatch(/setTimeout|setInterval/);
    for (const f of files("src/learn/reading").filter((f) => !f.endsWith(".tsx"))) expect(code(readFileSync(f, "utf8")), f).not.toMatch(/setTimeout|setInterval/);
  });
  it("saved round state carries no time", async () => {
    const { validParts } = await import("../src/learn/games/sound-boat/parts");
    expect(validParts({ kind: "parts", level: 4, ids: [], starter: 0, index: 0, answer: {}, clean: [], heard: false, elapsedMs: 1 }, 4)).toBe(false);
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
    // Every timer in the edited function loses its allowance, and the two that run the edited callback show it.
    expect(unallowed(uses).length).toBe(3);
    expect(uses.filter((u) => progress.test(u.call)).length).toBe(2);
  });
  // R3-3: the reviewer's probe. A .mjs helper, a directory whose only index is index.ios.ts, and a clock alias.
  it("follows .mjs modules and platform directory indexes, and reports a clock alias", () => {
    put("src/learn/games/later/entry.ts", 'import "./late.mjs"; import "./folder"; import "./bare"; export const alias = (next: () => void) => { const later = setTimeout; later(next, 1400); };');
    put("src/learn/games/later/late.mjs", "export const later = next => setTimeout(next, 1400);");
    put("src/learn/games/later/bare.mjs", "export const later = next => setTimeout(next, 1400);");
    put("src/learn/games/later/folder/index.ios.ts", "export const later = (next: () => void) => setTimeout(next, 1400);");
    const reached = reachable(root, ["src/learn/games/later/entry.ts"]);
    expect(reached).toEqual(["src/learn/games/later/bare.mjs", "src/learn/games/later/entry.ts", "src/learn/games/later/folder/index.ios.ts", "src/learn/games/later/late.mjs"]);
    expect(clockUses(root, reached).map((u) => `${u.file.split("/").slice(-2).join("/")}:${u.kind}`).sort()).toEqual(["folder/index.ios.ts:timeout", "later/bare.mjs:timeout", "later/entry.ts:reference", "later/late.mjs:timeout"]);
  });
  it("reports every way of using a clock other than a direct call", () => {
    const forms = [
      "const later = setTimeout; later(next, 1400);",
      "const { setTimeout: later } = globalThis; later(next, 1400);",
      "const later = globalThis.setTimeout; later(next, 1400);",
      'globalThis["setTimeout"](next, 1400);',
      "[setInterval][0](next, 1000);",
      "const tick = requestAnimationFrame; tick(next);",
      "const now = performance.now; now();",
      "const D = Date; D.now();",
      "const t = Date.now; t();",
      "run(setTimeout, next);",
    ];
    forms.forEach((body, i) => put(`src/learn/games/forms/f${i}.ts`, `export const go = (next: () => void, run: (f: unknown, n: unknown) => void) => { ${body} };`));
    put("src/learn/games/forms/import.ts", 'import { setTimeout as later } from "node:timers"; export const go = (next: () => void) => later(next, 1400);');
    const found = clockUses(root, [...forms.map((_, i) => `src/learn/games/forms/f${i}.ts`), "src/learn/games/forms/import.ts"]);
    for (const [i, body] of [...forms, "import rename"].entries()) expect(found.some((u) => u.kind === "reference" && u.file.endsWith(i < forms.length ? `/f${i}.ts` : "/import.ts")), body).toBe(true);
    // Types and direct calls are not references.
    put("src/learn/games/forms/plain.ts", "let t: ReturnType<typeof setTimeout> | undefined; export const go = (next: () => void) => { t = setTimeout(next, 10); clearTimeout(t); return Date.now() + performance.now() + new Date().getTime(); };");
    expect(clockUses(root, ["src/learn/games/forms/plain.ts"]).map((u) => u.kind).sort()).toEqual(["clock", "clock", "clock", "timeout"]);
  });
  // R3-3(c): the reviewer's wrapper (r3-evidence/clock-wrapper.patch) keeps the timer call and `say` exactly, and
  // changes what `sound` is. The timer's key binds `sound`'s declaration, so the allowance is lost.
  it("an allowed timer whose callback's dependency is rewrapped to advance loses its allowance", () => {
    const view = readFileSync("src/learn/games/sound-boat/view.tsx", "utf8");
    const patched = view
      .replace("  update,\n  practice,\n  assistance,\n  sound,\n  soundOn,", "  update,\n  practice,\n  assistance,\n  sound: originalSound,\n  soundOn,")
      .replace("    complete = admitted && boatComplete(s);\n\n  // Say each new word.", '    complete = boatComplete(s);\n\n  const latest = useRef(s); latest.current = s;\n  function sound(...args: Parameters<typeof originalSound>) { originalSound(...args); update(boatMove(latest.current, {type: "next"})); }\n\n  // Say each new word.');
    expect(patched.split("originalSound").length).toBe(4);
    const allowed = clockUses(".", ["src/learn/games/sound-boat/view.tsx"]);
    expect(unallowed(allowed)).toEqual([]);
    put("src/learn/games/sound-boat/view.tsx", patched);
    const uses = clockUses(root, ["src/learn/games/sound-boat/view.tsx"]);
    expect(uses.map((u) => u.call)).toEqual(allowed.map((u) => u.call));
    expect(unallowed(uses).length).toBe(3);
  });
});

// R1a fix 4: the School host's and the Store's clocks live in small reviewed functions. A host call to one is keyed by
// the call and the callbacks it passes, so ordinary host edits keep their keys and a timed action still loses its own.
describe("the host's clock functions", () => {
  const root = mkdtempSync(join(tmpdir(), "li-host-clock-"));
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  const put = (name: string, text: string) => {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), text);
  };
  for (const owner of Object.keys(CLOCK_OWNERS)) put(owner, readFileSync(owner, "utf8"));
  const frame = readFileSync("src/learn/LearnFrame.tsx", "utf8");
  const keys = (file: string) => clockUses(root, [file]).map((u) => u.key).sort();
  const original = clockUses(".", ["src/learn/LearnFrame.tsx"]).map((u) => u.key).sort();
  it("each clock owner exports only its reviewed clock functions, and holds every clock it is allowed", () => {
    for (const [owner, names] of Object.entries(CLOCK_OWNERS)) {
      const exported = [...readFileSync(owner, "utf8").matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]).sort();
      expect(exported, owner).toEqual([...names].sort());
      expect(clockUses(".", [owner]).every((u) => Object.hasOwn(ALLOWED, u.key)), owner).toBe(true);
    }
    expect(original).toEqual(["src/learn/LearnFrame.tsx#clock-call#0f53e5ac1fcf", "src/learn/LearnFrame.tsx#clock-call#e3dd1c9ffd2f"]);
  });
  it("an ordinary LearnFrame edit keeps every key", () => {
    // Like F-frame-2: layout and the code around the timers change; the timer calls and their callbacks do not.
    const edited = frame
      .replace("      reactCompanion(\"correct\");", "      reactCompanion(\"correct\");\n      setBurst((b) => ({ ...b }));")
      .replace("    introduced.current = saved.id;", "    introduced.current = saved.id;\n    stopSound();");
    expect(edited.split("setBurst((b) => ({ ...b }))").length).toBe(2);
    expect(edited.split("stopSound();").length).toBeGreaterThan(frame.split("stopSound();").length);
    put("src/learn/LearnFrame.tsx", edited);
    expect(keys("src/learn/LearnFrame.tsx")).toEqual(original);
  });
  it("a host timer that is changed to advance, or whose callback is rewrapped to advance, loses its allowance", () => {
    put("src/learn/LearnFrame.tsx", frame.replace("speakAfter(() => sound(engine.introAudio!, true), 450)", "speakAfter(() => { sound(engine.introAudio!, true); save(saved); }, 450)"));
    const changed = clockUses(root, ["src/learn/LearnFrame.tsx"]);
    expect(unallowed(changed).length).toBe(1);
    // The cheer line's sound is rewrapped: the timer call is the same text, its callback now saves.
    const wrapped = frame.replace("  const { play: sound, stop: stopSound } = useSoundControls(", "  const { play: playSound, stop: stopSound } = useSoundControls(")
      .replace("  const cheerLine = useRef", "  const sound = useCallback((key: string, automatic?: boolean) => { playSound(key, automatic); save(acceptedRound.current!); }, [playSound]);\n  const cheerLine = useRef");
    expect(wrapped.split("playSound").length).toBe(4);
    put("src/learn/LearnFrame.tsx", wrapped);
    const uses = clockUses(root, ["src/learn/LearnFrame.tsx"]);
    expect(uses.map((u) => u.call)).toEqual(clockUses(".", ["src/learn/LearnFrame.tsx"]).map((u) => u.call));
    expect(unallowed(uses).length).toBe(2);
  });
  it("a clock function used any way but a direct call is a reference", () => {
    const forms = [
      'import { speakAfter } from "../../src/learn/frameClocks"; const later = speakAfter; later(() => {}, 1);',
      'import * as clocks from "../../src/learn/frameClocks"; const c = clocks; c.speakAfter(() => {}, 1);',
      'const clocks = require("../../src/learn/frameClocks"); clocks.speakAfter(() => {}, 1);',
      'export { speakAfter } from "../../src/learn/frameClocks";',
      'import { speakAfter as later } from "../../src/learn/frameClocks"; [later][0](() => {}, 1);',
    ];
    forms.forEach((body, i) => put(`probe/host/f${i}.ts`, body));
    for (const [i, body] of forms.entries()) expect(clockUses(root, [`probe/host/f${i}.ts`]).some((u) => u.kind === "reference"), body).toBe(true);
    // A direct call, plain or through a namespace, is a clock-call.
    put("probe/host/ok.ts", 'import * as clocks from "../../src/learn/frameClocks"; import { speakAfter as later } from "../../src/learn/frameClocks"; clocks.speakAfter(() => {}, 1); later(() => {}, 2);');
    expect(clockUses(root, ["probe/host/ok.ts"]).map((u) => u.kind)).toEqual(["clock-call", "clock-call"]);
  });
});
