/**
 * A3a Arcade curves (AR-02 Shell Song, AR-03 Rail Parade, AR-04 Crab Crossing, AR-05 Palm Patrol).
 * Continuity itself is enforced by the AR-00 boundary table (tests/arcade-boundaries.test.ts); these
 * tests hold each row's own acceptance: witnesses for every scored seed, Helper off and on at 60 Hz.
 */
import { describe, expect, it } from "vitest";
import { createSong, noteDuration, songLevel, songLevels, songMotifUnits, songResult, songStep, songTransition, SONG_PHRASE_STEP } from "../src/arcade/games/shell-song/engine";
import { createRail, railLevel, railLevels, railScoredSeed, railTick } from "../src/arcade/games/rail-parade/engine";
import { crabLanes, crabLevel, crabLevels, crabPace, crabScoredSeed, crabStep, crabTransition, createCrab, supported, validCrab, type CrabState } from "../src/arcade/games/crab-crossing/engine";
import { createPalm, palmLevel, palmLevels, palmStep, palmTransition, palmWorkload, validPalm, PALM_BURST_LIMIT, PALM_ENDLESS_BREAK, PALM_WAVE_BREAK, type PalmLevel, type PalmState } from "../src/arcade/games/palm-patrol/engine";
import { boundaryTables, easings } from "../src/arcade/boundaries";
import { allLevelIds, type ArcadeId, type LevelId } from "../src/arcade/types";
import { arcadeTransition, emptyArcade, validArcade, type ArcadeSave } from "../src/arcade/progress";
import { readFileSync } from "node:fs";
import { crabWitness, pilotRun, railWitness } from "./helpers/arcade-pilots";
import { crossings, firstLanding, landsAt } from "./helpers/crab-support";
import { certified as railCertified } from "../src/arcade/games/rail-parade/certified";
import { certified as palmCertified } from "../src/arcade/games/palm-patrol/certified";
import { palmParsFromReplays, palmProbe, palmReplay, PALM_SEEDS, type PalmPilot } from "./helpers/palm-replay";
import { restBeats } from "../src/arcade/restBeats";

const ordinary = allLevelIds.filter(id => !id.startsWith("learn-"));
const rows = (game: string) => boundaryTables().find(t => t.game === game)!.rows.filter(r => !r.level.startsWith("learn-"));
const tick = { type: "tick" } as const;

describe("AR-02 Shell Song: motif units, new phrases, paired echoes, a long finale", () => {
  it("stores each phrase's independent units beside its taps, and plays exactly that", () => {
    for (const l of songLevels.filter(l => !l.word)) {
      expect(l.units).toHaveLength(l.rounds);
      expect(l.taps).toEqual(l.units.map(u => l.twist === "twins" ? u * 2 : u));
      let s = createSong(l, 77, false);
      const shown: number[] = [];
      while (!songResult(s)) {
        if (s.phase === "watch") s = songStep(s, tick, 1 / 30);
        else { if (s.cursor === 0) shown.push(s.pattern.length); s = songTransition(s, { type: "shell", index: s.pattern[s.cursor] }); }
      }
      expect(shown).toEqual(l.taps);
    }
  });
  it("enters World 6 with at least World 5's exit units, not its tap length", () => {
    expect(songMotifUnits(songLevel("w6-1"))).toBeGreaterThanOrEqual(songMotifUnits(songLevel("w5-8")));
    expect(Math.max(...songLevel("w6-1").taps)).toBeLessThan(Math.max(...songLevel("w5-8").taps));
  });
  it("never drops phrases or slows playback at a world entry, and only rest beats ease units", () => {
    const r = rows("shell-song");
    for (let i = 1; i < r.length; i++) {
      expect(r[i].values.phrases!).toBeGreaterThanOrEqual(r[i - 1].values.phrases!);
      expect(r[i].values.noteMs!).toBeLessThanOrEqual(r[i - 1].values.noteMs!);
      expect(r[i].values.noteMsPeak!).toBeLessThanOrEqual(r[i - 1].values.noteMsPeak!);
    }
    expect(easings().filter(e => e.game === "shell-song").map(e => `${e.level} ${e.metric}`)).toEqual(["w2-1 units", "w3-1 units", "w4-1 units", "w5-1 units"]);
    expect(songLevel("w6-8").rounds).toBe(5);
    expect(noteDuration({ ...createSong(songLevel("w3-1"), 1), rounds: 1 })).toBe(songLevel("w3-1").noteMs - SONG_PHRASE_STEP);
  });
  it("names the twists for what they ask", () => {
    expect(songLevel("w4-1").name).toBe("New phrases · 1");
    expect(songLevel("w4-1").goals[0]).toBe("Answer 4 new phrases");
    expect(songLevel("w5-3").goals[0]).toBe("Echo 4 paired phrases");
    expect(songLevel("w6-8").goals[0]).toBe("Play a long finale of 5 phrases");
    expect(songLevel("w1-1").goals[0]).toBe("Repeat 3 growing patterns");
  });
  it("has no response deadline and keeps Replay available in every phase of play", () => {
    for (const id of ["w1-1", "w4-8", "w5-8", "w6-8"] as const) {
      let s = createSong(songLevel(id), 9, false);
      while (s.phase === "watch") s = songStep(s, tick, 1 / 30);
      for (let i = 0; i < 600; i++) s = songStep(s, tick, 1 / 30);
      expect(s.phase).toBe("repeat");
      expect(songTransition(s, { type: "replay" }).phase).toBe("watch");
      expect(songTransition(songTransition(s, { type: "shell", index: s.pattern[0] }), { type: "replay" }).phase).toBe("watch");
    }
  });
});

