import { exactKeys, plain, uint } from '../../state/saveBits';

/**
 * The saved board for every G5 game: one mark per place (a link's bridge count, or an edge's
 * empty/line/cross), with whole-stroke undo and redo. A stroke is one gesture, so one undo step.
 */
export type Change = readonly [index: number, value: number];
export type Stroke = readonly (readonly [index: number, before: number, after: number])[];
export type Marks = { marks: number[]; undo: Stroke[]; redo: Stroke[]; edits: number };
export type MarkEvent = { type: 'set'; changes: readonly Change[] } | { type: 'undo' } | { type: 'redo' } | { type: 'help' } | { type: 'hint' } | { type: 'reset' };
export type AuditKind = 'help' | 'reset';
export type MarksPayload = { version: 1; marks: string; undo: string; redo: string; edits: number; audit: [AuditKind, number][] };

/** What a game adds: how many places, which values each takes, and the rules a single mark must keep. */
export type MarkRules<P> = {
  places(p: P): number;
  max: number;
  /** A mark the board refuses outright (a bridge across another). The engine refuses it the same way. */
  allowed(p: P, marks: readonly number[], index: number, value: number): boolean;
  /** A whole board the rules accept, checked on load and after undo or redo. */
  legal(p: P, marks: readonly number[]): boolean;
  solved(p: P, marks: readonly number[]): boolean;
  /** The changes Show me makes: the same plan the hint card describes. */
  hintMove(p: P, marks: readonly number[]): Change[] | null;
  /** What counts as the answer for the finish fingerprint (crosses are notes, so they drop out). */
  answer(marks: readonly number[]): string;
};

const MAX_AUDIT = 2147483647, HISTORY = 1800, MAX_STROKES = 200;
export const auditCount = (audit: MarksPayload['audit'], kind: AuditKind) => audit.filter(a => a[0] === kind).reduce((n, a) => n + a[1], 0);
/** Counts never shrink; consecutive events of one kind share a row; at most 32 rows are kept in order. */
export function record(audit: MarksPayload['audit'], kind: AuditKind): MarksPayload['audit'] {
  const last = audit.at(-1);
  if (last?.[0] === kind) return [...audit.slice(0, -1), [kind, Math.min(MAX_AUDIT, last[1] + 1)]];
  if (audit.length < 32) return [...audit, [kind, 1]];
  return (['help', 'reset'] as const).flatMap(k => { const n = auditCount(audit, k) + (k === kind ? 1 : 0); return n ? [[k, Math.min(MAX_AUDIT, n)] as [AuditKind, number]] : []; });
}
export function validAudit(x: unknown): x is MarksPayload['audit'] {
  return Array.isArray(x) && x.length <= 32 && x.every((a, i, all) => Array.isArray(a) && a.length === 2 && (a[0] === 'help' || a[0] === 'reset') && uint(a[1], MAX_AUDIT) && a[1] > 0 && (!i || all[i - 1][0] !== a[0]));
}

const encodeStroke = (s: Stroke) => s.map(([i, b, a]) => `${i.toString(36)}.${b}${a}`).join(',');
export const encodeHistory = (list: readonly Stroke[]) => list.map(encodeStroke).join(';');
export function decodeHistory(text: unknown, places: number, max: number): Stroke[] | null {
  if (typeof text !== 'string' || text.length > HISTORY || !/^[0-9a-z.,;]*$/.test(text)) return null;
  if (!text) return [];
  const out: Stroke[] = [];
  for (const part of text.split(';')) {
    const stroke: [number, number, number][] = [];
    for (const change of part.split(',')) {
      const m = /^([0-9a-z]{1,3})\.(\d)(\d)$/.exec(change);
      if (!m) return null;
      const i = parseInt(m[1], 36), b = Number(m[2]), a = Number(m[3]);
      if (i >= places || b > max || a > max || a === b || stroke.some(c => c[0] === i)) return null;
      stroke.push([i, b, a]);
    }
    out.push(stroke);
  }
  return out.length <= MAX_STROKES ? out : null;
}
/** The newest strokes that fit the byte budget; the board itself is never trimmed. */
function trim(undo: readonly Stroke[], redo: readonly Stroke[]): { undo: string; redo: string } {
  let u = [...undo].slice(-MAX_STROKES), r = [...redo].slice(-MAX_STROKES);
  for (;;) {
    const us = encodeHistory(u), rs = encodeHistory(r);
    if (us.length + rs.length <= HISTORY) return { undo: us, redo: rs };
    if (u.length) u = u.slice(1); else r = r.slice(1);
  }
}
export const encodeMarks = (m: Marks): Omit<MarksPayload, 'version' | 'audit'> => ({ marks: m.marks.join(''), ...trim(m.undo, m.redo), edits: m.edits });
export function decodeMarks<P>(payload: unknown, p: P, rules: MarkRules<P>): Marks | null {
  if (!validShape(payload)) return null;
  const n = rules.places(p);
  if (payload.marks.length !== n || ![...payload.marks].every(c => /\d/.test(c) && Number(c) <= rules.max)) return null;
  const undo = decodeHistory(payload.undo, n, rules.max), redo = decodeHistory(payload.redo, n, rules.max);
  const marks = [...payload.marks].map(Number);
  if (!undo || !redo || payload.undo.length + payload.redo.length > HISTORY || !rules.legal(p, marks)) return null;
  if (!replays(p, rules, marks, undo, 'undo') || !replays(p, rules, marks, redo, 'redo')) return null;
  return { marks, undo, redo, edits: payload.edits };
}
/**
 * Whether a saved history fits the saved board: undo walks back from the marks, newest stroke first,
 * each change finding its `after` value and restoring `before`; redo walks forward the same way from
 * `before` to `after`. Every board on the way must be legal. Trimming drops only the oldest strokes,
 * so a real history always replays.
 */
