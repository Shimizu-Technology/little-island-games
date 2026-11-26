import { describe, expect, it } from 'vitest';
import {
  activeCrosswordClue,
  checkCrossword,
  createCrossword,
  CROSSWORD_LOCK,
  CROSSWORD_UNDO_LIMIT,
  crosswordClueText,
  crosswordLetter,
  crosswordLetterCode,
  crosswordReducer,
  indexCrossword,
  isCrosswordComplete,
  type CrosswordAction,
  type CrosswordDirection,
  type CrosswordPuzzle,
  type CrosswordState,
  type CrosswordTier,
} from '../src/puzzles/crossword/engine';
import {
  CROSSWORD_SAVE_CAP,
  decodeCrosswordSave,
  encodeCrosswordSave,
} from '../src/puzzles/crossword/save';
import { REVIEWED_CROSSWORD_CLUES } from '../src/puzzles/crossword/starterClues';
import { STARTER_CROSSWORDS, STARTER_CROSSWORD_DEFINITIONS } from '../src/puzzles/crossword/starterSet';

const puzzle = STARTER_CROSSWORDS.Easy[0];

function play(actions: readonly CrosswordAction[], start = createCrossword(puzzle), board = puzzle) {
  return actions.reduce((state, action) => crosswordReducer(board, state, action), start);
}

const type = (letter: string) => ({ type: 'type', letter }) as const;
const select = (cell: number) => ({ type: 'select', cell }) as const;
const hint = (kind: 'check-letter' | 'reveal-letter' | 'reveal-word') => ({ type: 'hint', hint: kind }) as const;

describe('curated starter crosswords', () => {
  const sizes = { Easy: 5, Medium: 7, Hard: 9, Expert: 11 } as const;

  it('ships 12 distinct, correctly sized boards per tier and a reviewed clue for every answer', () => {
    const tiers = Object.keys(sizes) as CrosswordTier[];
    const puzzles = tiers.flatMap(tier => STARTER_CROSSWORDS[tier]);
    const used = new Set(puzzles.flatMap(item => item.clues.map(clue => clue.answer)));
    expect(new Set(puzzles.map(item => item.id)).size).toBe(48);
    expect(new Set(puzzles.map(item => item.solution)).size).toBe(48);
    expect(used).toEqual(new Set(Object.keys(REVIEWED_CROSSWORD_CLUES)));
    for (const tier of tiers) {
      expect(STARTER_CROSSWORDS[tier]).toHaveLength(12);
      expect(STARTER_CROSSWORDS[tier].every(item => item.tier === tier && item.size === sizes[tier])).toBe(true);
    }
  });

  it.each(STARTER_CROSSWORD_DEFINITIONS)('verifies every crossing and clue number in $id', definition => {
    const { rows } = definition;
    const n = rows.length;
    const columns = rows.map((_, col) => rows.map(row => row[col]).join(''));
    const independentlyIndexed = (lines: readonly string[], direction: CrosswordDirection) => lines.flatMap((line, offset) =>
      Array.from(line.matchAll(/[A-Z]+/g), match => {
        const answer = match[0];
        const cells = Array.from(answer, (_, i) => direction === 'Across'
          ? offset * n + match.index + i
          : (match.index + i) * n + offset);
        return { direction, answer, cells };
      }));

    const entries = [...independentlyIndexed(rows, 'Across'), ...independentlyIndexed(columns, 'Down')];
    const starts = [...new Set(entries.map(entry => entry.cells[0]))].sort((a, b) => a - b);
    const indexed = STARTER_CROSSWORDS[definition.tier].find(item => item.id === definition.id)!;
    const memberships = Array<number>(n * n).fill(0);
    const answers = new Set<string>();

    for (const entry of entries) {
      const { answer, direction, cells } = entry;
      expect(answer).toMatch(/^[A-Z]{3,}$/);
      expect(answers.has(answer)).toBe(false);
      answers.add(answer);
      const number = starts.indexOf(cells[0]) + 1;
      const clue = indexed.clues.find(item => item.number === number && item.direction === direction);
      const vetted = REVIEWED_CROSSWORD_CLUES[answer];
      expect(vetted).toBeDefined();
      expect(vetted.easy.trim()).not.toBe('');
      expect(vetted.harder.trim()).not.toBe('');
      expect(vetted.easy.trim()).not.toEqual(vetted.harder.trim());
      expect(clue).toEqual({ ...entry, ...vetted, number });
      for (const cell of cells) {
        memberships[cell]++;
        const crossing = indexed.crossings[cell]!;
        expect(indexed.clues[crossing[direction]]).toBe(clue);
        expect(indexed.clues[crossing.Across].answer[indexed.clues[crossing.Across].cells.indexOf(cell)])
          .toBe(indexed.clues[crossing.Down].answer[indexed.clues[crossing.Down].cells.indexOf(cell)]);
      }
    }

    const mask = rows.join('');
    const connected = new Set([mask.search(/[A-Z]/)]);
    for (const cell of connected) {
      const [r, c] = [Math.floor(cell / n), cell % n];
      for (const [y, x] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        if (x >= 0 && x < n && y >= 0 && y < n && rows[y][x] !== '#') connected.add(y * n + x);
      }
    }

    expect(indexed.clues).toHaveLength(entries.length);
    expect(indexed.numbers).toEqual(Array.from(mask, (_, i) => starts.indexOf(i) + 1));
    expect(memberships).toEqual(Array.from(mask, cell => cell === '#' ? 0 : 2));
    expect(connected.size).toBe(memberships.filter(Boolean).length);
    expect([...mask].every((cell, i) => (cell === '#') === (mask[mask.length - 1 - i] === '#'))).toBe(true);
  });
});

