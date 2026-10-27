import { nextRandom, type ArcadeEngine, type ArcadeResult } from "../../types";
import { canonicalLevel, finite, mathGate, record, runLevels, uint, validFact, type MathGate, type ScrollLevel } from "../scrolling/content";
export { runLevels, runLevel } from "../scrolling/content";
export type RunInput = { type: "left" | "right" | "jump" | "duck" | "idle" | "finish" } | { type: "lane"; lane: number } | { type: "helper"; value: boolean };
export type TrailRow = { z: number; lane: number; shellLane: number; kind: "coconut" | "crab" | "frond" | "line"; passed: boolean; fact: MathGate };
export type RunState = { level: ScrollLevel | "endless"; seed: number; helper: boolean; lane: number; poseLane: number; jump: number; duck: number; time: number; travel: number; cooldown: number; rows: TrailRow[]; passed: number; shells: number; score: number; bumps: number; status: "playing" | "cleared" | "stumbled" | "rest"; event: number; cue: "ready" | "step" | "jump" | "duck" | "shell" | "bump" | "answer" | "try"; feedback: number; helped: boolean };
export const runLearning = (s: RunState) => s.level !== "endless" && s.level.world === "learn";
function newRow(s: RunState, z: number): { seed: number; row: TrailRow } {
  let [seed, n] = nextRandom(s.seed); const lane = Math.floor(n * 3);
  [seed, n] = nextRandom(seed); const shellLane = (lane + 1 + Math.floor(n * 2)) % 3;
  [seed, n] = nextRandom(seed); const index = s.level === "endless" ? 8 : s.level.index, rank = s.level === "endless" ? 2 : s.level.rank;
  const kind = (["coconut", "crab", "frond", "line"] as const)[Math.floor(n * (rank ? 4 : Math.min(4, index)))];
  const fact = mathGate(seed, index); return { seed: fact.seed, row: { z, lane, shellLane, kind, passed: false, fact: fact.fact } };
}
export function createRun(level: RunState["level"], seed: number, helper = true): RunState {
  let s: RunState = { level, seed: seed >>> 0, helper, lane: 1, poseLane: 1, jump: 0, duck: 0, time: 0, travel: 0, cooldown: 0, rows: [], passed: 0, shells: 0, score: 0, bumps: 0, status: "playing", event: 0, cue: "ready", feedback: 0, helped: helper };
  const spacing = level === "endless" ? .48 : level.spacing;
  for (let i = 0; i < 5; i++) { const next = newRow(s, -.2 - i * spacing); s = { ...s, seed: next.seed, rows: [...s.rows, next.row] }; }
  // World one opens with an obstacle in the center and a shell on the left: show, then do.
  if (level !== "endless" && level.world === "w1") s.rows[0] = { ...s.rows[0], lane: 1, shellLane: 0, kind: level.index < 3 ? "coconut" : "frond" };
  return s;
}
export function runTransition(s: RunState, input: RunInput): RunState {
  if (s.status !== "playing" || !record(input) || typeof input.type !== "string") return s;
  if (input.type === "helper" && typeof input.value === "boolean") return { ...s, helper: input.value, helped: s.helped || input.value };
  if (input.type === "finish" && s.level === "endless") return { ...s, status: "rest" };
  if (input.type === "lane" && (!Number.isInteger(input.lane) || input.lane < 0 || input.lane > 2)) return s;
  const lane = input.type === "lane" ? input.lane : Math.max(0, Math.min(2, s.lane + (input.type === "left" ? -1 : input.type === "right" ? 1 : 0)));
  if (["left", "right", "lane"].includes(input.type)) return lane === s.lane ? s : { ...s, lane, event: s.event + 1, cue: "step" };
  if (input.type === "jump" && s.jump <= 0) return { ...s, jump: 1.1, duck: 0, event: s.event + 1, cue: "jump" };
  if (input.type === "duck" && s.duck <= 0) return { ...s, duck: 1.1, jump: 0, event: s.event + 1, cue: "duck" };
  return s;
}
export function rowSafe(s: RunState, row: TrailRow): boolean {
  if (runLearning(s)) return row.fact.choices[s.lane] === row.fact.answer;
  return s.lane !== row.lane || (["coconut", "crab"].includes(row.kind) ? s.jump > .15 : s.duck > .1);
}
export function runStep(before: RunState, _input: RunInput, dt: number): RunState {
  if (before.status !== "playing" || !finite(dt, .000001, .1)) return before;
  let s: RunState = { ...before, time: before.time + dt, poseLane: before.poseLane + (before.lane - before.poseLane) * Math.min(1, dt * 15), jump: Math.max(0, before.jump - dt), duck: Math.max(0, before.duck - dt), cooldown: Math.max(0, before.cooldown - dt), feedback: Math.max(0, before.feedback - dt) };
  const speed = (s.level === "endless" ? Math.min(.38, .24 + s.passed * .002) : s.level.speed * 1.4) * (s.helper ? .72 : 1), distance = s.cooldown ? 0 : speed * dt;
  s.travel += distance;
  s.rows = s.rows.map(row => ({ ...row, z: row.z + distance }));
  for (let i = 0; i < s.rows.length; i++) {
    const row = s.rows[i]; if (row.passed || row.z < .88) continue;
    const learn = runLearning(s), safe = rowSafe(s, row);
    if (!safe) {
      s = { ...s, bumps: s.bumps + 1, helped: s.helped || learn, cooldown: 1.1, status: s.helper || learn ? "playing" : "stumbled", event: s.event + 1, cue: learn ? "try" : "bump", feedback: .9 };
    } else {
      const shell = learn || s.lane === row.shellLane;
      s = { ...s, passed: s.passed + 1, shells: s.shells + (shell ? 1 : 0), score: Math.min(99999999, s.score + 40 + (shell ? 20 : 0)), event: s.event + 1, cue: learn ? "answer" : "shell", feedback: .7 };
    }
    if (!safe && learn) {
      const retryDistance = s.level === "endless" ? .6 : s.level.spacing;
      s.rows = s.rows.map(r => ({ ...r, z: r.z - retryDistance }));
      break;
    }
    s.rows[i] = { ...row, passed: true };
    if (s.status !== "playing") return s;
  }
  // Recycle exactly five rows. A stumble repeats a marker rather than spending a life.
  const spacing = s.level === "endless" ? .48 : s.level.spacing;
  s.rows = s.rows.map(row => { if (row.z < 1.2) return row; const next = newRow(s, Math.min(...s.rows.map(r => r.z)) - spacing); s.seed = next.seed; return next.row; });
  if (s.level !== "endless" && s.passed >= s.level.target) s.status = "cleared";
  return s;
}
export function runResult(s: RunState): ArcadeResult | null {
  if (s.status === "playing") return null;
  const cleared = s.status === "cleared", target = s.level === "endless" ? Infinity : s.level.target;
  return { cleared, outcome: cleared ? "cleared" : s.status === "rest" ? "stopped" : "game-over", stars: cleared ? s.shells >= target ? 3 : s.shells >= Math.ceil(target * .5) ? 2 : 1 : 0, score: s.score, detail: `${s.passed} ${runLearning(s) ? "answers" : "trail markers"} · ${s.shells} shells` };
}
export function validRun(v: unknown): v is RunState {
  if (!record(v) || !canonicalLevel(v.level, runLevels) || !uint(v.seed, 0xffffffff) || typeof v.helper !== "boolean" || typeof v.helped !== "boolean" || !uint(v.lane, 2) || !finite(v.poseLane, 0, 2) || !Array.isArray(v.rows) || v.rows.length !== 5) return false;
  return [v.time, v.travel].every(n => finite(n, 0, 1e10)) && [v.jump, v.duck, v.cooldown, v.feedback].every(n => finite(n, 0, 2)) && [v.passed, v.shells, v.score, v.bumps, v.event].every(n => uint(n)) && (v.shells as number) <= (v.passed as number) && ["playing", "cleared", "stumbled", "rest"].includes(v.status as string) && ["ready", "step", "jump", "duck", "shell", "bump", "answer", "try"].includes(v.cue as string) && v.rows.every(row => record(row) && finite(row.z, -4, 1.3) && uint(row.lane, 2) && uint(row.shellLane, 2) && row.lane !== row.shellLane && typeof row.passed === "boolean" && ["coconut", "crab", "frond", "line"].includes(row.kind as string) && validFact(row.fact));
}
export const runEngine: ArcadeEngine<RunState, RunInput, ScrollLevel> = { create: createRun, reduce: runTransition, step: runStep, result: runResult, validate: validRun };