function replays<P>(p: P, rules: MarkRules<P>, marks: readonly number[], list: readonly Stroke[], kind: 'undo' | 'redo'): boolean {
  const board = [...marks];
  for (let k = list.length - 1; k >= 0; k--) {
    for (const [i, b, a] of list[k]) {
      const [from, to] = kind === 'undo' ? [a, b] : [b, a];
      if (board[i] !== from) return false;
      board[i] = to;
    }
    if (!rules.legal(p, board)) return false;
  }
  return true;
}
export const validShape = (x: unknown): x is MarksPayload => plain(x) && exactKeys(x, ['version', 'marks', 'undo', 'redo', 'edits', 'audit']) && x.version === 1
  && typeof x.marks === 'string' && x.marks.length <= 1024 && typeof x.undo === 'string' && typeof x.redo === 'string' && uint(x.edits, MAX_AUDIT) && validAudit(x.audit);
export const freshPayload = <P,>(p: P, rules: MarkRules<P>): MarksPayload => ({ version: 1, marks: '0'.repeat(rules.places(p)), undo: '', redo: '', edits: 0, audit: [] });

/** Applies one stroke, keeping only the changes the rules allow, in order. Returns the same object for a no-op. */
export function applyStroke<P>(m: Marks, p: P, rules: MarkRules<P>, changes: readonly Change[]): Marks {
  const marks = [...m.marks], stroke: [number, number, number][] = [];
  for (const [i, v] of changes) {
    if (!uint(i, marks.length - 1) || !uint(v, rules.max) || marks[i] === v || !rules.allowed(p, marks, i, v)) continue;
    const seen = stroke.find(c => c[0] === i);
    if (seen) seen[2] = v; else stroke.push([i, marks[i], v]);
    marks[i] = v;
  }
  const kept = stroke.filter(c => c[1] !== c[2]);
  return kept.length ? { marks, undo: [...m.undo, kept], redo: [], edits: m.edits + 1 } : m;
}
/** One event through the real rules. Returns the same payload object when nothing changes, null when invalid. */
export function stepMarks<P>(p: P, rules: MarkRules<P>, payload: MarksPayload, event: MarkEvent): MarksPayload | null {
  const m = decodeMarks(payload, p, rules);
  if (!m) return null;
  let next = m, audit = payload.audit;
  if (event.type === 'help') audit = record(audit, 'help');
  else if (event.type === 'reset') {
    if (m.marks.every(v => !v)) return payload;
    audit = record(audit, 'reset');
    next = { marks: m.marks.map(() => 0), undo: [], redo: [], edits: m.edits + 1 };
  } else if (event.type === 'undo' || event.type === 'redo') {
    const from = event.type === 'undo' ? m.undo : m.redo, stroke = from.at(-1);
    if (!stroke) return payload;
    const marks = [...m.marks];
    for (const [i, b, a] of event.type === 'undo' ? [...stroke].reverse() : stroke) marks[i] = event.type === 'undo' ? b : a;
    if (!rules.legal(p, marks)) return payload;
    next = event.type === 'undo' ? { marks, undo: m.undo.slice(0, -1), redo: [...m.redo, stroke], edits: m.edits + 1 } : { marks, undo: [...m.undo, stroke], redo: m.redo.slice(0, -1), edits: m.edits + 1 };
  } else if (event.type === 'hint') {
    const move = rules.hintMove(p, m.marks);
    if (!move) return payload;
    next = applyStroke(m, p, rules, move);
    if (next === m) return payload;
    audit = record(audit, 'help');
  } else if (event.type === 'set') {
    if (!Array.isArray(event.changes) || event.changes.length > 512 || !event.changes.every(c => Array.isArray(c) && c.length === 2)) return null;
    next = applyStroke(m, p, rules, event.changes);
  } else return null;
  if (next === m && audit === payload.audit) return payload;
  return { version: 1, ...encodeMarks(next), audit };
}
