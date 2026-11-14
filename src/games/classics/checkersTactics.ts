import { applyCheckers, checkersMoves, position, type CheckersMove, type Position, type Side } from "../checkers";
import { exactKeys, plain } from "../../state/saveBits";
import type { ReplayEngine } from "../../challenge/types";
export type Descriptor = { version: 1; pieces: [number, number][]; turn: Side; title: string };
export type Initial = { version: 1 };
export type Action = ["m", number, number[]] | ["h"] | ["z"];
export type State = { revision: number; position: Position; tried: boolean; correct: boolean; hint: CheckersMove | null };
export function tacticsPosition(d: Descriptor): Position {
  const board = Array<number>(64).fill(0);
  for (const [square, piece] of d.pieces) board[square] = piece;
  return position(board, d.turn);
}
/** Exact one-turn search of every legal full jump chain, including crowning and blocked opponents. */
export const winningCaptures = (p: Position) => checkersMoves(p, "classic").filter(m => m.captured.length > 0 && applyCheckers(p, m, "classic").outcome === (p.turn === 1 ? "red" : "blue"));
export const checkersTacticsDescriptors: readonly Descriptor[] = [
  { version: 1, pieces: [[26,1],[28,1],[49,1],[35,-1],[56,-1]], turn: 1, title: "Choose the safe jump" },
  { version: 1, pieces: [[35,1],[37,1],[46,1],[55,-1],[44,-1]], turn: 1, title: "Leave no reply" },
  { version: 1, pieces: [[17,1],[19,1],[10,1],[24,-1],[26,-1]], turn: 1, title: "Look at both jumps" },
  { version: 1, pieces: [[1, 1], [8, -1], [37, 1], [21, 1], [44, -1], [28, -1]], turn: 1, title: "Link two jumps" },
  { version: 1, pieces: [[1, 1], [8, -1], [3, 1], [5, 1], [10, -1], [26, -1]], turn: 1, title: "Choose a two-hop route" },
  { version: 1, pieces: [[1, 1], [8, -1], [23, 1], [7, 1], [14, -1], [30, -1]], turn: 1, title: "Follow the edge" },
  { version: 1, pieces: [[1, 1], [8, -1], [14, 1], [12, 1], [35, -1], [21, -1]], turn: 1, title: "Jump through the middle" },
  { version: 1, pieces: [[1, 1], [8, -1], [28, 1], [26, 1], [35, -1], [49, -1]], turn: 1, title: "Finish with a crown" },
  { version: 1, pieces: [[35,2],[5,2],[12,-2],[10,-2],[26,-2]], turn: 1, title: "Choose your starting king" },
  { version: 1, pieces: [[30,2],[51,2],[21,2],[28,-2],[44,-2],[12,-2]], turn: 1, title: "Three hops home" },
  { version: 1, pieces: [[55,2],[35,2],[40,2],[30,-2],[46,-2],[28,-2]], turn: 1, title: "The long way round" },
  { version: 1, pieces: [[12,2],[8,2],[28,2],[17,-2],[33,-2],[35,-2]], turn: 1, title: "Look past the first jump" },
];
export const checkersTacticsEngine: ReplayEngine<Descriptor, Initial, Action, State> = {
  initial: () => ({ version: 1 }),
  validInitial: (v): v is Initial => plain(v) && exactKeys(v, ["version"]) && v.version === 1,
  validAction: (v): v is Action => Array.isArray(v) && (v.length === 1 && ["h", "z"].includes(v[0]) || v.length === 3 && v[0] === "m" && Number.isInteger(v[1]) && v[1] >= 0 && v[1] < 64 && Array.isArray(v[2]) && v[2].length > 0 && v[2].length <= 12 && v[2].every(i => Number.isInteger(i) && i >= 0 && i < 64)),
  create: d => ({ revision: 0, position: tacticsPosition(d), tried: false, correct: false, hint: null }),
  step: (s, a, d) => {
    if (a[0] === "z") return { state: { revision: s.revision + 1, position: tacticsPosition(d), tried: false, correct: false, hint: null }, event: "reset" };
    if (a[0] === "h") return { state: { ...s, revision: s.revision + 1, position: tacticsPosition(d), tried: false, hint: winningCaptures(tacticsPosition(d))[0] ?? null }, event: "help" };
    if (s.tried) return null;
    const move = checkersMoves(s.position, "classic").find(m => m.from === a[1] && m.path.join() === a[2].join());
    if (!move) return null;
    const after = applyCheckers(s.position, move, "classic"), correct = after.outcome === (d.turn === 1 ? "red" : "blue");
    return { state: { ...s, revision: s.revision + 1, position: after, tried: true, correct }, event: "check", correct };
  },
  inspect: s => ({ solved: s.correct, metrics: {}, edits: Number(s.tried), solution: null, objectives: [] }),
};
