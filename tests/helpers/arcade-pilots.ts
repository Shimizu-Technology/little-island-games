/**
 * Legal-input pilots for every Arcade engine, used as dare witnesses (AR-10).
 * Rail, Crab, Palm, Beach and Flight pilots are the v3 play-spec reachability
 * policies (artifacts v3/master-audit/play-spec/probes/reachability.ts); Reef and
 * Cargo replay tests/fixtures/puzzle-feel.json; Run uses the shipped runFixture.
 * Cargo with Helper on, or on another seed, uses a placement planner, because Helper
 * changes the garbage schedule and the recorded moves no longer fit.
 * Pilots only send real inputs to the real transitions: no state is patched. Every
 * pilot creates its engine in the requested Helper mode and reports the mode it ran in.
 */
import { readFileSync } from "node:fs";
import * as reef from "../../src/arcade/games/reef-builder/engine";
import * as song from "../../src/arcade/games/shell-song/engine";
import * as rail from "../../src/arcade/games/rail-parade/engine";
import * as crab from "../../src/arcade/games/crab-crossing/engine";
import * as palm from "../../src/arcade/games/palm-patrol/engine";
import * as beach from "../../src/arcade/games/beach-ball/engine";
import * as flight from "../../src/arcade/games/fruit-bat-flight/engine";
import { flightLevel, runLevel } from "../../src/arcade/games/scrolling/content";
import { runFixture } from "../../src/arcade/games/lagoon-run/fixtures";
import * as cargo from "../../src/arcade/games/canoe-cargo/engine";
import type { ArcadeId, ArcadeResult, LevelId } from "../../src/arcade/types";
import { crabAdvance, crossingPath, railPath, railUpcoming } from "../grid-fixtures";

const tick = { type: "tick" } as const;
const fixtures = JSON.parse(readFileSync("tests/fixtures/puzzle-feel.json", "utf8")) as { reef: { id: LevelId; seed: number; moves: { slot: number; row: number; col: number }[] }[]; cargo: { id: LevelId; seed: number; moves: { turn: number; col: number }[] }[] };

/** A pilot's terminal result and the Helper mode its engine actually ran in. */
export type PilotRun = { result: ArcadeResult | null; helper: boolean };
const ran = (result: ArcadeResult | null, state: { helper: boolean }): PilotRun => ({ result, helper: state.helper });

