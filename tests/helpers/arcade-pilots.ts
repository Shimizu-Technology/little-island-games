/**
 * Legal-input pilots for every Arcade engine, used as dare witnesses (AR-10).
 * Rail, Crab, Palm, Beach and Flight pilots are the v3 play-spec reachability
 * policies (artifacts v3/master-audit/play-spec/probes/reachability.ts); Reef and
 * Cargo replay tests/fixtures/puzzle-feel.json; Run uses the shipped runFixture.
 * Pilots only send real inputs to the real transitions: no state is patched.
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

function railPilot(level: rail.RailLevel, seed: number, helper: boolean) {
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
  return rail.railResult(s);
}
function crabPilot(level: crab.CrabLevel, seed: number, helper: boolean) {
  let s = crab.createCrab(level, seed, helper);
  for (let c = 0; c < level.target; c++) {
    for (const d of crossingPath(s)) s = crabAdvance(d === "wait" ? s : crab.crabTransition(s, { type: "hop", direction: d }));
    if (s.phase === "play") s = crabAdvance(s, 12);
  }
  return crab.crabResult(s);
}
function palmPilot(level: palm.PalmLevel, seed: number, helper: boolean) {
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
  return palm.palmResult(s);
}
function beachPilot(level: beach.BeachLevel, seed: number, helper: boolean) {
  let s = beach.createBeach(level, seed, helper);
  for (let i = 0; i < 40000 && s.phase === "play"; i++) {
    const b = s.balls.filter(b => b.vy > 0).sort((a, b) => (513 - a.y) / a.vy - (513 - b.y) / b.vy)[0] ?? s.balls[0];
    const aim = beach.reflectedX(b.x + b.vx * Math.max(0, (513 - b.y) / Math.max(1, b.vy)));
    s = beach.beachTransition(s, { type: "paddle", seat: 0, x: aim + (aim > 180 ? -29 : 29) });
    s = beach.beachStep(s, tick, 1 / 60);
  }
  return beach.beachResult(s);
}
function fly(level: flight.FlightState["level"], seed: number, helper: boolean, offset: number, look: number, trigger: number) {
  let s = flight.createFlight(level, seed, helper);
  for (let i = 0; i < 15000 && !flight.flightResult(s); i++) {
    const gate = s.gates.filter(g => !g.passed && g.x > look).sort((a, b) => a.x - b.x)[0];
    const target = gate ? flight.flightLearning(s) ? [.24, .5, .76][gate.fact.choices.indexOf(gate.fact.answer)] : gate.center : .5;
    if (s.waiting || (s.y > target + offset && s.vy > trigger)) s = flight.flightTransition(s, { type: "flap" });
    s = flight.flightStep(s, { type: "idle" }, 1 / 60);
  }
  return flight.flightResult(s);
}
/** Same bounded controller search as the v3 probe; the first three-star parameters win. */
function flightPilot(level: flight.FlightState["level"], seed: number, helper: boolean) {
  let best: ArcadeResult | null = null;
  for (const trigger of [-.05, -.35, .1]) for (const look of [.175, .19, .2, .22, .14]) for (const offset of [.045, .025, .065, 0, -.02, .035, .055, .015, .075, .06, .07, .05, .04]) {
    const r = fly(level, seed, helper, offset, look, trigger);
    if (!best || (r?.stars ?? 0) > best.stars) best = r;
    if (r?.stars === 3) return r;
  }
  return best;
}
function reefPilot(id: LevelId) {
  const f = fixtures.reef.find(f => f.id === id)!;
  let s = reef.createReef(reef.reefLevel(id), f.seed, false);
  for (const m of f.moves) s = reef.reefTransition(s, { type: "place", ...m });
  return reef.reefResult(s);
}
function cargoPilot(id: LevelId) {
  const f = fixtures.cargo.find(f => f.id === id)!;
  let s = cargo.createCargo(cargo.cargoLevel(id), f.seed, false);
  for (const m of f.moves) {
    for (let i = 0; i < m.turn; i++) s = cargo.cargoTransition(s, { type: "rotate" });
    for (let i = 0; i < 9 && s.col !== m.col; i++) s = cargo.cargoTransition(s, { type: s.col < m.col ? "right" : "left" });
    s = cargo.cargoTransition(s, { type: "drop" });
  }
  return cargo.cargoResult(s);
}
function songPilot(id: LevelId) {
  const l = song.songLevel(id);
  let s = song.createSong(l, 42, false), n = 0;
  while (!song.songResult(s) && n++ < 20000) {
    if (s.phase === "watch") s = song.songStep(s, tick, 1 / 30);
    else if (s.phase === "repeat") s = song.songTransition(s, { type: "shell", index: s.pattern[s.cursor] });
    else if (s.phase === "picture") s = song.songTransition(s, { type: "picture", word: l.word! });
  }
  return song.songResult(s);
}
/** The v3 probe's fixture seeds per game; Reef and Cargo use their recorded fixture seeds. */
export const pilotSeeds: Partial<Record<ArcadeId, number>> = { "rail-parade": 120, "crab-crossing": 120, "palm-patrol": 42, "beach-ball": 42, "fruit-bat-flight": 981, "lagoon-run": 771, "shell-song": 42 };
export function pilot(game: ArcadeId, id: LevelId, seed = pilotSeeds[game] ?? 42, helper = false): ArcadeResult | null {
  switch (game) {
    case "reef-builder": return reefPilot(id);
    case "canoe-cargo": return cargoPilot(id);
    case "shell-song": return songPilot(id);
    case "rail-parade": return railPilot(rail.railLevel(id), seed, helper);
    case "crab-crossing": return crabPilot(crab.crabLevel(id), seed, helper);
    case "palm-patrol": return palmPilot(palm.palmLevel(id), seed, helper);
    case "beach-ball": return beachPilot(beach.beachLevel(id), seed, helper);
    case "fruit-bat-flight": return flightPilot(flightLevel(id), seed, helper);
    case "lagoon-run": return runFixture(runLevel(id), seed, helper).result;
  }
}
