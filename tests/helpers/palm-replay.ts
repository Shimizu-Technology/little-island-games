/**
 * Palm Patrol legal replays (AR-05). A replay only moves Coco and tosses through the real transitions at
 * 60 Hz, leading the lowest beetle the way the v3 reachability policy does. Its pace is how often it may
 * toss:
 * - "rapid": every time the 0.22 s cooldown allows (the v3 policy);
 * - "quick": at most every 0.45 s;
 * - "steady": at most every 0.9 s, about one toss a second, the pace the workload is sized for;
 * - "gentle": at most every 1.5 s, the reviewer's slower child;
 * - "late": at most every 3 s, a child who keeps pausing.
 * Probes add two pilots that are not replays: "miss" tosses at the gentle pace but aims every other toss
 * well wide, and "idle" never tosses.
 * A burst is the longest stretch of active play between breaks. A tick is part of a break when the engine
 * enters it with a break running or leaves it with one, so a break's last tick is never counted as play.
 */
import * as palm from "../../src/arcade/games/palm-patrol/engine";
import type { ArcadeResult } from "../../src/arcade/types";

export const palmPaces = { rapid: 0, quick: 0.45, steady: 0.9, gentle: 1.5, late: 3 } as const;
export type PalmPace = keyof typeof palmPaces;
export type PalmPilot = PalmPace | "miss" | "idle";
export type PalmReplay = { result: ArcadeResult | null; helper: boolean; time: number; burst: number; accuracy: number; heartsLost: number; breaks: number[]; holds: number };
/**
 * What a probe saw during breaks. `holds` counts breaks taken with beetles still on the board. During any
 * break no heart may be lost (`breakHits`) and no beetle may move closer to Coco (`breakMoves`). Across a
 * hold, `lostProgress` counts beetles that came back stronger, appeared from nowhere or vanished without
 * being netted, and `diving` counts beetles still diving when play resumed.
 */
export type PalmProbe = PalmReplay & { breakHits: number; breakMoves: number; lostProgress: number; diving: number };

const tick = { type: "tick" } as const;
const live = (s: palm.PalmState) => s.beetles.filter(b => !b.caught);
export function palmProbe(level: palm.PalmLevel | "endless", seed: number, helper: boolean, pilot: PalmPilot, seconds = 600): PalmProbe {
  let s = palm.createPalm(level, seed, helper), burst = 0, longest = 0, reload = 0, resting = false, tosses = 0;
  let breakHits = 0, breakMoves = 0, lostProgress = 0, diving = 0, holds = 0;
  let hold: { wave: number; caught: number; hp: Map<number, number> } | null = null;
  const breaks: number[] = [], pace = pilot === "miss" ? palmPaces.gentle : pilot === "idle" ? Infinity : palmPaces[pilot];
  for (let i = 0; i < 60 * seconds && s.phase === "play"; i++) {
    const b = live(s).sort((a, b) => b.y - a.y)[0];
    if (b && reload <= 0 && pilot !== "idle") {
      const dx = !b.diving ? s.direction * palm.palmMarchSpeed(s) * (532 - b.y) / palm.HUSK_SPEED : 0;
      let x = b.x + dx; if (x > 335 || x < 25) x = b.x - dx;
      if (pilot === "miss" && tosses % 2) x = x > 180 ? x - 150 : x + 150;
      const shots = s.shots;
      s = palm.palmTransition(palm.palmTransition(s, { type: "move", x }), { type: "toss" });
      if (s.shots > shots) { reload = pace; tosses++; }
    }
    reload -= 1 / 60;
    const prev = s;
    s = palm.palmStep(s, tick, 1 / 60);
    if (prev.waveWait > 0 || s.waveWait > 0) {
      if (!resting) {
        breaks.push(0);
        if (live(prev).length) { holds++; hold = { wave: prev.wave, caught: prev.caught, hp: new Map(live(prev).map(b => [b.id, b.hp])) }; }
      }
      resting = true; burst = 0; breaks[breaks.length - 1] += 1 / 60;
      if (s.lives.hit > prev.lives.hit) breakHits++;
      for (const b of live(s)) { const p = prev.beetles.find(p => p.id === b.id); if (p && !p.caught && b.y > p.y + 1e-9) breakMoves++; }
    } else {
      if (resting && hold && s.wave === hold.wave) {
        const now = live(prev), netted = prev.caught - hold.caught;
        for (const b of now) if (!hold.hp.has(b.id) || b.hp > hold.hp.get(b.id)!) lostProgress++;
        if (hold.hp.size - now.length !== netted) lostProgress++;
        diving += now.filter(b => b.diving).length;
      }
      if (resting) hold = null;
      resting = false; burst += 1 / 60; longest = Math.max(longest, burst);
    }
  }
  return { result: palm.palmResult(s), helper: s.helper, time: Number(s.time.toFixed(2)), burst: Number(longest.toFixed(2)), accuracy: s.shots ? s.landed / s.shots : 0, heartsLost: s.lives.hit, breaks: breaks.map(b => Number(b.toFixed(2))), holds, breakHits, breakMoves, lostProgress, diving };
}
export function palmReplay(level: palm.PalmLevel, seed: number, helper: boolean, pace: PalmPace): PalmReplay {
  const { result, time, burst, accuracy, heartsLost, breaks, holds } = palmProbe(level, seed, helper, pace);
  return { result, helper, time, burst, accuracy, heartsLost, breaks, holds };
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
