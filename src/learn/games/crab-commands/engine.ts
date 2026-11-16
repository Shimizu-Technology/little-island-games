import { decodeProgram as readProgram, sessionBytes, type PackedProgram } from '../../program/codec';
import { crabProgram, paletteRepeats, projectCrab, readCrabDraft } from './program';
import type { LearnEngine, LearnOptions, Pace } from "../../types";
import { pickItems } from "../../skills";
import { exact, integer, prediction } from "../../kit/science";
import { nodeCost, type Program } from "../../program/model";
import schoolContent from "./school-content.json";
export type Command = "up" | "right" | "down" | "left" | "forward" | "turn-left" | "turn-right" | "repeat";
export type Level = {
  /** Only newly authored content opts in. Never infer this from a saved draft. */
  blockEditor?: boolean;
  id: string;
  pace: Pace;
  skill: string;
  rows: string[];
  facing: number;
  /** 0: two or three cards · 1: four to six · 2: a longer beach. A round plays one of each, in order. */
  tier: 0 | 1 | 2;
  /** Kept so older saved rounds still load; never offered in a new round. */
  retired?: boolean;
  /** School Level 4 (stretch) or Level 5 (deep) beach. Levels 1–3 have none and pick by pace. */
  stage?: "stretch" | "deep";
  /** Level 4: the plan opens with this planted bug (one wrong step, turn or Again). */
  starter?: Command[];
  bug?: "step" | "turn" | "loop";
  /** Level 5: the most blocks the plan may hold, always below the fewest flat cards. */
  tray?: number;
  /** Low sand (~) floods once the crab has walked this many squares. */
  tide?: number;
};
/** Hand-drawn beaches: C crab, S shell, H crab house, # sandcastle. Deep Water adds K key, G gate (open
 * once the key is held) and ~ low sand (passable only within the level's tide). */
