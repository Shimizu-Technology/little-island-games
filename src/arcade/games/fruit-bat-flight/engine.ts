import { nextRandom, type ArcadeEngine, type ArcadeResult } from "../../types";
import { canonicalLevel, finite, flightLevels, mathGate, record, uint, validFact, type MathGate, type ScrollLevel } from "../scrolling/content";
export { flightLevels, flightLevel } from "../scrolling/content";
export type FlightInput = { type: "flap" } | { type: "idle" } | { type: "helper"; value: boolean } | { type: "finish" };
export type PalmGate = { x: number; center: number; fruit: boolean; passed: boolean; fact: MathGate };
export type FlightState = { level: ScrollLevel | "endless"; seed: number; helper: boolean; y: number; vy: number; time: number; travel: number; cooldown: number; flap: number; gates: PalmGate[]; passed: number; fruit: number; score: number; bumps: number; status: "playing" | "cleared" | "bumped" | "rest"; event: number; cue: "ready" | "flap" | "fruit" | "bump" | "answer" | "try"; feedback: number; helped: boolean };
const PLAYER_X = .24;
export const flightLearning = (s: FlightState) => s.level !== "endless" && s.level.world === "learn";
function newGate(s: FlightState, x: number): { seed: number; gate: PalmGate } {
  let [seed, n] = nextRandom(s.seed); const rank = s.level === "endless" ? 2 : s.level.rank;
  const center = .5 + (n - .5) * (.12 + rank * .1);
  const fact = mathGate(seed, s.level === "endless" ? 8 : s.level.index); seed = fact.seed;
  return { seed, gate: { x, center, fruit: true, passed: false, fact: fact.fact } };
}
export function createFlight(level: FlightState["level"], seed: number, helper = true): FlightState {
  let s: FlightState = { level, seed: seed >>> 0, helper, y: .5, vy: 0, time: 0, travel: 0, cooldown: 0, flap: 0, gates: [], passed: 0, fruit: 0, score: 0, bumps: 0, status: "playing", event: 0, cue: "ready", feedback: 0, helped: helper };
  const spacing = level === "endless" ? .55 : level.spacing;
  for (let i = 0; i < 4; i++) { const next = newGate(s, 1.1 + i * spacing); s = { ...s, seed: next.seed, gates: [...s.gates, next.gate] }; }
  return s;
}
export const flightGap = (s: FlightState) => Math.min(.76, (s.level === "endless" ? .38 : s.level.gap) + (s.helper ? .14 : 0));
export function flightTransition(s: FlightState, input: FlightInput): FlightState {
  if (s.status !== "playing") return s;
  if (input.type === "helper" && typeof input.value === "boolean") return { ...s, helper: input.value, helped: s.helped || input.value };
  if (input.type === "finish" && s.level === "endless") return { ...s, status: "rest" };
  if (input.type !== "flap") return s;
  // A very short input buffer allows fast taps without launching the bat off-screen.
  if (s.flap > .08) return s;
  return { ...s, vy: s.helper ? -.30 : -.34, flap: .16, event: s.event + 1, cue: "flap" };
}
function bump(s: FlightState, center: number, wrong = false): FlightState {
  const gentle = s.helper || flightLearning(s);
  return { ...s, y: gentle ? Math.max(.08, Math.min(.92, center)) : s.y, vy: gentle ? -.1 : s.vy, cooldown: gentle ? 1.1 : 0, bumps: s.bumps + 1, fruit: Math.max(0, s.fruit - (wrong ? 0 : 1)), status: gentle ? "playing" : "bumped", event: s.event + 1, cue: wrong ? "try" : "bump", feedback: .85 };
}
export function flightStep(before: FlightState, _input: FlightInput, dt: number): FlightState {
  if (before.status !== "playing" || !finite(dt, .000001, .1)) return before;
  let s = { ...before, time: before.time + dt, cooldown: Math.max(0, before.cooldown - dt), flap: Math.max(0, before.flap - dt), feedback: Math.max(0, before.feedback - dt) };
  const learn = flightLearning(s), speed = (s.level === "endless" ? Math.min(.32, .21 + s.passed * .002) : s.level.speed) * (s.helper ? .78 : 1);
  const gust = s.level !== "endless" && s.level.storm ? Math.sin(s.time * 1.7) * .12 : 0;
  s.vy = Math.min(.55, s.vy + ((s.helper ? .56 : .72) + gust) * dt);
  s.y += s.vy * dt;
  if (s.y < .045 || s.y > .955) {
    if (!s.cooldown) s = bump(s, .5);
    else { s.y = Math.max(.05, Math.min(.95, s.y)); s.vy = 0; }
    if (s.status !== "playing") return s;
  }
  // Helper bumps cost a second of flight; no lives, refill clock, or star penalty.
  const distance = s.cooldown ? 0 : speed * dt; s.travel += distance;
  s.gates = s.gates.map(g => ({ ...g, x: g.x - distance }));
  const radius = .025, gap = flightGap(s);
  for (let i = 0; i < s.gates.length; i++) {
    let g = s.gates[i];
    if (g.passed) continue;
    if (!learn && Math.abs(g.x - PLAYER_X) < .052 && Math.abs(s.y - g.center) > gap / 2 - radius && !s.cooldown) {
      s = bump(s, g.center); g = { ...g, passed: true, fruit: false }; s.gates[i] = g;
      if (s.status !== "playing") return s;
    }
    if (g.x <= PLAYER_X && !g.passed) {
      const choice = Math.min(2, Math.max(0, Math.round((s.y - .24) / .26)));
      const right = !learn || g.fact.choices[choice] === g.fact.answer;
      if (!right) {
        s = bump(s, s.y, true);
        // Bring the same fact back with a fresh approach; no answer is given away.
        const retryDistance = s.level === "endless" ? .6 : s.level.spacing;
        s.gates = s.gates.map(gate => ({ ...gate, x: gate.x + retryDistance }));
        break;
      }
      else {
        const fruit = learn || Math.abs(s.y - g.center) < .135;
        s = { ...s, passed: s.passed + 1, fruit: s.fruit + (fruit ? 1 : 0), score: Math.min(99999999, s.score + 40 + (fruit ? 20 : 0)), event: s.event + 1, cue: learn ? "answer" : "fruit", feedback: .7 };
      }
      s.gates[i] = { ...g, passed: true, fruit: false };
    }
  }
  const spacing = s.level === "endless" ? .55 : s.level.spacing;
  s.gates = s.gates.map(g => {
    if (g.x > -.12) return g;
    const next = newGate(s, Math.max(...s.gates.map(g => g.x)) + spacing); s.seed = next.seed;
    return next.gate;
  });
  if (s.level !== "endless" && s.passed >= s.level.target) s.status = "cleared";
  return s;
}
export function flightResult(s: FlightState): ArcadeResult | null {
  if (s.status === "playing") return null;
  const cleared = s.status === "cleared", target = s.level === "endless" ? Infinity : s.level.target;
  return { cleared, stars: cleared ? s.fruit >= target ? 3 : s.fruit >= Math.ceil(target * .5) ? 2 : 1 : 0, score: s.score, detail: `${s.passed} ${flightLearning(s) ? "answers" : "palms passed"} · ${s.fruit} glowing fruit` };
}
export function validFlight(v: unknown): v is FlightState {
  if (!record(v) || !canonicalLevel(v.level, flightLevels) || !uint(v.seed, 0xffffffff) || typeof v.helper !== "boolean" || typeof v.helped !== "boolean" || !finite(v.y, 0, 1) || !finite(v.vy, -1, 1) || !Array.isArray(v.gates) || v.gates.length !== 4) return false;
  return [v.time, v.travel].every(n => finite(n, 0, 1e10)) && [v.cooldown, v.flap, v.feedback].every(n => finite(n, 0, 2)) && [v.passed, v.fruit, v.score, v.bumps, v.event].every(n => uint(n)) && (v.fruit as number) <= (v.passed as number) && ["playing", "cleared", "bumped", "rest"].includes(v.status as string) && ["ready", "flap", "fruit", "bump", "answer", "try"].includes(v.cue as string) && v.gates.every(g => record(g) && finite(g.x, -.3, 4) && finite(g.center, .2, .8) && typeof g.fruit === "boolean" && typeof g.passed === "boolean" && validFact(g.fact));
}
export const flightEngine: ArcadeEngine<FlightState, FlightInput, ScrollLevel> = { create: createFlight, reduce: flightTransition, step: flightStep, result: flightResult, validate: validFlight };
