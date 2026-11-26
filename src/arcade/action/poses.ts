import { HIDDEN_POSE, type SpritePose } from "../poses";
import type { ArtPose } from "../ArtPose";
import { FIRE_SECONDS, palmConfig, type PalmState } from "../games/palm-patrol/engine";
import { beachConfig, paddleWidth, turtleX, type BeachState } from "../games/beach-ball/engine";
import { type Arena, BALL_RADIUS, PALM_ACTOR_SIZE } from "./arena";

export type PalmArtPose = ArtPose & { recoil?: number; flash?: number };
function position(a: Arena, x: number, y: number, w: number, h = w): SpritePose {
  "worklet";
  return { x: a.x + (x - w / 2) * a.scale, y: a.y + (y - h / 2) * a.scale, opacity: 1 };
}
/** Fixed-step art only. All arguments and callees are worklet-safe; no React/HUD objects. */
export function palmPoses(s: PalmState, a: Arena, reduced: boolean, entry: number): PalmArtPose[] {
  "worklet";
  const next: PalmArtPose[] = Array(88).fill(HIDDEN_POSE),
    group = `${s.wave}-${s.relay}-${s.fact}`,
    config = palmConfig(s),
    learning = config.world === "learn",
    impactAge = 0.45 - s.pulse,
    bonking = !reduced && s.cue === "bonk" && impactAge < 0.16;
  for (const b of s.beetles) {
    const size = b.boss ? PALM_ACTOR_SIZE.boss : PALM_ACTOR_SIZE.beetle,
      catchAge = 0.45 - b.caught,
      y = reduced && b.caught ? b.y + catchAge * 170 : b.y,
      p: PalmArtPose = position(a, b.x, y, size);
    p.identity = `${group}:${b.id}:${b.boss}:${!!b.caught}`;
    // Beetles stop stepping while a breather holds the formation.
    p.frame = !reduced && !b.caught && !b.diving && !s.waveWait ? Math.floor(s.time * 7 + b.id % 2) % 2 : 0;
    if (!reduced && !learning) p.opacity = 1 - entry * 0.25;
    p.angle = 0;
    if (!reduced) {
      if (b.caught) {
        p.angle = Math.sin(catchAge * 29) * 0.24 * (b.caught / 0.45);
        if (b.boss && catchAge < 0.16) p.flash = 0.36 * (1 - catchAge / 0.16) ** 2;
      }
      else if (b.diving) p.angle = Math.max(-0.24, Math.min(0.24, Math.atan2(b.diveX, config.diveSpeed)));
      else if (!learning && !s.waveWait) p.angle = Math.sin(s.time * 22 + b.id) * 0.04;
      if (!b.caught && bonking && Math.hypot(b.x - s.feedbackX, b.y - s.feedbackY) < 22) {
        const remaining = 1 - impactAge / 0.16;
        p.angle += Math.cos(impactAge * 74) * (b.boss ? 0.11 : 0.17) * remaining;
        if (b.boss) p.flash = 0.36 * remaining ** 2;
      }
    }
    // A resting formation dims a little, so the pause shows without reading the label.
    if (s.waveWait > 0 && !b.caught) p.opacity = (p.opacity ?? 1) * 0.6;
    next[(b.boss ? 15 : 0) + b.id] = p;
    if (b.caught) next[30 + b.id] = { ...position(a, b.x, y, PALM_ACTOR_SIZE.beetle), angle: p.angle, identity: p.identity };
    if (b.hp > 1 && !b.boss) next[73 + b.id] = { ...position(a, b.x, b.y - 12, 14, 7), identity: p.identity };
  }
  for (let i = 0; i < s.husks.length; i++)
    next[45 + i] = { snap: true, ...position(a, s.husks[i].x, s.husks[i].y, PALM_ACTOR_SIZE.coconut), angle: reduced ? 0 : s.time * 11 };
  const shotAge = FIRE_SECONDS - s.cooldown,
    recoil = reduced ? 0 : shotAge < 0.065
      ? (1 - shotAge / 0.065) ** 2
      : -0.35 * Math.max(0, 1 - Math.abs(shotAge - 0.105) / 0.04);
  next[57] = {
    ...position(a, s.launcher, 552 + (!reduced && s.lives.invulnerable > 1 ? 7 : 0), PALM_ACTOR_SIZE.launcher),
    recoil,
    frame: reduced ? 0 : s.cooldown > 0.16 ? 1 : s.cooldown > 0.08 ? 2 : 0,
  };
  if (s.pulse > 0 && s.cue !== "fire") {
    const age = 1 - s.pulse / 0.45;
    if (!reduced && (s.cue === "bonk" || s.cue === "net")) {
      const burst = 1 - (1 - age) ** 2;
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4, radius = 9 + burst * (i % 2 ? 26 : 17);
        next[58 + i] = {
          ...position(a, s.feedbackX + Math.cos(angle) * radius, s.feedbackY + Math.sin(angle) * radius - burst * 13, 6),
          identity: `${s.feedbackX}:${s.feedbackY}:${s.landed}`,
          angle: burst * 0.5,
          scale: (i % 2 ? 1.3 : 0.85) * (1 - age * 0.35),
          opacity: (1 - age) ** 1.5,
        };
      }
    }
    next[66] = {
      ...position(a, Math.max(55, Math.min(300, s.feedbackX)), Math.max(76, s.feedbackY - 38 - (reduced ? 0 : age * 16)), 110, 24),
      opacity: reduced ? 1 : s.pulse / 0.45,
    };
  }
  return next;
}
export type WallSpark = { x: number; y: number; at: number };
export function beachPoses(s: BeachState, a: Arena, reduced: boolean, sparks: WallSpark[]): SpritePose[] {
  "worklet";
  const next: SpritePose[] = Array(72).fill(HIDDEN_POSE), config = beachConfig(s), ballSize = (BALL_RADIUS * 2) / 0.95;
  for (let i = 0; i < Math.min(2, sparks.length); i++) {
    const e = sparks[i], age = (s.time - e.at) / 0.1;
    next[66 + i] = { snap: true, identity: `${e.at}:${e.x}:${e.y}`, ...position(a, e.x, e.y, 18), opacity: 1 - age, scale: reduced ? 1 : 0.9 + age * 0.2 };
  }
  for (let i = 0; i < s.balls.length; i++) {
    const b = s.balls[i];
    if (!reduced && !b.wait && Math.hypot(b.vx, b.vy) >= 330) {
      for (let j = 0; j < 2; j++) {
        const tail = (j + 1) * 0.014;
        next[68 + i * 2 + j] = { identity: `${s.points[0]}:${s.points[1]}:${i}:${j}`, ...position(a, Math.max(12, Math.min(348, b.x - b.vx * tail)), b.y - b.vy * tail, 7), opacity: 0.23 - j * 0.08 };
      }
    }
    next[i] = {
      identity: `${s.points[0]}:${s.points[1]}`,
      ...position(a, b.x, b.y, ballSize),
      angle: reduced ? 0 : s.time * (b.vy < 0 ? -3 : 3),
      scale: !reduced && b.squash ? 1 - b.squash * 0.8 : 1,
    };
  }
  for (let i = 0; i < 2; i++) next[2 + i] = position(a, s.paddles[i], i ? 65 : 535, paddleWidth(s, i as 0 | 1), 20);
  if (config.turtle) next[12] = position(a, turtleX(s), 300, 86);
  let pop = 0;
  for (let j = 0; j < s.effects.length; j++) {
    const e = s.effects[j],
      age = 1 - e.remaining / e.duration;
    for (let i = 0; i < 8; i++)
      next[14 + j * 8 + i] = {
        identity: e.id,
        ...position(
          a,
          e.x + Math.cos((i * Math.PI) / 4) * age * 28,
          e.y + Math.sin((i * Math.PI) / 4) * age * 28,
          5
        ),
        opacity: reduced ? 0 : 1 - age,
      };
    if (e.point && pop < 2) next[62 + pop++] = { ...position(a, e.x, e.y - age * 18, 65, 26), opacity: 1 - age };
  }
  return next;
}
