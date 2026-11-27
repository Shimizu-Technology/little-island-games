import type { LearnEngine } from "../../types";
import { levelOf } from "../../levelOptions";
import { blank, frameOf, roundPicks, validV3, type TideV3 } from "./school";
export type { TideV3 } from "./school";

type Color = "blue" | "coral";
type Size = "big" | "small";
type Kind = "fish" | "shell";
export type Item = { color: Color; size: Size; kind: Kind; bell: boolean };
export type Rule = { first: string; join: string; second: string; action: string };
export type Task = { items: Item[]; target: Rule; prompt: string; slots: (keyof Rule)[] };
/** Rounds saved before C4 (versions 1 and 2): seeded tasks, kept exactly as they were made. */
export type LegacyTide = { version: 1 | 2; level: number; seed: number; index: number; total: 4; rule: Rule; running: number; helped: boolean };
/** New rounds are version 3 (C4, school.ts): certified belts. */
export type TideState = LegacyTide | TideV3;
export const isV3 = (s: TideState): s is TideV3 => s.version === 3;
const terms = ["blue", "coral", "big", "small", "fish", "shell", "bell"];
export const choices: Record<keyof Rule, string[]> = {
  first: terms, join: ["and", "or", "then"], second: terms, action: ["left", "right", "count left"],
};
const empty: Rule = { first: "", join: "", second: "", action: "" };
const hash = (seed: number, index: number, salt: number) => (Math.imul(seed + index * 7919 + salt * 104729, 1664525) >>> 0) % 100000;
export function taskAt(level: number, seed: number, index: number, version: 1 | 2 = 2): Task {
  const n = hash(seed, index, level), flip = n % 2, color = flip ? "coral" : "blue", size = n % 3 ? "big" : "small";
  const first = level === 1 ? color : level === 2 ? size : level === 3 ? color : level === 4 ? "bell" : size;
  const second = level === 3 ? size : level >= 4 ? color : "";
  const join = level === 3 ? (index % 2 ? "or" : "and") : level >= 4 ? "then" : "";
  const action = level === 4 && index % 2 ? "count left" : "left";
  const target = { first, join, second, action };
  const slots: (keyof Rule)[] = level >= 3 ? ["first", "join", "second", "action"] : ["first", "action"];
  const items: Item[] = Array.from({ length: 4 + Math.min(level, 3) }, (_, i) => ({
    color: (i + Math.floor(n / 5)) % 2 ? "blue" : "coral",
    size: (i + Math.floor(n / 13)) % 2 ? "big" : "small",
    kind: (i + Math.floor(n / 29)) % 2 ? "fish" : "shell",
    bell: (i + Math.floor(n / 7)) % 3 === 0,
  }));
  // Every belt contains both routes, including an event and a nested condition.
  if (level === 4) { items[0].bell = true; items[0].color = color as Color; items[1].bell = false; items[2].bell = true; items[2].color = color === "blue" ? "coral" : "blue"; }
  if (level === 3 && version === 1) { items[0].color = color as Color; items[0].size = size as Size; items[1].color = color === "blue" ? "coral" : "blue"; items[1].size = size === "big" ? "small" : "big"; }
  if (level === 3 && version === 2) {
    // Both, neither, first only, second only: AND and OR always differ.
    for (let i = 0; i < 4; i++) {
      items[i].color = (i === 0 || i === 2 ? color : color === "blue" ? "coral" : "blue") as Color;
      items[i].size = (i === 0 || i === 3 ? size : size === "big" ? "small" : "big") as Size;
    }
  }
  if (level === 5) { items[0].size = size as Size; items[0].color = color as Color; items[1].size = size as Size; items[1].color = color === "blue" ? "coral" : "blue"; }
  return { items, target, slots, prompt: level === 4 ? `First, when the bell rings, open the gate. Then check for ${color}. Send matching catches left${action === "count left" ? " and count them" : ""}; others go right.` : level === 5 ? `If ${first}, check if ${second}. Only then send left. Otherwise send right.` : `Send ${first}${second ? ` ${join} ${second}` : ""} left. Everything else goes right.` };
}
export function matches(item: Item, term: string): boolean {
  return term === item.color || term === item.size || term === item.kind || (term === "bell" && item.bell);
}
export function route(item: Item, rule: Rule): "left" | "right" {
  const a = matches(item, rule.first), b = matches(item, rule.second);
  const yes = rule.join === "and" || rule.join === "then" ? a && b : rule.join === "or" ? a || b : a;
  return yes ? (rule.action === "right" ? "right" : "left") : (rule.action === "right" ? "left" : "right");
}
/** running is the next catch to process; count only catches already processed. */
export function counterAt(s: LegacyTide): number {
  if (s.index >= 4 || s.rule.action !== "count left") return 0;
  return taskAt(s.level,s.seed,s.index,s.version).items.slice(0,Math.max(0,s.running)).filter(item => route(item,s.rule) === "left").length;
}
export function advance(s: LegacyTide): LegacyTide {
  const t = taskAt(s.level, s.seed, s.index, s.version);
  if (s.running < 0) return s;
  if (s.running < t.items.length) return { ...s, running: s.running + 1 };
  return { ...s, version: 2, index: s.index + 1, rule: empty, running: -1, helped: false };
}
export const complete = (s: TideState) => s.index >= 4;
export function ready(s: LegacyTide): boolean {
  const t = taskAt(s.level, s.seed, s.index, s.version);
  return t.slots.every((slot) => s.rule[slot] !== "");
}
export function correct(s: LegacyTide): boolean {
  const t = taskAt(s.level, s.seed, s.index, s.version);
  return t.items.every((item) => route(item, s.rule) === route(item, t.target)) && (s.level !== 4 || s.rule.action === t.target.action);
}
export const engine: LearnEngine<TideState> = {
  id: "tide-logic", name: "Tide Logic", island: "coding", ages: [7, 12], ownLevels: true,
  tagline: "Build rules for the dock sorter.", description: "Write if/else rules, then run the belt to sort every catch.",
  help: "Read where the catches should go, then tap each empty rule block and choose a word. Press Run to test your rule on the whole belt. Every wrong rule fails somewhere on the belt, and the sorter shows the first catch it sends the wrong way. From Level 3 the goal is in everyday words: turn it into AND or OR yourself. At Level 4 the bell can ring on a catch or on the catch before it. Help shows a clue first, then fixes one block, then shows the whole rule. Undo takes back a block, and Clear empties the rule.",
  spokenIntro: "Build a rule for the dock sorter, then run the belt!",
  spokenHelp: "Read or hear where the catches should go, then tap each empty rule block to choose a clue. Press Run the belt to test every catch. Tap Help for a clue or a step.",
  color: "#287A82", surface: "#E6F3F2", modes: ["solo", "together"],
  skills: { "think.code-condition": "Making if and else rules", "think.code-events": "Reacting to events", "think.code-logic": "Joining conditions" },
  levelNames: [
    { name: "Colour gates", description: "Sort by one colour." },
    { name: "Big or small", description: "Sort by size." },
    { name: "Two clues", description: "Turn everyday words into AND or OR." },
    { name: "The real bell", description: "Does the bell ring on this catch or the one before?" },
    { name: "Trace the rule", description: "Bell clues, then trace a catch before you run." },
  ],
  create: (o, c) => {
    const level = levelOf(o), prev = c.previous as Partial<TideV3> | undefined;
    const seen = prev?.version === 3 && prev.level === level && Array.isArray(prev.picks) ? prev.picks : [];
    return { version: 3, level, picks: roundPicks(c.rng, seen), index: 0, total: 4, rule: blank(frameOf(level)), running: -1, helped: false, hint: 0, undo: [], misses: 0 };
  },
  validate: (x, o): x is TideState => {
    if (!x || typeof x !== "object" || Array.isArray(x)) return false;
    if ((x as { version?: unknown }).version === 3) return validV3(x as Record<string, unknown>, levelOf(o));
    const s = x as LegacyTide;
    if (Object.keys(s).sort().join() !== "helped,index,level,rule,running,seed,total,version" || (s.version !== 1 && s.version !== 2) || s.level !== levelOf(o) || !Number.isInteger(s.seed) || s.seed < 0 || s.seed >= 100000 || !Number.isInteger(s.index) || s.index < 0 || s.index > 4 || s.total !== 4 || typeof s.helped !== "boolean") return false;
    if (!s.rule || typeof s.rule !== "object" || Object.keys(s.rule).sort().join() !== "action,first,join,second") return false;
    if (!(["first", "join", "second", "action"] as const).every((k) => s.rule[k] === "" || choices[k].includes(s.rule[k]))) return false;
    if (!Number.isInteger(s.running) || s.running < -1 || s.running > (s.index < 4 ? taskAt(s.level, s.seed, s.index, s.version).items.length : -1)) return false;
    if (s.index === 4) return s.running === -1 && Object.values(s.rule).every((v) => v === "");
    const slots = taskAt(s.level, s.seed, s.index, s.version).slots;
    if ((["first", "join", "second", "action"] as const).some((k) => !slots.includes(k) && s.rule[k] !== "")) return false;
    return s.running === -1 || (ready(s) && correct(s));
  },
  outcome: (s) => complete(s) ? "done" : null,
  // A version 3 round's own record of Help or a wrong run; legacy rounds keep the frame's flag.
  helpedWork: (s) => isV3(s) && (s.helped || s.misses > 0),
};