function railPilot(level: rail.RailLevel, seed: number, helper: boolean): PilotRun {
  let s = rail.createRail(level, seed, helper);
  for (let move = 0; move < 700 && s.phase === "play"; move++) {
    const path = railPath(s); if (!path.length) break;
    if (level.world === "learn") s = rail.railMove(s, path[0]);
    else {
      const turn = railUpcoming(s); if (turn) s = rail.railTransition(s, { type: "turn", direction: turn });
      const before = s.moves;
      for (let f = 0; f < 30 && s.moves === before && s.phase === "play" && s.respawn === 0; f++) s = rail.railStep(s, tick, 1 / 60);
    }
  }
  return ran(rail.railResult(s), s);
}
function crabPilot(level: crab.CrabLevel, seed: number, helper: boolean): PilotRun {
  let s = crab.createCrab(level, seed, helper);
  for (let c = 0; c < level.target; c++) {
    for (const d of crossingPath(s)) s = crabAdvance(d === "wait" ? s : crab.crabTransition(s, { type: "hop", direction: d }));
    if (s.phase === "play") s = crabAdvance(s, 12);
  }
  return ran(crab.crabResult(s), s);
}
function palmPilot(level: palm.PalmLevel, seed: number, helper: boolean): PilotRun {
  let s = palm.createPalm(level, seed, helper);
  for (let i = 0; i < 40000 && s.phase === "play"; i++) {
    const b = s.beetles.filter(b => !b.caught).sort((a, b) => b.y - a.y)[0];
    if (b) {
      const dx = !b.diving ? s.direction * palm.palmMarchSpeed(s) * (532 - b.y) / palm.HUSK_SPEED : 0;
      let x = b.x + dx; if (x > 335 || x < 25) x = b.x - dx;
      s = palm.palmTransition(palm.palmTransition(s, { type: "move", x }), { type: "toss" });
    }
    s = palm.palmStep(s, tick, 1 / 60);
  }
  return ran(palm.palmResult(s), s);
}
function beachPilot(level: beach.BeachLevel, seed: number, helper: boolean): PilotRun {
  let s = beach.createBeach(level, seed, helper);
  for (let i = 0; i < 40000 && s.phase === "play"; i++) {
    const b = s.balls.filter(b => b.vy > 0).sort((a, b) => (513 - a.y) / a.vy - (513 - b.y) / b.vy)[0] ?? s.balls[0];
    const aim = beach.reflectedX(b.x + b.vx * Math.max(0, (513 - b.y) / Math.max(1, b.vy)));
    s = beach.beachTransition(s, { type: "paddle", seat: 0, x: aim + (aim > 180 ? -29 : 29) });
    s = beach.beachStep(s, tick, 1 / 60);
  }
  return ran(beach.beachResult(s), s);
}
function fly(level: flight.FlightState["level"], seed: number, helper: boolean, offset: number, look: number, trigger: number): PilotRun {
  let s = flight.createFlight(level, seed, helper);
  for (let i = 0; i < 15000 && !flight.flightResult(s); i++) {
    const gate = s.gates.filter(g => !g.passed && g.x > look).sort((a, b) => a.x - b.x)[0];
    const target = gate ? flight.flightLearning(s) ? [.24, .5, .76][gate.fact.choices.indexOf(gate.fact.answer)] : gate.center : .5;
    if (s.waiting || (s.y > target + offset && s.vy > trigger)) s = flight.flightTransition(s, { type: "flap" });
    s = flight.flightStep(s, { type: "idle" }, 1 / 60);
  }
  return ran(flight.flightResult(s), s);
}
/** Same bounded controller search as the v3 probe; the first three-star parameters win. */
function flightPilot(level: flight.FlightState["level"], seed: number, helper: boolean): PilotRun {
  let best: PilotRun | null = null;
  for (const trigger of [-.05, -.35, .1]) for (const look of [.175, .19, .2, .22, .14]) for (const offset of [.045, .025, .065, 0, -.02, .035, .055, .015, .075, .06, .07, .05, .04]) {
    const r = fly(level, seed, helper, offset, look, trigger);
    if (!best || (r.result?.stars ?? 0) > (best.result?.stars ?? 0)) best = r;
    if (r.result?.stars === 3) return r;
  }
  return best!;
}
/** Reef has only its recorded fixture plan; Helper changes no reef rule, so the plan replays in either mode. */
function reefPilot(id: LevelId, seed: number | undefined, helper: boolean): PilotRun {
  const f = fixtures.reef.find(f => f.id === id)!;
  let s = reef.createReef(reef.reefLevel(id), seed ?? f.seed, helper);
  if (seed !== undefined && seed !== f.seed) return ran(null, s);
  for (const m of f.moves) s = reef.reefTransition(s, { type: "place", ...m });
  return ran(reef.reefResult(s), s);
}
type CargoMove = { turn: number; col: number };
function cargoPlace(s: cargo.CargoState, m: CargoMove): cargo.CargoState {
  for (let i = 0; i < m.turn; i++) s = cargo.cargoTransition(s, { type: "rotate" });
  for (let i = 0; i < 9 && s.col !== m.col; i++) s = cargo.cargoTransition(s, { type: s.col < m.col ? "right" : "left" });
  return cargo.cargoTransition(s, { type: "drop" });
}
/** Holes, bumps and height, with a well kept open on the right edge for multi-row sends. */
function cargoShape(s: cargo.CargoState, rows: number): number {
  const { COLS, ROWS } = cargo, height = Array<number>(COLS).fill(0);
  let holes = 0, bumps = 0;
  for (let c = 0; c < COLS; c++) {
    let top = false;
    for (let r = 0; r < ROWS; r++) { const full = !!s.board[r * COLS + c]; if (full && !top) { top = true; height[c] = ROWS - r; } else if (!full && top) holes++; }
  }
  for (let c = 1; c < COLS - 1; c++) bumps += Math.abs(height[c] - height[c - 1]);
  const met = s.bestRows >= rows;
  return -holes * 8 - bumps * 1.5 - Math.max(...height) * 2 - height[COLS - 1] * 3 + s.canoes * 6 + (met ? 500 : 0) + s.lastRows.length * (met ? 2 : -1);
}
/**
 * Beam search over real placements (rotate, slide, drop) until the level clears having sent
 * at least `rows` canoes with one piece. Turn-based like the fixture replays: no frames pass.
 */
