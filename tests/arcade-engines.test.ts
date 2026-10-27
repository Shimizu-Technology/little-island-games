import { describe, expect, it } from "vitest";
import { allLevelIds, nextRandom, worldIds } from "../src/arcade";
import { clearLines, createReef, legalReefMoves, placementCells, reefEngine, reefLevel, reefLevels, reefResult, reefTransition, SHAPES } from "../src/arcade/games/reef-builder/engine";
import { createSong, glowingShell, noteDuration, songEngine, songLevel, songLevels, songResult, songStep, songTiles, songTransition, songWords, type SongState } from "../src/arcade/games/shell-song/engine";
import { advanceClock, FIXED_DT, snapDrop, swipeDirection } from "../src/arcade/clock";
import { wordEntry } from "../src/learn/kit/reading";
function hear(s: SongState) { for (let n = 0; n < 2000 && s.phase === "watch"; n++) s = songStep(s, { type: "tick" }, FIXED_DT); return s; }
function solveSong(initial: SongState): SongState {
  let s = initial;
  for (let round = 0; round < 20; round++) {
    s = hear(s);
    for (const index of [...s.pattern]) s = songTransition(s, { type: "shell", index });
    if (s.phase === "picture" && s.level !== "endless") s = songTransition(s, { type: "picture", word: s.level.word! });
    if (songResult(s)) return s;
  }
  throw new Error("Song did not end");
}
describe("arcade content and fixed input contract", () => {
  it("has three eight-level worlds and a complete learning world in both games", () => {
    for (const levels of [reefLevels, songLevels]) { expect(levels.map(l => l.id)).toEqual(allLevelIds); for (const world of worldIds) expect(levels.filter(l => l.world === world)).toHaveLength(8); expect(levels.every(l => l.goals.length === 3 && l.goals.every(Boolean))).toBe(true); }
    expect(songWords).toHaveLength(8); expect(songWords.every(w => wordEntry(w)?.tiles.length === 3)).toBe(true);
  });
  it("clamps long frames, preserves fixed steps, and ignores invalid time", () => {
    let clock = { remainder: 0, ticks: 0, dropped: 0 };
    for (let n = 0; n < 120; n++) clock = advanceClock(clock, 1 / 120).clock;
    expect(clock.ticks).toBe(60); expect(clock.remainder).toBeCloseTo(0);
    const long = advanceClock(clock, 4); expect(long.steps).toBe(6); expect(long.clock.dropped).toBeCloseTo(3.9);
    for (const dt of [NaN, Infinity, -1, 0]) expect(advanceClock(clock, dt).clock).toBe(clock);
  });
  it("uses stable RNG and snaps touch coordinates without placing outside the board", () => {
    expect(nextRandom(1)).toEqual(nextRandom(1)); expect(nextRandom(1)).not.toEqual(nextRandom(2));
    const rect = { x: 10, y: 100, width: 320, height: 320 };
    expect(snapDrop(329, 419, rect, 8, 8)).toEqual({ row: 7, col: 7 }); expect(snapDrop(330, 420, rect, 8, 8)).toBeNull(); expect(snapDrop(9, 100, rect, 8, 8)).toBeNull();
    expect(swipeDirection(6, 8)).toBeNull(); expect(swipeDirection(-40, 5)).toBe("left"); expect(swipeDirection(4, -60)).toBe("up");
  });
});
describe("Reef Builder", () => {
  it("teaches a real row clear with a fish, with unchanged input state", () => {
    const s = createReef(reefLevel("w1-1"), 27, false), original = JSON.stringify(s);
    const next = reefTransition(s, { type: "place", slot: 0, row: 7, col: 6 });
    expect(next.lines).toBe(1); expect(next.rescued).toBe(1); expect(next.board.every(n => n === 0)).toBe(true); expect(reefResult(next)?.stars).toBe(3); expect(JSON.stringify(s)).toBe(original);
    expect(reefTransition(next, { type: "place", slot: 0, row: 0, col: 0 })).toBe(next);
  });
  it("counts simultaneous row/column clears and their shared cell once", () => {
    const board = Array(64).fill(0); for (let n = 0; n < 8; n++) { board[3 * 8 + n] = 1; board[n * 8 + 4] = 1; }
    expect(clearLines(board)).toEqual({ cells: expect.any(Array), count: 2 }); expect(clearLines(board).cells).toHaveLength(15);
  });
  it("clears number rows only at ten, without requiring eight filled cells", () => {
    const s = createReef(reefLevel("learn-1"), 12), next = reefTransition(s, { type: "place", slot: 0, row: 7, col: 1 });
    expect(next.lines).toBe(1); expect(next.rescued).toBe(1); expect(next.status).toBe("cleared");
    const five = { ...s, pieces: [{ cells: SHAPES[0], value: 5, color: 1 }] };
    expect(reefTransition(five, { type: "place", slot: 0, row: 7, col: 1 }).lines).toBe(0);
    expect(placementCells(s, { cells: SHAPES[0], value: 7, color: 1 }, 7, 1)).toBeNull();
  });
  it("rejects overlap, off-board, malformed and stale placement without scoring", () => {
    const s = createReef(reefLevel("w1-2"), 7);
    for (const [row, col] of [[7, 0], [8, 0], [0, -1], [NaN, 2], [0, 7]]) {
      const next = reefTransition(s, { type: "place", slot: 0, row, col }); expect(next.score).toBe(0); expect(next.moves).toBe(0); expect(next.board).toEqual(s.board);
    }
    expect(reefTransition(s, { type: "place", slot: 9, row: 0, col: 0 })).toBe(s);
  });
  it("offers three pieces, refills after all three, and reproduces seeded play", () => {
    let a = createReef("endless", 411), b = createReef("endless", 411);
    expect(a.pieces).toHaveLength(3);
    for (let i = 0; i < 9; i++) { const move = legalReefMoves(a)[0]; expect(move).toBeDefined(); a = reefTransition(a, { type: "place", ...move }); b = reefTransition(b, { type: "place", ...move }); }
    expect(a).toEqual(b); expect(a.moves).toBe(9); expect(a.pieces.filter(Boolean)).toHaveLength(3);
  });
  it("gives Helper a gentle reroll without costing stars", () => {
    const s = createReef(reefLevel("w1-1"), 12, true), small = reefTransition(s, { type: "reroll", slot: 0 });
    expect(small.pieces[0]?.cells).toHaveLength(1); expect(small.moves).toBe(0);
    const still = reefTransition({ ...s, helper: false }, { type: "reroll", slot: 0 }); expect(still.pieces).toBe(s.pieces);
    expect(reefResult(reefTransition(s, { type: "place", slot: 0, row: 7, col: 6 }))?.stars).toBe(3);
  });
  it("reaches a real full-board result and lets free play finish voluntarily", () => {
    const s = createReef("endless", 1, false), board = Array(64).fill(1); board[0] = 0;
    const blocked = { ...s, board, pieces: [{ cells: SHAPES[0], value: 1, color: 1 }] };
    const placed = reefTransition(blocked, { type: "place", slot: 0, row: 0, col: 0 }); expect(placed.lines).toBe(16); expect(placed.board.every(n => !n)).toBe(true);
    expect(reefResult(reefTransition(s, { type: "finish" }))?.cleared).toBe(false); expect(reefEngine.result(s)).toBeNull();
  });
  it("every level has deterministic playable openings with valid shape bounds", () => {
    for (const level of reefLevels) { const s = createReef(level, 123); expect(s).toEqual(createReef(level, 123)); expect(legalReefMoves(s).length).toBeGreaterThan(0); expect(s.fish.length).toBeGreaterThanOrEqual(level.goal === "fish" ? level.target : 1); }
    expect(SHAPES.every(shape => new Set(shape.map(c => c.join())).size === shape.length && shape.every(([r, c]) => r >= 0 && r <= 3 && c >= 0 && c <= 3))).toBe(true);
  });
});
describe("Shell Song", () => {
  it.each(allLevelIds)("completes %s by the actual reducer, including word/picture learning", id => {
    const s = solveSong(createSong(songLevel(id), 18, false)); expect(songResult(s)?.stars).toBe(3); expect(s.slips).toBe(0); expect(songEngine.result(s)?.cleared).toBe(true);
  });
  it("ignores early taps, allows untimed input and replays exactly the same song", () => {
    const s = createSong(songLevel("w1-1"), 21, false); expect(songTransition(s, { type: "shell", index: s.pattern[0] })).toBe(s);
    let ready = hear(s); ready = songStep(ready, { type: "tick" }, 500); expect(ready.phase).toBe("repeat");
    expect(songTransition(ready, { type: "replay" }).pattern).toEqual(s.pattern); expect(noteDuration({ ...s, helper: true })).toBeGreaterThan(noteDuration(s));
    expect(glowingShell({ ...s, elapsed: 460 })).toBe(s.pattern[0]);
  });
  it("retries wrong patterns, ends gently after three slips without Helper, and keeps Helper stars", () => {
    let s = createSong(songLevel("w1-1"), 31, false);
    for (let n = 0; n < 3; n++) { s = hear(s); s = songTransition(s, { type: "shell", index: (s.pattern[0] + 1) % s.shells }); }
    expect(s.phase).toBe("rest"); expect(songResult(s)?.stars).toBe(0);
    let helped = createSong(songLevel("w1-1"), 31, true);
    for (let n = 0; n < 4; n++) { helped = hear(helped); helped = songTransition(helped, { type: "shell", index: (helped.pattern[0] + 1) % helped.shells }); }
    expect(helped.phase).toBe("watch"); expect(songResult(solveSong(helped))?.stars).toBe(1);
    expect(songResult(solveSong(createSong(songLevel("w1-1"), 31, true)))?.stars).toBe(3);
  });
  it("marks reading help/wrong pictures as helped, without a deadline or forced loss", () => {
    let s = hear(createSong(songLevel("learn-1"), 5, false)); for (const index of s.pattern) s = songTransition(s, { type: "shell", index });
    expect(s.phase).toBe("picture"); expect(songTiles(s)).toEqual(wordEntry(songLevel("learn-1").word!)!.tiles);
    for (let i = 0; i < 6; i++) s = songTransition(s, { type: "picture", word: s.choices.find(w => w !== songLevel("learn-1").word)! });
    expect(s.phase).toBe("picture"); expect(s.helped).toBe(true); expect(songTransition(s, { type: "picture", word: songLevel("learn-1").word! }).phase).toBe("cleared");
  });
  it("does not mutate previous state or accept invalid input", () => {
    const s = hear(createSong(songLevel("w2-1"), 4)), copy = JSON.stringify(s);
    for (const index of [-1, NaN, 7, .5]) expect(songTransition(s, { type: "shell", index })).toBe(s);
    songTransition(s, { type: "shell", index: s.pattern[0] }); expect(JSON.stringify(s)).toBe(copy);
    expect(songResult(songTransition(createSong("endless", 1), { type: "finish" }))?.stars).toBe(0);
  });
});

it("break reminders add only active play, across game segments, and stay off by default", async () => {
  const { changeBreakClock, breakDue } = await import("../src/arcade/breakClock");
  let clock = { played: 0, since: null } as import("../src/arcade/breakClock").BreakClock;
  clock = changeBreakClock(clock, true, 1000); clock = changeBreakClock(clock, false, 601000);
  expect(clock.played).toBe(600000); expect(breakDue(clock, 15, 99999999)).toBe(false);
  clock = changeBreakClock(clock, true, 2000000); expect(breakDue(clock, 15, 2300000)).toBe(true); expect(breakDue(clock, 0, 2300000)).toBe(false);
  expect(changeBreakClock(clock, true, 2300000)).toBe(clock);
});
