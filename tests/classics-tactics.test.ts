import { describe, expect, it } from "vitest";
import { ticForkDescriptors, ticForkEngine, ticPosition, forkSquares } from "../src/games/classics/ticForks";
import { checkersTacticsDescriptors, checkersTacticsEngine, tacticsPosition, winningCaptures } from "../src/games/classics/checkersTactics";
import { ticMove, ticOutcome, ticTurn, createTic } from "../src/games/tic";
import { checkersMoves, applyCheckers, col, row } from "../src/games/checkers";
import { defaultOptions, random } from "../src/games/types";
import { registration as tic } from "../src/challenge/registrations/tic-tac-toe";
import { registration as checkers } from "../src/challenge/registrations/checkers";
import { emptyChallenge, validChallengeSession, type ChallengeSession } from "../src/state/challenge";
const options = { supportOff: false, ownRead: false };
const launch = (entry: typeof tic | typeof checkers, index = 0) => {
  const p = entry.puzzles[index];
  return entry.start(p.ref, "family", "tactic-test", emptyChallenge(), options, p.dares.map(d => d.slot));
};
describe("Classics authored tactics", () => {
  it("certifies every legal Tic prefix and every answer, including all alternative answers", () => {
    for (const d of ticForkDescriptors) {
      let s = createTic(defaultOptions);
      for (const i of d.prefix) { expect(ticOutcome(s.board)).toBeNull(); const next = ticMove(s, i); expect(next).not.toBe(s); s = next; }
      const player = ticTurn(s.board), other = player === "X" ? "O" : "X", answers = forkSquares(s.board, player);
      expect(s.board.flatMap((v, i) => { if (v) return []; const b = [...s.board]; b[i] = player; return ticOutcome(b) === player ? [i] : []; }), d.title).toEqual([]);
      expect(answers.length, d.title).toBeGreaterThan(0);
      // Independent engine proof: after any legal defence, at least one immediate winning move remains.
      const actual: number[] = [];
      s.board.forEach((v, i) => {
        if (v) return;
        const after = ticMove(s, i); if (ticOutcome(after.board)) return;
        const threats = after.board.flatMap((v, j) => { if (v) return []; const b = [...after.board]; b[j] = player; return ticOutcome(b) === player ? [j] : []; });
        if (threats.length < 2) return;
        const all = after.board.every((v, j) => {
          if (v) return true;
          const reply = ticMove(after, j);
          return ticOutcome(reply.board) !== other && reply.board.some((v, k) => !v && ticOutcome(ticMove(reply, k).board) === player);
        });
        if (all) actual.push(i);
      });
      expect(answers).toEqual(actual);
    }
  });
  it("certifies every composed legal Checkers position and its complete winning chains", () => {
    for (const d of checkersTacticsDescriptors) {
      expect(new Set(d.pieces.map(([i]) => i)).size).toBe(d.pieces.length);
      for (const [i, piece] of d.pieces) { expect((row(i) + col(i)) % 2).toBe(1); expect(Math.abs(piece)).toBeLessThanOrEqual(2); if (piece === 1) expect(row(i)).not.toBe(7); if (piece === -1) expect(row(i)).not.toBe(0); }
      const p = tacticsPosition(d), solutions = winningCaptures(p);
      expect(solutions.length, d.title).toBeGreaterThan(0);
      for (const m of solutions) {
        const after = applyCheckers(p, m, "classic");
        expect(checkersMoves(after, "classic")).toEqual([]);
        expect(after.outcome).toBe(d.turn === 1 ? "red" : "blue");
        const s = checkersTacticsEngine.step(checkersTacticsEngine.create(d, { version: 1 }, options), ["m", m.from, m.path], d)!;
        expect(s.correct).toBe(true);
      }
    }
    expect(checkersMoves(tacticsPosition(checkersTacticsDescriptors.at(-1)!)).length).toBeGreaterThan(1);
  });
  it("awards only permanent marks, validates resumed replay, and rejects forged results", () => {
    for (let i = 0; i < tic.puzzles.length; i++) {
      const s = launch(tic, i), d = ticForkDescriptors[i], answer = forkSquares(ticPosition(d).board, ticTurn(ticPosition(d).board))[0];
      const selected = tic.move(s, ["s", answer])!, done = tic.move(selected, ["c"])!;
      expect(done.result).toMatchObject({ event: "independent", awards: 0, dares: [tic.puzzles[i].dares[0].slot], cost: null });
      expect(validChallengeSession(JSON.parse(JSON.stringify(done)), "family", tic.catalog)).toBe(true);
      expect(tic.move(done, ["h"])).toBeNull();
      expect(validChallengeSession({ ...s, result: done.result }, "family", tic.catalog)).toBe(false);
    }
    for (let i = 0; i < checkers.puzzles.length; i++) {
      const s = launch(checkers, i), m = winningCaptures(tacticsPosition(checkersTacticsDescriptors[i]))[0];
      expect(checkers.move(s, ["m", m.from, m.path])!.result).toMatchObject({ event: "independent", awards: 0, dares: [checkers.puzzles[i].dares[0].slot] });
    }
  });
  it("retains failed choice, and help/reset cannot erase attempt evidence", () => {
    let s = launch(tic);
    s = tic.move(s, ["s", 3])!; s = tic.move(s, ["c"])!;
    expect((s.payload as { actions: unknown[] }).actions.at(-1)).toEqual(["c"]);
    s = tic.move(s, ["z"])!; s = tic.move(s, ["s", 6])!; s = tic.move(s, ["c"])!;
    expect(s.result).toMatchObject({ event: "helped", dares: [], awards: 0 });
    const d = checkersTacticsDescriptors.at(-1)!, p = tacticsPosition(d), all = checkersMoves(p), bad = all.find(m => !winningCaptures(p).some(w => JSON.stringify(w) === JSON.stringify(m)))!;
    let c = launch(checkers, checkers.puzzles.length - 1);
    c = checkers.move(c, ["m", bad.from, bad.path])!; expect(c.result).toBeNull();
    c = checkers.move(c, ["h"])!; c = checkers.move(c, ["z"])!;
    const good = winningCaptures(p)[0]; c = checkers.move(c, ["m", good.from, good.path])!;
    expect(c.result).toMatchObject({ event: "helped", dares: [] });
  });
  it("rejects malformed actions and survives 10,000 deterministic action prefixes per tactic", () => {
    const rng = random(213);
    for (const [entry, kinds] of [[tic, ["s", "c", "h", "z"]], [checkers, ["m", "h", "z"]]] as const) {
      let s: ChallengeSession = launch(entry), accepted = 0;
      for (let i = 0; i < 10000; i++) {
        if (s.result || i % 200 === 0) s = launch(entry, i % entry.puzzles.length);
        const kind = kinds[Math.floor(rng() * kinds.length)], action = kind === "s" ? [kind, Math.floor(rng() * 12) - 1] : kind === "m" ? [kind, Math.floor(rng() * 64), [Math.floor(rng() * 64)]] : [kind];
        const next = entry.move(s, action); if (next) { expect(validChallengeSession(next, "family", entry.catalog)).toBe(true); s = next; accepted++; }
      }
      expect(accepted).toBeGreaterThan(100);
      for (const bad of [null, ["s", -1], ["m", 1, []], ["h", 1], ["unknown"]]) expect(entry.move(launch(entry), bad)).toBeNull();
    }
    expect(ticForkEngine.validAction(["s", 9])).toBe(false);
  });
});

