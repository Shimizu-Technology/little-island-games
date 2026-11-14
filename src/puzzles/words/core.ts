import { exactKeys, plain, uint } from '../../state/saveBits';
import { sha256Hex } from '../sha256';

export type SearchWord = { id: string; spelling: string; cells: number[]; audio: string | null };
export type SearchPuzzle = {
  language: 'en' | 'ch'; cells: string[][]; words: SearchWord[]; theme: string;
  list: 'pictures' | 'words' | 'hidden'; message: string | null;
};
export type SearchState = { found: [word: number, hunter: 0 | 1][]; turn: 0 | 1; edits: number };
export type SearchAction = readonly [start: number, end: number, hunter: 0 | 1];
export type Direction = readonly [row: number, column: number];
export const directions: readonly Direction[] = [[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, -1], [-1, 1]];
const alphabet = new Set(["'", 'A', 'Å', 'B', 'CH', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'Ñ', 'NG', 'O', 'P', 'R', 'S', 'T', 'U', 'Y']);
export function letters(spelling: string, language: 'en' | 'ch'): string[] {
  const s = spelling.normalize('NFC').toUpperCase();
  return language === 'ch' ? s.match(/CH|NG|./gu) ?? [] : [...s.replaceAll(' ', '')];
}
/** First motion locks one of eight rays. Later motion changes length, never direction. */
export function snapRay(start: number, end: number, columns: number, rows: number, lock: Direction | null = null): { direction: Direction | null; cells: number[] } {
  const sr = Math.floor(start / columns), sc = start % columns, dr = Math.floor(end / columns) - sr, dc = end % columns - sc;
  if (!dr && !dc && !lock) return { direction: null, cells: [start] };
  const angle = Math.atan2(dr, dc), sector = Math.round(angle / (Math.PI / 4));
  const direction: Direction = lock ?? [Math.round(Math.sin(sector * Math.PI / 4)), Math.round(Math.cos(sector * Math.PI / 4))];
  const [dy, dx] = direction, length = Math.max(0, Math.round((dr * dy + dc * dx) / (dy * dy + dx * dx)));
  const cells: number[] = [];
  for (let i = 0; i <= length; i++) { const r = sr + i * dy, c = sc + i * dx; if (r < 0 || c < 0 || r >= rows || c >= columns) break; cells.push(r * columns + c); }
  return { direction, cells };
}
/** Finger-space octants. A 0.65-cell dead zone ignores entry-edge noise; a 7-degree
 * hysteresis margin prevents sector chatter while still allowing a curved drag to re-snap. */
