import {
  allLevelIds,
  levelNumber,
  worldOf,
  type ArcadeEngine,
  type ArcadeLevel,
  type ArcadeResult,
  type LevelId,
} from "../../types";
import { delta, directions, exact, finite, integer, matches, type Direction } from "../grid/rules";
/** W4–W6 use provisional extended curves; feel workers own final tuning. */
export const CRAB_COLS = 9,
  CRAB_ROWS = 11;
export type CrabLevel = ArcadeLevel & {
  rank: number;
  speed: number;
  target: number;
  numbers: number[];
  stones: number[];
};
export const crabLevels: readonly CrabLevel[] = allLevelIds.map((id) => {
  const index = levelNumber(id),
    world = worldOf(id),
    rank = { w1: 0, w2: 1, w3: 2, w4: 3, w5: 4, w6: 5, learn: 0 }[world],
    learn = world === "learn",
    backwards = learn && [2, 5, 8].includes(index),
    skip = index >= 6 ? 5 : index >= 3 ? 2 : 1,
    numbers = learn ? Array.from({ length: 9 }, (_, i) => (backwards ? (9 - i) * skip : (i + 1) * skip)) : [];
  const target = learn ? 1 : index < 4 ? 1 : 2;
  return {
    id,
    index,
    world,
    rank,
    speed: 0.32 + rank * 0.2 + (index - 1) * 0.022,
    target,
    numbers,
    stones: learn ? Array.from({ length: 9 }, (_, i) => 4 + (index === 1 ? 0 : (Math.floor(i / 2) % 3) - 1)) : [],
    name: learn
      ? `${backwards ? "Count back" : "Count on"}${skip > 1 ? ` by ${skip}` : ""}`
      : [
          "To the sea!",
          "Look, then hop",
          "Lagoon friends",
          "Two cozy burrows",
          "Coastal explorer",
          "Catch a canoe",
          "Island traffic",
          "Home by the waves",
        ][index - 1],
    goals: [
      learn
        ? `${backwards ? "Count back" : "Count on"}: ${numbers.join(" → ")} · no timer`
        : `Reach ${target} seaside burrow${target > 1 ? "s" : ""}`,
      "Finish with at most 2 bumps",
      "Finish without a bump",
    ],
  };
});
export const crabLevel = (id: LevelId) => crabLevels.find((l) => l.id === id)!;
export type Lane = {
  row: number;
  kind: "bus" | "pickup" | "bike" | "log" | "turtle" | "canoe";
  speed: number;
  span: number;
  spacing: number;
  offset: number;
};
export type CrabState = {
  level: CrabLevel | "endless";
  seed: number;
  helper: boolean;
  x: number;
  y: number;
  time: number;
  hops: number;
  crossed: number;
  cursor: number;
  bumps: number;
  score: number;
  shield: number;
  phase: "play" | "cleared" | "rest" | "stopped";
  message: string;
};
export type CrabInput =
  | { type: "tick" }
  | { type: "hop"; direction: Direction }
  | { type: "helper"; value: boolean }
  | { type: "finish" };
