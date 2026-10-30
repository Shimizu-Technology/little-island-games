import type { LearnEngine } from "../../types";
import { levelOf } from "../../levelOptions";
export type AlgebraTask = { kind: "pattern" | "depth" | "expression" | "balance" | "two-step" | "inequality"; a: number; b: number; extra: number; answer: number };
export type AlgebraState = { version: 1; level: number; tasks: AlgebraTask[]; index: number; value: number; offset: number; divided: boolean; helped: boolean };
const pick = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
export const makeTask = (l: number, r: () => number, index = 0): AlgebraTask => {
  if (l === 1) { const a = pick(r, 1, 12), b = pick(r, 2, 5); return { kind: "pattern", a, b, extra: 3, answer: a + b * 3 }; }
  if (l === 2) { const a = pick(r, -9, 4), b = pick(r, -6, 6) || 2; return { kind: "depth", a, b, extra: 0, answer: a + b }; }
  if (l === 3) { const a = pick(r, 1, 8), b = pick(r, 2, 6), extra = pick(r, 2, 4); return { kind: "expression", a, b, extra, answer: a + b * extra }; }
  if (l === 4) { const a = pick(r, 2, 9), answer = pick(r, 2, 15); return { kind: "balance", a, b: answer + a, extra: 1, answer }; }
  const a = pick(r, 2, 9), answer = pick(r, 2, 14), extra = pick(r, 2, 3); return { kind: index % 2 ? "inequality" : "two-step", a, b: answer * extra + a, extra, answer };
};
export const taskValid = (t: AlgebraTask, l: number) => !!t && typeof t === "object" && Object.keys(t).sort().join() === "a,answer,b,extra,kind" && [t.a, t.b, t.extra, t.answer].every(Number.isInteger) && (l === 1 ? t.kind === "pattern" && t.a >= 1 && t.a <= 12 && t.b >= 2 && t.b <= 5 && t.extra === 3 && t.answer === t.a + 3 * t.b : l === 2 ? t.kind === "depth" && t.a >= -9 && t.a <= 4 && t.b >= -6 && t.b <= 6 && t.b !== 0 && t.extra === 0 && t.answer === t.a + t.b : l === 3 ? t.kind === "expression" && t.a >= 1 && t.a <= 8 && t.b >= 2 && t.b <= 6 && t.extra >= 2 && t.extra <= 4 && t.answer === t.a + t.b * t.extra : l === 4 ? t.kind === "balance" && t.a >= 2 && t.a <= 9 && t.extra === 1 && t.answer >= 2 && t.answer <= 15 && t.b === t.answer + t.a : ["two-step", "inequality"].includes(t.kind) && t.a >= 2 && t.a <= 9 && t.extra >= 2 && t.extra <= 3 && t.answer >= 2 && t.answer <= 14 && t.b === t.answer * t.extra + t.a);
export const solved = (s: AlgebraState) => { const t = s.tasks[s.index]; if (!t) return false; if (t.kind === "balance" || t.kind === "two-step" || t.kind === "inequality") return s.offset === -t.a && (t.kind === "balance" || s.divided) && s.value === t.answer; return s.value === t.answer; };
export const engine: LearnEngine<AlgebraState> = {
  id: "treasure-algebra", name: "Treasure Algebra", island: "numbers", ages: [9, 14], ownLevels: true,
  tagline: "Balance the map to unlock treasure.", description: "Move on a sea-level line, discover patterns, and balance equations to open a chest.",
  help: "Use the big step controls to move on the number line. For equations, remove the same amount from both scale pans, then divide both sides when needed. Keep both sides balanced to find the hidden number. Hint is always available.",
  color: "#AC5C26", surface: "#FFF0CF", modes: ["solo", "together"],
  levelNames: [
    { name: "Map patterns", description: "Follow repeated steps to find the missing map marker." },
    { name: "Below sea level", description: "Walk positive and negative steps on a sea-level line." },
    { name: "Expression caves", description: "Read a variable box and multiply before adding." },
    { name: "Balance the chest", description: "Do the same operation to both scale pans." },
    { name: "Two-step treasure", description: "Undo two-step equations and simple inequality boundaries." },
  ],
  skills: { "num.patterns": "Number patterns", "num.integers": "Positive and negative numbers", "num.expressions": "Order of operations", "num.balance": "Balancing equations", "num.two-step": "Two-step equations and inequalities" },
  create: (o, c) => { const level = levelOf(o), tasks: AlgebraTask[] = [], seen = new Set<string>(); let tries = 0; while (tasks.length < 5 && tries++ < 100) { const t = makeTask(level, c.rng, tasks.length), key = `${t.kind}:${t.a}:${t.b}:${t.extra}`; if (!seen.has(key)) { seen.add(key); tasks.push(t); } } return { version: 1, level, tasks, index: 0, value: 0, offset: 0, divided: false, helped: false }; },
  validate: (x, o): x is AlgebraState => { if (!x || typeof x !== "object" || Object.keys(x).sort().join() !== "divided,helped,index,level,offset,tasks,value,version") return false; const s = x as AlgebraState; const t = s.tasks?.[s.index]; return s.version === 1 && s.level === levelOf(o) && Array.isArray(s.tasks) && s.tasks.length === 5 && s.tasks.every(v => taskValid(v, s.level)) && Number.isInteger(s.index) && s.index >= 0 && s.index <= 5 && Number.isInteger(s.value) && s.value >= -20 && s.value <= 100 && Number.isInteger(s.offset) && s.offset >= -20 && s.offset <= 20 && typeof s.divided === "boolean" && typeof s.helped === "boolean" && (s.index < 5 || (s.value === 0 && s.offset === 0 && !s.divided)) && (!t || t.kind === "balance" || t.kind === "two-step" || t.kind === "inequality" || (s.offset === 0 && !s.divided)); },
  outcome: s => s.index === 5 ? "done" : null,
};