describe("AR-03 Rail Parade: tick continuity and a certified scored seed pool", () => {
  it("never slows the step at a world entry, start or peak, and keeps the old top speed", () => {
    const r = rows("rail-parade");
    for (let i = 1; i < r.length; i++) { expect(r[i].values.tick!).toBeLessThanOrEqual(r[i - 1].values.tick!); expect(r[i].values.tickPeak!).toBeLessThanOrEqual(r[i - 1].values.tickPeak!); }
    expect(railLevel("w6-8").tick).toBeCloseTo(0.113, 6);
    expect(railLevel("w4-1").tick).toBeLessThan(railLevel("w3-8").tick);
  });
  it("plays scored levels only from the pool and leaves Endless free", () => {
    for (const l of railLevels) {
      expect(l.seeds).toEqual(railCertified.levels[l.id].seeds);
      expect(new Set(l.seeds).size).toBe(8);
      for (const entropy of [0, 1, 7, 8, 0xffffffff, 123456789]) expect(l.seeds).toContain(railScoredSeed(l, entropy));
    }
    expect(railScoredSeed("endless", 987654)).toBe(987654);
  });
  it.each(railLevels.map(l => [l.id] as const))("%s: every pooled seed has a no-bump witness within par, Helper off and on", id => {
    const l = railLevel(id);
    for (const seed of l.seeds) for (const helper of [false, true]) {
      const run = railWitness(l, seed, helper);
      expect(run.helper).toBe(helper);
      expect(run.result?.cleared, `${id} seed ${seed} helper ${helper}`).toBe(true);
      expect(run.bumps).toBe(0);
      expect(run.moves).toBeLessThanOrEqual(l.par);
      expect(run.result?.stars).toBe(3);
    }
  });
});