export const crabLearning = (s: CrabState) => s.level !== "endless" && s.level.world === "learn";
export const crabConfig = (s: CrabState) => (s.level === "endless" ? crabLevel("w3-8") : s.level);
export const waterLane = (l: Lane) => ["log", "turtle", "canoe"].includes(l.kind);
export function crabLanes(s: CrabState): Lane[] {
  if (crabLearning(s)) return [];
  const l = crabConfig(s),
    speed = l.speed * (s.helper ? 0.6 : 1) * (s.level === "endless" ? Math.min(1.6, 1 + s.crossed * 0.03) : 1),
    offset = (s.seed % 100) / 25;
  return [
    { row: 8, kind: "pickup", speed, span: 1.3, spacing: 5.5, offset },
    { row: 7, kind: "bus", speed: -speed * 0.8, span: 1.9, spacing: 6, offset: offset + 2.5 },
    ...(l.rank > 0
      ? [{ row: 6, kind: "bike" as const, speed: speed * 1.2, span: 0.85, spacing: 4.8, offset: offset + 1 }]
      : []),
    { row: 4, kind: "log", speed: speed * 0.55, span: 3.5, spacing: 5, offset: 0 },
    { row: 3, kind: "turtle", speed: -speed * 0.45, span: 3.3, spacing: 4.8, offset: 1 },
    ...(l.rank > 0 && !s.helper
      ? [{ row: 2, kind: "canoe" as const, speed: speed * 0.6, span: 3.1, spacing: 4.5, offset: 0 }]
      : []),
    ...(l.rank > 1
      ? [{ row: 1, kind: "canoe" as const, speed: -speed * 0.55, span: 3.2, spacing: 4.5, offset: 1 }]
      : []),
  ];
}
export function laneObjects(l: Lane, time: number): number[] {
  const shift = (((l.offset + time * l.speed) % l.spacing) + l.spacing) % l.spacing;
  return Array.from({ length: 5 }, (_, i) => shift + (i - 1) * l.spacing).filter((x) => x > -l.span && x < 9 + l.span);
}
export const supported = (l: Lane, x: number, time: number) =>
  laneObjects(l, time).some((p) => x >= p - l.span / 2 + 0.15 && x <= p + l.span / 2 - 0.15);
