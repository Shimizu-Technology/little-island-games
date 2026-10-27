import { wordEntry } from "../../../learn/kit/reading";
import { songWords } from "../shell-song/engine";
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
import {
  cell,
  delta,
  directions,
  exact,
  finite,
  inside,
  integer,
  matches,
  opposite,
  same,
  type Cell,
  type Direction,
} from "../grid/rules";
export const RAIL_COLS = 10,
  RAIL_ROWS = 10;
export type RailLevel = ArcadeLevel & {
  target: number;
  tick: number;
  hedges: Cell[];
  snakeRow: number;
  snakeSpan: number;
  sequence: string[];
  word?: string;
};
export const railLevels: readonly RailLevel[] = allLevelIds.map((id) => {
  const index = levelNumber(id),
    world = worldOf(id),
    rank = { w1: 0, w2: 1, w3: 2, learn: 0 }[world],
    learn = world === "learn",
    word = learn && index > 4 ? songWords[index - 5] : undefined;
  const sequence = word
    ? [...wordEntry(word)!.tiles]
    : learn
      ? Array.from({ length: 4 + Math.floor(index / 3) }, (_, n) =>
          String((n + 1) * (index === 3 ? 2 : index === 4 ? 5 : 1))
        )
      : [];
  return {
    id,
    index,
    world,
    name: learn
      ? word
        ? `Spell ${word}`
        : index === 3
          ? "Two by two"
          : index === 4
            ? "Fives in the garden"
            : "Counting chicks"
      : [
          "First little chick",
          "Garden party",
          "Follow Mama",
          "Around the flowers",
          "Little explorers",
          "Parade day",
          "A growing family",
          "Home together",
        ][index - 1],
    target: learn ? sequence.length : 3 + rank + Math.floor(index / 3),
    tick: 0.62 - rank * 0.13 - (index - 1) * 0.018,
    hedges: rank
      ? [
          { x: 4, y: 4 },
          { x: 5, y: 4 },
          ...(rank === 2
            ? [
                { x: 7, y: 6 },
                { x: 7, y: 5 },
                { x: 2, y: 2 },
              ]
            : []),
        ]
      : [],
    snakeRow: learn ? -1 : 1 + rank,
    snakeSpan: 3 + rank,
    sequence,
    ...(word ? { word } : {}),
    goals: [
      learn
        ? word
          ? `Collect ${wordEntry(word)!.tiles.join(" → ")} · no timer`
          : `Collect ${sequence.join(" → ")} · no timer`
        : `Bring ${3 + rank + Math.floor(index / 3)} chicks together`,
      "Finish with at most 2 bumps",
      "Finish without a bump",
    ],
  };
});
export const railLevel = (id: LevelId) => railLevels.find((l) => l.id === id)!;
export type RailState = {
  level: RailLevel | "endless";
  seed: number;
  helper: boolean;
  body: Cell[];
  direction: Direction;
  queue: Direction[];
  food: Cell;
  decoy: Cell;
  collected: number;
  bumps: number;
  moves: number;
  score: number;
  elapsed: number;
  patrol: number;
  phase: "play" | "cleared" | "rest";
  message: string;
};
export type RailInput =
  | { type: "tick" }
  | { type: "turn"; direction: Direction }
  | { type: "helper"; value: boolean }
  | { type: "finish" };
export const railLearning = (s: RailState) => s.level !== "endless" && s.level.world === "learn";
export const railTarget = (s: RailState) => (s.level === "endless" ? Infinity : s.level.target);
export const railTick = (s: RailState) =>
  (s.level === "endless" ? Math.max(0.18, 0.4 - s.collected * 0.004) : s.level.tick) * (s.helper ? 1.5 : 1);
