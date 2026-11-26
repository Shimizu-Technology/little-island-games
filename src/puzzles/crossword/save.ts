import {
  activeCrosswordClue,
  CROSSWORD_LOCK,
  CROSSWORD_UNDO_LIMIT,
  crosswordLetter,
  type CrosswordCursor,
  type CrosswordDelta,
  type CrosswordPuzzle,
  type CrosswordState,
} from './engine';

const SEXTETS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const VERSION = 1;
export const CROSSWORD_SAVE_CAP = 4096;

function packIndex(index: number): string {
  return SEXTETS[index >> 6] + SEXTETS[index & 63];
}

function unpackIndex(text: string, at: number): number {
  return (SEXTETS.indexOf(text[at]) << 6) + SEXTETS.indexOf(text[at + 1]);
}

function packCursor({ cell, direction }: CrosswordCursor): number {
  return cell * 2 + Number(direction === 'Down');
}

function unpackCursor(puzzle: CrosswordPuzzle, code: number): CrosswordCursor | null {
  if (!Number.isInteger(code) || code < 0) return null;
  const cell = Math.floor(code / 2);
  return puzzle.crossings[cell] ? { cell, direction: code % 2 ? 'Down' : 'Across' } : null;
}

/**
 * Six bits per cell, two characters per cursor/cell index, and one edit per history step.
 * A word reveal may change multiple cells, but every retained reveal locks new cells.
 * The board therefore adds at most 225 changes beyond the 256 single-edit budget.
 */
export function encodeCrosswordSave(puzzle: CrosswordPuzzle, state: CrosswordState): string {
  const options = Number(state.mistakes === 'friendly') + Number(state.skipFilled) * 2
    + Number(state.playTogether) * 4 + Number(state.clueLevel === 'harder') * 8;
  const undo = state.undo.map(delta => packIndex(packCursor(delta.cursor)) + SEXTETS[delta.before.length]
    + delta.before.map(([cell, code]) => packIndex(cell) + SEXTETS[code]).join('')).join('');
  const save = JSON.stringify({
    v: VERSION, puzzle: puzzle.fingerprint, cursor: packCursor(state.cursor),
    cells: state.cells.map(code => SEXTETS[code]).join(''),
    undo, options, help: state.helpUsed,
  });
  if (save.length > CROSSWORD_SAVE_CAP) throw new Error('Crossword checkpoint exceeds its byte budget');
  return save;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function packed(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]*$/.test(value);
}

function validCell(puzzle: CrosswordPuzzle, at: number, code: number, help: boolean): boolean {
  if (!puzzle.crossings[at]) return code === 0;
  if (code <= 26) return true;
  return help && code >= CROSSWORD_LOCK + 1 && code <= CROSSWORD_LOCK + 26
    && crosswordLetter(code) === puzzle.solution[at];
}

function parseUndo(puzzle: CrosswordPuzzle, packedUndo: string, cells: readonly number[]): CrosswordDelta[] | null {
  const undo: CrosswordDelta[] = [];
  let at = 0;
  while (at < packedUndo.length) {
    if (undo.length === CROSSWORD_UNDO_LIMIT || at + 3 > packedUndo.length) return null;
    const cursor = unpackCursor(puzzle, unpackIndex(packedUndo, at));
    const count = SEXTETS.indexOf(packedUndo[at + 2]);
    at += 3;
    if (!cursor || count < 1 || count > puzzle.size || at + count * 3 > packedUndo.length) return null;
    const clue = activeCrosswordClue(puzzle, cursor);
    const before: [number, number][] = [];
    let last = -1;
    for (let i = 0; i < count; i++, at += 3) {
      const cell = unpackIndex(packedUndo, at);
      const code = SEXTETS.indexOf(packedUndo[at + 2]);
      const offset = clue.cells.indexOf(cell);
      if (offset <= last || code > 26) return null;
      last = offset;
      before.push([cell, code]);
    }
    undo.push({ cursor, before });
  }

  // Undo from the saved board so a changed cell can never be a no-op or an illegal lock.
  const restored = cells.slice();
  for (let i = undo.length - 1; i >= 0; i--) {
    const { cursor, before } = undo[i];
    const [cell, prev] = before[0];
    const current = restored[cell];
    const clue = activeCrosswordClue(puzzle, cursor);
    if (current >= CROSSWORD_LOCK) {
      const revealed = before.map(([position]) => position);
      const wholeWord = clue.cells.filter(position => restored[position] < CROSSWORD_LOCK || revealed.includes(position));
      const letterOnly = revealed.length === 1 && cell === cursor.cell;
      if (!letterOnly && (wholeWord.length !== revealed.length || wholeWord.some((position, index) => position !== revealed[index]))) {
        return null;
      }
      if (revealed.some(position => restored[position] < CROSSWORD_LOCK)) return null;
    } else {
      if (before.length !== 1 || current === prev) return null;
      const start = clue.cells.indexOf(cursor.cell);
      const target = clue.cells.indexOf(cell);
      if (current === 0 && target !== start) {
        if (target > start || (restored[cursor.cell] > 0 && restored[cursor.cell] < CROSSWORD_LOCK)) return null;
        if (clue.cells.slice(target + 1, start).some(position => restored[position] < CROSSWORD_LOCK)) return null;
      }
      if (current > 0) {
        if (target < start) return null;
        if (target > start) {
          if (restored[cursor.cell] < CROSSWORD_LOCK) return null;
          const skipped = clue.cells.slice(start + 1, target);
          if (skipped.some(position => restored[position] === 0)) return null;
          if (prev !== 0 && skipped.some(position => restored[position] < CROSSWORD_LOCK)) return null;
        }
      }
    }
    for (const [position, code] of before) restored[position] = code;
  }
  return undo;
}

export function decodeCrosswordSave(puzzle: CrosswordPuzzle, input: unknown): CrosswordState | null {
  // Accepted payloads are ASCII. Bounding the input length before parsing also bounds parser work.
  if (typeof input !== 'string' || input.length > CROSSWORD_SAVE_CAP || /[^\x00-\x7f]/.test(input)) return null;
  let save: unknown;
  try {
    save = JSON.parse(input);
  } catch {
    return null;
  }
  if (!record(save) || Object.keys(save).length !== 7 || save.v !== VERSION || save.puzzle !== puzzle.fingerprint
    || !packed(save.cells) || save.cells.length !== puzzle.solution.length || !packed(save.undo)
    || typeof save.cursor !== 'number' || typeof save.help !== 'boolean'
    || typeof save.options !== 'number' || !Number.isInteger(save.options) || save.options < 0 || save.options > 15) {
    return null;
  }
  const { help, options } = save;
  const cursor = unpackCursor(puzzle, save.cursor);
  if (!cursor) return null;
  const cells = Array.from(save.cells, char => SEXTETS.indexOf(char));
  if (cells.some((code, cell) => !validCell(puzzle, cell, code, help))) return null;
  const undo = parseUndo(puzzle, save.undo, cells);
  if (!undo) return null;
  return {
    cells, cursor, undo, helpUsed: help, feedback: null,
    mistakes: options & 1 ? 'friendly' : 'neutral',
    skipFilled: Boolean(options & 2), playTogether: Boolean(options & 4),
    clueLevel: options & 8 ? 'harder' : 'easy',
  };
}