const beaches: [id: string, tier: 0 | 1 | 2, rows: string[], retired?: true][] = [
  // Gentle: compass arrows. First beaches are one shell, then home.
  ["ea1", 0, ["CSH..", ".....", ".....", ".....", "....."]],
  ["ea2", 0, ["C....", "S....", "H....", ".....", "....."]],
  ["ea3", 0, ["CS...", ".H...", ".....", ".....", "....."]],
  ["ea4", 0, ["C#...", "S....", "H....", ".....", "....."]],
  ["ea5", 0, ["C....", "S....", ".H...", ".....", "....."]],
  ["ea6", 0, ["CS#..", "..H..", ".....", ".....", "....."]],
  ["eb1", 1, ["C.S..", "...H.", ".....", ".....", "....."]],
  ["eb2", 1, ["CS...", "##...", "..H..", ".....", "....."]],
  ["eb3", 1, ["C.#..", "S.#..", "..H..", ".....", "....."]],
  ["e1", 1, ["C.S.H", ".##..", ".....", ".....", "....."]],
  ["e2", 1, ["C#...", ".#...", ".S.H.", ".....", "....."]],
  ["e3", 1, ["C.S..", "##.#.", "...H.", ".....", "....."]],
  ["e4", 1, ["C....", ".##..", ".S#..", "..H..", "....."]],
  ["e5", 2, ["C.#..", "..#..", "S.S.H", ".....", "....."]],
  ["e6", 2, ["C..#H", ".S.#.", "...S.", ".###.", "....."]],
  ["e7", 2, ["C#S.H", ".#.#.", "...S.", ".....", "....."]],
  ["e8", 2, ["C....", "###S.", "S....", ".###.", "....H"], true],
  // Growing: walk forward and turn.
  ["ma1", 0, ["CSH..", ".....", ".....", ".....", "....."]],
  ["ma2", 0, ["CS...", ".H...", ".....", ".....", "....."]],
  ["ma3", 0, ["C....", "S....", "H....", ".....", "....."]],
  ["ma4", 0, ["CSH..", "###..", ".....", ".....", "....."]],
  ["mb1", 1, ["C.S..", "..#H.", ".....", ".....", "....."]],
  ["mb2", 1, ["C....", "S....", "..H..", ".....", "....."]],
  ["mb3", 1, ["CS...", "##...", "..H..", ".....", "....."]],
  ["m1", 1, ["C.S.H", ".###.", ".....", ".....", "....."]],
  ["mc1", 2, ["C.#..", "..S..", "..H..", ".....", "....."]],
  ["mc2", 2, ["C....", "..S..", "....H", ".....", "....."]],
  ["m2", 2, ["C#...", ".#S..", "...#H", ".....", "....."]],
  ["m3", 2, ["C..#H", "##.#.", "S..S.", ".###.", "....."], true],
  ["m4", 2, ["C.S..", ".#.#.", "...S.", ".###.", "....H"]],
  ["m5", 2, ["C#...", ".#.#.", "S..#H", "##.#.", "..S.."], true],
  ["m6", 2, ["C...H", ".###.", ".S.S.", ".....", "....."]],
  ["m7", 2, ["C.S#H", ".#.#.", "...S.", ".###.", "....."]],
  ["m8", 2, ["C#..H", ".#.#.", "S..S.", ".#.#.", "....."]],
  // Challenge: Again ×2 repeats the card before it two more times.
  ["ha1", 0, ["CS.H.", ".....", ".....", ".....", "....."]],
  ["ha2", 0, ["C....", "S....", "S....", "H....", "....."]],
  ["ha3", 0, ["C.S.H", ".....", ".....", ".....", "....."]],
  ["hb1", 1, ["C...S", "....H", ".....", ".....", "....."]],
  ["hb2", 1, ["C....", "S....", "S....", "...H.", "....."]],
  ["hb3", 1, ["CS.S.", "....H", ".....", ".....", "....."]],
  ["h1", 2, ["C...S", "####.", "H....", ".....", "....."]],
  ["h2", 2, ["C.S..", "####.", "S...H", ".....", "....."], true],
  ["h3", 2, ["C...S", ".###.", ".S..H", ".....", "....."]],
  ["h4", 2, ["C....", ".###S", "S...H", ".....", "....."]],
  ["h5", 2, ["C.S..", ".###.", "S...H", ".....", "....."]],
  ["h6", 2, ["C...H", ".###.", "S...S", ".....", "....."]],
  ["h7", 2, ["C...S", "##.#.", "H..S.", ".....", "....."]],
  ["h8", 2, ["C.S..", ".#.#.", "S#..H", "...#.", "....."], true],
];
const authored: Level[] = beaches.map(([id, tier, rows, retired]) => ({
  id,
  rows,
  tier,
  ...(retired ? { retired } : {}),
  pace: id.startsWith("e") ? "easy" : id.startsWith("m") ? "medium" : "hard",
  skill: id.startsWith("h")
    ? "think.loops"
    : ["e2", "e4", "m2", "m5"].includes(id)
      ? "think.debug"
      : "think.sequence",
  facing: 1,
}));
/** C1d: 30 more Level 1–3 beaches, then the Level 4 bug beaches and Level 5 block beaches. Baked by
 * bake-school.ts and re-proved on this engine in tests/c1d-crab-school.test.ts. */
export const levels: Level[] = [...authored, ...(schoolContent.extra as Level[]), ...(schoolContent.stretch as Level[]), ...(schoolContent.deep as Level[])];
// Isolated native QA only: a separate retired descriptor, never part of family content selection.
if (process.env.EXPO_PUBLIC_K7_FIXTURES === '1') levels.push({...levels[0],id:'k7-fixture',retired:true,blockEditor:true});
export const commands = (p: Pace): Command[] =>
  p === "easy"
    ? ["up", "right", "down", "left"]
    : p === "medium"
      ? ["forward", "turn-left", "turn-right"]
      : ["forward", "turn-left", "turn-right", "repeat"];
