import { levelOf } from "../../levelOptions";
import type { LearnEngine } from "../../types";

export type Cell = [number, number];
export type ShapeState = { version: 1; level: number; seed: number; index: number; total: 4; placed: number[]; helped: boolean };
export type Piece = { name: string; cells: Cell[]; target: Cell[]; color: string };
export type ShapeTask = { pieces: Piece[]; width: number; height: number; title: string; hint: string; cube?: { faces: string[]; answer: string } };
const forms: { name: string; cells: Cell[]; color: string }[] = [
  { name: "Sail", cells: [[0,0],[1,0],[0,1]], color: "#E9916F" },
  { name: "Hull", cells: [[0,0],[1,0],[2,0],[1,1]], color: "#5C9FA0" },
  { name: "Tail", cells: [[0,0],[0,1],[1,1]], color: "#D8AE55" },
  { name: "Roof", cells: [[0,0],[1,0],[2,0],[0,1]], color: "#879ACD" },
  { name: "Wave", cells: [[0,0],[1,0],[1,1],[2,1]], color: "#82B77C" },
  { name: "Cube net", cells: [[1,0],[0,1],[1,1],[2,1],[1,2],[1,3]], color: "#B889B9" },
];
export const rotate = (cells: Cell[]): Cell[] => cells.map(([x,y]) => [-y,x]);
export const flip = (cells: Cell[]): Cell[] => cells.map(([x,y]) => [-x,y]);
export const normalize = (cells: Cell[]): Cell[] => { const minX = Math.min(...cells.map(c => c[0])), minY = Math.min(...cells.map(c => c[1])); return cells.map(([x,y]) => [x-minX,y-minY]); };
export const sameCells = (a: Cell[], b: Cell[]) => a.length === b.length && a.every(([x,y]) => b.some(([u,v]) => x===u && y===v));
const random = (n: number) => (Math.imul(n, 1664525) + 1013904223) >>> 0;
export function taskAt(s: ShapeState): ShapeTask {
  const seed = random(s.seed + s.index * 11717), count = s.level <= 2 ? 2 : s.level === 3 ? 3 : 4;
  const indices = s.level === 5 ? [5,1,3,4] : [0,1,2,3,4];
  const pieces: Piece[] = Array.from({length: count}, (_, i) => {
    const f = forms[indices[(i + (s.level===5 && s.index===3 ? 0 : s.index)) % indices.length]];
    let cells = [...f.cells];
    if (s.level >= 3 && (random(seed + i) % 2)) cells = flip(cells);
    const turns = s.level >= 2 ? random(seed + i * 7) % 4 : 0;
    for (let t = 0; t < turns; t++) cells = rotate(cells);
    const left = i % 2 * 5, top = Math.floor(i / 2) * 5;
    const target = normalize(cells).map(([x,y]) => [x+left,y+top] as Cell);
    return { name: f.name, cells: f.cells, target, color: f.color };
  });
  const faces = ["A","B","C","D","E","F"].map((_,i) => ["A","B","C","D","E","F"][(i+seed%6)%6]);
  return { pieces, width: 9, height: count > 2 ? 9 : 4, title: s.level === 5 ? "Build the island net and silhouette" : "Fit the pieces into the silhouette", hint: `Start with ${pieces[s.placed.length]?.name ?? "a piece"}. Turn or flip it until its outline fits.`, ...(s.level===5 && s.index===3 ? {cube:{faces,answer:faces[5]}} : {}) };
}
export function fits(piece: Piece, cells: Cell[], x: number, y: number) { return sameCells(normalize(cells).map(([a,b]) => [a+x,b+y]), piece.target); }
export function place(s: ShapeState, pieceIndex: number, cells: Cell[], x: number, y: number): ShapeState {
  if (pieceIndex !== s.placed.length || !fits(taskAt(s).pieces[pieceIndex], cells, x, y)) return s;
  const placed = [...s.placed, pieceIndex];
  return placed.length === taskAt(s).pieces.length && !(s.level===5 && s.index===3) ? { ...s, index: s.index + 1, placed: [] } : { ...s, placed };
}
export function chooseCube(s: ShapeState, face: string): ShapeState { return s.level===5 && s.index===3 && s.placed.length===taskAt(s).pieces.length && face===taskAt(s).cube?.answer ? {...s,index:4,placed:[]} : s; }
export const help = (s: ShapeState): ShapeState => ({ ...s, helped: true });
export const engine: LearnEngine<ShapeState> = {
  id: "shape-shift", name: "Shape Shift", island: "thinking", ages: [4,13], ownLevels: true,
  levelNames: [
    { name: "Big pieces", description: "Fit two big pieces without turning." },
    { name: "Turn it", description: "Rotate pieces to fill a silhouette." },
    { name: "Flip the fish", description: "Fit three pieces and try mirror flips." },
    { name: "Mirror island", description: "Place four pieces with turns and flips." },
    { name: "Fold the net", description: "Rotate and mirror a six-square cube net and other pieces." },
  ],
  tagline: "Turn shapes to fit the island.", description: "Fit each piece into the glowing island silhouette. Turn and flip when needed.",
  help: "Choose the next piece. Tap Turn or Flip, then tap where its top-left corner should land in the silhouette. A piece snaps in when every square fits. Help shows a clue.",
  color: "#57793D", surface: "#EFF4DC", modes: ["solo", "together"], skills: { "think.spatial": "Turning and fitting shapes" },
  create: (o, ctx) => ({version: 1, level: levelOf(o), seed: Math.floor(ctx.rng()*0xffffffff) >>> 0, index: 0, total: 4, placed: [], helped: false}),
  validate: (v,o): v is ShapeState => { if (!v || typeof v !== "object" || Object.keys(v).sort().join() !== "helped,index,level,placed,seed,total,version") return false; const s=v as ShapeState; if (s.version !== 1 || s.level !== levelOf(o) || s.total !== 4 || !Number.isInteger(s.seed) || s.seed<0 || s.seed>0xffffffff || !Number.isInteger(s.index) || s.index<0 || s.index>4 || typeof s.helped !== "boolean" || !Array.isArray(s.placed)) return false; return s.placed.length <= (s.index===4 ? 0 : taskAt(s).pieces.length-(s.level===5 && s.index===3 ? 0 : 1)) && s.placed.every((n,i) => n===i); },
  outcome: s => s.index===4 ? "done" : null,
};
