import React, { createContext } from 'react';
import { readFileSync } from 'node:fs';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodePuzzle, type LatinPuzzle } from '../src/puzzles/latin/core';
import { latinRungs } from '../src/puzzles/latin/rungs';
import { grade, planHint, techniques, type Step } from '../src/puzzles/latin/solver';
import { chainMarks, cueFor, explainStep, techniqueName, techniqueNames } from '../src/puzzles/latin/teach';
import { cellClueWords, clueWords } from '../src/puzzles/latin/clues';
import { LatinBoard, rulesFor } from '../src/puzzles/latin/LatinBoard';
import { freshPayload, viewOf } from '../src/puzzles/latin/registration';
import { GridPreferences } from '../src/puzzles/grid/preferences';

vi.mock('react-native', () => ({ AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) }, View: 'div', TextInput: 'input', Pressable: 'button', Platform: { OS: 'ios' }, useWindowDimensions: () => ({ width: 393, height: 852 }), PanResponder: { create: (handlers: unknown) => ({ panHandlers: handlers }) } }));
vi.mock('react-native-reanimated', async () => { const { useRef } = await import('react'); return { default: { View: 'animated' }, useAnimatedStyle: (fn: () => unknown) => fn(), useSharedValue: (value: number) => useRef({ value, get() { return this.value; }, set(n: number) { this.value = n; } }).current }; });
vi.mock('react-native-svg', () => ({ default: 'svg', Path: 'path' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Copy: 'p', Heading: 'h2', C: {}, styles: {} }));
vi.mock('../src/components/Text', () => ({ Text: 'span' }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play() {} }) }));