describe('crossword play', () => {
  it('enters letters, advances, toggles Across/Down and backspaces from the blank square', () => {
    expect(activeCrosswordClue(puzzle, createCrossword(puzzle).cursor).answer).toBe('EGG');
    const typed = play([type('e'), type('g')]);
    expect(typed.cells.slice(0, 3).map(crosswordLetter)).toEqual(['E', 'G', '']);
    expect(typed.cursor).toEqual({ cell: 2, direction: 'Across' });
    const erased = play([{ type: 'backspace' }], typed);
    expect(erased.cells.slice(0, 3).map(crosswordLetter)).toEqual(['E', '', '']);
    expect(erased.cursor.cell).toBe(1);
    const down = play([select(1)], erased);
    expect(down.cursor.direction).toBe('Down');
    expect(activeCrosswordClue(puzzle, down.cursor).answer).toBe('GIRL');
    const next = play([{ type: 'clue', step: 1 }], down);
    expect(activeCrosswordClue(puzzle, next.cursor).answer).toBe('GROUP');
    expect(play([{ type: 'clue', step: -1 }], next).cursor).toEqual(down.cursor);
    expect(play([select(3), type('é'), type('AB')], down)).toBe(down);
  });

  it('skips filled crossing letters when requested and always skips locked letters', () => {
    const firstClue = activeCrosswordClue(puzzle, createCrossword(puzzle).cursor);
    const [first, middle, last] = firstClue.cells;
    const crossed = play([select(middle), type('g'), select(first)]);
    expect(play([type('e')], crossed).cursor.cell).toBe(middle);
    const skipped = play([{ type: 'skip-filled', value: true }, type('e')], crossed);
    expect(skipped.cursor.cell).toBe(last);
    const locked = play([hint('reveal-letter'), type('g')], crossed);
    expect(locked.cells[first]).toBe(CROSSWORD_LOCK + crosswordLetterCode('E'));
    expect(crosswordLetter(locked.cells[middle])).toBe('G');
    const skipLockedAndFilled = play([{ type: 'skip-filled', value: true }, select(first), type('z')], locked);
    expect(crosswordLetter(skipLockedAndFilled.cells[last])).toBe('Z');
    expect(play([{ type: 'backspace' }], skipLockedAndFilled).cells[first]).toBe(locked.cells[first]);
  });

  it('keeps drafts neutral until Check and checks without spending help', () => {
    const draft = play([type('z'), type('g')]);
    expect(draft.feedback).toBeNull();
    const checked = play([{ type: 'check' }], draft);
    expect(checked.feedback).toEqual({ type: 'check', wrong: 1, blanks: puzzle.crossings.filter(Boolean).length - 2 });
    expect(checked.helpUsed).toBe(false);
    expect(checkCrossword(puzzle, checked).wrong).toEqual([0]);
    expect(play([type('g')], checked).feedback).toBeNull();
  });

  it('records assistance before giving an answer or its correctness and keeps it after Undo', () => {
    expect(play([hint('check-letter')]).helpUsed).toBe(false);
    const checked = play([type('z'), select(0), hint('check-letter')]);
    expect(checked.helpUsed).toBe(true);
    expect(checked.feedback).toEqual({ type: 'check-letter', result: 'wrong' });

    const letter = play([hint('reveal-letter')]);
    expect(letter.helpUsed).toBe(true);
    expect(letter.cells[0]).toBe(CROSSWORD_LOCK + crosswordLetterCode('E'));
    const word = play([hint('reveal-word')], letter);
    expect(word.cells.slice(0, 3).map(crosswordLetter)).toEqual(['E', 'G', 'G']);
    const [undoWord, undoLetter] = [{ type: 'undo' }, { type: 'undo' }] as const;
    const undone = play([undoWord, undoLetter], word);
    expect(undone.cells).toEqual(createCrossword(puzzle).cells);
    expect(undone.helpUsed).toBe(true);
  });

  it('lets two readers toggle clue difficulty on the same exact entry and fill', () => {
    const old = play([type('e')]);
    const clue = activeCrosswordClue(puzzle, old.cursor);
    expect(crosswordClueText(puzzle, old, clue)).toBe(clue.easy);
    const together = play([{ type: 'play-together', value: true }, { type: 'clue-level', value: 'harder' }], old);
    expect(crosswordClueText(puzzle, together, clue)).toBe(clue.harder);
    expect(together.cells).toBe(old.cells);
    expect(together.cursor).toBe(old.cursor);
    expect(together.undo).toBe(old.undo);
  });

  it('completes only with all squares correct and Undo can reopen it', () => {
    let state = createCrossword(puzzle);
    for (const [cell, letter] of Array.from(puzzle.solution).entries()) {
      if (letter !== '#') state = play([select(cell), type(letter)], state);
    }
    expect(checkCrossword(puzzle, state)).toEqual({ wrong: [], blanks: 0, complete: true });
    expect(isCrosswordComplete(puzzle, state)).toBe(true);
    expect(isCrosswordComplete(puzzle, play([{ type: 'undo' }], state))).toBe(false);
  });
});