export const railHedges = (s: RailState) => (s.level === "endless" ? railLevel("w3-8").hedges : s.level.hedges);
export function railSnake(s: RailState): Cell[] {
  const l = s.level === "endless" ? railLevel("w3-8") : s.level;
  if (l.snakeRow < 0) return [];
  // Back-and-forth patrol is visible and never crosses the introductory bottom garden.
  const span = l.snakeSpan,
    travel = 8 - span,
    t = s.patrol % (travel * 2),
    x = 1 + (t <= travel ? t : travel * 2 - t);
  return Array.from({ length: span }, (_, i) => ({ x: x + i, y: l.snakeRow }));
}
function scatter(s: RailState): RailState {
  const free = Array.from({ length: 100 }, (_, i) => ({ x: i % 10, y: Math.floor(i / 10) })).filter(
    (p) =>
      !s.body.some((b) => same(b, p)) &&
      !railHedges(s).some((b) => same(b, p)) &&
      p.y !== (s.level === "endless" ? 3 : s.level.snakeRow)
  );
  if (free.length < 2) return { ...s, phase: "cleared", message: "The whole garden is a parade!" };
  const [seed, n] = nextRandom(s.seed),
    food = free[Math.floor(n * free.length)],
    other = free.filter((p) => !same(p, food));
  const [next, m] = nextRandom(seed);
  return { ...s, seed: next, food, decoy: other[Math.floor(m * other.length)] };
}
export function createRail(level: RailState["level"], seed: number, helper = true): RailState {
  const s: RailState = {
    level,
    seed: seed >>> 0,
    helper,
    body: [
      { x: 2, y: 7 },
      { x: 1, y: 7 },
      { x: 0, y: 7 },
    ],
    direction: "right",
    queue: [],
    food: { x: 5, y: 7 },
    decoy: { x: 8, y: 8 },
    collected: 0,
    bumps: 0,
    moves: 0,
    score: 0,
    elapsed: 0,
    patrol: 0,
    phase: "play",
    message: "Follow the chick!",
  };
  return level !== "endless" && level.id === "w1-1" ? s : scatter(s);
}
function bump(s: RailState, message: string): RailState {
  const gentle = s.helper || railLearning(s);
  return {
    ...s,
    bumps: Math.min(99999999, s.bumps + 1),
    queue: [],
    elapsed: 0,
    ...(gentle ? { body: s.body.slice(0, Math.max(1, s.body.length - 1)) } : { phase: "rest" as const }),
    message: gentle ? `${message} · regroup and try again` : message,
  };
}
export function railMove(s: RailState, direction: Direction): RailState {
  if (s.phase !== "play") return s;
  const d = delta[direction],
    head = { x: s.body[0].x + d.x, y: s.body[0].y + d.y },
    eat = same(head, s.food);
  // A moving tail vacates its square on this same tick.
  if (
    !inside(head, 10, 10) ||
    railHedges(s).some((p) => same(p, head)) ||
    s.body.slice(0, eat ? undefined : -1).some((p) => same(p, head)) ||
    railSnake(s).some((p) => same(p, head))
  )
    return bump(s, "Oops! Mind the garden path");
  if (railLearning(s) && same(head, s.decoy))
    return {
      ...s,
      bumps: s.bumps + 1,
      message: `Find ${s.level !== "endless" ? s.level.sequence[s.collected] : "the next tile"} first`,
    };
  const collected = s.collected + Number(eat),
    body = [head, ...s.body];
  if (!eat || body.length > 40) body.pop();
  let next: RailState = {
    ...s,
    body,
    direction,
    collected,
    moves: Math.min(99999999, s.moves + 1),
    score: Math.min(99999999, s.score + (eat ? 40 : 0)),
    message: eat ? "+40 · Chick-tastic!" : "",
  };
  if (collected >= railTarget(s)) return { ...next, phase: "cleared", message: "Everyone is together!" };
  if (eat) next = scatter(next);
  return next;
}
export function railTransition(s: RailState, input: RailInput): RailState {
  if (input.type === "helper") return typeof input.value === "boolean" ? { ...s, helper: input.value } : s;
  if (s.phase !== "play") return s;
  if (input.type === "finish") return s.level === "endless" ? { ...s, phase: "rest" } : s;
  if (input.type !== "turn" || !directions.includes(input.direction)) return s;
  const previous = s.queue.at(-1) ?? s.direction;
  if (opposite(previous, input.direction) && s.body.length > 1) return s;
  if (railLearning(s)) return railMove(s, input.direction);
  return s.queue.length < 2 && previous !== input.direction ? { ...s, queue: [...s.queue, input.direction] } : s;
}
export function railStep(s: RailState, input: RailInput, dt: number): RailState {
  if (input.type !== "tick") return railTransition(s, input);
  if (s.phase !== "play" || railLearning(s) || !Number.isFinite(dt) || dt <= 0) return s;
  const elapsed = s.elapsed + Math.min(dt, 0.1);
  if (elapsed < railTick(s)) return { ...s, elapsed };
  const direction = s.queue[0] ?? s.direction;
  const next = railMove({ ...s, queue: s.queue.slice(1), elapsed: elapsed - railTick(s) }, direction);
  if (next.phase !== "play") return next;
  const patrolled = { ...next, patrol: (s.patrol + 1) % 10000 };
  return railSnake(patrolled).some((p) => same(p, patrolled.body[0]))
    ? bump(patrolled, "The tree snake crossed the path")
    : patrolled;
}
export function railResult(s: RailState): ArcadeResult | null {
  return s.phase === "play"
    ? null
    : {
        cleared: s.phase === "cleared",
        stars: s.phase === "cleared" ? (s.bumps === 0 ? 3 : s.bumps <= 2 ? 2 : 1) : 0,
        score: s.score,
        detail: `${s.collected} chicks · ${s.bumps} bumps`,
      };
}
export function validRail(v: unknown): v is RailState {
  if (
    !exact(v, [
      "level",
      "seed",
      "helper",
      "body",
      "direction",
      "queue",
      "food",
      "decoy",
      "collected",
      "bumps",
      "moves",
      "score",
      "elapsed",
      "patrol",
      "phase",
      "message",
    ])
  )
    return false;
  if (!(v.level === "endless" || railLevels.some((l) => matches(l, v.level)))) return false;
  const s = v as unknown as RailState;
  if (
    s.score !== Math.min(99999999, s.collected * 40) ||
    s.moves < s.collected ||
    (s.body && Array.isArray(s.body) && s.body.length > 3 + s.collected)
  )
    return false;
  if (
    s.level !== "endless" &&
    (s.collected > s.level.target ||
      (s.phase === "cleared" ? s.collected !== s.level.target : s.collected >= s.level.target) ||
      (s.level.world === "learn" && s.phase === "rest"))
  )
    return false;
  return (
    integer(v.seed, 0xffffffff) &&
    typeof v.helper === "boolean" &&
    Array.isArray(v.body) &&
    v.body.length > 0 &&
    v.body.length <= 40 &&
    v.body.every((p) => cell(p, 10, 10)) &&
    new Set(v.body.map((p) => `${p.x},${p.y}`)).size === v.body.length &&
    directions.includes(v.direction as Direction) &&
    Array.isArray(v.queue) &&
    v.queue.length <= 2 &&
    v.queue.every((d) => directions.includes(d)) &&
    cell(v.food, 10, 10) &&
    cell(v.decoy, 10, 10) &&
    !same(v.food, v.decoy) &&
    [v.collected, v.bumps, v.moves, v.score].every((n) => integer(n)) &&
    integer(v.patrol, 9999) &&
    finite(v.elapsed, 2) &&
    ["play", "cleared", "rest"].includes(v.phase as string) &&
    typeof v.message === "string" &&
    v.message.length < 150
  );
}
export const railEngine: ArcadeEngine<RailState, RailInput, RailLevel> = {
  create: createRail,
  reduce: railTransition,
  step: railStep,
  result: railResult,
  validate: validRail,
};
