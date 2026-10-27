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
export type PalmLevel = ArcadeLevel & {
  count: number;
  waves: number;
  speed: number;
  divers: boolean;
  boss: boolean;
  facts: number;
};
export const palmLevels: readonly PalmLevel[] = allLevelIds.map((id) => {
  const index = levelNumber(id),
    world = worldOf(id),
    rank = { w1: 0, w2: 1, w3: 2, learn: 0 }[world];
  return {
    id,
    index,
    world,
    name:
      world === "learn"
        ? ["Little sums", "One more", "Make five", "Take away", "Make ten", "Double up", "Ten and more", "Math grove"][
            index - 1
          ]
        : [
            "Hello, beetles!",
            "Husk toss",
            "Leafy shelter",
            "A little zigzag",
            "Grove keepers",
            "Swoop & scoop",
            "Palm party",
            "The big visitor",
          ][index - 1],
    count: world === "learn" ? 3 : 3 + Math.floor(index / 3) + rank * 2,
    waves: world === "learn" ? 1 : 1 + Number(index >= 5) + Number(rank === 2),
    speed: world === "learn" ? 3 : 7 + rank * 5 + index * 0.8,
    divers: rank > 0 || index >= 6,
    boss: index === 8 && world !== "learn",
    facts: world === "learn" ? 3 + Math.floor(index / 3) : 0,
    goals: [
      world === "learn" ? `Match ${3 + Math.floor(index / 3)} math facts` : "Guide every beetle into a net",
      "Keep at least 2 palms happy",
      "Keep all 4 palms happy",
    ],
  };
});
export const palmLevel = (id: LevelId) => palmLevels.find((l) => l.id === id)!;
export type Beetle = {
  id: number;
  x: number;
  y: number;
  base: number;
  hp: number;
  value: number;
  diver: boolean;
  boss: boolean;
  caught: number;
};
export type Husk = { x: number; y: number; bounced: boolean };
export type PalmState = {
  level: PalmLevel | "endless";
  seed: number;
  helper: boolean;
  helped: boolean;
  phase: "play" | "cleared" | "rest";
  time: number;
  launcher: number;
  beetles: Beetle[];
  husks: Husk[];
  shields: number[];
  palms: number;
  wave: number;
  caught: number;
  score: number;
  cooldown: number;
  fact: number;
  prompt: string;
  answer: number;
  event: number;
  feedback: string;
  feedbackX: number;
  feedbackY: number;
  pulse: number;
  shots: number;
  misses: number;
};
export type PalmInput =
  | { type: "tick" }
  | { type: "move"; x: number }
  | { type: "toss" }
  | { type: "helper"; value: boolean }
  | { type: "finish" };