function cargoPlanner(id: LevelId, seed: number, helper: boolean, rows: number): PilotRun {
  const start = cargo.createCargo(cargo.cargoLevel(id), seed, helper);
  let beam = [start];
  for (let depth = 0; depth < 120 && beam.length; depth++) {
    const next: cargo.CargoState[] = [], seen = new Set<string>();
    for (const s of beam) for (let turn = 0; turn < 4; turn++) for (let col = -2; col < cargo.COLS; col++) {
      const n = cargoPlace(s, { turn, col });
      if (n.status === "over" || n.loads === s.loads) continue;
      const key = `${n.board.map(c => c ? 1 : 0).join("")}${n.piece.shape}:${n.canoes}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (n.status === "cleared") { if (n.bestRows >= rows) return ran(cargo.cargoResult(n), n); continue; }
      next.push(n);
    }
    beam = next.sort((a, b) => cargoShape(b, rows) - cargoShape(a, rows)).slice(0, 24);
  }
  return ran(null, start);
}
function cargoPilot(id: LevelId, seed: number | undefined, helper: boolean, rows: number): PilotRun {
  const f = fixtures.cargo.find(f => f.id === id)!;
  if (helper || (seed !== undefined && seed !== f.seed)) return cargoPlanner(id, seed ?? f.seed, helper, rows);
  let s = cargo.createCargo(cargo.cargoLevel(id), f.seed, helper);
  for (const m of f.moves) s = cargoPlace(s, m);
  return ran(cargo.cargoResult(s), s);
}
function songPilot(id: LevelId, seed: number, helper: boolean): PilotRun {
  const l = song.songLevel(id);
  let s = song.createSong(l, seed, helper), n = 0;
  while (!song.songResult(s) && n++ < 20000) {
    if (s.phase === "watch") s = song.songStep(s, tick, 1 / 30);
    else if (s.phase === "repeat") s = song.songTransition(s, { type: "shell", index: s.pattern[s.cursor] });
    else if (s.phase === "picture") s = song.songTransition(s, { type: "picture", word: l.word! });
  }
  return ran(song.songResult(s), s);
}
/** The v3 probe's fixture seeds per game; Reef and Cargo use their recorded fixture seeds. */
export const pilotSeeds: Partial<Record<ArcadeId, number>> = { "rail-parade": 120, "crab-crossing": 120, "palm-patrol": 42, "beach-ball": 42, "fruit-bat-flight": 981, "lagoon-run": 771, "shell-song": 42 };
/**
 * Plays one level with legal input. `seed` undefined means the game's fixture seed. `rows` is
 * the Cargo planner's goal for canoes sent with one piece (a dare's threshold).
 */
export function pilotRun(game: ArcadeId, id: LevelId, seed?: number, helper = false, rows = 1): PilotRun {
  const s = seed ?? pilotSeeds[game] ?? 42;
  switch (game) {
    case "reef-builder": return reefPilot(id, seed, helper);
    case "canoe-cargo": return cargoPilot(id, seed, helper, rows);
    case "shell-song": return songPilot(id, s, helper);
    case "rail-parade": return railPilot(rail.railLevel(id), s, helper);
    case "crab-crossing": return crabPilot(crab.crabLevel(id), s, helper);
    case "palm-patrol": return palmPilot(palm.palmLevel(id), s, helper);
    case "beach-ball": return beachPilot(beach.beachLevel(id), s, helper);
    case "fruit-bat-flight": return flightPilot(flightLevel(id), s, helper);
    case "lagoon-run": { const r = runFixture(runLevel(id), s, helper); return ran(r.result, r.state); }
  }
}
export const pilot = (game: ArcadeId, id: LevelId, seed?: number, helper = false, rows = 1): ArcadeResult | null => pilotRun(game, id, seed, helper, rows).result;
