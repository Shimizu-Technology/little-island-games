import { Base, Options, base } from "./types";
export type Mark = "X" | "O";
export type TicState = Base & { game: "tic-tac-toe"; board: (Mark | null)[]; human: Mark; history: (Mark | null)[][] };
export const lines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
export function ticOutcome(board: TicState["board"]): Mark | "draw" | null {
  for (const [a, b, c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  return board.every(Boolean) ? "draw" : null;
}
export const ticTurn = (board: TicState["board"]): Mark => (board.filter(Boolean).length % 2 === 0 ? "X" : "O");
export const createTic = (options: Options): TicState => ({
  ...base("tic-tac-toe", options),
  game: "tic-tac-toe",
  board: Array(9).fill(null),
  human: options.computerFirst ? "O" : "X",
  history: [],
});
export function ticMove(s: TicState, index: number): TicState {
  if (!Number.isInteger(index) || index < 0 || index > 8 || s.board[index] || ticOutcome(s.board)) return s;
  const board = [...s.board];
  board[index] = ticTurn(board);
  return { ...s, board, history: [...s.history, s.board] };
}
function score(board: TicState["board"], player: Mark, depth = 0): number {
  const result = ticOutcome(board);
  if (result) return result === "draw" ? 0 : result === player ? 10 - depth : depth - 10;
  const turn = ticTurn(board);
  const values = board.flatMap((v, i) => {
    if (v) return [];
    const next = [...board];
    next[i] = turn;
    return [score(next, player, depth + 1)];
  });
  return turn === player ? Math.max(...values) : Math.min(...values);
}
export function ticChoice(s: TicState, rng = Math.random, perfect = false): number | null {
  if (ticOutcome(s.board)) return null;
  const available = s.board.flatMap((m, i) => (m ? [] : [i]));
  if (!perfect && (s.options.difficulty === "easy" || (s.options.difficulty === "medium" && rng() < 0.3)))
    return available[Math.floor(rng() * available.length)];
  const player = ticTurn(s.board);
  return available
    .map((i) => {
      const b = [...s.board];
      b[i] = player;
      return { i, score: score(b, player) };
    })
    .sort((a, b) => b.score - a.score)[0].i;
}
export function ticUndo(s: TicState): TicState {
  if (!s.history.length) return s;
  const history = [...s.history];
  let board = history.pop()!;
  if (s.options.mode === "solo" && ticTurn(board) !== s.human && history.length) board = history.pop()!;
  return { ...s, board, history };
}
