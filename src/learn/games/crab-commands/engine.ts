import type { LearnEngine, Pace } from "../../types";
import { pickItems } from "../../skills";
import { exact, integer, prediction } from "../../kit/science";
export type Command = "up" | "right" | "down" | "left" | "forward" | "turn-left" | "turn-right" | "repeat";
export type Level = { id: string; pace: Pace; skill: string; rows: string[]; facing: number };
/** Hand-drawn beaches: C crab, S shell, H home rock, # sandcastle. */
export const levels: Level[] = [
  ["e1", ["C.S.H", ".##..", ".....", ".....", "....."]],
  ["e2", ["C#...", ".#...", ".S.H.", ".....", "....."]],
  ["e3", ["C.S..", "##.#.", "...H.", ".....", "....."]],
  ["e4", ["C....", ".##..", ".S#..", "..H..", "....."]],
  ["e5", ["C.#..", "..#..", "S.S.H", ".....", "....."]],
  ["e6", ["C..#H", ".S.#.", "...S.", ".###.", "....."]],
  ["e7", ["C#S.H", ".#.#.", "...S.", ".....", "....."]],
  ["e8", ["C....", "###S.", "S....", ".###.", "....H"]],
  ["m1", ["C.S.H", ".###.", ".....", ".....", "....."]],
  ["m2", ["C#...", ".#S..", "...#H", ".....", "....."]],
  ["m3", ["C..#H", "##.#.", "S..S.", ".###.", "....."]],
  ["m4", ["C.S..", ".#.#.", "...S.", ".###.", "....H"]],
  ["m5", ["C#...", ".#.#.", "S..#H", "##.#.", "..S.."]],
  ["m6", ["C...H", ".###.", ".S.S.", ".....", "....."]],
  ["m7", ["C.S#H", ".#.#.", "...S.", ".###.", "....."]],
  ["m8", ["C#..H", ".#.#.", "S..S.", ".#.#.", "....."]],
  ["h1", ["C...S", "####.", "H....", ".....", "....."]],
  ["h2", ["C.S..", "####.", "S...H", ".....", "....."]],
  ["h3", ["C...S", ".###.", ".S..H", ".....", "....."]],
  ["h4", ["C....", ".###S", "S...H", ".....", "....."]],
  ["h5", ["C.S..", ".###.", "S...H", ".....", "....."]],
  ["h6", ["C...H", ".###.", "S...S", ".....", "....."]],
  ["h7", ["C...S", "##.#.", "H..S.", ".....", "....."]],
  ["h8", ["C.S..", ".#.#.", "S#..H", "...#.", "....."]],
].map(([id, rows]) => ({
  id: id as string,
  rows: rows as string[],
  pace: (id as string).startsWith("e") ? "easy" : (id as string).startsWith("m") ? "medium" : "hard",
  skill: (id as string).startsWith("h")
    ? "think.loops"
    : ["e2", "e4", "m2", "m5"].includes(id as string)
      ? "think.debug"
      : "think.sequence",
  facing: 1,
}));
export const commands = (p: Pace): Command[] =>
  p === "easy"
    ? ["up", "right", "down", "left"]
    : p === "medium"
      ? ["forward", "turn-left", "turn-right"]
      : ["forward", "turn-left", "turn-right", "repeat"];
export type Walker = { pos: number; facing: number; shells: number; previous: Command | null; bump: boolean };
const cell = (l: Level, p: number) => l.rows[Math.floor(p / 5)]?.[p % 5];
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
  if (x < 0 || x > 4 || y < 0 || y > 4 || cell(l, y * 5 + x) === "#") return { ...w, previous: c, bump: true };
  const pos = y * 5 + x,
    shell = shellCells(l).indexOf(pos);
  return { pos, facing: dir, shells: w.shells | (shell < 0 ? 0 : 1 << shell), previous: c, bump: false };
}
export const solved = (l: Level, w: Walker) =>
  !w.bump && cell(l, w.pos) === "H" && w.shells === (1 << shellCells(l).length) - 1;
