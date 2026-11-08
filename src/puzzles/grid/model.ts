import { exactKeys, pack, plain, uint, unpack } from '../../state/saveBits';
export type GridSpec = { rows: number; columns: number; symbols: readonly string[]; givens: readonly number[]; kind: 'digits' | 'paint' | 'letters' | 'cells' };
export type CellDelta = [index: number, before: number, beforeNotes: number, after: number, afterNotes: number];
export type Stroke = CellDelta[];
export type GridState = { version: 1; values: number[]; notes: number[]; selected: number; tool: number; pencil: boolean; undo: Stroke[]; redo: Stroke[]; edits: number };
export type GridAction = { type: 'select'; cell: number } | { type: 'tool'; value: number } | { type: 'pencil' } | { type: 'write'; cells: number[]; value: number; selected?: number } | { type: 'undo' } | { type: 'redo' };
export const historyLimit = (spec: GridSpec) => spec.kind === 'paint' ? 512 : 256;
export function validSpec(spec: GridSpec): boolean {
  return ['digits', 'paint', 'letters', 'cells'].includes(spec.kind) && new Set(spec.symbols).size === spec.symbols.length && Number.isInteger(spec.rows) && spec.rows >= 1 && spec.rows <= 25 && Number.isInteger(spec.columns) && spec.columns >= 1 && spec.columns <= 25 && spec.symbols.length > 0 && spec.symbols.length <= (spec.kind === 'digits' ? 9 : 31) && spec.symbols.every(s => typeof s === 'string' && [...s].length >= 1 && [...s].length <= 4) && spec.givens.length === spec.rows * spec.columns && spec.givens.every(n => uint(n, spec.symbols.length));
}
export function createGrid(spec: GridSpec): GridState {
  if (!validSpec(spec)) throw new Error('Invalid grid specification.');
  return { version: 1, values: [...spec.givens], notes: spec.givens.map(() => 0), selected: 0, tool: 1, pencil: false, undo: [], redo: [], edits: 0 };
}
export function gridAction(state: GridState, action: GridAction, spec: GridSpec): GridState {
  const count = spec.rows * spec.columns;
  if (action.type === 'select') return uint(action.cell, count - 1) && action.cell !== state.selected ? { ...state, selected: action.cell } : state;
  if (action.type === 'tool') return uint(action.value, spec.symbols.length) && action.value !== state.tool ? { ...state, tool: action.value } : state;
  if (action.type === 'pencil') return spec.kind === 'digits' ? { ...state, pencil: !state.pencil } : state;
  if (action.type === 'undo' || action.type === 'redo') {
    const reverse = action.type === 'undo', source = reverse ? state.undo : state.redo, stroke = source.at(-1);
    if (!stroke) return state;
    const values = [...state.values], notes = [...state.notes];
    for (const [i, v, n, after, afterNotes] of stroke) { values[i] = reverse ? v : after; notes[i] = reverse ? n : afterNotes; }
    return { ...state, values, notes, undo: reverse ? source.slice(0, -1) : [...state.undo, stroke], redo: reverse ? [...state.redo, stroke] : source.slice(0, -1), edits: state.edits + 1 };
  }
  if (action.selected !== undefined && !uint(action.selected, count - 1)) return state;
  if (!uint(action.value, spec.symbols.length) || !action.cells.length || action.cells.length > count || !action.cells.every(i => uint(i, count - 1))) return state;
  const values = [...state.values], notes = [...state.notes], stroke: Stroke = [];
  for (const i of new Set(action.cells)) {
    if (spec.givens[i] || state.pencil && action.value > 0 && state.values[i]) continue;
    const v = state.pencil && action.value > 0 ? 0 : action.value;
    const n = state.pencil && action.value > 0 ? state.notes[i] ^ (1 << (action.value - 1)) : 0;
    if (v === values[i] && n === notes[i]) continue;
    stroke.push([i, values[i], notes[i], v, n]); values[i] = v; notes[i] = n;
  }
  const selected = action.selected ?? state.selected;
  return stroke.length ? { ...state, selected, values, notes, undo: [...state.undo, stroke].slice(-historyLimit(spec)), redo: [], edits: state.edits + 1 } : selected !== state.selected ? { ...state, selected } : state;
}
/** Select nearest cell even beyond the border. There are no dead strips between cells. */
export function nearestCell(x: number, y: number, cell: number, spec: Pick<GridSpec, 'rows' | 'columns'>): number {
  return Math.max(0, Math.min(spec.rows - 1, Math.floor(y / cell))) * spec.columns + Math.max(0, Math.min(spec.columns - 1, Math.floor(x / cell)));
}
export function nearestEdge(x: number, y: number, cell: number, rows: number, columns: number): { axis: 'h' | 'v'; row: number; column: number } {
  const gx = Math.max(0, Math.min(columns, x / cell)), gy = Math.max(0, Math.min(rows, y / cell));
  const dx = Math.abs(gx - Math.round(gx)), dy = Math.abs(gy - Math.round(gy));
  return dy <= dx ? { axis: 'h', row: Math.round(gy), column: Math.min(columns - 1, Math.floor(gx)) } : { axis: 'v', row: Math.min(rows - 1, Math.floor(gy)), column: Math.round(gx) };
}
/** First movement locks the axis for the entire stroke. Interpolate fast drags, including edges. */
export function paintLine(start: number, end: number, columns: number, axisLock: 'row' | 'column' | null): { axis: 'row' | 'column'; cells: number[] } {
  const sr = Math.floor(start / columns), sc = start % columns, er = Math.floor(end / columns), ec = end % columns;
  const axis = axisLock ?? (Math.abs(ec - sc) >= Math.abs(er - sr) ? 'row' : 'column'), cells: number[] = [];
  const from = axis === 'row' ? sc : sr, to = axis === 'row' ? ec : er;
  for (let p = Math.min(from, to); p <= Math.max(from, to); p++) cells.push(axis === 'row' ? sr * columns + p : p * columns + sc);
  return { axis, cells };
}
export const REPEAT_MS = 160;
export function acceptTouch(last: { cell: number; at: number } | null, cell: number, now: number, changesState: boolean): boolean {
  return !changesState || !last || last.cell !== cell || now - last.at >= REPEAT_MS || now < last.at;
}
export function moveSelection(selected: number, key: string, spec: GridSpec): number {
  const row = Math.floor(selected / spec.columns), col = selected % spec.columns;
  if (key === 'ArrowLeft') return row * spec.columns + Math.max(0, col - 1);
  if (key === 'ArrowRight') return row * spec.columns + Math.min(spec.columns - 1, col + 1);
  if (key === 'ArrowUp') return Math.max(0, row - 1) * spec.columns + col;
  if (key === 'ArrowDown') return Math.min(spec.rows - 1, row + 1) * spec.columns + col;
  return selected;
}
export function gridGeometry(width: number, height: number, spec: GridSpec, zoom: boolean) {
  const fit = Math.min(width / spec.columns, Math.max(160, height) / spec.rows), needsZoom = fit < 40;
  const cell = zoom && needsZoom ? Math.max(44, fit) : fit;
  return { cell, needsZoom, width: cell * spec.columns, height: cell * spec.rows };
}