const corpus = JSON.parse(readFileSync('tests/fixtures/latin-sudoku-corpus.json', 'utf8')) as [string, number, string, string][];
const blank = (kind: LatinPuzzle['kind'], n: number, box = 0): LatinPuzzle => ({ kind, size: n, box, givens: Array<number>(n * n).fill(0), cages: [], less: [], sights: [], mask: Array<number>(n * n).fill(0) });
const sudokuOf = (n: number, text: string): LatinPuzzle => ({ ...blank('sudoku', n, n === 9 ? 3 : 2), givens: [...text].map(Number) });
/** A small Cage Math board: two-square cages across each row. */
const cages4: LatinPuzzle = { ...blank('cage-math', 4), cages: [{ cells: [0, 1], op: '+', target: 3 }, { cells: [2, 3], op: '+', target: 7 }, { cells: [4, 8], op: '-', target: 1 }, { cells: [5, 6], op: '*', target: 12 }, { cells: [7], op: '=', target: 1 }, { cells: [9, 10, 11], op: '+', target: 7 }, { cells: [12, 13], op: '/', target: 2 }, { cells: [14, 15], op: '+', target: 5 }] };
const text = (screen: ReactTestRenderer) => JSON.stringify(screen.toJSON());
const labels = (screen: ReactTestRenderer) => screen.root.findAllByType('button').map(b => b.props.accessibilityLabel as string).filter(l => typeof l === 'string' && l.startsWith('Row '));
async function board(p: LatinPuzzle, values?: number[], mistakes: 'Friendly' | 'Plain' = 'Friendly', teaches = '', helps = 0) {
  const payload = freshPayload(p), view = viewOf(p, payload, 'Test 1', teaches)!;
  if (values) view.state = { ...view.state, values };
  const tree = (h: number) => <GridPreferences.Provider value={{ mistakes, band: 1, reader: 'Growing', fillNotes: false } as never}><LatinBoard view={{ ...view, helps: h }} dispatch={() => {}} active width={353}/></GridPreferences.Provider>;
  let screen!: ReactTestRenderer;
  await act(async () => { screen = create(tree(helps)); });
  return Object.assign(screen, { helped: () => act(async () => { screen.update(tree(helps + 1)); }) });
}
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('colour-chain hints explain the deduction they made (review R6)', () => {
  const chains = corpus.filter(r => r[3] === 'simple-coloring').flatMap(r => { const p = sudokuOf(r[1], r[2]); return grade(p).steps.filter(s => s.technique === 'simple-coloring').map(s => ({ p, s })); });
  it('the grader marks both kinds, with the colours it reasoned from', () => {
    const wrap = chains.filter(c => c.s.chain?.kind === 'wrap'), trap = chains.filter(c => c.s.chain?.kind === 'trap');
    expect(wrap.length).toBeGreaterThan(0); expect(trap.length).toBeGreaterThan(0);
    for (const { s } of wrap) { const [dots] = s.chain!.colours; expect(s.remove.every(([i]) => dots.includes(i))).toBe(true); }
    for (const { s } of trap) { const [dots, rings] = s.chain!.colours; expect(s.remove.every(([i]) => !dots.includes(i) && !rings.includes(i))).toBe(true); }
  });
  it('a wrap says one colour sees itself; a trap says a square sees both', () => {
    const wrap = chains.find(c => c.s.chain?.kind === 'wrap')!, trap = chains.find(c => c.s.chain?.kind === 'trap')!;
    const w = explainStep(wrap.p, wrap.s).think, t = explainStep(trap.p, trap.s).think;
    // A wrap names the two dots that see each other; a trap names the squares that see both marks.
    const [x, y] = wrap.s.chain!.proof;
    expect(w).toContain(`The dots at row ${Math.floor(x / 9) + 1}, column ${x % 9 + 1} and row ${Math.floor(y / 9) + 1}, column ${y % 9 + 1} see each other`); expect(w).not.toMatch(/both a dot and a ring/);
    expect(wrap.s.chain!.colours[0]).toEqual(expect.arrayContaining([x, y]));
    expect(t).toMatch(/(sees|each see) both a dot and a ring/);
    expect(trap.s.chain!.proof).toEqual(trap.s.remove.map(([i]) => i));
    for (const { s } of chains) expect(s.chain!.links.every(([a, b]) => [...s.chain!.colours[0], ...s.chain!.colours[1]].includes(a) && s.focus.includes(b))).toBe(true);
    expect(explainStep(wrap.p, wrap.s).look).toContain(`dots ${chainMarks[0]} and rings ${chainMarks[1]}`);
  });
  it('the board shows the two colours as dots and rings a screen reader can hear', async () => {
    const { p, s } = chains.find(c => c.s.chain?.kind === 'wrap')!;
    // Walk the public hint plan until its key step is this kind of chain.
    let values = [...p.givens], cue = cueFor(p, planHint(p, values));
    for (let i = 0; i < 81 && !cue.marks; i++) { const plan = planHint(p, values); if (plan.kind !== 'place') break; values = values.map((v, j) => j === plan.cell ? plan.value : v); cue = cueFor(p, planHint(p, values)); }
    expect(cue.marks, `${s.technique}`).toBeDefined();
    const screen = await board(p, values);
    try {
      await act(async () => { (screen.root.findAllByType('button').find(b => b.props.label === 'Hint: where should I look?')!.props.onPress as () => void)(); });
      // The cue opens once its help record is accepted, which the board sees as a higher help count.
      await screen.helped();
      expect(text(screen)).toContain(`dots ${chainMarks[0]} and rings ${chainMarks[1]}`);
      const all = labels(screen);
      expect(all.filter(l => l.endsWith(', chain dot')).length).toBe(cue.marks![0].length);
      expect(all.filter(l => l.endsWith(', chain ring')).length).toBe(cue.marks![1].length);
      await act(async () => { (screen.root.findAllByType('button').find(b => b.children.includes('Why?'))!.props.onPress as () => void)(); });
      expect(text(screen)).toContain(cue.think.slice(0, 40));
      expect(cue.think).toMatch(/The dots at .* see each other/);
      // The Why step rings the two dots it names and joins them with a dashed line.
      const paths = screen.root.findAllByType('path');
      expect(paths.some(n => ((n.props.d as string)?.match(/a/g) ?? []).length === 4)).toBe(true);
      expect(paths.some(n => !!n.props.strokeDasharray && (n.props.d as string)?.split('M').length === 2)).toBe(true);
      // The chain's links are drawn: one line per linked pair.
      expect(cue.links!.length).toBeGreaterThan(1);
      expect(screen.root.findAllByType('path').some(n => (n.props.d as string)?.split('M').length - 1 === cue.links!.length)).toBe(true);
    } finally { await act(async () => screen.unmount()); }
  });
});