export const run = (l: Level, program: Command[]) => program.reduce((w, c) => step(l, w, c), start(l));
/** Breadth first search uses exactly the same step/loop semantics as Go. */
export function solve(l: Level): Command[] {
  const queue = [{ w: start(l), path: [] as Command[] }],
    seen = new Set<string>();
  for (let i = 0; i < queue.length; i++) {
    const { w, path } = queue[i];
    if (solved(l, w)) return path;
    for (const c of commands(l.pace)) {
      const n = step(l, w, c);
      if (n.bump) continue;
      const key = `${n.pos}/${n.facing}/${n.shells}/${n.previous}`;
      if (!seen.has(key)) {
        seen.add(key);
        queue.push({ w: n, path: [...path, c] });
      }
    }
  }
  return [];
}
export type CrabState = {
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
  island: "thinking",
  tagline: "Build a plan. Walk, collect, debug.",
  description: "Give a crab arrow cards to collect every shell and reach its home rock.",
  help: "Tap cards to make a program, then press Go. Tap a card in the strip to remove it. If the crab bumps, change that card and try again. Gentle uses compass arrows. Growing uses forward and turns. Challenge adds Repeat: do the previous card two more times. Together, alternate placing cards. Hint shows a shortest program. No move limit and no timer.",
  helpAudio: "crab-commands-help",
  modes: ["solo", "together"],
  color: "#B0563A",
  surface: "#FBE6DC",
  skills: {
    "think.sequence": "Putting steps in order",
    "think.debug": "Finding and fixing a step",
    "think.loops": "Repeating steps",
  },
  paceHelp: {
    easy: "Up, down, left and right.",
    medium: "Forward, turn left and turn right.",
    hard: "Repeat the previous card two more times.",
  },
  create: (o, c) => ({
    levels: pickItems(
      levels.filter((l) => l.pace === o.pace),
      c.skills,
      3,
      c.rng,
      c.today
    ).map((l) => l.id),
    completed: [],
    program: [],
    cursor: 0,
    running: false,
    starter: c.starter,
    cards: 0,
    debugging: false,
  }),
  validate: (x, o): x is CrabState => {
    if (!exact(x, ["levels", "completed", "program", "cursor", "running", "starter", "cards", "debugging"]))
      return false;
    const s = x as CrabState,
      validProgram = (p: unknown): p is Command[] =>
        Array.isArray(p) && p.length <= 80 && p.every((c) => commands(o.pace).includes(c));
    if (
      typeof s.debugging !== "boolean" ||
      !prediction(s.starter) ||
      !integer(s.cards, 0, 1000000) ||
      !Array.isArray(s.levels) ||
      s.levels.length !== 3 ||
      new Set(s.levels).size !== 3 ||
      !s.levels.every((id) => levels.some((l) => l.id === id && l.pace === o.pace)) ||
      !Array.isArray(s.completed) ||
      s.completed.length > 3 ||
      !s.completed.every(
        (p, i) =>
          validProgram(p) &&
          solved(levels.find((l) => l.id === s.levels[i])!, run(levels.find((l) => l.id === s.levels[i])!, p)) &&
          p.every(
            (_, j) =>
              !solved(
                levels.find((l) => l.id === s.levels[i])!,
                run(levels.find((l) => l.id === s.levels[i])!, p.slice(0, j))
              )
          )
      ) ||
      !validProgram(s.program) ||
      !integer(s.cursor, 0, s.program.length) ||
      typeof s.running !== "boolean"
    )
      return false;
    const l = currentLevel(s),
      w = run(l, s.program.slice(0, s.cursor));
    const previous = s.cursor > 0 ? run(l, s.program.slice(0, s.cursor - 1)) : null;
    return (
      s.cards >= s.program.length + s.completed.reduce((n, p) => n + p.length, 0) &&
      (!previous || (!previous.bump && !solved(l, previous))) &&
      (!w.bump || s.debugging) &&
      (s.cursor === 0 || s.running || w.bump || solved(l, w) || s.cursor === s.program.length) &&
      (!s.running || (s.completed.length < 3 && s.cursor < s.program.length && !w.bump && !solved(l, w))) &&
      (s.completed.length < 3 || (s.program.length === 0 && s.cursor === 0 && !s.running))
    );
  },
  outcome: (s) => (s.completed.length === 3 ? "done" : null),
  turn: (s) => ((s.starter + s.cards) % 2) as 0 | 1,
};
