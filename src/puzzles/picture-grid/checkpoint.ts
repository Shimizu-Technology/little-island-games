import { base64, exactKeys, jsonBytes, pack, plain, uint, unbase64, unpack } from '../../state/saveBits';
import { EMPTY, emptyMarks, solved, validSize, type Mark, type PictureClues } from './engine';
import { pictureHint } from './help';

export type Paint = { type: 'paint'; from: number; to: number; mark: Mark };
export type PictureEvent = Paint | { type: 'undo' } | { type: 'hint' } | { type: 'reset' };
type Stroke = { start: number; stride: number; before: readonly Mark[] };
export type PictureDraft = {
  size: number; marks: readonly Mark[]; undo: readonly Stroke[];
  edits: number; helps: number; resets: number; showingHint: boolean;
};
export type PictureSave = {
  version: 1; size: number; cells: string; base: string; history: string;
  edits: number; helps: number; resets: number; showingHint: boolean;
};
export const UNDO_STROKES = 512;
const MAX_COUNTER = 2_147_483_647;
const STROKE_BYTES = 3;
const MAX_HISTORY_BYTES = UNDO_STROKES * STROKE_BYTES;
export const PICTURE_SAVE_BYTES = 2750;
export const freshPicture = (size: number): PictureDraft => ({
  size, marks: emptyMarks(size), undo: [], edits: 0, helps: 0, resets: 0, showingHint: false,
});

function strokeGeometry(size: number, from: number, to: number) {
  const start = Math.min(from, to), end = Math.max(from, to);
  if (Math.floor(start / size) === Math.floor(end / size)) return { start, stride: 1, length: end - start + 1 };
  if (start % size === end % size) return { start, stride: size, length: (end - start) / size + 1 };
  return null;
}

export function validPictureEvent(value: unknown, size: number): value is PictureEvent {
  if (!plain(value)) return false;
  if (value.type === 'undo' || value.type === 'hint' || value.type === 'reset') return exactKeys(value, ['type']);
  return value.type === 'paint' && exactKeys(value, ['type', 'from', 'to', 'mark'])
    && uint(value.from, size * size - 1) && uint(value.to, size * size - 1) && uint(value.mark, 2)
    && !!strokeGeometry(size, value.from, value.to);
}

export function editPicture(draft: PictureDraft, event: PictureEvent, picture?: PictureClues): PictureDraft {
  const { size, edits, helps, resets } = draft;
  if (!validPictureEvent(event, size)) return draft;
  if (event.type === 'hint') {
    if (!picture || draft.showingHint || helps === MAX_COUNTER || solved(picture, draft.marks) || !pictureHint(picture, draft.marks)) return draft;
    return { ...draft, helps: helps + 1, showingHint: true };
  }
  if (edits === MAX_COUNTER) return draft;
  if (event.type === 'reset') {
    if (resets === MAX_COUNTER || draft.marks.every(m => m === EMPTY) && !draft.undo.length) return draft;
    return { ...freshPicture(size), edits: edits + 1, helps, resets: resets + 1 };
  }
  const marks = [...draft.marks];
  if (event.type === 'undo') {
    const stroke = draft.undo.at(-1);
    if (!stroke) return draft;
    stroke.before.forEach((mark, offset) => { marks[stroke.start + offset * stroke.stride] = mark; });
    return { ...draft, marks, edits: edits + 1, undo: draft.undo.slice(0, -1), showingHint: false };
  }
  const { start, stride, length } = strokeGeometry(size, event.from, event.to)!;
  const before = Array.from({ length }, (_, offset) => marks[start + offset * stride]);
  if (before.every(mark => mark === event.mark)) return draft;
  before.forEach((_, offset) => { marks[start + offset * stride] = event.mark; });
  const undo = [...draft.undo, { start, stride, before }].slice(-UNDO_STROKES);
  return { ...draft, marks, edits: edits + 1, undo, showingHint: false };
}

/** Save the whole ring as a 2-bit base board plus three bytes per stroke.
 * The LE header contains a 10-bit start, 5-bit length minus one, and 1-bit axis.
 * The third byte is the mark painted across the range.
 */
export function encodePicture(draft: PictureDraft): PictureSave {
  const base = [...draft.marks];
  const bytes = Array<number>(draft.undo.length * STROKE_BYTES);
  for (let i = draft.undo.length - 1; i >= 0; i--) {
    const { start, stride, before } = draft.undo[i];
    const header = start | ((before.length - 1) << 10) | (stride === 1 ? 0 : 0x8000);
    const pos = i * STROKE_BYTES;
    bytes[pos] = header & 255;
    bytes[pos + 1] = header >>> 8;
    bytes[pos + 2] = base[start];
    before.forEach((mark, offset) => { base[start + offset * stride] = mark; });
  }
  return { version: 1, size: draft.size, cells: pack(draft.marks, 2), base: pack(base, 2), history: base64(bytes),
    edits: draft.edits, helps: draft.helps, resets: draft.resets, showingHint: draft.showingHint };
}

function unpackMarks(raw: unknown, size: number): Mark[] | null {
  const marks = unpack(raw, size * size, 2);
  return marks && marks.every(mark => mark <= 2) ? marks as Mark[] : null;
}

export function decodePicture(value: unknown, expectedSize?: number): PictureDraft | null {
  if (!plain(value) || !exactKeys(value, ['version', 'size', 'cells', 'base', 'history', 'edits', 'helps', 'resets', 'showingHint'])
    || value.version !== 1 || !validSize(value.size) || (expectedSize !== undefined && value.size !== expectedSize)
    || !uint(value.edits, MAX_COUNTER) || !uint(value.helps, MAX_COUNTER) || !uint(value.resets, value.edits)
    || typeof value.showingHint !== 'boolean' || value.showingHint && !value.helps
    || typeof value.history !== 'string' || value.history.length > MAX_HISTORY_BYTES / STROKE_BYTES * 4
    || value.history.length % 4 !== 0) return null;
  const { size, edits, helps, resets, showingHint, history } = value;
  const marks = unpackMarks(value.cells, size), replay = unpackMarks(value.base, size);
  const count = history.length / 4;
  const bytes = unbase64(history, count * STROKE_BYTES);
  if (!marks || !replay || !bytes || count + resets > edits || jsonBytes(value) > PICTURE_SAVE_BYTES) return null;
  if (count + resets === edits && replay.some(mark => mark !== EMPTY)) return null;
  const undo: Stroke[] = [];
  for (let i = 0; i < bytes.length; i += STROKE_BYTES) {
    const header = bytes[i] | (bytes[i + 1] << 8);
    const start = header & 1023, length = ((header >>> 10) & 31) + 1;
    const vertical = !!(header & 0x8000), mark = bytes[i + 2];
    const stride = vertical ? size : 1;
    const lineOffset = vertical ? Math.floor(start / size) : start % size;
    if (start >= size * size || lineOffset + length > size || length === 1 && vertical || !uint(mark, 2)) return null;
    const before = Array.from({ length }, (_, offset) => replay[start + offset * stride]);
    if (before.every(previous => previous === mark)) return null;
    before.forEach((_, offset) => { replay[start + offset * stride] = mark as Mark; });
    undo.push({ start, stride, before });
  }
  if (marks.some((mark, i) => mark !== replay[i])) return null;
  return { size, marks, undo, edits, helps, resets, showingHint };
}
