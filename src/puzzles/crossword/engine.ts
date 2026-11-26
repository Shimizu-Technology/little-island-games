import { sha256Hex } from '../sha256';

export type CrosswordTier = 'Easy' | 'Medium' | 'Hard' | 'Expert';
export type CrosswordDirection = 'Across' | 'Down';
export type CrosswordClueText = { readonly easy: string; readonly harder: string };
export type CrosswordDefinition = {
  readonly id: string;
  readonly title: string;
  readonly tier: CrosswordTier;
  /** Square solution rows. # is a block. Every open cell belongs to both directions. */
  readonly rows: readonly string[];
  readonly clues: Readonly<Partial<Record<string, CrosswordClueText>>>;
};
export type CrosswordClue = CrosswordClueText & {
  readonly number: number;
  readonly direction: CrosswordDirection;
  readonly cells: readonly number[];
  readonly answer: string;
};
export type CrosswordPuzzle = {
  readonly id: string;
  readonly title: string;
  readonly tier: CrosswordTier;
  readonly size: number;
  readonly solution: string;
  readonly fingerprint: string;
  readonly clues: readonly CrosswordClue[];
  readonly numbers: readonly number[];
  /** Clue indexes by direction at each open cell. Blocks have no entry. */
  readonly crossings: readonly (Readonly<Record<CrosswordDirection, number>> | undefined)[];
};

const DIRECTIONS = ['Across', 'Down'] as const;
const OTHER_DIRECTION = { Across: 'Down', Down: 'Across' } as const;
export const CROSSWORD_MAX_SIZE = 15;