/** `key` and `walked` exist only on beaches that have a key or a tide, so older states never change. */
export type Walker = { pos: number; facing: number; shells: number; previous: Command | null; bump: boolean; key?: true; walked?: number };
/** Search identity: every field that can change what the next card does. */
export const walkerKey = (w: Walker) => `${w.pos}/${w.facing}/${w.shells}/${w.previous}${w.key ? "/k" : ""}${w.walked === undefined ? "" : `/${w.walked}`}`;
const cell = (l: Level, p: number) => l.rows[Math.floor(p / 5)]?.[p % 5];
/** Sandcastles block; a gate blocks until the key is held; low sand blocks once the tide is in. */
export const flooded = (l: Level, w: Walker) => l.tide !== undefined && (w.walked ?? 0) >= l.tide;
const blockedAt = (l: Level, w: Walker, p: number) => {
  const c = cell(l, p);
  return c === "#" || (c === "G" && !w.key) || (c === "~" && flooded(l, w));
};
/** The cards a beach offers: its pace's set. Level 5 beaches use Walk and Turn, with blocks. */
export const levelCommands = (l: Level) => commands(l.pace);
/** Which beaches a round at these options draws from. Levels 1–3 by pace, Levels 4–5 by stage. */
export const inPool = (l: Level, o: { pace: Pace; stage?: string }) => (o.stage ? l.stage === o.stage : !l.stage && l.pace === o.pace);
const shellCells = (l: Level) =>
  l.rows
    .join("")
    .split("")
    .flatMap((c, i) => (c === "S" ? [i] : []));
export const start = (l: Level): Walker => ({
  pos: l.rows.join("").indexOf("C"),
  facing: l.facing,
  shells: 0,
  previous: null,
  bump: false,
});
export function step(l: Level, w: Walker, c: Command): Walker {
  if (w.bump) return w;
  if (c === "repeat") {
    if (!w.previous || w.previous === "repeat") return { ...w, bump: true };
    return step(l, step(l, w, w.previous), w.previous);
  }
  if (c === "turn-left" || c === "turn-right")
    return { ...w, facing: (w.facing + (c === "turn-left" ? 3 : 1)) % 4, previous: c };
  const dir = c === "forward" ? w.facing : ["up", "right", "down", "left"].indexOf(c);
  const x = (w.pos % 5) + [0, 1, 0, -1][dir],
    y = Math.floor(w.pos / 5) + [-1, 0, 1, 0][dir];
  if (x < 0 || x > 4 || y < 0 || y > 4 || blockedAt(l, w, y * 5 + x)) return { ...w, previous: c, bump: true };
  const pos = y * 5 + x,
    shell = shellCells(l).indexOf(pos);
  const next: Walker = { pos, facing: dir, shells: w.shells | (shell < 0 ? 0 : 1 << shell), previous: c, bump: false };
  if (w.key || cell(l, pos) === "K") next.key = true;
  if (l.tide !== undefined) next.walked = (w.walked ?? 0) + 1;
  return next;
}
/** One footprint per square walked, with the card that moved the crab there. */
export type Trail = { steps: { pos: number; facing: number; card: number }[]; bumpCard: number | null; bumpPos: number; bumpFacing: number };
/**
 * The planned path, one square at a time (Again ×2 expands to the card before it, exactly like step()).
 * Ends at the first bump so the beach can show where the crab would stop.
 */
export function trail(l: Level, program: Command[]): Trail {
  let w = start(l);
  const steps: Trail["steps"] = [];
  for (let card = 0; card < program.length; card++) {
    const c = program[card];
    const moves = c === "repeat" ? (w.previous && w.previous !== "repeat" ? [w.previous, w.previous] : null) : [c];
    if (!moves) return { steps, bumpCard: card, bumpPos: w.pos, bumpFacing: w.facing };
    for (const m of moves) {
      const n = step(l, w, m);
      if (n.bump) return { steps, bumpCard: card, bumpPos: w.pos, bumpFacing: m === "forward" ? w.facing : ["up", "right", "down", "left"].indexOf(m) };
      if (n.pos !== w.pos) steps.push({ pos: n.pos, facing: n.facing, card });
      w = n;
    }
    if (solved(l, w)) break;
  }
  return { steps, bumpCard: null, bumpPos: w.pos, bumpFacing: w.facing };
}
export const solved = (l: Level, w: Walker) =>
  !w.bump && cell(l, w.pos) === "H" && w.shells === (1 << shellCells(l).length) - 1;