describe("AR-04 Crab Crossing: speed continuity, certified hop budgets, reachable support", () => {
  it("never slows lanes at a world entry, and keeps the authored top speed", () => {
    const r = rows("crab-crossing");
    for (let i = 1; i < r.length; i++) { expect(r[i].values.speed!).toBeGreaterThanOrEqual(r[i - 1].values.speed!); expect(r[i].values.period!).toBeLessThanOrEqual(r[i - 1].values.period!); }
    expect(crabLevel("w6-8").speed).toBeCloseTo(2.815, 6);
    expect(crabLevel("w4-1").speed).toBeCloseTo(crabLevel("w3-8").speed, 6);
  });
  it("plays scored levels only from the certified traffic phases and leaves Endless free", () => {
    for (const l of crabLevels) { expect(new Set(l.seeds.map(s => s % 100)).size).toBe(8); for (const entropy of [0, 5, 0xffffffff]) expect(l.seeds).toContain(crabScoredSeed(l, entropy)); }
    expect(crabScoredSeed("endless", 4242)).toBe(4242);
  });
  it.each(crabLevels.map(l => [l.id] as const))("%s: every pooled phase crosses with no bump within its hop budget, Helper off and on", id => {
    const l = crabLevel(id);
    for (const seed of l.seeds) for (const helper of [false, true]) {
      const run = crabWitness(l, seed, helper);
      expect(run.helper).toBe(helper);
      expect(run.result?.cleared, `${id} phase ${seed} helper ${helper}`).toBe(true);
      expect(run.bumps).toBe(0);
      // The budget counts hops only. Waiting on the sand or a deck is free.
      expect(run.hops).toBeLessThanOrEqual(l.par);
      expect(run.result?.stars).toBe(3);
    }
  });
  it("alternates water lane directions, so a reversed log never drifts alongside the turtles", () => {
    for (const id of ["w1-1", "w4-1", "w6-8"] as const) {
      const water = crabLanes(createCrab(crabLevel(id), 0)).filter(l => l.row <= 4 && l.speed !== 0).sort((a, b) => b.row - a.row);
      expect(Math.sign(water[0].speed)).toBe(-Math.sign(water[1].speed));
    }
  });
  // Paces: Helper on at the start (0.8), Helper off at the start (1) and at the last burrow (1.15), and Endless at its cap.
  it.each(crabLevels.filter(l => l.world !== "learn").map(l => [l.id] as const))("%s: every water lane has reachable support under real hop time and drift", id => {
    for (const pace of [0.8, 1, 1.15]) for (const c of crossings(crabLevel(id), pace)) {
      // A crab that lands more than one tile from the edge its deck drifts toward always has a way up within 3 s.
      expect(c.stranded.filter(s => s.tilesToEdge > 1), `${id} row ${c.row} pace ${pace}`).toEqual([]);
      expect(c.worstWait).toBeLessThanOrEqual(3);
    }
  });
  it("gives Endless the same reachable support at its fastest pace", () => {
    for (const c of crossings("endless", 1.6 * 1.15)) { expect(c.stranded.filter(s => s.tilesToEdge > 1)).toEqual([]); expect(c.worstWait).toBeLessThanOrEqual(3); }
  });
  it("matches the engine at an edge platform: the model's landing frames are the engine's", () => {
    // W4-1's reversed log carries the crab left. Stand on it close to the left edge.
    const level = crabLevel("w4-1"), lanes = crabLanes(createCrab(level, 0)), log = lanes.find(l => l.kind === "log")!, turtle = lanes.find(l => l.kind === "turtle")!;
    expect(log.speed).toBeLessThan(0);
    const start = (x: number, travel: number): CrabState => ({ ...createCrab(level, 0), x, y: 4, travel, furthest: 4 });
    const pace = crabPace(start(1, 0));
    let tau = 0, x = 0, first = -1;
    search: for (tau = 0; tau < 20; tau += 0.05) for (x = 0.8; x <= 1.6; x += 0.1) if (supported(log, x, tau) && (first = firstLanding(log, turtle, pace, tau, x)) > 0 && landsAt(log, turtle, pace, tau, x, first)) break search;
    expect(first).toBeGreaterThan(0);
    const hopAfter = (frames: number) => {
      let s = start(x, tau);
      expect(validCrab(s)).toBe(true);
      for (let f = 0; f < frames; f++) s = crabStep(s, tick, 1 / 60);
      s = crabTransition(s, { type: "hop", direction: "up" });
      for (let f = 0; f < 12 && s.hop; f++) s = crabStep(s, tick, 1 / 60);
      return s;
    };
    // The first frame the model allows lands on a turtle; a frame it forbids splashes.
    expect(hopAfter(first)).toMatchObject({ y: 3, bumps: 0 });
    const early = Array.from({ length: first }, (_, f) => f).find(f => !landsAt(log, turtle, pace, tau, x, f))!;
    expect(hopAfter(early)).toMatchObject({ bumps: 1, impact: { kind: "splash" } });
    // Waiting instead rides the log off the edge at the time the model gives.
    let wait = start(x, tau);
    while (wait.bumps === 0) wait = crabStep(wait, tick, 1 / 60);
    expect(wait.impact.kind).toBe("splash");
    expect(Math.abs(wait.time - x / (-log.speed * pace))).toBeLessThanOrEqual(1 / 60 + 1e-9);
  });
});

