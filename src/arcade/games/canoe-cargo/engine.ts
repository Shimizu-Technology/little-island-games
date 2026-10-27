import { nextRandom, type ArcadeEngine, type ArcadeLevel, type ArcadeResult, type LevelId, type WorldId } from "../../types";

export const COLS = 9, ROWS = 14;
export const cargoKinds = ["crate", "coconut", "fish", "taro"] as const;
export type CargoKind = typeof cargoKinds[number];
export type CargoCell = { kind: CargoKind; value: number; stuck: boolean };
export type Point = readonly [number, number];
// Cargo bundles deliberately mix two, three and four parcels, on a 9×14 hold.
export const cargoShapes: readonly (readonly Point[])[] = [
  [[0, 0], [0, 1], [0, 2]], [[0, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 0], [1, 1]], [[0, 1], [1, 0], [1, 1], [1, 2]],
  [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [1, 1], [1, 2]],
];
export type CargoPiece = { shape: number; turn: number; kind: CargoKind; value: number };
export type CargoLevel = ArcadeLevel & { goal: "canoes" | "crates" | "score"; target: number; fall: number; opening: number; garbageEvery: number; targetSum: number; par: number };
const worldNames = { w1: ["First delivery", "Coconut morning", "Room for a friend", "Taro time", "Two little canoes", "Harbor helper", "Full sails", "Captain's picnic"], w2: ["Trade wind", "Fish for supper", "Clear the crates", "Across the bay", "Quick packing", "A busy harbor", "Island supplies", "Sunset delivery"], w3: ["Rising tide", "Floating cargo", "Make some room", "Night crossing", "Wave rider", "Cargo captain", "Moonlit harbor", "The big voyage"], learn: ["Nine for the canoe", "Make twelve", "Fifteen afloat", "Eighteen aboard", "Count the coconuts", "Number harbor", "Double delivery", "Sum captain"] };
export const cargoLevels: CargoLevel[] = (["w1", "w2", "w3", "learn"] as WorldId[]).flatMap(world => Array.from({ length: 8 }, (_, i): CargoLevel => {
  const opening = world === "w1" ? 2 + Math.floor(i / 3) : world === "learn" ? 2 + Math.floor(i / 3) : 3 + Math.floor(i / 3);
  const goal = world === "learn" || world === "w1" ? "canoes" : i % 3 === 1 ? "score" : i % 3 === 2 ? "crates" : "canoes";
  const targetSum = world === "learn" ? [9, 12, 15, 18, 12, 15, 18, 21][i] : 0;
  const target = goal === "crates" ? opening * 6 : goal === "score" ? (opening * 130) : world === "learn" ? opening * 2 : opening;
  const par = world === "learn" || i === 0 ? opening : opening * 3 + i + (world === "w3" ? 3 : 0);
  return { id: `${world}-${i + 1}`, world, index: i + 1, name: worldNames[world][i], goal, target, opening, targetSum, par,
    fall: world === "w1" ? 2.4 - i * .12 : world === "w2" ? 1.25 - i * .065 : world === "w3" ? .82 - i * .045 : 3.4,
    garbageEvery: world === "w3" ? Math.max(3, 6 - Math.floor(i / 2)) : 0,
    goals: [`${goal === "canoes" ? `Send ${target} canoes` : goal === "crates" ? `Free ${target} stuck crates` : `Reach ${target} points`}${targetSum ? ` · rows of ${targetSum} sail twice` : ""}`, `Finish in ${par + 8} loads or fewer`, `Finish in ${par + 3} loads or fewer`],
  };
}));
export function cargoLevel(id: LevelId): CargoLevel { const level = cargoLevels.find(l => l.id === id); if (!level) throw new Error("Unknown cargo level"); return level; }
export type CargoState = {
  version: 1; level: CargoLevel | "endless"; seed: number; helper: boolean; board: (CargoCell | null)[];
  piece: CargoPiece; next: [CargoPiece, CargoPiece]; held: CargoPiece | null; holdUsed: boolean;
  row: number; col: number; clock: number; loads: number; lines: number; canoes: number; freed: number; score: number; combo: number;
  status: "playing" | "cleared" | "over" | "finished"; event: number; lastRows: number[]; lastBonus: number; lastPoints: number; bump: number;
  /** Set once a full learning row missed its target sum; the finish counts as helped practice. */
  helped?: boolean;
};
export type CargoInput = { type: "left" | "right" | "rotate" | "down" | "drop" | "hold" | "finish" | "idle" } | { type: "helper"; value: boolean };
function draw(seed: number, gentle: boolean): [number, CargoPiece] {
  const [a, r] = nextRandom(seed), [b, v] = nextRandom(a), [c, k] = nextRandom(b);
  return [c, { shape: Math.floor(r * (gentle ? 3 : cargoShapes.length)), turn: 0, kind: cargoKinds[Math.floor(k * 4)], value: 1 + Math.floor(v * 3) }];
}
export function pieceCells(piece: CargoPiece): Point[] {
  let cells = cargoShapes[piece.shape].map(([r, c]) => [r, c] as Point);
  for (let turn = 0; turn < piece.turn; turn++) { const h = Math.max(...cells.map(p => p[0])); cells = cells.map(([r, c]) => [c, h - r]); }
  return cells;
}
export function fits(s: Pick<CargoState, "board">, piece: CargoPiece, row: number, col: number): boolean {
  return pieceCells(piece).every(([r, c]) => row + r >= 0 && row + r < ROWS && col + c >= 0 && col + c < COLS && !s.board[(row + r) * COLS + col + c]);
}
export function landingRow(s: CargoState): number { let row = s.row; while (fits(s, s.piece, row + 1, s.col)) row++; return row; }
export const cargoGoalValue = (s: CargoState) => s.level === "endless" || s.level.goal === "score" ? s.score : s.level.goal === "crates" ? s.freed : s.canoes;
export function createCargo(level: CargoLevel | "endless", seed: number, helper: boolean): CargoState {
  let rng = seed >>> 0;
  const gentle = level !== "endless" && (level.world === "w1" || level.world === "learn");
  let piece: CargoPiece, p1: CargoPiece, p2: CargoPiece;
  [rng, piece] = draw(rng, gentle); [rng, p1] = draw(rng, gentle); [rng, p2] = draw(rng, gentle);
  const board: (CargoCell | null)[] = Array(COLS * ROWS).fill(null);
  if (level !== "endless") {
    // The first deliveries demonstrate filling a gap; later play remains a seeded open puzzle.
    // Each learning opening is an honest sum with a 3-parcel gap, never an auto-completed row.
    for (let j = 0; j < level.opening; j++) {
      const value = level.targetSum ? Math.max(1, Math.floor(level.targetSum / 9)) : 1;
      let remaining = level.targetSum ? level.targetSum - 3 * value : 6;
      const gap = level.index === 1 ? 3 : (level.index % 3) * 3;
      const filled = Array.from({ length: COLS }, (_, c) => c).filter(c => c < gap || c >= gap + 3);
      filled.forEach((c, n) => { const amount = level.targetSum ? Math.min(3, remaining - (5 - n)) : 1; remaining -= amount; board[(ROWS - 1 - j) * COLS + c] = { kind: "crate", value: amount, stuck: true }; });
    }
    if (level.world === "learn" || level.index === 1) {
    const openingValue = level.targetSum ? Math.max(1, Math.floor(level.targetSum / 9)) : 1;
    piece = { shape: 0, turn: 0, kind: "coconut", value: openingValue };
    p1 = { shape: 0, turn: 0, kind: "fish", value: openingValue };
    if (level.opening > 2) p2 = { shape: 0, turn: 0, kind: "taro", value: openingValue };
    }
  }
  return { version: 1, level, seed: rng, helper, board, piece, next: [p1, p2], held: null, holdUsed: false, row: 0, col: 3, clock: 0, loads: 0, lines: 0, canoes: 0, freed: 0, score: 0, combo: 0, status: "playing", event: 0, lastRows: [], lastBonus: 0, lastPoints: 0, bump: 0 };
}
function spawn(s: CargoState): CargoState {
  // One safe reserve: after the replacement load, the held bundle returns automatically.
  // Nothing disappears, and the two-piece queue keeps its order.
  if (s.held) {
    const next = { ...s, piece: s.held, held: null, row: 0, col: 3, clock: 0 };
    return fits(next, next.piece, 0, 3) ? next : { ...next, status: "over" };
  }
  const [seed, drawn] = draw(s.seed, s.level !== "endless" && (s.level.world === "w1" || s.level.world === "learn"));
  const opening = s.level !== "endless" && (s.level.world === "learn" || s.level.index === 1) && s.loads + 2 < s.level.opening ? { shape: 0, turn: 0, kind: cargoKinds[s.loads % 4], value: s.level.targetSum ? Math.max(1, Math.floor(s.level.targetSum / 9)) : 1 } : drawn;
  const piece = s.next[0], next = { ...s, seed, piece, next: [s.next[1], opening] as [CargoPiece, CargoPiece], row: 0, col: 3, clock: 0 };
  return fits(next, piece, 0, 3) ? next : { ...next, status: "over" };
}
function lock(s: CargoState): CargoState {
  const board = s.board.slice();
  pieceCells(s.piece).forEach(([r, c]) => { board[(s.row + r) * COLS + s.col + c] = { kind: s.piece.kind, value: s.piece.value, stuck: false }; });
  const lastRows: number[] = []; let freed = 0, bonus = 0, missed = false;
  for (let row = 0; row < ROWS; row++) {
    const line = board.slice(row * COLS, (row + 1) * COLS);
    if (line.every(Boolean)) {
      lastRows.push(row); freed += line.filter(c => c?.stuck).length;
      if (s.level !== "endless" && s.level.targetSum) { if (line.reduce((n, c) => n + c!.value, 0) === s.level.targetSum) bonus++; else missed = true; }
    }
  }
  const remaining = board.filter((_, i) => !lastRows.includes(Math.floor(i / COLS)));
  const combo = lastRows.length ? s.combo + 1 : 0, lastPoints = lastRows.length * 100 + bonus * 100 + Math.max(0, combo - 1) * 40 + (lastRows.length > 1 ? lastRows.length * 40 : 0) + 5;
  let next: CargoState = { ...s, board: [...Array(lastRows.length * COLS).fill(null), ...remaining], loads: s.loads + 1, lines: s.lines + lastRows.length, canoes: s.canoes + lastRows.length + bonus, freed: s.freed + freed, score: Math.min(99999999, s.score + lastPoints), combo, event: s.event + 1, lastRows, lastBonus: bonus, lastPoints, ...(missed || s.helped ? { helped: true } : {}) };
  if (s.level !== "endless" && cargoGoalValue(next) >= s.level.target) return { ...next, status: "cleared" };
  const every = s.level === "endless" ? Math.max(5, 12 - Math.floor(next.lines / 5)) : s.level.garbageEvery;
  if (every && next.loads % (every + (s.helper ? 3 : 0)) === 0) {
    if (next.board.slice(0, COLS).some(Boolean)) return { ...next, status: "over" };
    const [seed, r] = nextRandom(next.seed), gap = Math.floor(r * 7);
    next = { ...next, seed, board: [...next.board.slice(COLS), ...Array.from({ length: COLS }, (_, c) => c >= gap && c < gap + 3 ? null : { kind: "crate" as const, value: 1, stuck: true })] };
  }
  return spawn(next);
}
export function cargoTransition(s: CargoState, input: CargoInput): CargoState {
  if (s.status !== "playing" || !input || typeof input !== "object") return s;
  if (input.type === "helper") return typeof input.value === "boolean" ? { ...s, helper: input.value, clock: 0 } : s;
  if (input.type === "finish") return s.level === "endless" ? { ...s, status: "finished" } : s;
  if (input.type === "hold") {
    if (!s.helper || s.holdUsed) return s;
    const next = s.held ? { ...s, piece: s.held, row: 0, col: 3, clock: 0 } : spawn(s);
    return { ...next, held: s.piece, holdUsed: true, status: fits(next, next.piece, 0, 3) ? "playing" : "over" };
  }
  if (input.type === "drop") return lock({ ...s, row: landingRow(s) });
  if (input.type === "down") return fits(s, s.piece, s.row + 1, s.col) ? { ...s, row: s.row + 1, clock: 0 } : lock(s);
  if (input.type === "left" || input.type === "right") {
    const col = s.col + (input.type === "left" ? -1 : 1);
    return fits(s, s.piece, s.row, col) ? { ...s, col } : { ...s, bump: s.bump + 1 };
  }
  if (input.type === "rotate") {
    const piece = { ...s.piece, turn: (s.piece.turn + 1) % 4 };
    for (const kick of [0, -1, 1, -2, 2]) if (fits(s, piece, s.row, s.col + kick)) return { ...s, piece, col: s.col + kick };
    return { ...s, bump: s.bump + 1 };
  }
  return s;
}
export function cargoStep(s: CargoState, _input: CargoInput, dt: number): CargoState {
  if (s.status !== "playing" || !Number.isFinite(dt) || dt <= 0 || dt > .1 || (s.helper && s.level !== "endless" && s.level.world === "learn")) return s;
  const fall = (s.level === "endless" ? Math.max(.25, 1.3 - s.lines * .02) : s.level.fall) * (s.helper ? 1.8 : 1);
  const clock = s.clock + dt;
  if (clock < fall) return { ...s, clock };
  return cargoTransition({ ...s, clock: 0 }, { type: "down" });
}
export function cargoResult(s: CargoState): ArcadeResult | null {
  if (s.status === "playing") return null;
  const cleared = s.status === "cleared", stars = cleared && s.level !== "endless" ? s.loads <= s.level.par + 3 ? 3 : s.loads <= s.level.par + 8 ? 2 : 1 : 0;
  return { cleared, stars, score: s.score, detail: `${s.canoes} canoes sailed · ${s.freed} crates freed · ${s.loads} loads packed.${s.lastBonus ? " A target-sum delivery sailed twice!" : ""}` };
}
const exact = (v: unknown, keys: string[]): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).sort().join() === keys.sort().join();
const uint = (v: unknown, max = 99999999): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
function validPiece(v: unknown): v is CargoPiece { return exact(v, ["shape", "turn", "kind", "value"]) && uint(v.shape, cargoShapes.length - 1) && uint(v.turn, 3) && cargoKinds.includes(v.kind as CargoKind) && uint(v.value, 3) && v.value >= 1; }
export function validCargo(v: unknown): v is CargoState {
  if (v && typeof v === "object" && !Array.isArray(v) && "helped" in v) {
    const { helped, ...rest } = v as Record<string, unknown>;
    return typeof helped === "boolean" && validCargo(rest);
  }
  if (!exact(v, ["version", "level", "seed", "helper", "board", "piece", "next", "held", "holdUsed", "row", "col", "clock", "loads", "lines", "canoes", "freed", "score", "combo", "status", "event", "lastRows", "lastBonus", "lastPoints", "bump"]) || v.version !== 1 || typeof v.helper !== "boolean" || typeof v.holdUsed !== "boolean" || !uint(v.seed, 0xffffffff)) return false;
  if (v.level !== "endless" && !cargoLevels.some(l => JSON.stringify(l) === JSON.stringify(v.level))) return false;
  if (!Array.isArray(v.board) || v.board.length !== COLS * ROWS || !v.board.every(c => c === null || (exact(c, ["kind", "value", "stuck"]) && cargoKinds.includes(c.kind as CargoKind) && uint(c.value, 3) && c.value >= 1 && typeof c.stuck === "boolean"))) return false;
  if (!validPiece(v.piece) || !Array.isArray(v.next) || v.next.length !== 2 || !v.next.every(validPiece) || !(v.held === null || validPiece(v.held)) || (v.held !== null && !v.holdUsed) || (v.holdUsed && v.held === null && !v.loads)) return false;
  if (!["loads", "lines", "canoes", "freed", "score", "combo", "event", "lastBonus", "lastPoints", "bump"].every(k => uint(v[k])) || !uint(v.row, ROWS - 1) || !uint(v.col, COLS - 1) || typeof v.clock !== "number" || !Number.isFinite(v.clock) || v.clock < 0 || v.clock > 10) return false;
  if (!["playing", "cleared", "over", "finished"].includes(v.status as string) || !Array.isArray(v.lastRows) || v.lastRows.length > 4 || new Set(v.lastRows).size !== v.lastRows.length || !v.lastRows.every(r => uint(r, ROWS - 1))) return false;
  const s = v as CargoState;
  return s.event === s.loads && s.lines <= s.loads * 4 && s.canoes >= s.lines && s.canoes <= s.lines * 2 && s.lastBonus <= s.lastRows.length && s.combo <= s.loads && (s.status !== "playing" || fits(s, s.piece, s.row, s.col)) && (s.status !== "cleared" || (s.level !== "endless" && cargoGoalValue(s) >= s.level.target)) && (s.status !== "finished" || s.level === "endless");
}
export const cargoEngine: ArcadeEngine<CargoState, CargoInput, CargoLevel> = { create: createCargo, reduce: cargoTransition, step: cargoStep, result: cargoResult, validate: validCargo };