describe('a colour trap rules out the candidate it removes (review 2, F3)', () => {
  const traps = corpus.filter(r => r[3] === 'simple-coloring').flatMap(r => { const p = sudokuOf(r[1], r[2]); return grade(p).steps.filter(s => s.chain?.kind === 'trap').map(s => ({ p, s })); });
  it('one proof square "cannot be" the number; several "none of them can be" it', () => {
    const one = traps.find(t => t.s.chain!.proof.length === 1)!;
    const [i] = one.s.chain!.proof, v = one.s.digits[0], at = `Row ${Math.floor(i / 9) + 1}, column ${i % 9 + 1}`;
    expect(explainStep(one.p, one.s).think).toContain(`${at} sees both a dot and a ring, so it cannot be ${v}.`);
    // A trap proved by two squares (the same chain, with a second outside square named).
    const two: Step = { ...one.s, chain: { ...one.s.chain!, proof: [i, i === 0 ? 1 : 0] } };
    expect(explainStep(one.p, two).think).toMatch(new RegExp(`each see both a dot and a ring, so none of them can be ${v}\\.$`));
    for (const { p, s } of traps) {
      const t = explainStep(p, s).think;
      expect(t).toMatch(new RegExp(`so (it cannot|none of them can) be ${s.digits[0]}\\.$`));
      expect(t).not.toMatch(/so it can be/);
    }
  });
  it('the reviewer\'s Trench 8 board: Why says row 8, column 1 cannot be 4', async () => {
    const lines = readFileSync('src/content/puzzles/assets/p47.lipuzzle', 'utf8').trim().split('\n');
    const p = decodePuzzle(JSON.parse(lines[8])[3])!;
    // After 28 hinted placements on Trench 8 (bank 47, index 7).
    const values = [...'381972645267451839549800271003007508070590312005308704030209150052000980916785423'].map(Number);
    const plan = planHint(p, values);
    if (plan.kind !== 'place') throw new Error('expected a placement');
    expect(plan.steps.at(-1)!.chain!.kind).toBe('trap');
    expect(plan.steps.at(-1)!.remove).toEqual([[63, 8]]); // candidate 4's bit at row 8, column 1
    expect([plan.cell, plan.value]).toEqual([63, 7]);
    const screen = await board(p, values);
    try {
      await act(async () => { (screen.root.findAllByType('button').find(b => b.props.label === 'Hint: where should I look?')!.props.onPress as () => void)(); });
      await screen.helped();
      await act(async () => { (screen.root.findAllByType('button').find(b => b.children.includes('Why?'))!.props.onPress as () => void)(); });
      expect(text(screen)).toContain('Row 8, column 1 sees both a dot and a ring, so it cannot be 4.');
      expect(text(screen)).not.toContain('so it can be 4');
    } finally { await act(async () => screen.unmount()); }
  });
});

describe('cage clues reach a screen reader with their squares (review R7)', () => {
  it('every cage square names its cage rule and the other squares in it', async () => {
    const words = cellClueWords(cages4);
    expect(words(0)).toBe('in a cage that adds to 3 with row 1 column 2');
    expect(words(9)).toBe('in a cage that adds to 7 with row 3 column 3 and row 3 column 4');
    expect(words(12)).toBe('in a cage that has one number 2 times the other with row 4 column 2');
    expect(words(7)).toBe('in a one-square cage that holds 1');
    const screen = await board(cages4);
    try {
      const all = labels(screen);
      expect(all[0]).toBe('Row 1, column 1, empty, in a cage that adds to 3 with row 1 column 2');
      expect(all.every(l => /cage/.test(l))).toBe(true);
    } finally { await act(async () => screen.unmount()); }
  });
  it('the summary lists every cage with its rule and squares', () => {
    const summary = clueWords(cages4);
    expect(summary).toContain('8 cages.');
    expect(summary).toContain('A cage of 2 squares that multiplies to 12: row 2 column 2 and row 2 column 3.');
  });
  it('arrow squares say what they are smaller or bigger than', () => {
    const p = { ...blank('greater-than', 4), less: [[0, 1], [5, 1]] as [number, number][] };
    expect(cellClueWords(p)(1)).toBe('bigger than row 1 column 1 and bigger than row 2 column 2');
    expect(cellClueWords(p)(0)).toBe('smaller than row 1 column 2');
  });
});