describe("AR-05 Palm Patrol: smoothed workload, short bursts, a 2 s break, replay pars", () => {
  it("authors World 1 as 5, 5, 5, 8, 10, 12, 14 with one relay, and a short crown encounter at W1-8", () => {
    expect(["w1-1", "w1-2", "w1-3", "w1-4", "w1-5", "w1-6", "w1-7"].map(id => palmWorkload(palmLevel(id as LevelId)).beetles)).toEqual([5, 5, 5, 8, 10, 12, 14]);
    expect(palmLevels.every(l => l.relays === 1)).toBe(true);
    const w18 = palmLevel("w1-8");
    expect(palmWorkload(w18)).toEqual({ beetles: 15, armorHits: 0, crowns: 1, crownHp: 5, nets: 19, crownWave: true });
    expect(w18.waves).toBe(2);
  });
  it("brings divers in at World 2 with two waves of 10, and caps every level at 60 beetles with armor counted apart", () => {
    const w2 = palmLevel("w2-1");
    expect([w2.count, w2.waves, w2.relays, w2.divers]).toEqual([10, 2, 1, true]);
    for (const id of ordinary) { const w = palmWorkload(palmLevel(id)); expect(w.beetles).toBeLessThanOrEqual(60); if (!palmLevel(id).armored) expect(w.armorHits).toBe(0); }
    expect(palmWorkload(palmLevel("w3-1"))).toEqual({ beetles: 27, armorHits: 6, crowns: 0, crownHp: 0, nets: 33, crownWave: false });
    expect(palmWorkload(palmLevel("w6-8"))).toEqual({ beetles: 36, armorHits: 8, crowns: 1, crownHp: 5, nets: 48, crownWave: false });
  });
  it("counts every crown and its nets in the workload, checked against the formations the engine really sends", () => {
    // Review P2-1: walk each level's real formations, emptying a wave only to see the next one.
    const formations = (l: PalmLevel) => {
      let s: PalmState = createPalm(l, 9, false), beetles = 0, crowns = 0, nets = 0, armor = 0, guard = 0;
      for (;;) {
        beetles += s.beetles.length; crowns += s.beetles.filter(b => b.boss).length;
        nets += s.beetles.reduce((n, b) => n + b.hp, 0); armor += s.beetles.filter(b => !b.boss && b.hp > 1).length;
        const wave = s.wave;
        s = palmStep({ ...s, beetles: [] }, tick, 1 / 60);
        while (s.phase === "play" && s.wave === wave && guard++ < 1e5) s = palmStep(s, tick, 1 / 60);
        if (s.phase !== "play") return { beetles, crowns, nets, armor };
      }
    };
    for (const id of ordinary) {
      const l = palmLevel(id), w = palmWorkload(l), real = formations(l);
      expect({ beetles: w.beetles, crowns: w.crowns, nets: w.nets, armor: w.armorHits }, id).toEqual(real);
      expect(w.nets).toBe(w.beetles - w.crowns + w.armorHits + w.crownHp);
    }
    expect(formations(palmLevel("w3-8"))).toEqual({ beetles: 28, crowns: 1, nets: 38, armor: 6 });
    expect(formations(palmLevel("w4-1"))).toEqual({ beetles: 27, crowns: 0, nets: 33, armor: 6 });
  });
  it("shows the two world-entry workload drops in the boundary table as named rest beats beside the speed rest beats", () => {
    const palmEasings = easings().filter(e => e.game === "palm-patrol" && e.param === "workload");
    expect(palmEasings.map(e => `${e.from}→${e.level} ${e.metric} ${e.before}→${e.after}`).sort()).toEqual([
      "w3-8→w4-1 beetles 28→27", "w3-8→w4-1 nets 38→33", "w4-8→w5-1 beetles 28→27", "w4-8→w5-1 nets 38→33",
    ]);
    for (const level of ["w4-1", "w5-1"]) {
      const note = restBeats.find(n => n.game === "palm-patrol" && n.level === level && n.metric === "workload")!;
      expect("restBeat" in note && note.restBeat.with).toBe("speed");
      expect(restBeats.some(n => n.game === "palm-patrol" && n.level === level && n.metric === "speed" && "restBeat" in n)).toBe(true);
    }
    expect(readFileSync("docs/ARCADE_BOUNDARIES.md", "utf8")).toContain("w3-8 → w4-1, Nets needed");
  });
  it("rests 2 s between waves with no beetles and no tosses", () => {
    let s: PalmState = createPalm(palmLevel("w2-1"), 3, false);
    s = { ...s, beetles: [] };
    s = palmStep(s, tick, 1 / 60);
    expect(s.waveWait).toBe(PALM_WAVE_BREAK);
    expect(s.beetles).toEqual([]);
    expect(palmTransition(s, { type: "toss" }).shots).toBe(s.shots);
    let frames = 0;
    while (s.waveWait > 0) { s = palmStep(s, tick, 1 / 60); frames++; expect(s.lives.hit).toBe(0); }
    expect(frames / 60).toBeGreaterThanOrEqual(PALM_WAVE_BREAK - 1e-9);
    expect(s.wave).toBe(2);
  });
  it("keeps Endless's own waves and short breath", () => {
    const s = createPalm("endless", 5, false);
    expect(s.beetles).toHaveLength(10);
    let e: PalmState = { ...s, beetles: [] };
    e = palmStep(e, tick, 1 / 60);
    expect(e.relay).toBe(2);
    e = { ...e, beetles: [], relay: 2 };
    e = palmStep(e, tick, 1 / 60);
    expect(e.waveWait).toBe(PALM_ENDLESS_BREAK);
  });
  it("takes a safe 2 s breather mid-formation once ordinary play has run 15 s, keeping every beetle", () => {
    // Review P1: the engine enforces the burst limit itself. A diver mid-dive and a marcher just above the
    // shields are both on the board when the limit arrives.
    let s: PalmState = createPalm(palmLevel("w3-1"), 4, false);
    s = { ...s, burst: PALM_BURST_LIMIT - 1 / 120, launcher: 300, beetles: s.beetles.map((b, i) => i === 1 ? { ...b, diving: true, y: 430, x: 120 } : i === 3 ? { ...b, y: 470, x: 72 } : b) };
    const before = s.beetles.map(b => ({ id: b.id, hp: b.hp })), event = s.event;
    s = palmStep(s, tick, 1 / 60);
    expect(s.waveWait).toBe(PALM_WAVE_BREAK);
    expect(s.burst).toBe(0);
    // It sounds the wave tone; the view shows its own resting label instead of pulse text.
    expect([s.cue, s.event, s.pulse]).toEqual(["wave", event + 1, 0]);
    expect(s.beetles.map(b => ({ id: b.id, hp: b.hp }))).toEqual(before);
    expect(palmTransition(s, { type: "toss" }).shots).toBe(s.shots);
    expect(validPalm(s)).toBe(true);
    let frames = 1;
    while (s.waveWait > 0) {
      const prev = s;
      s = palmStep(s, tick, 1 / 60); frames++;
      expect(s.lives.hit).toBe(0);
      for (const b of s.beetles) expect(b.y).toBeLessThanOrEqual(prev.beetles.find(p => p.id === b.id)!.y + 1e-9);
    }
    // The tick that ends the breather still holds; the diver is back in its row and nobody came closer.
    expect(frames / 60).toBeGreaterThanOrEqual(PALM_WAVE_BREAK);
    expect(s.wave).toBe(1);
    expect(s.beetles.map(b => ({ id: b.id, hp: b.hp }))).toEqual(before);
    const diver = s.beetles.find(b => b.id === 1)!;
    expect(diver.diving).toBe(false);
    expect(diver.y).toBeCloseTo(105 + s.marchY, 6);
    // The marcher that was about to reach the shields climbed back to its row as well.
    expect(s.beetles.find(b => b.id === 3)!.y).toBeCloseTo(105 + s.marchY, 6);
    for (const b of s.beetles) expect(b.y, `beetle ${b.id}`).toBeLessThanOrEqual(105 + Math.floor(b.id / 5) * 58 + s.marchY + 1e-9);
    // Play resumes: the clock runs again and tosses are accepted.
    s = palmStep(s, tick, 1 / 60);
    expect(s.burst).toBeGreaterThan(0);
    expect(palmTransition({ ...s, cooldown: 0 }, { type: "toss" }).shots).toBe(s.shots + 1);
  });
  it("keeps Learn untimed: no breather however long a fact takes", () => {
    let s: PalmState = createPalm(palmLevel("learn-5"), 2, false);
    for (let i = 0; i < 60 * 40; i++) { s = palmStep(s, tick, 1 / 60); expect(s.waveWait).toBe(0); }
    expect(s.phase).toBe("play");
    expect(s.burst).toBe(0);
  });
  it("holds Endless to the same 15 s limit, with valid breather states", () => {
    for (const pilot of ["gentle", "late", "idle"] as const) for (const helper of [false, true]) {
      const r = palmProbe("endless", 3, helper, pilot, 240);
      expect(r.burst, `${pilot} ${helper}`).toBeLessThanOrEqual(PALM_BURST_LIMIT);
      expect(r.holds).toBeGreaterThan(0);
      expect([r.breakHits, r.breakMoves, r.lostProgress, r.diving]).toEqual([0, 0, 0, 0]);
    }
    let s: PalmState = createPalm("endless", 6, false);
    s = palmStep({ ...s, burst: PALM_BURST_LIMIT }, tick, 1 / 60);
    expect(s.waveWait).toBe(PALM_WAVE_BREAK);
    expect(validPalm(s)).toBe(true);
  });
  it("matches the reviewer's gentle replays: W1-7, W3-1 and W6-8 now break before 15 s", () => {
    for (const id of ["w1-7", "w3-1", "w6-8"] as const) {
      const r = palmReplay(palmLevel(id), 1, false, "gentle");
      expect(r.burst, id).toBeLessThanOrEqual(PALM_BURST_LIMIT);
      expect(r.holds, id).toBeGreaterThan(0);
      expect(r.result?.cleared, id).toBe(true);
    }
  });
  const pilots: [PalmPilot, readonly number[]][] = [["gentle", PALM_SEEDS], ["late", [1, 2]], ["miss", [1, 2]], ["idle", [1]]];
  it.each(ordinary.map(id => [id] as const))("%s: gentle, late, missing and idle pilots never play more than 15 s between safe breaks", id => {
    const l = palmLevel(id);
    for (const [pilot, seeds] of pilots) for (const seed of seeds) for (const helper of [false, true]) {
      const r = palmProbe(l, seed, helper, pilot), at = `${id} ${pilot} seed ${seed} helper ${helper}`;
      expect(r.burst, at).toBeLessThanOrEqual(PALM_BURST_LIMIT);
      expect(r.breaks.every(b => b >= PALM_WAVE_BREAK), at).toBe(true);
      expect({ breakHits: r.breakHits, breakMoves: r.breakMoves, lostProgress: r.lostProgress, diving: r.diving }, at).toEqual({ breakHits: 0, breakMoves: 0, lostProgress: 0, diving: 0 });
      // The gentle child still clears every level with Helper on. Helper off, 11 of its 384 runs in W5-4,
      // W5-8 and W6-2 lose their hearts, exactly as before the breather (A3a FIX-REPORT).
      if (pilot === "gentle" && helper) expect(r.result?.cleared, at).toBe(true);
    }
  });
  it.each(ordinary.map(id => [id] as const))("%s: steady legal replays clear hit-free with bursts of 15 s or less and earn three stars, Helper off and on", id => {
    const l = palmLevel(id);
    for (const seed of PALM_SEEDS) for (const helper of [false, true]) {
      const r = palmReplay(l, seed, helper, "steady");
      expect(r.helper).toBe(helper);
      expect(r.result?.cleared, `${id} seed ${seed} helper ${helper}`).toBe(true);
      expect(r.heartsLost).toBe(0);
      expect(r.burst).toBeLessThanOrEqual(15);
      expect(r.breaks.every(b => b >= PALM_WAVE_BREAK)).toBe(true);
      expect(r.breaks).toHaveLength(l.waves - 1);
      expect(r.holds).toBe(0);
      // Rounds of more than one wave land in the 20–60 s target; W1-8's short crown encounter brings it to
      // 19.4–20.4 s. World 1's single waves are one short burst each.
      if (l.waves > 1) { expect(r.time).toBeGreaterThanOrEqual(l.world === "w1" ? 19 : 20); expect(r.time).toBeLessThanOrEqual(60); }
      expect(r.result?.stars).toBe(3);
    }
  });
  it("takes its aim and time pars from those replays", () => {
    const fitted = palmParsFromReplays(palmLevels);
    expect(palmCertified.levels).toEqual(fitted);
    for (const l of palmLevels) expect({ par: l.par, accuracy: l.accuracy }).toEqual(fitted[l.id]);
  });
});