function fact(s: PalmState): PalmState {
  const index = s.level === "endless" ? 1 : s.level.index,
    limit = index < 4 ? 5 : index < 7 ? 10 : 20;
  let seed: number, r: number;
  [seed, r] = nextRandom(s.seed);
  const a = 1 + Math.floor(r * (limit / 2));
  [seed, r] = nextRandom(seed);
  const b = 1 + Math.floor(r * (limit / 2));
  const subtract = index === 4 || (index >= 7 && s.fact % 2 === 1),
    double = index === 6;
  const answer = subtract ? a : double ? a * 2 : a + b,
    prompt = subtract ? `${a + b} − ${b} = ?` : `${a} + ${double ? a : b} = ?`;
  [seed, r] = nextRandom(seed);
  const slot = Math.floor(r * 3),
    values = [answer + 1, Math.max(0, answer - 1)];
  return {
    ...s,
    seed,
    prompt,
    answer,
    beetles: [0, 1, 2].map((i) => ({
      id: i,
      x: 72 + i * 108,
      base: 72 + i * 108,
      y: 125,
      hp: 1,
      value: i === slot ? answer : values[i > slot ? i - 1 : i],
      diver: false,
      boss: false,
      caught: 0,
    })),
    husks: [],
  };
}
function formation(s: PalmState): PalmState {
  if (s.level !== "endless" && s.level.world === "learn") return fact(s);
  const config =
    s.level === "endless" ? palmLevel(`w${Math.min(3, 1 + Math.floor(s.wave / 3))}-8` as LevelId) : s.level;
  const boss = config.boss && s.wave === config.waves,
    count = boss ? 1 : config.count;
  return {
    ...s,
    beetles: Array.from({ length: count }, (_, i) => ({
      id: i,
      x: boss ? 180 : 48 + (i % 5) * 65,
      base: boss ? 180 : 48 + (i % 5) * 65,
      y: boss ? 115 : 80 + Math.floor(i / 5) * 64,
      hp: boss ? 5 : 1,
      value: -1,
      diver: config.divers && i % 3 === 1,
      boss,
      caught: 0,
    })),
    husks: [],
  };
}
export function createPalm(level: PalmState["level"], seed: number, helper = true): PalmState {
  return formation({
    level,
    seed: seed >>> 0,
    helper,
    helped: helper,
    phase: "play",
    time: 0,
    launcher: 180,
    beetles: [],
    husks: [],
    shields: [3, 3, 3],
    palms: 4,
    wave: 1,
    caught: 0,
    score: 0,
    cooldown: 0,
    fact: 0,
    prompt: "",
    answer: 0,
    event: 0,
    feedback: "",
    feedbackX: 180,
    feedbackY: 240,
    pulse: 0,
    shots: 0,
    misses: 0,
  });
}
function feedback(s: PalmState, text: string, x: number, y: number): PalmState {
  return { ...s, event: s.event + 1, feedback: text, feedbackX: x, feedbackY: y, pulse: 0.65 };
}
export function palmTransition(s: PalmState, input: PalmInput): PalmState {
  if (s.phase !== "play") return s;
  if (input.type === "helper" && typeof input.value === "boolean")
    return { ...s, helper: input.value, helped: s.helped || input.value };
  if (input.type === "move" && finite(input.x, -10000, 10000)) return { ...s, launcher: clamp(input.x, 24, 336) };
  if (input.type === "finish") return s.level === "endless" ? { ...s, phase: "rest" } : s;
  if (input.type === "toss" && s.cooldown <= 0 && s.husks.length < 12)
    return { ...s, husks: [...s.husks, { x: s.launcher, y: 538, bounced: false }], cooldown: 0.28, shots: s.shots + 1 };
  return s;
}
export function palmStep(before: PalmState, input: PalmInput, dt: number): PalmState {
  if (input.type !== "tick") return palmTransition(before, input);
  if (before.phase !== "play" || !finite(dt, 0, 0.1) || dt === 0) return before;
  let s = {
    ...before,
    time: before.time + dt,
    cooldown: Math.max(0, before.cooldown - dt),
    pulse: Math.max(0, before.pulse - dt),
    shields: [...before.shields],
  };
  const learning = s.level !== "endless" && s.level.world === "learn",
    speed = (s.level === "endless" ? 15 + Math.min(20, s.wave) : s.level.speed) * (s.helper ? 0.55 : 1);
  s.beetles = s.beetles.map((b) =>
    b.caught > 0
      ? { ...b, caught: Math.max(0.001, b.caught - dt), y: b.y - 130 * dt, x: b.x + Math.sin(s.time * 14) * 1.4 }
      : {
          ...b,
          x:
            b.base +
            Math.sin(s.time * (b.diver ? 1.5 : 0.6) + b.id * 0.3) * (learning ? 9 : b.boss ? 78 : b.diver ? 30 : 15),
          y: b.y + dt * speed * (b.diver ? 1.8 : 1),
        }
  );
  s.husks = s.husks.map((h) => ({ ...h, y: h.y + (h.bounced ? 290 : -410) * dt }));
  for (const h of s.husks) {
    if (h.bounced || h.y < -20) continue;
    const b = s.beetles.find(
      (b) => !b.caught && Math.abs(b.x - h.x) < (b.boss ? 38 : 23) && Math.abs(b.y - h.y) < (b.boss ? 35 : 24)
    );
    if (!b) continue;
    if (learning && b.value !== s.answer) {
      h.bounced = true;
      s.misses++;
      s = feedback(s, "↩ Try another", b.x, b.y);
      continue;
    }
    h.y = -50;
    b.hp--;
    if (b.hp === 0) {
      b.caught = 0.75;
      s.caught++;
      s.score = Math.min(99999999, s.score + (learning ? 100 : 40));
      s = feedback(s, learning ? "+100 ✓" : "+40 • Net!", b.x, b.y);
      if (learning) s.fact++;
    } else s = feedback(s, "Bonk!", b.x, b.y);
  }
  s.husks = s.husks.filter((h) => h.y > -20 && h.y < 620);
  if (learning && s.fact > before.fact) {
    if (s.fact >= (s.level as PalmLevel).facts) return { ...s, phase: "cleared" };
    return fact(s);
  }
  for (const b of s.beetles) {
    if (b.caught || b.y < 480) continue;
    if (learning) {
      b.y = 125;
      continue;
    } // Math choices never expire or harm the grove.
    const shield = [72, 180, 288].findIndex((x) => Math.abs(x - b.x) < 48);
    if (shield >= 0 && s.shields[shield] > 0) {
      s.shields[shield]--;
      b.y = 340;
      s = feedback(s, "Leaf save!", b.x, 480);
    } else if (b.y >= 530) {
      s.palms--;
      b.y = 100;
      s = feedback(s, "Dizzy detour", b.x, 510);
    }
  }
  s.beetles = s.beetles.filter((b) => !b.caught || (b.caught > 0.002 && b.y > -60));
  if (s.palms <= 0) return { ...s, palms: 0, phase: "rest" };
  if (!s.beetles.length) {
    if (s.level !== "endless" && s.wave >= s.level.waves) return { ...s, phase: "cleared" };
    s = formation({ ...s, wave: s.wave + 1 });
  }
  return s.helper ? palmTransition(s, { type: "toss" }) : s;
}
export function palmResult(s: PalmState): ArcadeResult | null {
  return s.phase === "play"
    ? null
    : {
        cleared: s.phase === "cleared",
        stars: s.phase !== "cleared" ? 0 : s.palms === 4 ? 3 : s.palms >= 2 ? 2 : 1,
        score: s.score,
        detail:
          s.level !== "endless" && s.level.world === "learn"
            ? `${s.fact} facts matched · ${s.misses} gentle bounce-backs`
            : `${s.caught} beetles guided · ${s.palms} happy palms`,
      };
}
export function validPalm(v: unknown): v is PalmState {
  if (
    !exact(
      v,
      "level seed helper helped phase time launcher beetles husks shields palms wave caught score cooldown fact prompt answer event feedback feedbackX feedbackY pulse shots misses"
    ) ||
    !(v.level === "endless" || canonicalLevel(v.level, palmLevels)) ||
    !integer(v.seed, 0xffffffff) ||
    typeof v.helper !== "boolean" ||
    typeof v.helped !== "boolean" ||
    !["play", "cleared", "rest"].includes(v.phase as string)
  )
    return false;
  return (
    finite(v.time) &&
    finite(v.launcher, 24, 336) &&
    [v.caught, v.score, v.fact, v.event, v.shots, v.misses].every((n) => integer(n)) &&
    integer(v.wave) &&
    (v.wave as number) > 0 &&
    integer(v.palms, 4) &&
    finite(v.cooldown, 0, 0.28) &&
    finite(v.pulse, 0, 0.65) &&
    integer(v.answer, 40) &&
    typeof v.prompt === "string" &&
    v.prompt.length <= 30 &&
    typeof v.feedback === "string" &&
    v.feedback.length <= 30 &&
    finite(v.feedbackX, -60, 420) &&
    finite(v.feedbackY, -60, 620) &&
    Array.isArray(v.shields) &&
    v.shields.length === 3 &&
    v.shields.every((n) => integer(n, 3)) &&
    Array.isArray(v.beetles) &&
    v.beetles.length <= 12 &&
    new Set(v.beetles.map((b) => b.id)).size === v.beetles.length &&
    v.beetles.every(
      (b) =>
        exact(b, "id x y base hp value diver boss caught") &&
        integer(b.id, 11) &&
        finite(b.x, -60, 420) &&
        finite(b.y, -70, 540) &&
        finite(b.base, 0, 360) &&
        integer(b.hp, 5) &&
        finite(b.value, -1, 40) &&
        Number.isInteger(b.value) &&
        typeof b.diver === "boolean" &&
        typeof b.boss === "boolean" &&
        finite(b.caught, 0, 0.75)
    ) &&
    Array.isArray(v.husks) &&
    v.husks.length <= 12 &&
    v.husks.every(
      (h) => exact(h, "x y bounced") && finite(h.x, 24, 336) && finite(h.y, -20, 620) && typeof h.bounced === "boolean"
    )
  );
}
export const palmEngine: ArcadeEngine<PalmState, PalmInput, PalmLevel> = {
  create: createPalm,
  reduce: palmTransition,
  step: palmStep,
  result: palmResult,
  validate: validPalm,
};
