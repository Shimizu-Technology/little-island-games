/**
 * Palm Patrol legal replays (AR-05). A replay only moves Coco and tosses through the real transitions at
 * 60 Hz, leading the lowest beetle the way the v3 reachability policy does. Its pace is how often it may
 * toss:
 * - "rapid": every time the 0.22 s cooldown allows (the v3 policy);
 * - "quick": at most every 0.45 s;
 * - "steady": at most every 0.9 s, about one toss a second, the pace the workload is sized for;
 * - "gentle": at most every 1.5 s, reported only, to show what a slower child meets.
 * A burst is the longest stretch of play with beetles on the board and no wave break.
 */
import * as palm from "../../src/arcade/games/palm-patrol/engine";
import type { ArcadeResult } from "../../src/arcade/types";

export const palmPaces = { rapid: 0, quick: 0.45, steady: 0.9, gentle: 1.5 } as const;
export type PalmPace = keyof typeof palmPaces;
export type PalmReplay = { result: ArcadeResult | null; helper: boolean; time: number; burst: number; accuracy: number; heartsLost: number; breaks: number[] };

const tick = { type: "tick" } as const;
export function palmReplay(level: palm.PalmLevel, seed: number, helper: boolean, pace: PalmPace): PalmReplay {
  let s = palm.createPalm(level, seed, helper), burst = 0, longest = 0, reload = 0, resting = false;
  const breaks: number[] = [];
  for (let i = 0; i < 60 * 600 && s.phase === "play"; i++) {
    const b = s.beetles.filter(b => !b.caught).sort((a, b) => b.y - a.y)[0];
    if (b && reload <= 0) {
      const dx = !b.diving ? s.direction * palm.palmMarchSpeed(s) * (532 - b.y) / palm.HUSK_SPEED : 0;
      let x = b.x + dx; if (x > 335 || x < 25) x = b.x - dx;
      const shots = s.shots;
      s = palm.palmTransition(palm.palmTransition(s, { type: "move", x }), { type: "toss" });
      if (s.shots > shots) reload = palmPaces[pace];
    }
    reload -= 1 / 60;
    s = palm.palmStep(s, tick, 1 / 60);
    if (s.waveWait > 0) { if (!resting) breaks.push(0); resting = true; burst = 0; breaks[breaks.length - 1] += 1 / 60; }
    else { resting = false; burst += 1 / 60; longest = Math.max(longest, burst); }
  }
  return { result: palm.palmResult(s), helper: s.helper, time: Number(s.time.toFixed(2)), burst: Number(longest.toFixed(2)), accuracy: s.shots ? s.landed / s.shots : 0, heartsLost: s.lives.hit, breaks: breaks.map(b => Number(b.toFixed(2))) };
}

export const PALM_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
/**
 * Pars refitted from steady replays over eight seeds, Helper off and on. The time par is half again the
 * slowest steady clear, in whole seconds, which is about what the gentle pace needs in World 1. The aim
 * par keeps the world's 55–67.5% ladder unless a steady replay lands less than 10 points above it, in
 * which case it drops to fit that replay.
 */
export function palmParsFromReplays(levels: readonly palm.PalmLevel[]): Record<string, { par: number; accuracy: number }> {
  const out: Record<string, { par: number; accuracy: number }> = {};
  for (const level of levels) {
    const rank = level.world === "learn" ? 0 : Number(level.world[1]) - 1, ladder = Number((0.55 + rank * 0.025).toFixed(3));
    if (level.world === "learn") { out[level.id] = { par: 22 + level.index * 0.5, accuracy: ladder }; continue; }
    const runs = PALM_SEEDS.flatMap(seed => [false, true].map(helper => palmReplay(level, seed, helper, "steady")));
    if (!runs.every(r => r.result?.cleared && r.heartsLost === 0)) throw new Error(`Palm ${level.id}: a steady replay did not clear hit-free`);
    const slowest = Math.max(...runs.map(r => r.time)), aim = Math.min(...runs.map(r => r.accuracy));
    out[level.id] = { par: Math.ceil(slowest * 1.5), accuracy: aim >= ladder + 0.1 ? ladder : Math.floor((aim - 0.1) * 20) / 20 };
  }
  return out;
}
