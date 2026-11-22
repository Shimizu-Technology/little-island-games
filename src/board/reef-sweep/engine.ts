import { Seat, validSeat } from "../../games/match";
import { blank, integer, object, Position, ReefFallback, Strength } from "../types";
import {
  boardFromMines,
  legacyBoard,
  redrawBoard,
  REDRAW_MAX_ATTEMPTS,
  REDRAW_NODE_BUDGET,
  urchins,
} from "./redraw";
import {
  coordinate,
  deducePublic,
  neighbors,
  publicView,
  revealCell,
  solvePublicNoGuess,
  type DeduceResult,
  type PublicStep,
} from "./solver";

export { coordinate, neighbors, urchins };
export type { DeduceResult, PublicStep };

/** A solo puzzle: no rival, so no head start. */
export const maxEdge = 0;

/** Creates a legacy Reef Sweep round (no `rules` marker) for backward-compatible replay and tests. */
export function createLegacy(seed = 1, size = 5, _starter: Seat = 0): Position {
  const n = [5, 6, 7].includes(size) ? size : 5;
  return blank(seed, n, 0, Array(n * n).fill(0), Array(n * n).fill(0));
}

/** Creates a version-2 Reef Sweep round with deterministic first-tap no-guess redraw. */
export function create(seed = 1, size = 5, _starter: Seat = 0): Position {
  const n = [5, 6, 7].includes(size) ? size : 5;
  return { ...blank(seed, n, 0, Array(n * n).fill(0), Array(n * n).fill(0)), rules: 2 };
}

/** Creates a version-2 Reef Sweep round bound to an explicitly accepted certified fallback board. */
export function createFallbackPosition(seed: number, size: number, fallback: ReefFallback): Position {
  const n = [5, 6, 7].includes(size) ? size : 5;
  return {
    ...blank(seed, n, 0, Array(n * n).fill(0), Array(n * n).fill(0)),
    rules: 2,
    fallback: { start: fallback.start, mines: [...fallback.mines].sort((a, b) => a - b) },
  };
}

/** Rebuilds the exact starting Position for undo/replay, preserving legacy rules or an accepted fallback. */
export function initialFrom(s: Position): Position {
  if (s.rules === undefined) return createLegacy(s.seed, s.size, s.starter);
  if (s.fallback) return createFallbackPosition(s.seed, s.size, s.fallback);
  return create(s.seed, s.size, s.starter);
}

/** 0..N-1 opens a tile; N..2N-1 toggles a flag. First opening and its neighbors are safe. */
export function legal(s: Position): number[] {
  if (s.outcome !== null) return [];
  const n = s.size * s.size;
  const unopened = !s.marks.includes(1);
  return s.marks.flatMap((m, i) => {
    if (m === 1) return [];
    if (m === 2) return [i + n];
    const canOpen = !(unopened && s.fallback && i !== s.fallback.start);
    const canFlag = s.moves.length < 400;
    if (canOpen && canFlag) return [i, i + n];
    if (canOpen) return [i];
    return canFlag ? [i + n] : [];
  });
}

function resolveFirstBoard(s: Position, cell: number): number[] | null {
  if (s.rules === undefined) return legacyBoard(s.seed, s.size, cell);
  if (s.fallback) return cell === s.fallback.start ? boardFromMines(s.size, s.fallback.mines) : null;
  const redrawn = redrawBoard(s.seed, s.size, cell, {
    maxAttempts: REDRAW_MAX_ATTEMPTS,
    nodeBudget: REDRAW_NODE_BUDGET,
  });
  return redrawn.status === "found" ? redrawn.board : null;
}

export function move(s: Position, action: number): Position {
  const count = s.size * s.size;
  if (!integer(action, 0, 2 * count - 1) || !legal(s).includes(action)) return s;
  const cell = action % count;
  if (action >= count) {
    const marks = [...s.marks];
    marks[cell] = marks[cell] === 2 ? 0 : 2;
    return { ...s, marks, moves: [...s.moves, action] };
  }
  let board = s.board;
  if (!s.marks.includes(1)) {
    const generated = resolveFirstBoard(s, cell);
    if (!generated) return s;
    board = generated;
  }
  const marks = revealCell(board, s.size, s.marks, cell);
  const won = board.every((v, i) => v === -1 || marks[i] === 1),
    outcome = board[cell] === -1 ? 1 : won ? 0 : null;
  return {
    ...s,
    board,
    marks,
    moves: [...s.moves, action],
    scores: [marks.filter((m, i) => m === 1 && board[i] !== -1).length, 0],
    outcome,
  };
}

/** Public-constraint logical deductions using ONLY visible numbers and total urchin count. */
export function deductions(s: Position): { safe: number[]; flags: number[] } {
  if (s.outcome !== null || !s.marks.includes(1)) return { safe: [], flags: [] };
  const res = deducePublic(publicView(s.size, urchins(s.size), s.board, s.marks));
  if (res.status === "deduced") {
    return {
      safe: res.safe.filter((i) => s.marks[i] === 0),
      flags: res.urchins.filter((i) => s.marks[i] === 0),
    };
  }
  return { safe: [], flags: [] };
}

