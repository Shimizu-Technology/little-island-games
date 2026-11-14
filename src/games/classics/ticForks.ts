import { createTic, lines, ticMove, ticOutcome, ticTurn, type TicState, type Mark } from "../tic";
import { defaultOptions } from "../types";
import { exactKeys, plain } from "../../state/saveBits";
import type { ReplayEngine } from "../../challenge/types";

export type Descriptor = { version: 1; prefix: number[]; title: string };
export type Initial = { version: 1 };
export type Action = ["s", number] | ["c"] | ["h"] | ["z"];
export type State = { board: TicState["board"]; selected: number | null; checked: boolean; correct: boolean; hint: number | null };
export const ticPosition = (d: Descriptor) => d.prefix.reduce(ticMove, createTic({ ...defaultOptions, difficulty: "hard" }));
/** A fork creates two different immediate winning squares, not merely two open lines. */
export function forkSquares(board: TicState["board"], player: Mark): number[] {
  if (ticOutcome(board)) return [];
  return board.flatMap((v, i) => {
    if (v) return [];
    const after = [...board]; after[i] = player;
    if (ticOutcome(after)) return [];
    const other = player === "X" ? "O" : "X";
    // The opponent must not be able to finish a line before this fork can work.
    if (after.some((v, j) => { if (v) return false; const reply = [...after]; reply[j] = other; return ticOutcome(reply) === other; })) return [];
    const wins = new Set(lines.flatMap(line => {
      const empty = line.filter(j => !after[j]);
      return empty.length === 1 && line.filter(j => after[j] === player).length === 2 ? empty : [];
    }));
    return wins.size >= 2 ? [i] : [];
  });
}
/** Authored legal move histories; no move is played past a terminal position. */
export const ticForkDescriptors: readonly Descriptor[] = [
  { version: 1, prefix: [0, 4, 8, 2], title: "Two corners" },
  { version: 1, prefix: [0, 1, 4, 8], title: "Across the middle" },
  { version: 1, prefix: [0, 2, 3, 6], title: "Look along the edges" },
  { version: 1, prefix: [0, 1, 2, 7], title: "From the centre" },
  { version: 1, prefix: [0, 1, 7, 4], title: "A second way through" },
  { version: 1, prefix: [0, 1, 5, 3], title: "Side by side" },
  { version: 1, prefix: [0, 1, 8, 2, 5], title: "O has a turn" },
  { version: 1, prefix: [0, 2, 1, 7, 4], title: "Watch both diagonals" },
];
export const ticForkEngine: ReplayEngine<Descriptor, Initial, Action, State> = {
  initial: () => ({ version: 1 }),
  validInitial: (v): v is Initial => plain(v) && exactKeys(v, ["version"]) && v.version === 1,
  validAction: (v): v is Action => Array.isArray(v) && (v.length === 2 && v[0] === "s" && Number.isInteger(v[1]) && v[1] >= 0 && v[1] < 9 || v.length === 1 && ["c", "h", "z"].includes(v[0])),
  create: d => ({ board: ticPosition(d).board, selected: null, checked: false, correct: false, hint: null }),
  step: (s, a) => {
    if (a[0] === "s") return s.board[a[1]] || s.selected === a[1] ? null : { state: { ...s, selected: a[1], checked: false }, event: "edit" };
    if (a[0] === "z") return { state: { ...s, selected: null, checked: false, hint: null }, event: "reset" };
    const answers = forkSquares(s.board, ticTurn(s.board));
    if (a[0] === "h") return { state: { ...s, hint: answers[0] ?? null }, event: "help" };
    if (s.selected === null || s.checked) return null;
    const correct = answers.includes(s.selected);
    return { state: { ...s, checked: true, correct }, event: "check", correct };
  },
  inspect: s => ({ solved: s.correct, metrics: {}, edits: Number(s.selected !== null), solution: null, objectives: [] }),
};