export type PackedGrid = { version: 1; values: string; notes: string; selected: number; tool: number; pencil: boolean; undo: string[]; redo: string[]; edits: number };
const valueBits = (spec: GridSpec) => Math.max(1, Math.ceil(Math.log2(spec.symbols.length + 1)));
// Fixed-width deltas, no object per candidate. History is pruned only as undo working memory.
const encodedStrokes = new WeakMap<GridSpec, WeakMap<Stroke, string>>();
const decodedStrokes = new WeakMap<GridSpec, Map<string, Stroke>>();
function encodeStroke(stroke: Stroke, spec: GridSpec) {
  const bits = valueBits(spec), noteBits = spec.kind === 'digits' ? spec.symbols.length : 0;
  const width = 10 + 2 * bits + 2 * noteBits;
  let cache = encodedStrokes.get(spec); if (!cache) { cache = new WeakMap(); encodedStrokes.set(spec, cache); }
  const cached = cache.get(stroke); if (cached) return cached;
  const encoded = pack(stroke.flatMap(([i, v, n, a, b]) => {
    const value = i + v * 2 ** 10 + a * 2 ** (10 + bits) + n * 2 ** (10 + 2 * bits) + b * 2 ** (10 + 2 * bits + noteBits);
    return Array.from({ length: width }, (_, j) => Math.floor(value / 2 ** j) % 2);
  }), 1);
  cache.set(stroke, encoded); return encoded;
}
function decodeStroke(raw: string, spec: GridSpec): Stroke | null {
  let cache = decodedStrokes.get(spec); if (!cache) { cache = new Map(); decodedStrokes.set(spec, cache); }
  const cached = cache.get(raw); if (cached) return cached;
  const bits = valueBits(spec), noteBits = spec.kind === 'digits' ? spec.symbols.length : 0, width = 10 + 2 * bits + 2 * noteBits;
  // Each delta has a whole number of bits. At most one change per cell in a stroke.
  for (let count = 1; count <= spec.rows * spec.columns; count++) {
    if (Math.ceil(count * width / 8) * 4 / 3 > raw.length + 4) break;
    const data = unpack(raw, count * width, 1); if (!data) continue;
    const result: Stroke = [];
    for (let k = 0; k < count; k++) {
      let v = 0; for (let j = 0; j < width; j++) v += data[k * width + j] * 2 ** j;
      const field = (start: number, width: number) => Math.floor(v / 2 ** start) % 2 ** width;
      result.push([field(0, 10), field(10, bits), field(10 + 2 * bits, noteBits), field(10 + bits, bits), field(10 + 2 * bits + noteBits, noteBits)]);
    }
    if (new Set(result.map(d => d[0])).size === result.length && result.every(([i, a, n, b, m]) => i < spec.rows * spec.columns && !spec.givens[i] && a <= spec.symbols.length && b <= spec.symbols.length && (!a || !n) && (!b || !m) && (a !== b || n !== m)) && encodeStroke(result, spec) === raw) {
      for (const delta of result) Object.freeze(delta); Object.freeze(result);
      if (cache.size >= 1024) cache.delete(cache.keys().next().value!); cache.set(raw, result); return result;
    }
  }
  return null;
}
export function encodeGrid(state: GridState, spec: GridSpec, maxBytes = 3000): PackedGrid {
  const encoded: PackedGrid = { version: 1, values: pack(state.values, valueBits(spec)), notes: spec.kind === 'digits' ? pack(state.notes, spec.symbols.length) : '', selected: state.selected, tool: state.tool, pencil: state.pencil, undo: state.undo.map(s => encodeStroke(s, spec)), redo: state.redo.map(s => encodeStroke(s, spec)), edits: state.edits };
  let bytes = JSON.stringify(encoded).length;
  while (bytes > maxBytes && (encoded.undo.length || encoded.redo.length)) { const history = encoded.undo.length ? encoded.undo : encoded.redo; const removed = history.shift()!; bytes -= removed.length + 2 + (history.length ? 1 : 0); }
  if (JSON.stringify(encoded).length > maxBytes) throw new Error('The grid draft exceeds its budget.');
  return encoded;
}
export function decodeGrid(raw: unknown, spec: GridSpec): GridState | null {
  if (!validSpec(spec) || !plain(raw) || !exactKeys(raw, ['version', 'values', 'notes', 'selected', 'tool', 'pencil', 'undo', 'redo', 'edits']) || raw.version !== 1 || typeof raw.values !== 'string' || typeof raw.notes !== 'string' || !uint(raw.selected, spec.rows * spec.columns - 1) || !uint(raw.tool, spec.symbols.length) || typeof raw.pencil !== 'boolean' || raw.pencil && spec.kind !== 'digits' || !uint(raw.edits, 2147483647) || !Array.isArray(raw.undo) || !Array.isArray(raw.redo) || raw.undo.length + raw.redo.length > historyLimit(spec) || ![...raw.undo, ...raw.redo].every(s => typeof s === 'string' && s.length < 8192) || JSON.stringify(raw).length > 4096) return null;
  const values = unpack(raw.values, spec.rows * spec.columns, valueBits(spec)), notes = spec.kind === 'digits' ? unpack(raw.notes, spec.rows * spec.columns, spec.symbols.length) : raw.notes === '' ? spec.givens.map(() => 0) : null;
  if (!values || !notes || values.some((v, i) => v > spec.symbols.length || v && notes[i] || spec.givens[i] && v !== spec.givens[i])) return null;
  const undo = raw.undo.map(s => decodeStroke(s, spec)), redo = raw.redo.map(s => decodeStroke(s, spec));
  if (undo.some(s => !s) || redo.some(s => !s)) return null;
  // Verify both history branches against this exact draft. Forged undo cannot change a given.
  for (const [history, reverse] of [[undo, true], [redo, false]] as const) {
    const v = [...values], n = [...notes];
    for (const stroke of [...history].reverse()) for (const [i, a, b, c, d] of stroke!) {
      if (v[i] !== (reverse ? c : a) || n[i] !== (reverse ? d : b)) return null;
      v[i] = reverse ? a : c; n[i] = reverse ? b : d;
    }
  }
  return { version: 1, values, notes, selected: raw.selected, tool: raw.tool, pencil: raw.pencil, undo: undo as Stroke[], redo: redo as Stroke[], edits: raw.edits };
}