describe('clash hints fit the rule and the clash setting (review R8)', () => {
  const sudoku = sudokuOf(4, corpus.find(r => r[1] === 4)![2]);
  it('never points at red squares, and names the repeated number', async () => {
    const empty = sudoku.givens.findIndex(v => !v), peer = sudoku.givens.findIndex((v, i) => v && Math.floor(i / 4) === Math.floor(empty / 4));
    const values = sudoku.givens.map((v, i) => i === empty ? sudoku.givens[peer] : v), cue = cueFor(sudoku, planHint(sudoku, values));
    expect(cue.technique).toBe('clash');
    expect(cue.look).toBe('Look at the gold squares.');
    expect(cue.think).toMatch(new RegExp(`${sudoku.givens[peer]} is in (row|column|the .*box) \\d* ?twice`));
    expect(cue.focus).toContain(empty);
    // With clashes hidden, the board marks no square as a conflict, and the hint does not mention red.
    const screen = await board(sudoku, values, 'Plain');
    try {
      expect(screen.root.findAllByType('button').some(b => b.props.label === 'Show clashes off')).toBe(true);
      expect(labels(screen).some(l => l.includes('conflict'))).toBe(false);
      expect(`${cue.look} ${cue.think}`).not.toMatch(/red/i);
    } finally { await act(async () => screen.unmount()); }
  });
  it('a cage, an arrow and a roof line each get their own reason', () => {
    const cage = { ...blank('cage-math', 2), cages: [{ cells: [0, 1], op: '+' as const, target: 4 }, { cells: [2, 3], op: '+' as const, target: 3 }] };
    expect(cueFor(cage, planHint(cage, [1, 2, 2, 1])).think).toMatch(/must add up to 4/);
    const less = { ...blank('greater-than', 2), less: [[0, 1]] as [number, number][] };
    expect(cueFor(less, planHint(less, [2, 1, 1, 2])).think).toMatch(/arrow points at the smaller number/);
    const sky = { ...blank('skyline', 2), sights: [[0, 2]] as [number, number][] };
    expect(cueFor(sky, planHint(sky, [2, 1, 1, 2])).think).toMatch(/exactly 2 roofs/);
  });
});

describe('beginner instructions state the rules (review R9)', () => {
  it('Sudoku says what makes a board right, for its own size', () => {
    expect(rulesFor(sudokuOf(4, '0'.repeat(16)))).toMatch(/each row, each column and each 2×2 box has the numbers 1 to 4, each one once/i);
    expect(rulesFor(sudokuOf(6, '0'.repeat(36)))).toMatch(/box of 2 rows by 3 columns has the numbers 1 to 6/);
    expect(rulesFor(sudokuOf(9, '0'.repeat(81)))).toMatch(/3×3 box has the numbers 1 to 9/);
  });
  it('Skyline and every other game state the no-repeat rule', () => {
    for (const kind of ['skyline', 'greater-than', 'cage-math', 'killer'] as const) expect(rulesFor(blank(kind, 4, kind === 'killer' ? 2 : 0))).toMatch(/1 to 4, each one once/);
    expect(rulesFor(blank('skyline', 4))).toMatch(/roofs you can see/);
  });
  it('Sprout offers How to play', async () => {
    const screen = await board(sudokuOf(4, corpus.find(r => r[1] === 4)![2]));
    try { expect(text(screen)).toContain('How to play'); } finally { await act(async () => screen.unmount()); }
  });
});

describe('technique ids are never shown to children (lead rule)', () => {
  const step = (technique: Step['technique']): Step => ({ technique, focus: [0, 1], groups: [{ kind: 'row', index: 0, cells: [0, 1, 2, 3] }, { kind: 'column', index: 0, cells: [0, 4, 8, 12] }], digits: [1, 2, 3], remove: [] });
  const shown = [
    ...Object.values(techniqueNames),
    ...techniques.flatMap(t => { const e = explainStep(sudokuOf(4, '0'.repeat(16)), step(t)); return [e.look, e.think]; }),
    ...Object.values(latinRungs).flat().flatMap(r => [r.title, r.summary]),
    ...(['sudoku', 'cage-math', 'greater-than', 'skyline', 'killer'] as const).map(k => rulesFor(blank(k, 4, k === 'sudoku' || k === 'killer' ? 2 : 0))),
  ];
  it('no displayed name, hint or rung text says "naked"', () => {
    for (const line of shown) expect(line).not.toMatch(/naked/i);
    expect(techniqueName('naked-pair')).toBe('A matching pair');
    expect(techniqueName('naked-triple')).toBe('A matching triple');
    expect(techniqueName('some-future-id')).toBe('');
  });
  it('the board header names the skill in words', async () => {
    const screen = await board(sudokuOf(4, corpus.find(r => r[1] === 4)![2]), undefined, 'Friendly', 'naked-pair');
    try { expect(text(screen)).toContain('A matching pair'); expect(text(screen)).not.toMatch(/naked/i); } finally { await act(async () => screen.unmount()); }
  });
});