describe("A3a dares and saves", () => {
  it("still witnesses each changed game's dares on the real launch path", () => {
    expect(pilotRun("rail-parade", "w1-5", 3).result?.facts?.streak).toBeGreaterThanOrEqual(6);
    expect(pilotRun("crab-crossing", "w2-2", 3).result?.facts?.clean).toBeGreaterThanOrEqual(1);
  });
  it("keeps stars and bests won under the old curves; a weaker finish on a new curve never rescores them", () => {
    // The frozen 3.0.0 save (tests/fixtures/arcade): learner b holds Shell Song stars from the old tempo and phrases.
    const shipped = JSON.parse(readFileSync("tests/fixtures/arcade/arcade-d1-shipped.json", "utf8")) as ArcadeSave, old = shipped.people.b.games["shell-song"]!;
    const level = Object.keys(old.stars)[0] as LevelId;
    const after = arcadeTransition(shipped, "b", { type: "finish", game: "shell-song", level, stars: 1, score: 1, round: "a3a-new-curve", name: "B" });
    expect(validArcade(after)).toBe(true);
    expect(after.people.b.games["shell-song"]!.stars).toEqual(old.stars);
    expect(after.people.b.games["shell-song"]!.best).toBe(old.best);
    for (const game of ["rail-parade", "crab-crossing", "palm-patrol"] as ArcadeId[]) {
      const won = arcadeTransition(emptyArcade(), "family", { type: "finish", game, level: "w6-8", stars: 3, score: 999, round: `${game}-v1`, name: "Kid" });
      const later = arcadeTransition(won, "family", { type: "finish", game, level: "w6-8", stars: 1, score: 10, round: `${game}-v2`, name: "Kid" });
      expect(later.people.family.games[game]!.stars["w6-8"]).toBe(3);
      expect(later.people.family.games[game]!.best).toBe(999);
    }
  });
  it("versions every changed descriptor, so a round says which curve it played", () => {
    for (const l of [...songLevels, ...railLevels, ...crabLevels, ...palmLevels]) expect(l.rulesVersion, l.id).toBe(2);
    expect(createSong(songLevel("w6-1"), 3).level).toMatchObject({ rulesVersion: 2 });
    expect(createRail(railLevel("w2-1"), railLevel("w2-1").seeds[0]).level).toMatchObject({ rulesVersion: 2 });
    expect(railTick(createRail(railLevel("w4-1"), 1))).toBeCloseTo(railLevel("w4-1").tick, 9);
  });
});