export function createCrab(level: CrabState["level"], seed: number, helper = true): CrabState {
  return {
    level,
    seed: seed >>> 0,
    helper,
    x: 4,
    y: 10,
    time: 0,
    hops: 0,
    crossed: 0,
    cursor: 0,
    bumps: 0,
    score: 0,
    shield: 0,
    phase: "play",
    message: "Look, then hop!",
  };
}
function bump(s: CrabState): CrabState {
  return {
    ...s,
    bumps: Math.min(99999999, s.bumps + 1),
    ...(s.helper ? { x: 4, y: s.y <= 5 ? 5 : 10, shield: 1.2 } : { phase: "rest" as const }),
    message: s.helper ? "Boop! Back to a safe spot" : "Boop! Let’s try another crossing",
  };
}
function collision(s: CrabState): CrabState {
  if (s.shield > 0 || crabLearning(s)) return s;
  if (s.x < 0 || s.x > 8) return bump(s);
  const lane = crabLanes(s).find((l) => l.row === s.y);
  if (!lane) return s;
  return waterLane(lane)
    ? supported(lane, s.x, s.time)
      ? s
      : bump(s)
    : laneObjects(lane, s.time).some((x) => Math.abs(x - s.x) < lane.span / 2 + 0.23)
      ? bump(s)
      : s;
}
export function crabTransition(s: CrabState, input: CrabInput): CrabState {
  if (input.type === "helper") return typeof input.value === "boolean" ? { ...s, helper: input.value } : s;
  if (s.phase !== "play") return s;
  if (input.type === "finish") return s.level === "endless" ? { ...s, phase: "stopped" } : s;
  if (input.type !== "hop" || !directions.includes(input.direction)) return s;
  const d = delta[input.direction],
    x = Math.round(s.x) + d.x,
    y = s.y + d.y;
  if (x < 0 || x > 8 || y < 0 || y > 10) return s;
  if (y === 0 && ![1, 4, 7].includes(x)) return { ...s, message: "Find a burrow at the shore" };
  if (
    crabLearning(s) &&
    input.direction === "up" &&
    y > 0 &&
    (s.level === "endless" || x !== s.level.stones[s.cursor] || y !== 9 - s.cursor)
  )
    return { ...s, bumps: s.bumps + 1, message: `Find ${crabConfig(s).numbers[s.cursor]} on the next stone` };
  if (crabLearning(s) && input.direction === "down") return s;
  const cursor = s.cursor + Number(crabLearning(s) && input.direction === "up" && y > 0);
  let next: CrabState = {
    ...s,
    x,
    y,
    cursor,
    hops: Math.min(99999999, s.hops + 1),
    time: Math.min(1000000, s.time + (crabLearning(s) ? 0.35 : 0)),
    message: crabLearning(s) && cursor > s.cursor ? `${crabConfig(s).numbers[s.cursor]} · Great!` : "",
  };
  next = collision(next);
  if (next.phase !== "play" || next.y !== 0) return next;
  const crossed = next.crossed + 1,
    score = Math.min(99999999, next.score + 100);
  return crossed >= (s.level === "endless" ? Infinity : s.level.target)
    ? { ...next, crossed, score, phase: "cleared", message: "Home by the sea!" }
    : { ...next, crossed, score, x: 4, y: 10, shield: 0.5, message: "+100 · Another cozy burrow!" };
}
export function crabStep(s: CrabState, input: CrabInput, dt: number): CrabState {
  if (input.type !== "tick") return crabTransition(s, input);
  if (s.phase !== "play" || crabLearning(s) || !Number.isFinite(dt) || dt <= 0) return s;
  const step = Math.min(0.1, dt),
    lane = crabLanes(s).find((l) => l.row === s.y && waterLane(l));
  return collision({
    ...s,
    time: Math.min(1000000, s.time + step),
    x: s.x + (lane?.speed ?? 0) * step,
    shield: Math.max(0, s.shield - step),
  });
}
export function crabResult(s: CrabState): ArcadeResult | null {
  return s.phase === "play"
    ? null
    : {
        cleared: s.phase === "cleared",
        outcome: s.phase === "cleared" ? "cleared" : s.phase === "stopped" ? "stopped" : "game-over",
        stars: s.phase === "cleared" ? (s.bumps === 0 ? 3 : s.bumps <= 2 ? 2 : 1) : 0,
        score: s.score,
        detail: `${s.crossed} burrows · ${s.bumps} bumps`,
      };
}
export function validCrab(v: unknown): v is CrabState {
  if (
    !exact(v, [
      "level",
      "seed",
      "helper",
      "x",
      "y",
      "time",
      "hops",
      "crossed",
      "cursor",
      "bumps",
      "score",
      "shield",
      "phase",
      "message",
    ]) ||
    !(v.level === "endless" || crabLevels.some((l) => matches(l, v.level)))
  )
    return false;
  const s = v as unknown as CrabState;
  if (s.score !== Math.min(99999999, s.crossed * 100) || s.hops < s.crossed * 10) return false;
  if (
    s.level === "endless"
      ? s.phase === "cleared"
      : s.crossed > s.level.target ||
        (s.phase === "cleared" ? s.crossed !== s.level.target || s.y !== 0 : s.crossed >= s.level.target)
  )
    return false;
  if (
    (!crabLearning(s) && s.cursor !== 0) ||
    (crabLearning(s) && (s.cursor > 9 || s.phase === "rest" || (s.phase === "cleared" && s.cursor !== 9)))
  )
    return false;
  return (
    integer(v.seed, 0xffffffff) &&
    typeof v.helper === "boolean" &&
    typeof v.x === "number" &&
    Number.isFinite(v.x) &&
    v.x > -1 &&
    v.x < 10 &&
    integer(v.y, 10) &&
    finite(v.time, 1000000) &&
    [v.hops, v.crossed, v.bumps, v.score].every((n) => integer(n)) &&
    integer(v.cursor, 9) &&
    finite(v.shield, 1.2) &&
    ["play", "cleared", "rest", "stopped"].includes(v.phase as string) &&
    typeof v.message === "string" &&
    v.message.length < 150
  );
}
export const crabEngine: ArcadeEngine<CrabState, CrabInput, CrabLevel> = {
  create: createCrab,
  reduce: crabTransition,
  step: crabStep,
  result: crabResult,
  validate: validCrab,
};
