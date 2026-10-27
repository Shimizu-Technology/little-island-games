import {
  allLevelIds,
  levelNumber,
  nextRandom,
  worldOf,
  type ArcadeEngine,
  type ArcadeLevel,
  type ArcadeResult,
  type LevelId,
} from "../../types";
import { canonicalLevel, clamp, exact, finite, integer } from "../../action/validation";
export type Strength = "gentle" | "steady" | "zippy";
export type BeachLevel = ArcadeLevel & {
  target: number;
  speed: number;
  wind: number;
  turtle: boolean;
  balls: number;
  countBy: 1 | 2 | 5;
};
export const beachLevels: readonly BeachLevel[] = allLevelIds.map((id) => {
  const index = levelNumber(id),
    world = worldOf(id),
    rank = { w1: 0, w2: 1, w3: 2, learn: 0 }[world];
  return {
    id,
    index,
    world,
    name:
      world === "learn"
        ? index <= 4
          ? "Two by two"
          : "High fives"
        : [
            "First splash",
            "Beach buddies",
            "Back & forth",
            "A sunny rally",
            "Sea breeze",
            "Turtle time",
            "Double splash",
            "Sunset final",
          ][index - 1],
    target: index < 4 ? 2 : 3,
    speed: world === "learn" ? 175 : 180 + rank * 22 + index * 4,
    wind: world === "w2" || world === "w3" ? 12 + index * 2 : 0,
    turtle: (world === "w2" && index >= 4) || world === "w3",
    balls: world === "w3" ? 2 : 1,
    countBy: world === "learn" ? (index <= 4 ? 2 : 5) : 1,
    goals: [
      `Win ${index < 4 ? 2 : 3} points${world === "learn" ? (index <= 4 ? " · count by 2s" : " · count by 5s") : ""}`,
      "Let in at most 1 point",
      "Win without letting in a point",
    ],
  };
});
export const beachLevel = (id: LevelId) => beachLevels.find((l) => l.id === id)!;
export type Ball = { x: number; y: number; vx: number; vy: number; wait: number };
export type BeachState = {
  level: BeachLevel | "endless";
  seed: number;
  helper: boolean;
  mode: "solo" | "together";
  strength: Strength;
  phase: "play" | "cleared" | "rest";
  time: number;
  paddles: [number, number];
  balls: Ball[];
  points: [number, number];
  hits: number;
  rally: number;
  bestRally: number;
  event: number;
  feedback: string;
  pulse: number;
  winner: 0 | 1 | null;
  score: number;
};
export type BeachInput =
  | { type: "tick" }
  | { type: "paddle"; seat: 0 | 1; x: number }
  | { type: "helper"; value: boolean }
  | { type: "finish" };
export const paddleWidth = (s: BeachState) => (s.helper ? 116 : 86);
export const beachConfig = (s: BeachState): BeachLevel =>
  s.level === "endless" ? { ...beachLevel("w3-8"), target: 99999999 } : s.level;