export const run = (l: Level, program: Command[]) => projectCrab(crabProgram(program), l)?.state ?? start(l);
/** Breadth first search uses exactly the same step/loop semantics as Go. */
export function solve(l: Level): Command[] {
  const queue = [{ w: start(l), path: [] as Command[] }],
    seen = new Set<string>();
  for (let i = 0; i < queue.length; i++) {
    const { w, path } = queue[i];
    if (solved(l, w)) return path;
    for (const c of levelCommands(l)) {
      const n = step(l, w, c);
      if (n.bump) continue;
      const key = walkerKey(n);
      if (!seen.has(key)) {
        seen.add(key);
        queue.push({ w: n, path: [...path, c] });
      }
    }
  }
  return [];
}
export type CrabState = {
  blockDraft?: PackedProgram;
  levels: string[];
  completed: Command[][];
  program: Command[];
  cursor: number;
  running: boolean;
  starter: 0 | 1;
  cards: number;
  debugging: boolean;
};
export const currentLevel = (s: CrabState) =>
  levels.find((l) => l.id === s.levels[Math.min(s.completed.length, s.levels.length - 1)])!;
export function tick(s: CrabState): CrabState {
  if (!s.running) return s;
  const cursor = s.cursor + 1,
    l = currentLevel(s),
    w = run(l, s.program.slice(0, cursor));
  return {
    ...s,
    cursor,
    debugging: s.debugging || w.bump,
    running: cursor < s.program.length && !w.bump && !solved(l, w),
  };
}
export const engine: LearnEngine<CrabState> = {
  id: "crab-commands",
  name: "Crab Commands",
  island: "coding",
  tagline: "Plan the crab's path, then Go!",
  description: "Tap arrow cards to lead the crab to its shell and home. Footprints show the path before you press Go.",
  help: "Tap arrow cards to plan the crab's walk. Footprints on the sand show where it will go, and a red mark shows where it would bump. Press Go to watch it walk. Tap a card in your plan to replace it, insert a card before it, or remove it. Gentle uses arrows that point the way. Growing uses Walk and Turn: the crab walks the way it faces. Challenge adds Again ×2, which does the card before it two more times. With a grown-up, take turns adding cards. The first beach is short and later ones grow. No timer and no move limit.",
  helpAudio: "crab-commands-help",
  introAudio: "crab-commands-intro",
  modes: ["solo", "together"],
  color: "#B0563A",
  surface: "#FBE6DC",
  skills: {
    "think.sequence": "Putting steps in order",
    "think.debug": "Finding and fixing a step",
    "think.loops": "Repeating steps",
  },
  paceHelp: {
    easy: "Arrow cards. Short beaches first.",
    medium: "Walk and turn cards.",
    hard: "Add Again ×2 to repeat a card.",
  },
  // New Level 4–5 rounds play real beaches; a saved Level 4–5 board round still opens on its board.
  nativeStages: true,
  levelNames: [
    { name: "Follow the arrows", description: "Build arrow paths on three beaches, from short to longer." },
    { name: "Walk and turn", description: "Plan paths using forward, left turns and right turns." },
    { name: "Do it again", description: "Use Again ×2 to repeat the previous command two more times." },
    { name: "Find & fix a bug", description: "Each beach opens with a plan that has one bug. Find it, fix it, and Go." },
    { name: "Repeat whole blocks", description: "The plan tray is too small for single cards. Build Repeat blocks to fit." },
  ],
  create: (o, c) => {
    // One beach from each tier, easiest first, so the first beach is two or three cards.
    const ids = ([0, 1, 2] as const).map(
      (tier) => pickItems(levels.filter((l) => inPool(l, o) && l.tier === tier && !l.retired), c.skills, 1, c.rng, c.today)[0].id
    );
    const opening = [...(levels.find((l) => l.id === ids[0])!.starter ?? [])];
    return { levels: ids, completed: [], program: opening, cursor: 0, running: false, starter: c.starter, cards: opening.length, debugging: false };
  },
  validate: (x, o): x is CrabState => {
    if (x && typeof x === 'object' && 'blockDraft' in x) {
      const { blockDraft, ...fields } = x;
      const legacy = fields as CrabState;
      if (!readProgram(blockDraft) || typeof legacy.running !== 'boolean') return false;
      // A stopped prefix is a deliberate single-step pause only in the K7 draft form.
      const manual = Array.isArray(legacy.program) && Number.isInteger(legacy.cursor) && legacy.cursor > 0 && legacy.cursor < legacy.program.length && Array.isArray(legacy.levels) && levels.some(l => l.id === legacy.levels[Math.min(Array.isArray(legacy.completed) ? legacy.completed.length : 0, 2)]);
      let validation = legacy;
      if (manual) { const walker = run(currentLevel(legacy as CrabState), legacy.program.slice(0, legacy.cursor)); if (!walker.bump && !solved(currentLevel(legacy as CrabState), walker)) validation = {...legacy,running:true}; }
      if (!validRound(validation, o, true)) return false;
      const level = currentLevel(legacy), decoded = readCrabDraft(blockDraft, level);
      return !!decoded && JSON.stringify(decoded.plan) === JSON.stringify(legacy.program) && (level.tray === undefined || (nodeCost(decoded.program) <= level.tray && trayTools(decoded.program))) && sessionBytes(x) <= 4096;
    }
    return validRound(x, o, false);
  },
  outcome: (s) => (s.completed.length === 3 ? "done" : null),
  turn: (s) => ((s.starter + s.cards) % 2) as 0 | 1,
};
/** A Level 5 board offers cards and Repeat only (at the editor's counts): no songs and no condition. */
const trayTools = (p: Program): boolean => paletteRepeats(p) && !p.songs.length && !JSON.stringify(p.body).includes('"call"') && !JSON.stringify(p.body).includes('"if"');
/** The flat fields of a round. A tray beach's flat plan is a block plan of single cards, so it fits the tray too. */
function validRound(x: unknown, o: LearnOptions, drafted: boolean): x is CrabState {
    if (!exact(x, ["levels", "completed", "program", "cursor", "running", "starter", "cards", "debugging"]))
      return false;
    const s = x as CrabState,
      validProgram = (p: unknown, l: Level | undefined): p is Command[] =>
        !!l && Array.isArray(p) && p.length <= 80 && p.every((c) => levelCommands(l).includes(c));
    if (
      typeof s.debugging !== "boolean" ||
      !prediction(s.starter) ||
      !integer(s.cards, 0, 1000000) ||
      !Array.isArray(s.levels) ||
      s.levels.length !== 3 ||
      new Set(s.levels).size !== 3 ||
      !s.levels.every((id) => levels.some((l) => l.id === id && inPool(l, o))) ||
      !Array.isArray(s.completed) ||
      s.completed.length > 3 ||
      !s.completed.every(
        (p, i) =>
          validProgram(p, levels.find((l) => l.id === s.levels[i])) &&
          solved(levels.find((l) => l.id === s.levels[i])!, run(levels.find((l) => l.id === s.levels[i])!, p)) &&
          p.every(
            (_, j) =>
              !solved(
                levels.find((l) => l.id === s.levels[i])!,
                run(levels.find((l) => l.id === s.levels[i])!, p.slice(0, j))
              )
          )
      ) ||
      !validProgram(s.program, currentLevel(s)) ||
      !integer(s.cursor, 0, s.program.length) ||
      typeof s.running !== "boolean"
    )
      return false;
    const l = currentLevel(s),
      w = run(l, s.program.slice(0, s.cursor));
    if (!drafted && l.tray !== undefined && s.program.length > l.tray) return false;
    const previous = s.cursor > 0 ? run(l, s.program.slice(0, s.cursor - 1)) : null;
    return (
      s.cards >= s.program.length + s.completed.reduce((n, p) => n + p.length, 0) &&
      (!previous || (!previous.bump && !solved(l, previous))) &&
      (!w.bump || s.debugging) &&
      (s.cursor === 0 || s.running || w.bump || solved(l, w) || s.cursor === s.program.length) &&
      (!s.running || (s.completed.length < 3 && s.cursor < s.program.length && !w.bump && !solved(l, w))) &&
      (s.completed.length < 3 || (s.program.length === 0 && s.cursor === 0 && !s.running))
    );
}
/** Bank a won beach and open the next one; a Level 4 beach opens with its own planted bug. */
export function nextBeach(s: CrabState): CrabState {
  const { blockDraft: _draft, ...legacy } = s;
  const completed = [...s.completed, s.program.slice(0, s.cursor)];
  const following = completed.length < 3 ? levels.find((l) => l.id === s.levels[completed.length])?.starter ?? [] : [];
  return { ...legacy, completed, program: [...following], cursor: 0, running: false, debugging: false, cards: Math.min(1000000, s.cards + following.length) };
}
