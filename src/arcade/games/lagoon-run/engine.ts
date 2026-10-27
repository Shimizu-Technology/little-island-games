import { nextRandom, type ArcadeEngine, type ArcadeResult } from "../../types";
import { configureLives, createLives, hitLives, stepLives, validLives, type Lives } from "../../lives";
import { canonicalLevel, finite, mathGate, record, runLevels, uint, validFact, type MathGate, type ScrollLevel } from "../scrolling/content";
export { runLevels, runLevel } from "../scrolling/content";
export type RunInput = { type: "left" | "right" | "jump" | "duck" | "idle" | "finish" } | { type: "lane"; lane: number } | { type: "helper"; value: boolean };
export type HazardKind = "coconut" | "crab" | "frond" | "line";
export type TrailRow = { z: number; lane: number; second: number; shellLane: number; kind: HazardKind; secondKind: HazardKind; moving: boolean; crossing: boolean; third: boolean; phase: number; passed: boolean; fact: MathGate };
export type RunState = { level: ScrollLevel | "endless"; seed: number; helper: boolean; lane: number; poseLane: number; laneFrom: number; laneTime: number; jump: number; duck: number; landing: number; time: number; travel: number; cooldown: number; rows: TrailRow[]; passed: number; shells: number; score: number; lastGain: number; bumps: number; status: "playing" | "cleared" | "stumbled" | "rest"; event: number; cue: "ready" | "step" | "jump" | "duck" | "shell" | "bump" | "answer" | "try"; feedback: number; helped: boolean; lives: Lives; command: number };
export const JUMP_SECONDS = .55, SLIDE_SECONDS = .6, LANE_SECONDS = .12;
export function runLearning(s: RunState) { "worklet"; return s.level !== "endless" && s.level.world === "learn"; }
export function jumpHeight(s: RunState) { "worklet"; return s.jump > 0 ? Math.sin((1 - s.jump / JUMP_SECONDS) * Math.PI) : 0; }
function newRow(s: RunState, z: number, serial: number): { seed: number; row: TrailRow } {
  "worklet";
  let [seed, n] = nextRandom(s.seed); const lane = serial === 0 ? 1 : Math.floor(n * 3);
  [seed, n] = nextRandom(seed); const shellLane = (lane + 1 + Math.floor(n * 2)) % 3;
  const rank = s.level === "endless" ? 5 : s.level.rank, learn = runLearning(s);
  const kinds: HazardKind[] = rank === 0 ? ["coconut"] : rank === 1 ? ["coconut", "frond"] : ["coconut", "frond", "crab", "line"];
  const kind = kinds[serial % kinds.length], fact = mathGate(seed, s.level === "endless" ? 8 : s.level.index);
  const two = !learn && serial >= 3 && (rank >= 3 || serial % 3 === 0);
  return { seed: fact.seed, row: { z, lane, second: two ? 3 - lane - shellLane : -1, shellLane, kind, secondKind: rank >= 3 ? kind === "frond" || kind === "line" ? "coconut" : "frond" : kind, moving: !learn && rank >= 2 && kind === "crab", crossing: rank >= 4 && two && Math.abs((3 - lane - shellLane) - lane) === 1, third: !learn && rank >= 5 && serial % 4 === 3, phase: n * Math.PI * 2, passed: false, fact: fact.fact } };
}
export function createRun(level: RunState["level"], seed: number, helper = false): RunState {
  let s: RunState = { level, seed: seed >>> 0, helper, lane: 1, poseLane: 1, laneFrom: 1, laneTime: 0, jump: 0, duck: 0, landing: 0, time: 0, travel: 0, cooldown: 0, rows: [], passed: 0, shells: 0, score: 0, lastGain: 0, bumps: 0, status: "playing", event: 0, cue: "ready", feedback: 0, helped: helper, lives: createLives(helper), command: 0 };
  const spacing = level === "endless" ? .53 : level.spacing;
  for (let i = 0; i < 5; i++) { const next = newRow(s, .16 - i * spacing, i); s = { ...s, seed: next.seed, rows: [...s.rows, next.row] }; }
  return s;
}
export function runTransition(s: RunState, input: RunInput): RunState {
  "worklet";
  if (s.status !== "playing" || !record(input)) return s;
  if (input.type === "helper" && typeof input.value === "boolean") return { ...s, helper: input.value, helped: s.helped || input.value, lives: configureLives(s.lives, input.value) };
  if (input.type === "finish" && s.level === "endless") return { ...s, status: "rest" };
  if (input.type === "lane" && (!Number.isInteger(input.lane) || input.lane < 0 || input.lane > 2)) return s;
  const lane = input.type === "lane" ? input.lane : Math.max(0, Math.min(2, s.lane + (input.type === "left" ? -1 : input.type === "right" ? 1 : 0)));
  if (["left", "right", "lane"].includes(input.type)) return lane === s.lane ? s : { ...s, lane, laneFrom: s.poseLane, laneTime: LANE_SECONDS, event: s.event + 1, cue: "step" };
  if (input.type === "jump" && s.jump <= 0) return { ...s, jump: JUMP_SECONDS, duck: 0, event: s.event + 1, cue: "jump" };
  if (input.type === "duck" && s.duck <= 0) return { ...s, duck: SLIDE_SECONDS, jump: 0, event: s.event + 1, cue: "duck" };
  return s;
}
/** Moving crabs remain in their blocked lane, crossing its width; shell trails stay safe/readable. */
export function obstacleLane(row: TrailRow, time: number) { "worklet"; return row.moving && row.crossing ? row.lane + (row.second - row.lane) * (.5 + Math.sin(time * 3 + row.phase) * .5) : row.lane + (row.moving ? Math.sin(time * 3 + row.phase) * .34 : 0); }
export function rowSafe(s: RunState, row: TrailRow): boolean {
  "worklet";
  if (runLearning(s)) return row.fact.choices[Math.round(s.poseLane)] === row.fact.answer;
  const avoids = (lane: number, kind: HazardKind) => { "worklet"; return lane < 0 || Math.abs(s.poseLane - lane) > .46 || (kind === "coconut" || kind === "crab" ? jumpHeight(s) > .42 : s.duck > .08); };
  return avoids(obstacleLane(row, s.time), row.kind) && avoids(row.second, row.secondKind) && (!row.third || avoids(row.shellLane, "coconut"));
}
export function runSpeed(s: RunState) {
  "worklet";
  return (s.level === "endless" ? Math.min(.8, .5 + s.passed * .002) : s.level.speed) * (s.helper ? .88 : 1) * (s.level === "endless" || runLearning(s) ? 1 : 1 + .18 * Math.min(1, s.passed / s.level.target));
}
export function runStep(before: RunState, _input: RunInput, dt: number): RunState {
  "worklet";
  if (before.status !== "playing" || !finite(dt, .000001, .1)) return before;
  const laneTime = Math.max(0, before.laneTime - dt), t = 1 - laneTime / LANE_SECONDS;
  let s: RunState = { ...before, lives: stepLives(before.lives, dt), time: before.time + dt, laneTime, poseLane: before.laneFrom + (before.lane - before.laneFrom) * (1 - (1 - t) ** 3), jump: Math.max(0, before.jump - dt), duck: Math.max(0, before.duck - dt), landing: before.jump > 0 && before.jump <= dt ? .13 : Math.max(0, before.landing - dt), cooldown: Math.max(0, before.cooldown - dt), feedback: Math.max(0, before.feedback - dt) };
  const distance = runSpeed(s) * dt; s.travel += distance;
  s.rows = s.rows.map(row => ({ ...row, z: row.z + distance }));
  for (let i = 0; i < s.rows.length; i++) {
    const row = s.rows[i]; if (row.passed || row.z < 1) continue;
    const learn = runLearning(s), safe = rowSafe(s, row);
    if (!safe && learn) {
      s = { ...s, bumps: s.bumps + 1, helped: true, event: s.event + 1, cue: "try", feedback: .45 };
      const spacing = s.level === "endless" ? .6 : s.level.spacing;
      s.rows = s.rows.map(r => ({ ...r, z: r.z - spacing })); break;
    }
    if (!safe && !s.lives.invulnerable) {
      const lives = hitLives(s.lives);
      s = { ...s, lives, lastGain: 0, bumps: s.bumps + 1, cooldown: .3, jump: 0, duck: 0, status: lives.hearts ? "playing" : "stumbled", event: s.event + 1, cue: "bump", feedback: .45 };
    } else if (safe) {
      const shell = learn || Math.abs(s.poseLane - row.shellLane) < .35;
      s = { ...s, passed: s.passed + 1, shells: s.shells + (shell ? 3 : 0), score: Math.min(99999999, s.score + 10 + (shell ? 30 : 0)), lastGain: shell ? 40 : 10, event: s.event + 1, cue: learn ? "answer" : "shell", feedback: .45 };
    }
    s.rows[i] = { ...row, passed: true };
    if (s.status !== "playing") return s;
  }
  const spacing = s.level === "endless" ? .53 : s.level.spacing;
  for (let i = 0; i < s.rows.length; i++) if (s.rows[i].z > 1.18) {
    const next = newRow(s, Math.min(...s.rows.map(r => r.z)) - spacing, Math.round(s.travel / spacing) + 5 + i);
    s.seed = next.seed; s.rows[i] = next.row; s.event++;
  }
  if (s.level !== "endless" && s.passed >= s.level.target) s.status = "cleared";
  return s;
}
export function runResult(s: RunState): ArcadeResult | null {
  "worklet";
  if (s.status === "playing") return null;
  const cleared = s.status === "cleared", target = s.level === "endless" ? Infinity : s.level.target;
  return { cleared, outcome: cleared ? "cleared" : s.status === "rest" ? "stopped" : "game-over", stars: cleared ? s.bumps === 0 && s.shells >= Math.ceil(target * 3 * .85) ? 3 : s.bumps <= 1 ? 2 : 1 : 0, score: s.score, detail: `${s.passed} ${runLearning(s) ? "answers" : "trail markers"} · ${s.shells} shells · ${s.bumps} hits` };
}
export function validRun(v: unknown): v is RunState {
  if (!record(v) || !canonicalLevel(v.level, runLevels) || !uint(v.seed, 0xffffffff) || typeof v.helper !== "boolean" || typeof v.helped !== "boolean" || !validLives(v.lives) || !uint(v.command) || !uint(v.lane, 2) || !finite(v.poseLane, 0, 2) || !finite(v.laneFrom, 0, 2) || !finite(v.laneTime, 0, LANE_SECONDS) || !finite(v.landing, 0, .13) || !Array.isArray(v.rows) || v.rows.length !== 5) return false;
  const keys = "level,seed,helper,lane,poseLane,laneFrom,laneTime,jump,duck,landing,time,travel,cooldown,rows,passed,shells,score,lastGain,bumps,status,event,cue,feedback,helped,lives,command".split(",");
  return Object.keys(v).length === keys.length && Object.keys(v).every(k => keys.includes(k)) && [v.time, v.travel].every(n => finite(n, 0, 1e10)) && finite(v.jump, 0, JUMP_SECONDS) && finite(v.duck, 0, SLIDE_SECONDS) && [v.cooldown, v.feedback].every(n => finite(n, 0, 1.2)) && [v.passed, v.shells, v.score, v.lastGain, v.bumps, v.event].every(n => uint(n)) && (v.shells as number) <= (v.passed as number) * 3 && (runLearning(v as RunState) || v.bumps === v.lives.hit) && (v.status === "stumbled" ? v.lives.hearts === 0 : v.lives.hearts > 0) && ["playing", "cleared", "stumbled", "rest"].includes(v.status as string) && ["ready", "step", "jump", "duck", "shell", "bump", "answer", "try"].includes(v.cue as string) && v.rows.every(row => record(row) && Object.keys(row).length === 12 && finite(row.z, -4, 1.3) && uint(row.lane, 2) && uint(row.shellLane, 2) && Number.isInteger(row.second) && finite(row.second, -1, 2) && row.lane !== row.shellLane && row.second !== row.shellLane && row.second !== row.lane && typeof row.passed === "boolean" && typeof row.moving === "boolean" && typeof row.crossing === "boolean" && typeof row.third === "boolean" && finite(row.phase, 0, Math.PI * 2) && ["coconut", "crab", "frond", "line"].includes(row.kind as string) && ["coconut", "crab", "frond", "line"].includes(row.secondKind as string) && validFact(row.fact));
}
export const runEngine: ArcadeEngine<RunState, RunInput, ScrollLevel> = { create: createRun, reduce: runTransition, step: runStep, result: runResult, validate: validRun };