it("every clean Checkers mark requires a real choice", () => {
  for (const d of checkersTacticsDescriptors) {
    const p = tacticsPosition(d), legal = checkersMoves(p, "classic"), wins = winningCaptures(p);
    expect(legal.length, d.title).toBeGreaterThan(1);
    expect(legal.length, d.title).toBeGreaterThan(wins.length);
  }
});

it('keeps twelve distinct positions under all square symmetries and colour swaps', () => {
  const keys=checkersTacticsDescriptors.map(d=>{
    const variants:string[]=[];
    for(let transform=0;transform<8;transform++)for(const colour of [1,-1]){
      const pieces=d.pieces.map(([i,p])=>{let r=i>>3,c=i%8;if(transform&4)[r,c]=[c,r];for(let n=0;n<(transform&3);n++)[r,c]=[c,7-r];return [r*8+c,p*colour];}).sort((a,b)=>a[0]-b[0]);
      variants.push(JSON.stringify([d.turn*colour,pieces]));
    }
    return variants.sort()[0];
  });
  expect(new Set(keys).size).toBe(12);
});
it('ramps from single captures with a decoy through two-hop men to king chains',()=>{
  const hops=checkersTacticsDescriptors.map(d=>Math.min(...winningCaptures(tacticsPosition(d)).map(m=>m.captured.length)));
  expect(hops.slice(0,3)).toEqual([1,1,1]);
  expect(hops.slice(3,8)).toEqual([2,2,2,2,2]);
  expect(hops).toEqual([...hops].sort((a,b)=>a-b));
  for(const d of checkersTacticsDescriptors.slice(0,3)) {expect(d.pieces.every(([,p])=>Math.abs(p)===1)).toBe(true);expect(checkersMoves(tacticsPosition(d),'classic')).toHaveLength(2);}
});
