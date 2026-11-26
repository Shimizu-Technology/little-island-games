import { existsSync, globSync, readFileSync } from 'node:fs';
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
import { STARTER_CROSSWORD_CLUES } from './fixtures/crossword-starter/starterClues';
import { STARTER_CROSSWORDS, STARTER_CROSSWORD_DEFINITIONS } from './fixtures/crossword-starter/starterSet';

const puzzle = STARTER_CROSSWORDS.Easy[0];

function play(actions: readonly CrosswordAction[], start = createCrossword(puzzle), board = puzzle) {
  return actions.reduce((state, action) => crosswordReducer(board, state, action), start);
}

const type = (letter: string) => ({ type: 'type', letter }) as const;
const select = (cell: number) => ({ type: 'select', cell }) as const;
const hint = (kind: 'check-letter' | 'reveal-letter' | 'reveal-word') => ({ type: 'hint', hint: kind }) as const;

function fillDraft(board = puzzle, mistake = -1) {
  return [...board.solution].reduce((state, letter, cell) => letter === '#' ? state
    : play([select(cell), type(cell === mistake ? 'Z' : letter)], state, board), createCrossword(board));
}

describe('draft starter crosswords', () => {
  const sizes = { Easy: 5, Medium: 7, Hard: 9, Expert: 11 } as const;

  it('keeps the draft clue and grid modules out of app code and its imports', () => {
    expect(existsSync('src/puzzles/crossword/starterSet.ts')).toBe(false);
    expect(existsSync('src/puzzles/crossword/starterClues.ts')).toBe(false);
    const importers = globSync(['src/**/*.{js,jsx,ts,tsx}', 'content/**/*.{js,jsx,ts,tsx}']).filter(path =>
      /crossword-starter|STARTER_CROSSWORDS|STARTER_CROSSWORD_CLUES/.test(readFileSync(path, 'utf8')));
    expect(importers).toEqual([]);
  });

  it('stages 12 distinct boards per tier with two clue readings per answer', () => {
    const tiers = Object.keys(sizes) as CrosswordTier[];
    const puzzles = tiers.flatMap(tier => STARTER_CROSSWORDS[tier]);
    const used = new Set(puzzles.flatMap(item => item.clues.map(clue => clue.answer)));
    expect(new Set(puzzles.map(item => item.id)).size).toBe(48);
    expect(new Set(puzzles.map(item => item.solution)).size).toBe(48);
    expect(used).toEqual(new Set(Object.keys(STARTER_CROSSWORD_CLUES)));
    for (const tier of tiers) {
      expect(STARTER_CROSSWORDS[tier]).toHaveLength(12);
      expect(STARTER_CROSSWORDS[tier].every(item => item.tier === tier && item.size === sizes[tier])).toBe(true);
    }
  });

  it('keeps exact answers out of all 1,512 draft clue readings', () => {
    const readings = Object.entries(STARTER_CROSSWORD_CLUES).flatMap(([answer, clues]) =>
      Object.values(clues).map(clue => ({ answer, clue })));
    expect(readings).toHaveLength(1512);
    expect(readings.filter(({ answer, clue }) => new RegExp(`\\b${answer}\\b`, 'i').test(clue))).toEqual([]);
  });

  it('uses simpler clues, US spelling, and a word-count cue for the two-word answer', () => {
    const clues = STARTER_CROSSWORD_CLUES;
    const readings = Object.values(clues).flatMap(clue => Object.values(clue)).join('\n');
    expect(readings).not.toMatch(/\b(theatre|traveller|neighbour|travelled)\b/i);
    expect(clues.ADD.easy).not.toBe(clues.ADDED.easy);
    expect(clues.ALE.easy).toMatch(/ginger.*soda/i);
    expect(clues.EWE.easy).toMatch(/lamb/);
    expect(clues.ASSETS.easy).toMatch(/bike/);
    expect(clues.SANS.easy).toMatch(/pickles/);
    expect(clues.SIRE.easy).toMatch(/horse’s dad/);
    expect(Object.values(clues.RUBBERBAND).every(clue => clue.endsWith('(2 words)'))).toBe(true);
    expect(clues.GELS.harder).toContain('as a plan does');
    expect(clues.RAGE.harder).toContain('all the ___');
    const stems = {
      TOAST: /toaster/i, KNEE: /kneel/i, KNEES: /kneel/i, SCOREBOARD: /\bboard\b/i,
      TRUSTEE: /\btrust\b/i, CROSSWIND: /\bacross\b|\bwind\b/i, AUTO: /automatic/i,
      CODE: /decoder/i, NAMED: /\bname\b/i, NUTS: /walnuts/i, BASES: /baseball/i,
      TIMER: /\btime\b/i, PARTIALLY: /\bpart\b/i, ASIDE: /\bside\b/i,
    };
    for (const [answer, stem] of Object.entries(stems)) {
      expect(Object.values(clues[answer]).join(' '), answer).not.toMatch(stem);
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
      const vetted = STARTER_CROSSWORD_CLUES[answer];
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

  it('skips filled crossing letters when requested and always skips revealed letters', () => {
    const firstClue = activeCrosswordClue(puzzle, createCrossword(puzzle).cursor);
    const [first, middle, last] = firstClue.cells;
    const crossed = play([select(middle), type('g'), select(first)]);
    expect(play([type('e')], crossed).cursor.cell).toBe(middle);
    const skipped = play([{ type: 'skip-filled', value: true }, type('e')], crossed);
    expect(skipped.cursor.cell).toBe(last);
    const revealed = play([hint('reveal-letter'), type('g')], crossed);
    expect(revealed.cells[first]).toBe(CROSSWORD_LOCK + crosswordLetterCode('E'));
    expect(crosswordLetter(revealed.cells[middle])).toBe('G');
    const skipRevealedAndFilled = play([{ type: 'skip-filled', value: true }, select(first), type('z')], revealed);
    expect(crosswordLetter(skipRevealedAndFilled.cells[last])).toBe('Z');
    expect(play([{ type: 'backspace' }], skipRevealedAndFilled).cells[first]).toBe(revealed.cells[first]);
  });

  it('counts only blanks on a partial Check without even reading the solution', () => {
    const draft = play([type('z'), type('g')]);
    expect(draft.feedback).toBeNull();
    const hidden: CrosswordPuzzle = { ...puzzle, get solution(): never { throw new Error('Partial draft was judged'); } };
    const checked = play([{ type: 'check' }], draft, hidden);
    expect(checked.feedback).toEqual({ type: 'incomplete', blanks: puzzle.crossings.filter(Boolean).length - 2 });
    expect(checked).toMatchObject({ checks: 0, failedChecks: 0, helpUsed: false, edits: 2 });
    expect(isCrosswordComplete(hidden, checked)).toBe(false);
    expect(play([type('g')], checked).feedback).toBeNull();
  });

  it('audits new full checks, keeps their counts through Undo and reload, and ignores repeated submissions', () => {
    const check = { type: 'check' } as const;
    const wrong = fillDraft(puzzle, 0);
    const checked = play([check], wrong);
    expect(checked).toMatchObject({ checks: 1, failedChecks: 1, helpUsed: false, edits: wrong.edits, feedback: { type: 'check', wrong: 1 } });
    expect(play([check], checked)).toBe(checked);
    const reloaded = roundTrip(puzzle, checked);
    expect(play([select(0), check], reloaded)).toMatchObject({ checks: 1, failedChecks: 1, feedback: { type: 'check', wrong: 1 } });
    const rewrote = play([{ type: 'undo' }, select(0), type('E'), check], reloaded);
    expect(rewrote).toMatchObject({ checks: 1, failedChecks: 1, feedback: { type: 'incomplete', blanks: 1 } });
    const solved = play([check], fillDraft());
    expect(solved).toMatchObject({ checks: 1, failedChecks: 0 });
  });

  it('records Friendly at creation or when selected, including after switching away and undoing', () => {
    expect(roundTrip(puzzle, createCrossword(puzzle, { mistakes: 'friendly' })).helpUsed).toBe(true);
    const neutral = play([type('Z'), { type: 'mistakes', value: 'friendly' }, { type: 'mistakes', value: 'neutral' }, { type: 'undo' }]);
    expect(roundTrip(puzzle, neutral)).toMatchObject({ mistakes: 'neutral', helpUsed: true, edits: 2 });
  });

  it('rewinds to the nearest correct draft, preserving older Undo and auditing even a no-move rewind', () => {
    const draft = play([type('E'), type('Z'), type('G'), { type: 'mistakes', value: 'rewind' }]);
    expect(draft.helpUsed).toBe(false);
    const rewound = play([{ type: 'rewind' }], roundTrip(puzzle, draft));
    expect(rewound.cells.slice(0, 3).map(crosswordLetter)).toEqual(['E', '', '']);
    expect(rewound.cursor).toEqual({ direction: 'Across', cell: 1 });
    expect(rewound.undo).toEqual(draft.undo.slice(0, 1));
    expect(roundTrip(puzzle, rewound)).toMatchObject({ helpUsed: true, edits: 4, mistakes: 'rewind' });
    expect(play([{ type: 'undo' }], rewound)).toMatchObject({ helpUsed: true, edits: 5 });
    const clear = createCrossword(puzzle, { mistakes: 'rewind' });
    expect(play([{ type: 'rewind' }], clear)).toMatchObject({ helpUsed: true, feedback: { type: 'rewind', result: 'clear' } });
  });

  it('keeps the draft and audits Rewind when there is no correct snapshot in the undo ring', () => {
    let state = play([type('Z'), { type: 'mistakes', value: 'rewind' }]);
    for (let i = 0; i < CROSSWORD_UNDO_LIMIT; i++) state = play([select(1), type(i % 2 ? 'G' : 'X')], state);
    const result = play([{ type: 'rewind' }], roundTrip(puzzle, state));
    expect(result).toMatchObject({ helpUsed: true, feedback: { type: 'rewind', result: 'unavailable' } });
    expect(result.cells).toEqual(state.cells);
    expect(result.undo).toEqual(state.undo);
  });

  it('erases past blanks and wraps to the earlier blank after typing at the end with Skip filled', () => {
    const draft = play([type('E'), select(2), { type: 'backspace' }]);
    expect(draft.cells.slice(0, 3)).toEqual([0, 0, 0]);
    expect(draft.cursor.cell).toBe(0);
    roundTrip(puzzle, draft);
    const wrapped = play([{ type: 'skip-filled', value: true }, select(2), type('G')]);
    expect(wrapped.cursor.cell).toBe(0);
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
    const state = fillDraft();
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

  it('keeps exactly the latest 256 moves through a 15x15 save including 225 revealed cells', () => {
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
      { options: -1 }, { options: 17 }, { options: 32 }, { help: false }, { help: 'true' },
      { options: 1, help: false }, { edits: 0 }, { edits: 1.5 }, { checks: -1 }, { failedChecks: 1 },
      { checks: 1, checkedAt: 0 }, { checks: 1, checkedAt: 3 }, { checks: 1, checkedAt: 2 }, { checkedAt: 1 },
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

  it('rejects an apparently solved save with no edits or help, even with an empty Undo ring', () => {
    const forged = { ...fillDraft(), edits: 0, undo: [], helpUsed: false };
    expect(isCrosswordComplete(puzzle, forged)).toBe(true);
    expect(decodeCrosswordSave(puzzle, encodeCrosswordSave(puzzle, forged))).toBeNull();
    expect(CROSSWORD_SAVE_CAP).toBe(3200);
  });

  it('refuses malformed grids before starting a session', () => {
    const good = STARTER_CROSSWORD_DEFINITIONS[0];
    expect(() => indexCrossword({ ...good, rows: ['ABC', 'DEF', 'G#I'] })).toThrow();
    expect(() => indexCrossword({ ...good, rows: ['ABC', 'DEF', 'AB#'] })).toThrow();
    expect(() => indexCrossword({ ...good, rows: ['ABC', 'ABC', 'ABC'] })).toThrow();
    expect(() => indexCrossword({ ...good, clues: {} })).toThrow();
  });
});