export function indexCrossword(definition: CrosswordDefinition): CrosswordPuzzle {
  const { id, title, tier, rows, clues: texts } = definition;
  const size = rows.length;
  const invalid = (reason: string): never => { throw new Error(`Crossword ${id}: ${reason}`); };
  if (!/^[a-z0-9-]{1,64}$/.test(id) || !title.trim()) invalid('invalid identity');
  if (size < 3 || size > CROSSWORD_MAX_SIZE || rows.some(row => row.length !== size || !/^[A-Z#]+$/.test(row))) {
    invalid('invalid grid');
  }

  const solution = rows.join('');
  const clues: CrosswordClue[] = [];
  const numbers = Array<number>(solution.length).fill(0);
  const entries: (Record<CrosswordDirection, number> | undefined)[] = Array(solution.length).fill(undefined);
  const answers = new Set<string>();
  let number = 0;
  for (let cell = 0; cell < solution.length; cell++) {
    if ((solution[cell] === '#') !== (solution[solution.length - 1 - cell] === '#')) invalid('asymmetric blocks');
    if (solution[cell] === '#') continue;
    const column = cell % size;
    const across = column === 0 || solution[cell - 1] === '#';
    const down = cell < size || solution[cell - size] === '#';
    if (!across && !down) continue;
    numbers[cell] = ++number;
    for (const direction of DIRECTIONS) {
      if (direction === 'Across' ? !across : !down) continue;
      const step = direction === 'Across' ? 1 : size;
      const end = direction === 'Across' ? cell - column + size : solution.length;
      const cells: number[] = [];
      for (let at = cell; at < end && solution[at] !== '#'; at += step) cells.push(at);
      const answer = cells.map(at => solution[at]).join('');
      if (cells.length < 3 || answers.has(answer)) invalid(`short or repeated answer ${answer}`);
      const text = texts[answer];
      if (!text?.easy.trim() || !text.harder.trim()) throw new Error(`Crossword ${id}: missing clue for ${answer}`);
      for (const at of cells) {
        const crossing = entries[at] ?? { Across: -1, Down: -1 };
        crossing[direction] = clues.length;
        entries[at] = crossing;
      }
      answers.add(answer);
      clues.push({ ...text, number, direction, cells, answer });
    }
  }

  const firstOpen = entries.findIndex(Boolean);
  if (firstOpen < 0 || entries.some(entry => entry && (entry.Across < 0 || entry.Down < 0))) invalid('unchecked grid');
  const connected = new Set([firstOpen]);
  for (const cell of connected) {
    const crossing = entries[cell]!;
    for (const direction of DIRECTIONS) {
      for (const neighbor of clues[crossing[direction]].cells) connected.add(neighbor);
    }
  }
  if (connected.size !== Array.from(solution).filter(letter => letter !== '#').length) invalid('disconnected grid');
  return {
    id, title, tier, size, solution, clues, numbers, crossings: entries,
    fingerprint: sha256Hex(`${id}/${size}/${solution}`),
  };
}

export type CrosswordCursor = { readonly cell: number; readonly direction: CrosswordDirection };
export type CrosswordMistakes = 'neutral' | 'friendly';
export type CrosswordClueLevel = 'easy' | 'harder';
export type CrosswordHint = 'check-letter' | 'reveal-letter' | 'reveal-word';
export type CrosswordOptions = {
  readonly mistakes: CrosswordMistakes;
  readonly skipFilled: boolean;
  readonly playTogether: boolean;
  readonly clueLevel: CrosswordClueLevel;
};
export type CrosswordFeedback =
  | { readonly type: 'check'; readonly wrong: number; readonly blanks: number }
  | { readonly type: 'check-letter'; readonly result: 'blank' | 'correct' | 'wrong' }
  | { readonly type: 'reveal-letter' | 'reveal-word' };

/** Each cell is blank (0), a draft letter (1–26), or a locked revealed letter (33–58). */
export const CROSSWORD_LOCK = 32;
export const CROSSWORD_UNDO_LIMIT = 256;
export type CrosswordDelta = {
  readonly cursor: CrosswordCursor;
  readonly before: readonly (readonly [cell: number, code: number])[];
};
export type CrosswordState = CrosswordOptions & {
  readonly cells: readonly number[];
  readonly cursor: CrosswordCursor;
  readonly undo: readonly CrosswordDelta[];
  readonly helpUsed: boolean;
  readonly feedback: CrosswordFeedback | null;
};

export type CrosswordAction =
  | { readonly type: 'select'; readonly cell: number }
  | { readonly type: 'clue'; readonly step: -1 | 1 }
  | { readonly type: 'type'; readonly letter: string }
  | { readonly type: 'backspace' | 'undo' | 'check' }
  | { readonly type: 'hint'; readonly hint: CrosswordHint }
  | { readonly type: 'mistakes'; readonly value: CrosswordMistakes }
  | { readonly type: 'skip-filled' | 'play-together'; readonly value: boolean }
  | { readonly type: 'clue-level'; readonly value: CrosswordClueLevel };

export function createCrossword(puzzle: CrosswordPuzzle, options: Partial<CrosswordOptions> = {}): CrosswordState {
  const clue = puzzle.clues[0];
  return {
    mistakes: options.mistakes ?? 'neutral',
    skipFilled: options.skipFilled ?? false,
    playTogether: options.playTogether ?? false,
    clueLevel: options.clueLevel ?? 'easy',
    cells: Array<number>(puzzle.solution.length).fill(0),
    cursor: { cell: clue.cells[0], direction: clue.direction },
    undo: [],
    helpUsed: false,
    feedback: null,
  };
}

export function activeCrosswordClue(puzzle: CrosswordPuzzle, { cell, direction }: CrosswordCursor): CrosswordClue {
  return puzzle.clues[puzzle.crossings[cell]![direction]];
}

export function crosswordClueText(puzzle: CrosswordPuzzle, state: CrosswordState, clue: CrosswordClue): string {
  const level = state.playTogether ? state.clueLevel : puzzle.tier === 'Easy' || puzzle.tier === 'Medium' ? 'easy' : 'harder';
  return clue[level];
}

export const crosswordLetterCode = (letter: string): number => letter.charCodeAt(0) - 64;
export const crosswordLetter = (code: number): string => code ? String.fromCharCode((code & 31) + 64) : '';

export function checkCrossword(puzzle: CrosswordPuzzle, state: CrosswordState) {
  const wrong: number[] = [];
  let blanks = 0;
  puzzle.crossings.forEach((crossing, cell) => {
    if (!crossing) return;
    const letter = crosswordLetter(state.cells[cell]);
    if (!letter) blanks++;
    else if (letter !== puzzle.solution[cell]) wrong.push(cell);
  });
  return { wrong, blanks, complete: wrong.length === 0 && blanks === 0 };
}

export function isCrosswordComplete(puzzle: CrosswordPuzzle, state: CrosswordState): boolean {
  return puzzle.crossings.every((crossing, cell) => !crossing || crosswordLetter(state.cells[cell]) === puzzle.solution[cell]);
}

function edit(
  state: CrosswordState,
  changes: readonly (readonly [number, number])[],
  cursor = state.cursor,
  feedback: CrosswordFeedback | null = null,
): CrosswordState {
  const before = changes.flatMap(([cell, code]) => state.cells[cell] === code ? [] : [[cell, state.cells[cell]] as const]);
  if (!before.length) return { ...state, cursor, feedback };
  const cells = state.cells.slice();
  for (const [cell, code] of changes) cells[cell] = code;
  const undo = [...state.undo.slice(1 - CROSSWORD_UNDO_LIMIT), { cursor: state.cursor, before }];
  return { ...state, cells, cursor, undo, feedback };
}

function enterLetter(state: CrosswordState, clue: CrosswordClue, letter: string): CrosswordState {
  if (!/^[a-zA-Z]$/.test(letter)) return state;
  const { cursor, cells, skipFilled } = state;
  const start = clue.cells.indexOf(cursor.cell);
  const remaining = clue.cells.slice(start);
  const writable = remaining.find(cell => (!skipFilled || cell === cursor.cell)
    ? cells[cell] < CROSSWORD_LOCK : cells[cell] === 0);
  if (writable === undefined) return state;
  const next = remaining.slice(remaining.indexOf(writable) + 1)
    .find(cell => skipFilled ? cells[cell] === 0 : cells[cell] < CROSSWORD_LOCK);
  return edit(state, [[writable, crosswordLetterCode(letter.toUpperCase())]], { ...cursor, cell: next ?? writable });
}

function backspace(state: CrosswordState, clue: CrosswordClue): CrosswordState {
  const { cursor, cells } = state;
  if (cells[cursor.cell] > 0 && cells[cursor.cell] < CROSSWORD_LOCK) {
    return edit(state, [[cursor.cell, 0]]);
  }
  const prior = clue.cells.slice(0, clue.cells.indexOf(cursor.cell)).reverse().find(cell => cells[cell] < CROSSWORD_LOCK);
  return prior === undefined ? state : edit(state, [[prior, 0]], { ...cursor, cell: prior });
}

function applyHint(puzzle: CrosswordPuzzle, state: CrosswordState, hint: CrosswordHint): CrosswordState {
  const cell = state.cursor.cell;
  if (hint === 'check-letter') {
    const letter = crosswordLetter(state.cells[cell]);
    if (!letter) return { ...state, feedback: { type: hint, result: 'blank' } };
    const assisted = { ...state, helpUsed: true };
    return { ...assisted, feedback: { type: hint, result: letter === puzzle.solution[cell] ? 'correct' : 'wrong' } };
  }

  const targets = hint === 'reveal-letter' ? [cell] : activeCrosswordClue(puzzle, state.cursor).cells;
  const changes = targets.filter(at => state.cells[at] < CROSSWORD_LOCK);
  if (!changes.length) return state;
  return edit(
    { ...state, helpUsed: true },
    changes.map(at => [at, CROSSWORD_LOCK + crosswordLetterCode(puzzle.solution[at])]),
    state.cursor,
    { type: hint },
  );
}

export function crosswordReducer(puzzle: CrosswordPuzzle, state: CrosswordState, action: CrosswordAction): CrosswordState {
  switch (action.type) {
    case 'select': {
      const cell = action.cell;
      if (!puzzle.crossings[cell]) return state;
      const direction = state.cursor.cell === cell ? OTHER_DIRECTION[state.cursor.direction] : state.cursor.direction;
      return { ...state, cursor: { cell, direction }, feedback: state.feedback?.type === 'check' ? state.feedback : null };
    }
    case 'clue': {
      const { direction, cell } = state.cursor;
      const clues = puzzle.clues.filter(clue => clue.direction === direction);
      const current = clues.findIndex(clue => clue.cells.includes(cell));
      const next = clues[(current + action.step + clues.length) % clues.length];
      return {
        ...state,
        cursor: { direction, cell: next.cells.find(at => !state.cells[at]) ?? next.cells[0] },
        feedback: state.feedback?.type === 'check' ? state.feedback : null,
      };
    }
    case 'type':
      return enterLetter(state, activeCrosswordClue(puzzle, state.cursor), action.letter);
    case 'backspace':
      return backspace(state, activeCrosswordClue(puzzle, state.cursor));
    case 'undo': {
      const last = state.undo.at(-1);
      if (!last) return state;
      const cells = state.cells.slice();
      for (const [cell, code] of last.before) cells[cell] = code;
      return { ...state, cells, cursor: last.cursor, undo: state.undo.slice(0, -1), feedback: null };
    }
    case 'check': {
      const { wrong, blanks } = checkCrossword(puzzle, state);
      return { ...state, feedback: { type: 'check', wrong: wrong.length, blanks } };
    }
    case 'hint':
      return applyHint(puzzle, state, action.hint);
    case 'mistakes':
      return { ...state, mistakes: action.value };
    case 'skip-filled':
      return { ...state, skipFilled: action.value };
    case 'play-together':
      return { ...state, playTogether: action.value };
    case 'clue-level':
      return { ...state, clueLevel: action.value };
  }
}
