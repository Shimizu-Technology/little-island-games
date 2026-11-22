/**
 * AR-04 reachable support. For one water crossing (the lane or sand below, and the lane or shore above),
 * this asks: a crab that has just landed supported below, at any traffic phase and any supported spot,
 * can it reach a supported landing above before the deck carries it off the edge? It may wait and take up
 * to two sidesteps on its deck. Hop time is the engine's CRAB_HOP, frames are 60 Hz, lanes move by travel
 * at the given pace, and `supported` is the engine's own body-on-deck rule.
 */
import * as crab from "../../src/arcade/games/crab-crossing/engine";

const F = 1 / 60, HOP_FRAMES = Math.ceil(crab.CRAB_HOP / F - 1e-9), HOMES = [1, 4, 7];

/** Whether a vertical hop started `frame` frames after arriving at (tau0, x0) below, with no sidestep, lands supported. */
export function landsAt(below: crab.Lane | null, above: crab.Lane | null, pace: number, tau0: number, x0: number, frame: number): boolean {
  const x = x0 + (below?.speed ?? 0) * pace * frame * F;
  return above ? crab.supported(above, x, tau0 + pace * (frame + HOP_FRAMES) * F) : HOMES.some(h => Math.abs(x - h) <= 0.48);
}
/** First frame, after arriving at (tau0, x0) below, at which a hop up lands supported; -1 if never. */
export function firstLanding(below: crab.Lane | null, above: crab.Lane | null, pace: number, tau0: number, x0: number, horizon = 15 * 60): number {
  const v = below ? below.speed : 0, at = (f: number, k: number) => x0 + v * pace * f * F + k;
  const standing = (f: number, k: number) => { const x = at(f, k); return x >= 0 && x <= 8 && (!below || crab.supported(below, x, tau0 + pace * f * F)); };
  // A vertical hop does not drift; the shore only needs a burrow within reach of the start column.
  const lands = (f: number, k: number) => { const x = at(f, k); return above ? crab.supported(above, x, tau0 + pace * (f + HOP_FRAMES) * F) : HOMES.some(h => Math.abs(x - h) <= 0.48); };
  const seen = new Set<string>(), queue: [number, number][] = [[0, 0]];
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [f, k] = queue.shift()!;
    if (f > horizon || !standing(f, k)) continue;
    if (lands(f, k)) return f;
    for (const next of [[f + 1, k], ...[-1, 1].filter(d => Math.abs(k + d) <= 2).map(d => [f + HOP_FRAMES, k + d])] as [number, number][]) {
      const key = next.join();
      if (!seen.has(key)) { seen.add(key); queue.push(next); }
    }
  }
  return -1;
}

export type Crossing = { row: number; above: string; below: string; arrivals: number; worstWait: number; stranded: { tau: number; x: number; secondsToEdge: number; tilesToEdge: number }[] };
/** Every water crossing of a level at one pace, over a sweep of traffic phases and arrival spots. */
export function crossings(level: crab.CrabLevel | "endless", pace: number): Crossing[] {
  const lanes = crab.crabLanes(crab.createCrab(level, 0)), water = (row: number) => lanes.find(l => l.row === row && crab.waterLane(l)) ?? null;
  const out: Crossing[] = [];
  for (const row of [4, 3, 2, 1, 0]) {
    const below = row === 4 ? null : water(row + 1), above = row === 0 ? null : water(row);
    if ((row > 0 && !above) || (row < 4 && !below)) continue;
    const c: Crossing = { row, above: above?.kind ?? "shore", below: below?.kind ?? "sand", arrivals: 0, worstWait: 0, stranded: [] };
    for (let tau = 0; tau < 20; tau += 0.53) {
      const spots = below ? Array.from({ length: 41 }, (_, i) => i / 5).filter(x => crab.supported(below, x, tau)) : [0, 1, 2, 3, 4, 5, 6, 7, 8];
      for (const x of spots) {
        c.arrivals++;
        const f = firstLanding(below, above, pace, tau, x), v = (below?.speed ?? 0) * pace;
        if (f >= 0) c.worstWait = Math.max(c.worstWait, f * F);
        else c.stranded.push({ tau, x, secondsToEdge: v > 0 ? (8 - x) / v : v < 0 ? x / -v : Infinity, tilesToEdge: v > 0 ? 8 - x : v < 0 ? x : Infinity });
      }
    }
    out.push(c);
  }
  return out;
}
