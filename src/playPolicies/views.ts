import type { Seat } from "../games/match";
import type { Position } from "../board/types";
import { edgeOf } from "../board/types";
import type { CanoesView, OpenBoardGame, OpenView, PublicView } from "./types";

const freeze = <T extends object>(v: T): Readonly<T> => Object.freeze(v);
export const openViewKeys = ["board", "edge", "game", "marks", "plies", "scores", "seat", "seed", "size"] as const;
export const canoesViewKeys = ["edge", "game", "incoming", "ownFleet", "plies", "scores", "searched", "seat"] as const;

/** Built from fields one by one, so a new Position field can never leak in by spreading. */
export function openView(game: OpenBoardGame, p: Position, seat: Seat = p.turn): OpenView {
  const e = edgeOf(p);
  return freeze({
    game,
    seat,
    size: p.size,
    seed: p.seed,
    board: freeze([...p.board]),
    marks: freeze([...p.marks]),
    scores: freeze([p.scores[0], p.scores[1]] as [number, number]),
    edge: freeze([e[0], e[1]] as [number, number]),
    plies: p.moves.length,
  });
}
export function canoesView(p: Position, seat: Seat = p.turn): CanoesView {
  const e = edgeOf(p),
    rival = seat === 0 ? 1 : 0;
  return freeze({
    game: "hidden-canoes",
    seat,
    ownFleet: freeze(p.board.slice(seat * 36, seat * 36 + 36)),
    searched: freeze(p.marks.slice(seat * 36, seat * 36 + 36)),
    incoming: freeze(p.marks.slice(rival * 36, rival * 36 + 36)),
    scores: freeze([p.scores[0], p.scores[1]] as [number, number]),
    edge: freeze([e[0], e[1]] as [number, number]),
    plies: p.moves.length,
  });
}
export function publicView(game: PublicView["game"], p: Position, seat: Seat = p.turn): PublicView {
  return game === "hidden-canoes" ? canoesView(p, seat) : openView(game, p, seat);
}

/**
 * A Position an engine's pure rules can run on, rebuilt only from what a seat
 * sees. Move history is not visible state: only its length is kept.
 */
export function openPosition(v: OpenView): Position {
  const p: Position = {
    seed: v.seed,
    size: v.size,
    starter: v.seat,
    turn: v.seat,
    moves: Array<number>(v.plies).fill(0),
    board: [...v.board],
    marks: [...v.marks],
    scores: [v.scores[0], v.scores[1]],
    outcome: null,
  };
  return v.edge[0] || v.edge[1] ? { ...p, edge: [v.edge[0], v.edge[1]] } : p;
}