function testGrid(): CrosswordPuzzle {
  // Synthetic 15x15 answer strings exercise capacity without shipping another starter.
  const rows = Array.from({ length: 15 }, (_, r) =>
    Array.from({ length: 15 }, (_, c) => String.fromCharCode(65 + (r * 3 + c * 5) % 26)).join(''));
  const columns = rows.map((_, col) => rows.map(row => row[col]).join(''));
  const clues = Object.fromEntries([...rows, ...columns].map(answer => [answer, { easy: 'Fixture', harder: 'Fixture' }]));
  return indexCrossword({ id: 'capacity-fixture', title: 'Capacity fixture', tier: 'Expert', rows, clues });
}

function roundTrip(board: CrosswordPuzzle, state: CrosswordState) {
  const save = encodeCrosswordSave(board, state);
  expect(Buffer.byteLength(save)).toBeLessThan(CROSSWORD_SAVE_CAP);
  const loaded = decodeCrosswordSave(board, save);
  expect(loaded).toEqual({ ...state, feedback: null });
  return loaded!;
}

describe('crossword saves', () => {
  it('round-trips hints, cursor, settings and Undo with no dependence on transient feedback', () => {
    const state = play([
      type('z'), hint('reveal-word'), select(0), select(0), { type: 'mistakes', value: 'friendly' },
      { type: 'play-together', value: true }, { type: 'clue-level', value: 'harder' },
      { type: 'skip-filled', value: true }, { type: 'check' },
    ]);
    const loaded = roundTrip(puzzle, state);
    expect(play([{ type: 'undo' }], loaded)).toEqual(play([{ type: 'undo' }], state));
  });

  it('keeps exactly the latest 256 moves through a 15x15 save including 225 locked cells', () => {
    const board = testGrid();
    let state = createCrossword(board);
    const change = (action: CrosswordAction) => { state = crosswordReducer(board, state, action); };
    for (let i = 0; i < 310; i++) {
      if (state.cursor.cell !== 0) change(select(0));
      change(type(i % 2 ? 'a' : 'z'));
    }
    for (let i = 0; i < board.size; i++) {
      change(hint('reveal-word'));
      change({ type: 'clue', step: 1 });
    }
    expect(state.undo).toHaveLength(CROSSWORD_UNDO_LIMIT);
    expect(state.cells.filter(code => code >= CROSSWORD_LOCK)).toHaveLength(225);
    state = roundTrip(board, state);
    for (let i = 0; i < CROSSWORD_UNDO_LIMIT; i++) change({ type: 'undo' });
    expect(state.undo).toHaveLength(0);
    expect(state.helpUsed).toBe(true);
    expect(state.cells.filter(code => code !== 0)).toHaveLength(1);
    expect(crosswordReducer(board, state, { type: 'undo' })).toBe(state);
  });

  it('round-trips diverse edit, cursor, hint and recovery sequences', () => {
    let seed = 14073;
    const choose = (max: number) => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) >>> 8) % max;
    for (const board of [puzzle, STARTER_CROSSWORDS.Expert[0]]) {
      let state = createCrossword(board);
      for (let i = 0; i < 900; i++) {
        const actions: CrosswordAction[] = [
          { type: 'backspace' }, { type: 'undo' }, type(String.fromCharCode(65 + choose(26))), select(choose(board.solution.length)),
          { type: 'clue', step: choose(2) ? 1 : -1 }, { type: 'skip-filled', value: Boolean(choose(2)) },
          hint('reveal-letter'), hint('reveal-word'), hint('check-letter'),
        ];
        state = crosswordReducer(board, state, actions[choose(actions.length)]);
        if (i % 13 === 0) state = roundTrip(board, state);
      }
      roundTrip(board, state);
    }
  });

  it('rejects corrupt saves, including false lock claims, oversized payloads and fake undo edits', () => {
    const valid = encodeCrosswordSave(puzzle, play([type('z'), hint('reveal-letter')]));
    const fields = JSON.parse(valid) as { cells: string; undo: string };
    expect(decodeCrosswordSave(STARTER_CROSSWORDS.Easy[1], valid)).toBeNull();
    const changes = [
      { v: 0 }, { puzzle: 'different' }, { cursor: 6 }, { cursor: 0.5 }, { cursor: 500 },
      { options: -1 }, { options: 16 }, { help: false }, { help: 'true' },
      { cells: 'A' }, { cells: 'h' + fields.cells.slice(1) }, { cells: '_' + fields.cells.slice(1) },
      { cells: fields.cells.slice(0, 3) + 'B' + fields.cells.slice(4) },
      { undo: 'AAAA' }, { undo: fields.undo.slice(0, -1) }, { undo: 'AAAAé' },
      { undo: 'AABABA' }, // Places a change after a writable selected cell.
      { undo: 'AACAAAABA' }, // Two cells allegedly edited with only one lock present.
      { extra: true },
    ];
    for (const change of changes) {
      expect(decodeCrosswordSave(puzzle, JSON.stringify({ ...fields, ...change })), JSON.stringify(change)).toBeNull();
    }
    expect(decodeCrosswordSave(puzzle, valid + ' '.repeat(CROSSWORD_SAVE_CAP))).toBeNull();
    expect(decodeCrosswordSave(puzzle, '{not json}')).toBeNull();
    expect(decodeCrosswordSave(puzzle, fields)).toBeNull();
  });

  it('refuses malformed grids before starting a session', () => {
    const good = STARTER_CROSSWORD_DEFINITIONS[0];
    expect(() => indexCrossword({ ...good, rows: ['ABC', 'DEF', 'G#I'] })).toThrow();
    expect(() => indexCrossword({ ...good, rows: ['ABC', 'DEF', 'AB#'] })).toThrow();
    expect(() => indexCrossword({ ...good, rows: ['ABC', 'ABC', 'ABC'] })).toThrow();
    expect(() => indexCrossword({ ...good, clues: {} })).toThrow();
  });
});