/** Public-constraint hint step for the shared Look -> Think -> One step -> Show me ladder. */
export function publicHintStep(s: Position): PublicStep | null {
  if (s.outcome !== null) return null;
  const count = s.size * s.size;
  if (!s.marks.includes(1)) {
    if (s.fallback) {
      const start = s.fallback.start;
      const coord = coordinate(s.size, start);
      if (s.marks[start] === 2) {
        return {
          kind: "unflag",
          cell: start,
          tier: "single-cell",
          clues: [],
          reason: {
            look: `Look at the ringed safe start at ${coord}.`,
            think: `Remove the flag at ${coord} so you can open the safe starting space.`,
            oneStep: `Remove the flag at ${coord} first, then tap ${coord} to open the reef.`,
          },
        };
      }
      return {
        kind: "open",
        cell: start,
        tier: "single-cell",
        clues: [],
        reason: {
          look: `Look at the ringed starting space at ${coord}.`,
          think: "This certified reef starts safely at the ringed space with no guessing needed.",
          oneStep: `Open ${coord} to start this certified no-guess reef.`,
        },
      };
    }
    const center = Math.floor(s.size / 2) * s.size + Math.floor(s.size / 2);
    const openings = legal(s).filter((i) => i < count);
    const pick = openings.includes(center) ? center : openings[0];
    if (pick === undefined) return null;
    const coord = coordinate(s.size, pick);
    return {
      kind: "open",
      cell: pick,
      tier: "single-cell",
      clues: [],
      reason: {
        look: "Any unflagged space is safe for your very first opening.",
        think: `Opening near the middle (like ${coord}) reveals the most touching numbers at once.`,
        oneStep: `Open ${coord}: your first tap and all touching spaces are safe.`,
      },
    };
  }
  const res = deducePublic(publicView(s.size, urchins(s.size), s.board, s.marks));
  if (res.status !== "deduced") return null;
  if (res.step.kind === "flag" && s.moves.length >= 400) return null;
  return res.step;
}

export function choose(s: Position, _strength: Strength): number | null {
  const step = publicHintStep(s);
  if (!step) return null;
  const count = s.size * s.size;
  if (step.kind === "open") return step.cell;
  if (step.kind === "unflag") return step.cell + count;
  return s.moves.length < 400 ? step.cell + count : null;
}

function validFallback(v: unknown, size: number): v is ReefFallback {
  if (!object(v)) return false;
  if (Object.keys(v).sort().join() !== "mines,start") return false;
  const count = size * size;
  const expectedMines = urchins(size);
  if (!integer(v.start, 0, count - 1) || !Array.isArray(v.mines) || v.mines.length !== expectedMines) return false;
  const excluded = new Set([v.start, ...neighbors(size, v.start)]);
  let prev = -1;
  for (const m of v.mines) {
    if (!integer(m, 0, count - 1) || m <= prev || excluded.has(m)) return false;
    prev = m;
  }
  const board = boardFromMines(size, v.mines as number[]);
  return solvePublicNoGuess(board, size, v.start, { nodeBudget: REDRAW_NODE_BUDGET }).status === "solved";
}

/**
 * Strictly replays and validates legacy (no `rules`), v2 no-guess (`rules: 2`),
 * and v2 explicitly accepted fallback (`rules: 2` + `fallback`) Reef Sweep positions.
 */
export function validate(value: unknown): value is Position {
  if (!object(value)) return false;
  const keys = Object.keys(value).sort().join();
  const isLegacy = keys === "board,marks,moves,outcome,scores,seed,size,starter,turn";
  const isV2 = keys === "board,marks,moves,outcome,rules,scores,seed,size,starter,turn" && value.rules === 2;
  const isFallback =
    keys === "board,fallback,marks,moves,outcome,rules,scores,seed,size,starter,turn" && value.rules === 2;
  if (!isLegacy && !isV2 && !isFallback) return false;
  if (
    !integer(value.seed, 0, 0xffffffff) ||
    ![5, 6, 7].includes(value.size as number) ||
    !validSeat(value.starter) ||
    value.starter !== 0 ||
    !Array.isArray(value.moves) ||
    value.moves.length > 500 ||
    !value.moves.every((m) => integer(m, 0, 1000))
  ) {
    return false;
  }
  const size = value.size as number;
  let state: Position;
  if (isLegacy) {
    state = createLegacy(value.seed, size, value.starter);
  } else if (isFallback) {
    if (!validFallback(value.fallback, size)) return false;
    state = createFallbackPosition(value.seed, size, value.fallback);
  } else {
    state = create(value.seed, size, value.starter);
  }
  for (const action of value.moves) {
    const next = move(state, action);
    if (next === state) return false;
    state = next;
  }
  return Object.keys(state).every((k) => JSON.stringify(state[k as keyof Position]) === JSON.stringify(value[k]));
}