function serve(s: BeachState, i: number, toward: number, wait = 1.1): [Ball, number] {
  const [seed, r] = nextRandom(s.seed),
    speed = beachConfig(s).speed * (s.helper ? 0.68 : 1),
    vx = (r - 0.5) * speed * 0.85;
  return [
    { x: i ? 240 : 120, y: 300 + i * 28, vx, vy: toward * Math.sqrt(speed * speed - vx * vx), wait: wait + i * 0.65 },
    seed,
  ];
}
export function createBeach(
  level: BeachState["level"],
  seed: number,
  helper = true,
  mode: BeachState["mode"] = "solo",
  strength: Strength = "gentle"
): BeachState {
  let s: BeachState = {
    level,
    seed: seed >>> 0,
    helper,
    mode,
    strength,
    phase: "play",
    time: 0,
    paddles: [180, 180],
    balls: [],
    points: [0, 0],
    hits: 0,
    rally: 0,
    bestRally: 0,
    event: 0,
    feedback: "",
    pulse: 0,
    winner: null,
    score: 0,
  };
  for (let i = 0; i < beachConfig(s).balls; i++) {
    const [ball, next] = serve(s, i, i ? 1 : -1);
    s = { ...s, seed: next, balls: [...s.balls, ball] };
  }
  return s;
}
export function beachTransition(s: BeachState, input: BeachInput): BeachState {
  if (s.phase !== "play") return s;
  if (input.type === "helper" && typeof input.value === "boolean")
    return input.value === s.helper
      ? s
      : {
          ...s,
          helper: input.value,
          balls: s.balls.map((b) => ({
            ...b,
            vx: b.vx * (input.value ? 0.68 : 1 / 0.68),
            vy: b.vy * (input.value ? 0.68 : 1 / 0.68),
          })),
        };
  if (
    input.type === "paddle" &&
    (input.seat === 0 || input.seat === 1) &&
    finite(input.x, -10000, 10000) &&
    (s.mode === "together" || input.seat === 0)
  ) {
    const paddles: [number, number] = [...s.paddles];
    paddles[input.seat] = clamp(input.x, paddleWidth(s) / 2, 360 - paddleWidth(s) / 2);
    return { ...s, paddles };
  }
  if (input.type === "finish" && s.level === "endless") return { ...s, phase: "rest" };
  return s;
}
export function beachStep(before: BeachState, input: BeachInput, dt: number): BeachState {
  if (input.type !== "tick") return beachTransition(before, input);
  if (before.phase !== "play" || !finite(dt, 0, 0.1) || dt === 0) return before;
  const config = beachConfig(before),
    s = {
      ...before,
      time: before.time + dt,
      pulse: Math.max(0, before.pulse - dt),
      paddles: [...before.paddles] as [number, number],
      points: [...before.points] as [number, number],
      balls: before.balls.map((b) => ({ ...b })),
    },
    width = paddleWidth(s);
  if (s.mode === "solo") {
    const incoming = s.balls.filter((b) => b.vy < 0).sort((a, b) => a.y - b.y)[0],
      ball = incoming ?? s.balls[0];
    const reach = { gentle: 65, steady: 135, zippy: 235 }[s.strength],
      error = { gentle: 42, steady: 21, zippy: 5 }[s.strength];
    const target = (ball?.x ?? 180) + Math.sin(s.time * 2.1) * error;
    s.paddles[1] = clamp(
      s.paddles[1] + clamp(target - s.paddles[1], -reach * dt, reach * dt),
      width / 2,
      360 - width / 2
    );
  }
  for (let i = 0; i < s.balls.length; i++) {
    const b = s.balls[i];
    if (b.wait > 0) {
      b.wait = Math.max(0, b.wait - dt);
      continue;
    }
    const oldY = b.y;
    b.vx = clamp(b.vx + Math.sin(s.time * 0.8 + i) * config.wind * dt, -300, 300);
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < 12 || b.x > 348) {
      b.x = clamp(b.x, 12, 348);
      b.vx *= -1;
    }
    const seat = b.vy > 0 ? 0 : 1,
      line = seat === 0 ? 523 : 77;
    if (
      (seat === 0 ? oldY <= line && b.y >= line : oldY >= line && b.y <= line) &&
      Math.abs(b.x - s.paddles[seat]) <= width / 2 + 10
    ) {
      const offset = clamp((b.x - s.paddles[seat]) / (width / 2), -1, 1),
        speed = Math.min(380, Math.hypot(b.vx, b.vy) * 1.025);
      b.vx = offset * speed * 0.78;
      b.vy = (seat === 0 ? -1 : 1) * Math.sqrt(speed * speed - b.vx * b.vx);
      b.y = line + (seat === 0 ? -1 : 1);
      s.hits++;
      s.rally++;
      s.bestRally = Math.max(s.bestRally, s.rally);
      s.event++;
      s.feedback = s.rally >= 4 ? "Rally!" : "Boop!";
      s.pulse = 0.3;
      s.score = Math.min(99999999, s.score + 10);
    }
    if (config.turtle) {
      const dx = b.x - 180,
        dy = b.y - 300,
        distance = Math.hypot(dx, dy);
      if (distance < 47 && distance > 0.001) {
        const nx = dx / distance,
          ny = dy / distance,
          dot = b.vx * nx + b.vy * ny;
        b.x = 180 + nx * 48;
        b.y = 300 + ny * 48;
        if (dot < 0) {
          b.vx -= 2 * dot * nx;
          b.vy -= 2 * dot * ny;
          if (Math.abs(b.vy) < 70) b.vy = (b.vy < 0 ? -1 : 1) * 70;
          s.event++;
          s.feedback = "Shh… boing!";
          s.pulse = 0.4;
        }
      }
    }
    if (b.y < -14 || b.y > 614) {
      const scorer = b.y < 0 ? 0 : 1;
      s.points[scorer]++;
      s.rally = 0;
      s.event++;
      s.feedback = `+${config.countBy} • Splash!`;
      s.pulse = 0.8;
      s.score = Math.min(99999999, s.score + (scorer === 0 || s.mode === "together" ? 100 : 0));
      const [next, seed] = serve(s, i, scorer === 0 ? 1 : -1);
      s.balls[i] = next;
      s.seed = seed;
    }
  }
  // Resolve both balls before judging: simultaneous final points are a tie and play continues.
  const target = s.mode === "together" && s.level === "endless" ? 5 : config.target;
  if (Math.max(...s.points) >= target && s.points[0] !== s.points[1]) {
    s.winner = s.points[0] > s.points[1] ? 0 : 1;
    s.phase = s.mode === "together" || s.winner === 0 ? "cleared" : "rest";
  }
  return s;
}
export function beachResult(s: BeachState): ArcadeResult | null {
  if (s.phase === "play") return null;
  const cleared = s.phase === "cleared",
    losing = Math.min(...s.points),
    count = beachConfig(s).countBy;
  return {
    cleared,
    stars: !cleared ? 0 : losing === 0 ? 3 : losing <= 1 ? 2 : 1,
    score: s.score,
    detail: `${s.points[0] * count} : ${s.points[1] * count} · best rally ${s.bestRally}`,
  };
}
export function validBeach(v: unknown): v is BeachState {
  return (
    exact(
      v,
      "level seed helper mode strength phase time paddles balls points hits rally bestRally event feedback pulse winner score"
    ) &&
    (v.level === "endless" || canonicalLevel(v.level, beachLevels)) &&
    integer(v.seed, 0xffffffff) &&
    typeof v.helper === "boolean" &&
    ["solo", "together"].includes(v.mode as string) &&
    ["gentle", "steady", "zippy"].includes(v.strength as string) &&
    ["play", "cleared", "rest"].includes(v.phase as string) &&
    finite(v.time) &&
    Array.isArray(v.paddles) &&
    v.paddles.length === 2 &&
    v.paddles.every((n) => finite(n, 0, 360)) &&
    Array.isArray(v.balls) &&
    v.balls.length >= 1 &&
    v.balls.length <= 2 &&
    v.balls.every(
      (b) =>
        exact(b, "x y vx vy wait") &&
        finite(b.x, 0, 360) &&
        finite(b.y, -14, 614) &&
        finite(b.vx, -600, 600) &&
        finite(b.vy, -600, 600) &&
        finite(b.wait, 0, 3)
    ) &&
    Array.isArray(v.points) &&
    v.points.length === 2 &&
    v.points.every((n) => integer(n)) &&
    [v.hits, v.rally, v.bestRally, v.event, v.score].every((n) => integer(n)) &&
    (v.bestRally as number) >= (v.rally as number) &&
    typeof v.feedback === "string" &&
    v.feedback.length <= 30 &&
    finite(v.pulse, 0, 0.8) &&
    (v.winner === null || v.winner === 0 || v.winner === 1)
  );
}
export const beachEngine: ArcadeEngine<BeachState, BeachInput, BeachLevel> = {
  create: createBeach,
  reduce: beachTransition,
  step: beachStep,
  result: beachResult,
  validate: validBeach,
};