export function dragRay(start: number, origin: { x: number; y: number }, point: { x: number; y: number }, size: number, columns: number, rows: number, previous: Direction | null = null): { direction: Direction | null; cells: number[] } {
  const dx = point.x - origin.x, dy = point.y - origin.y;
  if (Math.hypot(dx, dy) < size * .65) return { direction: null, cells: [start] };
  const x = point.x - (start % columns + .5) * size, y = point.y - (Math.floor(start / columns) + .5) * size;
  // Early intent follows the finger vector. On a longer trace, remove the landing
  // offset from its angle too: opposite cell edges must still name the same ray.
  const angle = Math.hypot(x, y) >= size * 1.5 ? Math.atan2(y, x) : Math.atan2(dy, dx), sector = Math.round(angle / (Math.PI / 4));
  let direction: Direction = [Math.round(Math.sin(sector * Math.PI / 4)), Math.round(Math.cos(sector * Math.PI / 4))];
  if (previous) {
    const old = Math.atan2(previous[0], previous[1]), difference = Math.abs(Math.atan2(Math.sin(angle - old), Math.cos(angle - old)));
    if (difference < Math.PI / 8 + 7 * Math.PI / 180) direction = previous;
  }
  // The landing point controls intent, but cell distance starts at the letter's centre.
  const [dr, dc] = direction, length = Math.max(0, Math.round((x * dc + y * dr) / (size * (dr * dr + dc * dc))));
  const cells: number[] = [];
  for (let n = 0; n <= length; n++) { const r = Math.floor(start / columns) + n * dr, c = start % columns + n * dc; if (r < 0 || c < 0 || r >= rows || c >= columns) break; cells.push(r * columns + c); }
  return { direction, cells };
}
export function straightPath(start: number, end: number, columns: number): number[] | null {
  const dr = Math.floor(end / columns) - Math.floor(start / columns), dc = end % columns - start % columns;
  if (!dr && !dc || dr && dc && Math.abs(dr) !== Math.abs(dc)) return null;
  const step = Math.sign(dr) * columns + Math.sign(dc);
  return Array.from({ length: Math.max(Math.abs(dr), Math.abs(dc)) + 1 }, (_, i) => start + i * step);
}
export const initialSearch = (): SearchState => ({ found: [], turn: 0, edits: 0 });
export function foundIndex(p: SearchPuzzle, start: number, end: number): number {
  const path = straightPath(start, end, p.cells[0].length);
  return path ? p.words.findIndex(w => w.cells.length === path.length && (w.cells.every((c, i) => c === path[i]) || w.cells.every((c, i) => c === path[path.length - 1 - i]))) : -1;
}
export function findWord(p: SearchPuzzle, s: SearchState, [start, end, hunter]: SearchAction): SearchState {
  const word = foundIndex(p, start, end);
  if (word < 0 || s.found.some(([i]) => i === word)) return s;
  return { found: [...s.found, [word, hunter]], turn: hunter === 0 ? 1 : 0, edits: s.edits + 1 };
}
export const searchSolved = (p: SearchPuzzle, s: SearchState) => s.found.length === p.words.length;
export const searchSolution = (p: SearchPuzzle) => sha256Hex(p.words.map(w => w.id).sort().join('|'));
export function validSearch(x: unknown): x is SearchPuzzle {
  if (!plain(x) || !exactKeys(x, ['language', 'cells', 'words', 'theme', 'list', 'message']) || !['en', 'ch'].includes(x.language as string) || typeof x.theme !== 'string' || !x.theme.length || x.theme.length > 100 || !['pictures', 'words', 'hidden'].includes(x.list as string) || !(x.message === null || typeof x.message === 'string' && x.message.length > 0 && x.message.length <= 256) || !Array.isArray(x.cells) || x.cells.length < 2 || x.cells.length > 16 || !Array.isArray(x.cells[0]) || x.cells[0].length < 2 || x.cells[0].length > 16) return false;
  const rows = x.cells as unknown[][], columns = rows[0].length;
  if (!rows.every(row => Array.isArray(row) && row.length === columns && row.every(c => typeof c === 'string' && (x.language === 'en' ? /^[A-Z]$/.test(c) : alphabet.has(c))))) return false;
  if (!Array.isArray(x.words) || !x.words.length || x.words.length > 24 || new Set(x.words.map(w => w?.id)).size !== x.words.length) return false;
  const flat = rows.flat(), paths = new Set<string>();
  for (const w of x.words) {
    if (!plain(w) || !exactKeys(w, ['id', 'spelling', 'cells', 'audio']) || typeof w.id !== 'string' || !w.id.length || typeof w.spelling !== 'string' || !w.spelling.length || !(w.audio === null || typeof w.audio === 'string' && w.audio.length > 0) || !Array.isArray(w.cells) || w.cells.length < 2 || !w.cells.every(c => uint(c, flat.length - 1))) return false;
    const cells = w.cells as number[], path = straightPath(cells[0], cells.at(-1)!, columns), expected = letters(w.spelling, x.language as 'en' | 'ch');
    if (!path || path.length !== cells.length || cells.length !== expected.length || cells.some((c, i) => c !== path[i] || flat[c] !== expected[i])) return false;
    const key = [...cells].sort((a, b) => a - b).join(','); if (paths.has(key)) return false; paths.add(key);
  }
  // The hidden message is read in row order from precisely the unused cells.
  const used = new Set((x.words as SearchWord[]).flatMap(w => w.cells));
  return x.message === null || flat.filter((_, i) => !used.has(i)).join('') === letters(x.message as string, x.language as 'en' | 'ch').join('');
}
export function validSearchState(x: unknown, p: SearchPuzzle): x is SearchState {
  return plain(x) && exactKeys(x, ['found', 'turn', 'edits']) && uint(x.turn, 1) && uint(x.edits) && Array.isArray(x.found) && x.found.length <= p.words.length && new Set(x.found.map(e => e?.[0])).size === x.found.length && x.found.every(e => Array.isArray(e) && e.length === 2 && uint(e[0], p.words.length - 1) && uint(e[1], 1));
}
