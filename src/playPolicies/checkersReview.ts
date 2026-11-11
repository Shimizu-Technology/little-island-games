import {
  applyCheckers,
  checkersMoves,
  checkersRules,
  col,
  row,
  type CheckersMove,
  type CheckersState,
  type Position,
  type Side,
} from "../games/checkers";

/** The same square names the Checkers board reads aloud. */
const coords = (i: number) => `${String.fromCharCode(65 + col(i))}${8 - row(i)}`;
/** A finished Checkers game's moment worth seeing again, for the side that `side` plays. */
export type CheckersMoment = {
  before: Position;
  show: CheckersMove;
  kind: "your-win" | "winning" | "stronger";
  title: string;
  text: string;
};
const sameBoard = (a: Position, b: Position) => a.turn === b.turn && a.board.every((v, i) => v === b.board[i]);
const route = (m: CheckersMove) => `${coords(m.from)} to ${coords(m.path[m.path.length - 1])}`;

/**
 * Reads only the saved positions of a finished game. Captures and safe squares are
 * checked with the same move rules the game uses; nothing is searched deeply.
 */
export function reviewCheckers(s: CheckersState, side: Side = 1): CheckersMoment | null {
  const outcome = s.position.outcome;
  if (!outcome || s.lesson !== null) return null;
  const rules = checkersRules(s),
    states = [...s.history, s.position];
  const decisions: { before: Position; played: CheckersMove }[] = [];
  for (let i = 0; i < states.length - 1; i++) {
    const before = states[i];
    if (before.turn !== side) continue;
    const played = checkersMoves(before, rules).find((m) => sameBoard(applyCheckers(before, m, rules), states[i + 1]));
    if (played) decisions.push({ before, played });
  }
  if (!decisions.length) return null;
  const mine = outcome === (side === 1 ? "red" : "blue");
  if (mine) {
    const last = decisions[decisions.length - 1];
    return {
      before: last.before,
      show: last.played,
      kind: "your-win",
      title: "Your winning move",
      text: `Moving ${route(last.played)} left the other side with no move.`,
    };
  }
  // Friendly rules let a jump be skipped: show the first one that was.
  for (const d of decisions) {
    const jump = checkersMoves(d.before, rules).find((m) => m.captured.length);
    if (jump && !d.played.captured.length)
      return {
        before: d.before,
        show: jump,
        kind: "stronger",
        title: "A jump was waiting",
        text: `Jumping ${route(jump)} would have captured ${jump.captured.length === 1 ? "a piece" : `${jump.captured.length} pieces`}.`,
      };
  }
  // Otherwise the last move that left a piece open when a safe move existed.
  const open = (p: Position) => checkersMoves(p, rules).some((m) => m.captured.length);
  for (const d of [...decisions].reverse()) {
    const after = applyCheckers(d.before, d.played, rules);
    if (after.outcome || !open(after)) continue;
    const safe = checkersMoves(d.before, rules).find((m) => {
      const next = applyCheckers(d.before, m, rules);
      return !next.outcome && !open(next);
    });
    if (safe)
      return {
        before: d.before,
        show: safe,
        kind: "stronger",
        title: "A safer move",
        text: `That move let the other side jump. Moving ${route(safe)} kept every piece safe for a turn.`,
      };
  }
  return null;
}
