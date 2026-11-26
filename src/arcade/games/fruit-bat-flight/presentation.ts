import { HIDDEN_POSE, type SpritePose } from "../../poses";
import { HIT_SECONDS } from "../../lives";
import { FLAP_DURATION } from "./animation";
import { flightGap, flightLearning, PLAYER_X, type FlightState } from "./engine";
import { batAngle, FLIGHT_H, FLIGHT_W, GROUND, TRUNK_HALF } from "./hull";

export const BAT_SIZE = 104;
export const BAT_CANVAS = 160;
export const BAT_X = PLAYER_X * FLIGHT_W;
export const PALM_WIDTH = 2 * TRUNK_HALF;
// The solid base covers pixels 46–209 of the 256 px cap image.
export const PALM_CAP_WIDTH = 45;
export const PALM_CAP_HEIGHT = PALM_CAP_WIDTH * 174 / 256;
// Row 58 is the first continuous solid lip across the collision width.
export const PALM_CAP_LIP = PALM_CAP_WIDTH * 58 / 256;
export const PALM_COLUMN_HEIGHT = FLIGHT_H + PALM_CAP_LIP;
export const PALM_TILE_HEIGHT = PALM_WIDTH * 280 / 192;
export const PALM_TILE_OVERLAP = 1.5;
export const SHORE_TILE_OVERLAP = 2;
export const FLIGHT_CHROME_TINT = "#A9DCD3";
export const FRUIT_SIZE = 48;
export const PORTAL_SIZE = 64;
export const PORTAL_HEIGHTS = [.24 * FLIGHT_H, .5 * FLIGHT_H, .76 * FLIGHT_H];
export const FLIGHT_GATE_COUNT = 4;
export const FLIGHT_SLOT = { bat: 0, palm: 1, fruit: 9, portal: 13, clouds: 25, shore: 27 } as const;

export function batFrame(s: Pick<FlightState, "cue" | "feedback" | "status" | "flap">) {
  "worklet";
  if (s.status === "bumped" || (s.cue === "bump" && s.feedback > 0)) return 2;
  return s.flap > .14 ? 1 : 0;
}

export function batArtMotion(s: FlightState, reduced: boolean) {
  "worklet";
  const frame = batFrame(s);
  const age = FLAP_DURATION - s.flap;
  const kick = reduced || frame === 2 || s.flap <= 0 ? 0 : Math.exp(-age * 24) * Math.cos(age * 32);
  const bob = !reduced && s.waiting ? Math.sin(s.hover * 4) * 4 : 0;
  const wobble = !reduced && frame === 2 ? Math.sin((.45 - s.feedback) * 35) * s.feedback * .32 : 0;
  return {
    frame,
    y: s.y * FLIGHT_H + bob,
    angle: s.status === "cleared" && !reduced ? -.2 : batAngle(s.vy) + wobble,
    kick,
  };
}

/** Use the exact rectangle tested against the torso ellipse, including a moving gap. */
export function palmPoses(gateX: number, center: number, gap: number, identity: number): [SpritePose, SpritePose] {
  "worklet";
  const x = gateX * FLIGHT_W - PALM_CAP_WIDTH / 2;
  return [
    { identity, x, y: (center - gap / 2) * FLIGHT_H - FLIGHT_H },
    { identity, x, y: (center + gap / 2) * FLIGHT_H - PALM_CAP_LIP },
  ];
}

export function flightPoses(s: FlightState, reduced: boolean): SpritePose[] {
  "worklet";
  const p: SpritePose[] = Array(FLIGHT_SLOT.shore + 1).fill(HIDDEN_POSE);
  const bat = batArtMotion(s, reduced);
  const protectedFlight = s.status === "playing" && !s.waiting && s.lives.invulnerable > 0;
  const blink = Math.floor((HIT_SECONDS - s.lives.invulnerable) * 10) % 2 === 0;
  p[FLIGHT_SLOT.bat] = {
    identity: s.lives.hit, x: BAT_X - BAT_CANVAS / 2, y: bat.y - BAT_CANVAS / 2,
    frame: bat.frame, angle: bat.angle, scale: 1 + bat.kick,
    opacity: protectedFlight ? (reduced ? .72 : blink ? .45 : 1) : 1,
  };
  const sceneryDistance = reduced ? 0 : s.travel * FLIGHT_W;
  const idleDrift = reduced ? 0 : s.hover * 3;
  p[FLIGHT_SLOT.clouds] = { x: reduced ? 0 : -(sceneryDistance * .09 + idleDrift) % FLIGHT_W, y: 0 };
  p[FLIGHT_SLOT.clouds + 1] = { x: reduced ? 0 : -(sceneryDistance * .19 + idleDrift * 1.6) % FLIGHT_W, y: 0 };
  const shore = (sceneryDistance * .85) % FLIGHT_W;
  p[FLIGHT_SLOT.shore] = { x: shore ? -shore : 0, y: GROUND };

  const learn = flightLearning(s), gap = flightGap(s);
  for (let i = 0; i < s.gates.length; i++) {
    const g = s.gates[i];
    if (!learn) {
      const [upper, lower] = palmPoses(g.x, g.center, gap, g.phase);
      p[FLIGHT_SLOT.palm + i * 2] = upper;
      p[FLIGHT_SLOT.palm + i * 2 + 1] = lower;
      if (g.fruit && !g.passed) {
        const pulse = reduced ? 0 : Math.sin(s.time * 4 + g.phase);
        p[FLIGHT_SLOT.fruit + i] = {
          identity: g.phase, x: g.x * FLIGHT_W - FRUIT_SIZE / 2,
          y: g.center * FLIGHT_H - FRUIT_SIZE / 2 + pulse * 2, scale: 1 + pulse * .045,
        };
      }
    } else if (!g.passed) {
      for (let c = 0; c < PORTAL_HEIGHTS.length; c++) {
        p[FLIGHT_SLOT.portal + i * PORTAL_HEIGHTS.length + c] = {
          identity: g.phase, x: g.x * FLIGHT_W - PORTAL_SIZE / 2, y: PORTAL_HEIGHTS[c] - PORTAL_SIZE / 2,
        };
      }
    }
  }
  return p;
}

export function flightAward(before: FlightState, after: FlightState) {
  "worklet";
  if (after.passed === before.passed) return null;
  const learn = flightLearning(after);
  const mango = !learn && after.fruit > before.fruit;
  const cleared = after.gates.find((gate, i) => gate.passed && !before.gates[i].passed && gate.phase === before.gates[i].phase);
  const choice = Math.min(2, Math.max(0, Math.round((after.y - .24) / .26)));
  return {
    x: cleared ? cleared.x * FLIGHT_W : BAT_X,
    y: learn ? PORTAL_HEIGHTS[choice] : (cleared?.center ?? after.y) * FLIGHT_H,
    mango,
    gain: after.score - before.score,
  };
}

export function impactVisual(progress: number, reduced: boolean) {
  "worklet";
  return {
    x: reduced ? 0 : Math.sin(progress * 3 * Math.PI) * (1 - progress) * 3.5,
    y: reduced ? 0 : Math.sin(progress * 2 * Math.PI) * (1 - progress) * 2,
    flash: (1 - progress) * (reduced ? .09 : .2),
  };
}
