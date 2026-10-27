import { allLevelIds, levelNumber, nextRandom, worldOf, type ArcadeEngine, type ArcadeLevel, type ArcadeResult, type LevelId } from "../../types";
export type ReefLevel = ArcadeLevel & { goal: "lines" | "fish" | "score"; target: number; greatMoves: number; goodMoves: number; startingRows: number; complexity: number; targetSum?: number };
export type CoralPiece = { cells: readonly (readonly [number, number])[]; value: number; color: number };
export type ReefState = { level: ReefLevel | "endless"; board: number[]; fish: number[]; pieces: (CoralPiece | null)[]; seed: number; helper: boolean; moves: number; lines: number; rescued: number; score: number; status: "playing" | "cleared" | "full" | "stopped"; lastClear: number[]; lastFish: number; message: string; /** Set once a learning-world sum was too big; the finish counts as helped practice. */ helped?: boolean };
export type ReefInput = { type: "place"; slot: number; row: number; col: number } | { type: "reroll"; slot: number } | { type: "helper"; value: boolean } | { type: "finish" };
/** W4–W6 use provisional extended curves; feel workers own final tuning. */
export const SHAPES: readonly (readonly (readonly [number, number])[])[] = [
  [[0, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0]], [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 0], [1, 1]], [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 1], [1, 0], [1, 1], [1, 2]], [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],
];
const worldRank = (id: LevelId) => ({ w1: 0, w2: 1, w3: 2, w4: 3, w5: 4, w6: 5, learn: 0 })[worldOf(id)];
export const reefLevels: readonly ReefLevel[] = allLevelIds.map(id => {
  const index = levelNumber(id), world = worldOf(id), rank = worldRank(id), learning = world === "learn";
  const goal = learning ? "lines" : (["lines", "fish", "score"] as const)[(index - 1) % 3];
  const lines = 1 + rank * 2 + Math.floor((index - 1) / 2), startingRows = Math.min(4, lines);
  const target = goal === "score" ? (rank + 1) * 200 + Math.floor(index / 3) * 150 : goal === "fish" ? Math.min(startingRows, 1 + rank + Math.floor(index / 4)) : lines;
  const greatMoves = learning ? 2 + index : lines * 3 + rank * 2;
  return { id, index, world, name: learning ? ["Two corals make ten", "Ten along the reef", "Find a number partner", "A cross of ten", "Three number corals", "Ten in two directions", "Leave room for ten", "A reef full of tens"][index - 1] : ["A home for fish", "Open a little channel", "Coral collector", "Room to grow", "Follow the current", "A bright new reef", "Hidden fish", "Reef keeper"][index - 1],
    goal, target: learning ? 1 + Math.floor((index - 1) / 2) : target, greatMoves, goodMoves: greatMoves * 2, startingRows, complexity: learning ? 0 : Math.min(SHAPES.length, 4 + rank * 3 + Math.floor(index / 3)), ...(learning ? { targetSum: 10 } : {}),
    goals: [learning ? `Make ${1 + Math.floor((index - 1) / 2)} line${index < 3 ? "" : "s"} of 10` : goal === "lines" ? `Clear ${target} line${target === 1 ? "" : "s"}` : goal === "fish" ? `Free ${target} fish` : `Reach ${target} points`, `Finish in ${greatMoves * 2} moves`, `Finish in ${greatMoves} moves`] };
});
export const reefLevel = (id: LevelId) => reefLevels.find(l => l.id === id)!;
function deal(seed: number, level: ReefState["level"]): { seed: number; pieces: CoralPiece[] } {
  const pieces: CoralPiece[] = [];
  for (let i = 0; i < 3; i++) {
    let n: number; [seed, n] = nextRandom(seed);
    const shape = level !== "endless" && level.targetSum ? 0 : Math.floor(n * (level === "endless" ? SHAPES.length : level.complexity));
    [seed, n] = nextRandom(seed);
    pieces.push({ cells: SHAPES[shape], value: level !== "endless" && level.targetSum ? 1 + Math.floor(n * 9) : 1, color: i + 1 });
  }
  return { seed, pieces };
}
export function createReef(level: ReefState["level"], seed: number, helper = true): ReefState {
  const board = Array<number>(64).fill(0), fish: number[] = [];
  const rows = level === "endless" ? 0 : level.startingRows;
  for (let i = 0; i < rows; i++) {
    const row = 7 - i;
    if (level !== "endless" && level.targetSum) { board[row * 8] = 4 + i % 3; fish.push(row * 8); }
    else {
      const gap = i % 2 ? 0 : 6;
      for (let c = 0; c < 8; c++) if (c < gap || c > gap + 1) board[row * 8 + c] = 1;
      fish.push(row * 8 + (gap === 0 ? 4 : 3));
    }
  }
  const dealt = deal(seed, level);
  // Every opening teaches an immediately useful horizontal placement; number reefs offer the partner of 4.
  if (rows) dealt.pieces[0] = { cells: level !== "endless" && level.targetSum ? SHAPES[0] : SHAPES[1], value: level !== "endless" && level.targetSum ? 6 : 1, color: 1 };
  return { level, board, fish, ...dealt, helper, moves: 0, lines: 0, rescued: 0, score: 0, status: "playing", lastClear: [], lastFish: 0, message: level !== "endless" && level.targetSum ? "Put 6 beside 4. Together they make 10." : rows ? "Fit the two-coral piece in the gap at the bottom." : "Build your own reef. Full lines release fish." };
}
export function placementCells(s: ReefState, piece: CoralPiece, row: number, col: number): number[] | null {
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  const cells = piece.cells.map(([r, c]) => [row + r, col + c] as const);
  if (cells.some(([r, c]) => r < 0 || r >= 8 || c < 0 || c >= 8 || s.board[r * 8 + c])) return null;
  if (s.level !== "endless" && s.level.targetSum) {
    const target = s.level.targetSum;
    const next = [...s.board]; cells.forEach(([r, c]) => { next[r * 8 + c] = piece.value; });
    if (cells.some(([r, c]) => Array.from({ length: 8 }, (_, i) => next[r * 8 + i]).reduce((a, b) => a + b, 0) > target || Array.from({ length: 8 }, (_, i) => next[i * 8 + c]).reduce((a, b) => a + b, 0) > target)) return null;
  }
  return cells.map(([r, c]) => r * 8 + c);
}
export function clearLines(board: number[], target?: number): { cells: number[]; count: number } {
  const lines: number[][] = [];
  for (let i = 0; i < 8; i++) for (const vertical of [false, true]) {
    const cells = Array.from({ length: 8 }, (_, j) => vertical ? j * 8 + i : i * 8 + j), values = cells.map(j => board[j]);
    if (target ? values.filter(Boolean).length >= 2 && values.reduce((a, b) => a + b, 0) === target : values.every(Boolean)) lines.push(cells);
  }
  return { cells: [...new Set(lines.flat())].filter(i => !!board[i]), count: lines.length };
}
/** The landing ghost and the reducer share placement and line rules, including make-ten reefs. */
export function previewReefPlacement(s: ReefState, piece: CoralPiece, row: number, col: number): { cells: number[]; clear: { cells: number[]; count: number } } | null {
  const cells = placementCells(s, piece, row, col);
  if (!cells) return null;
  const board = [...s.board]; cells.forEach(i => { board[i] = piece.value; });
  return { cells, clear: clearLines(board, s.level !== "endless" ? s.level.targetSum : undefined) };
}
export function legalReefMoves(s: ReefState, slot?: number): { slot: number; row: number; col: number }[] {
  const moves: { slot: number; row: number; col: number }[] = [];
  s.pieces.forEach((piece, i) => {
    if (!piece || (slot !== undefined && slot !== i)) return;
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) if (placementCells(s, piece, row, col)) moves.push({ slot: i, row, col });
  });
  return moves;
}
/** A deterministic gentle rescue. No score/star penalty, including with Helper on. */
function rerollPiece(s: ReefState, slot: number): ReefState {
  if (!s.pieces[slot]) return s;
  const target = s.level !== "endless" ? s.level.targetSum : undefined;
  let value = 1;
  if (target) {
    for (let row = 0; row < 8; row++) {
      const sum = s.board.slice(row * 8, row * 8 + 8).reduce((a, b) => a + b, 0);
      if (sum > 0 && sum < target) { value = target - sum; break; }
    }
  }
  const pieces = s.pieces.map((p, i) => i === slot ? { cells: SHAPES[0], value, color: p!.color } : p);
  let next = { ...s, pieces, message: target ? `Try this ${value}. Look for its partner to make ${target}.` : "A little coral to help you find room." };
  if (!legalReefMoves(next).length && target) { next = { ...next, pieces: pieces.map((p, i) => i === slot ? { ...p!, value: 1 } : p) }; }
  return next;
}
export const reefGoalValue = (s: ReefState) => s.level === "endless" ? s.score : s.level.goal === "lines" ? s.lines : s.level.goal === "fish" ? s.rescued : s.score;
export function reefTransition(s: ReefState, input: ReefInput): ReefState {
  if (input.type === "helper") {
    let next = { ...s, helper: input.value };
    if (input.value && s.status === "full" && s.board.some(n => !n)) { next = rerollPiece({ ...next, status: "playing" }, s.pieces.findIndex(Boolean)); if (!legalReefMoves(next).length) return { ...next, status: "full" }; }
    return next;
  }
  if (s.status !== "playing") return s;
  if (input.type === "finish") return s.level === "endless" ? { ...s, status: "stopped", message: "Your reef is ready to rest." } : s;
  if (input.type === "reroll") return s.helper && Number.isInteger(input.slot) ? rerollPiece(s, input.slot) : s;
  const piece = s.pieces[input.slot];
  if (!piece) return s;
  const preview = previewReefPlacement(s, piece, input.row, input.col);
  if (!preview) {
    // An open, in-bounds spot rejected only by the target sum is a wrong learning answer.
    const sumMiss = s.level !== "endless" && !!s.level.targetSum && !!placementCells({ ...s, level: "endless" }, piece, input.row, input.col);
    return { ...s, ...(sumMiss ? { helped: true } : {}), message: s.level !== "endless" && s.level.targetSum ? "Try an open spot where the row and column stay at 10 or less." : "That coral needs a little more room. Try another spot." };
  }
  const { cells, clear } = preview;
  const board = [...s.board]; cells.forEach(i => { board[i] = piece.value; });
  const fish = s.fish.length ? s.fish : [cells[0]], target = s.level !== "endless" ? s.level.targetSum : undefined;
  const rescued = fish.filter(i => clear.cells.includes(i)).length;
  clear.cells.forEach(i => { board[i] = 0; });
  let next: ReefState = { ...s, board, fish: fish.filter(i => !clear.cells.includes(i)), pieces: s.pieces.map((p, i) => i === input.slot ? null : p), moves: s.moves + 1, lines: s.lines + clear.count, rescued: s.rescued + rescued, score: Math.min(99999999, s.score + cells.length * 10 + clear.count * 80 + rescued * 50), lastClear: clear.cells, lastFish: rescued, message: clear.count ? `${target ? `You made ${target}! ` : ""}${clear.count} line${clear.count === 1 ? "" : "s"} clear${clear.count === 1 ? "s" : ""}. ${rescued ? `${rescued} fish swimming free!` : "Room for new coral."}` : target ? "Look for a number partner. Each line needs 10." : "A lovely fit. Keep a little space for your next piece." };
  if (next.level !== "endless" && reefGoalValue(next) >= next.level.target) return { ...next, status: "cleared" };
  if (next.pieces.every(p => p === null)) next = { ...next, ...deal(next.seed, next.level) };
  if (!legalReefMoves(next).length) {
    if (next.helper && next.board.some(n => !n)) next = rerollPiece(next, next.pieces.findIndex(Boolean));
    if (!legalReefMoves(next).length) next = { ...next, status: "full", message: "The reef is full. Try a fresh reef and leave a little channel." };
  }
  return next;
}
export function reefResult(s: ReefState): ArcadeResult | null {
  if (s.status === "playing") return null;
  const stars = s.status === "cleared" && s.level !== "endless" ? s.moves <= s.level.greatMoves ? 3 : s.moves <= s.level.goodMoves ? 2 : 1 : 0;
  return { cleared: s.status === "cleared", outcome: s.status === "cleared" ? "cleared" : s.status === "stopped" ? "stopped" : "game-over", stars, score: s.score, detail: `${s.lines} line${s.lines === 1 ? "" : "s"} · ${s.rescued} fish · ${s.moves} move${s.moves === 1 ? "" : "s"}` };
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown, max = 99999999) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
export function validReef(v: unknown): v is ReefState {
  if (!object(v) || !(v.level === "endless" || object(v.level) && reefLevels.some(l => l.id === (v.level as Record<string, unknown>).id)) || !Array.isArray(v.board) || v.board.length !== 64 || !v.board.every(n => integer(n, 9)) || !Array.isArray(v.fish) || new Set(v.fish).size !== v.fish.length || !v.fish.every(n => integer(n, 63) && (v.board as number[])[n]) || !Array.isArray(v.pieces) || v.pieces.length !== 3) return false;
  return v.pieces.every(p => p === null || object(p) && integer(p.value, 9) && (p.value as number) > 0 && integer(p.color, 3) && Array.isArray(p.cells) && SHAPES.some(shape => JSON.stringify(shape) === JSON.stringify(p.cells))) && integer(v.seed, 0xffffffff) && typeof v.helper === "boolean" && [v.moves, v.lines, v.rescued, v.score, v.lastFish].every(n => integer(n)) && ["playing", "cleared", "full", "stopped"].includes(v.status as string) && Array.isArray(v.lastClear) && v.lastClear.every(n => integer(n, 63)) && typeof v.message === "string" && (v.helped === undefined || typeof v.helped === "boolean");
}
export const reefEngine: ArcadeEngine<ReefState, ReefInput, ReefLevel> = { create: createReef, reduce: reefTransition, result: reefResult, validate: validReef };
