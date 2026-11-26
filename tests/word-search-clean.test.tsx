import React, { createContext, useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { WordSearchBoard } from '../src/puzzles/words/WordSearchBoard';
import { searchEngine } from '../src/puzzles/words/game';
import * as core from '../src/puzzles/words/core';
import { defineWordSearch } from '../src/puzzles/words/registration';
import { measureSearchBank } from '../src/puzzles/words/tiers';
import { emptyChallenge } from '../src/state/challenge';
import fixture from './fixtures/word-search/bank.json';
import { fixturePuzzles } from './fixtures/word-search/registration';
const env = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 1, reader: false, pictured: new Set<string>(), failPictures: false }));
vi.mock('react-native', () => ({ AccessibilityInfo: { isScreenReaderEnabled: async () => env.reader, addEventListener: () => ({ remove() {} }), announceForAccessibility: () => {} }, ScrollView: 'scroll', View: 'view', TextInput: 'input', Platform: { OS: 'ios' }, useWindowDimensions: () => env }));
vi.mock('react-native-svg', () => ({ default: 'svg', Circle: 'circle', Line: 'line', SvgXml: 'picture' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Copy: 'copy', Heading: 'heading', C: {} }));
vi.mock('../src/components/Text', () => ({ Text: 'text' }));
vi.mock('../src/components/Audio', () => ({ useSoundControls: () => ({ play: () => true }) }));
vi.mock('../src/puzzles/words/picture-context', () => ({ SearchPicturesContext: createContext({ idFor: (spelling: string) => env.pictured.has(spelling) ? spelling.toLowerCase() : undefined, load: async () => { if (env.failPictures) throw Error('offline'); return '<svg/>'; } }) }));
let screen: ReactTestRenderer;
const p = fixture.puzzles[0] as core.SearchPuzzle, crab = p.words[0], hintColor = '#B7791F';
const initial = (puzzle = p) => searchEngine.create(puzzle, { version: 1 }, { ownRead: false, supportOff: false });
const mount = async (props: Partial<React.ComponentProps<typeof WordSearchBoard>> = {}) => {
  const dispatch = vi.fn();
  await act(async () => { screen = create(<WordSearchBoard state={initial()} dispatch={dispatch} active width={353} {...props} />, { createNodeMock: () => ({ focus() {}, blur() {}, clear() {}, measureInWindow: () => {} }) }); });
  return dispatch;
};
/** A board wired to the real engine, so what it shows is what the engine accepted. */
const mountLive = async (props: Partial<React.ComponentProps<typeof WordSearchBoard>> = {}) => {
  const log: Parameters<typeof searchEngine.step>[1][] = [];
  let engine = (props.state ?? initial()) as ReturnType<typeof initial>;
  function Live() {
    const [state, setState] = useState(engine);
    return <WordSearchBoard {...props} state={state} dispatch={a => { const next = searchEngine.step(engine, a, p); if (!next) return; log.push(a); engine = next.state; setState(next.state); }} active width={353} />;
  }
  await act(async () => { screen = create(<Live />, { createNodeMock: () => ({ focus() {}, blur() {}, clear() {}, measureInWindow: () => {} }) }); });
  return { log, state: () => engine };
};
const surface = () => screen.root.findAll(n => !!n.props.onResponderGrant)[0];
const size = () => (surface().props.style.width - 2) / 6;
const touch = (x: number, y: number, id = 0) => ({ nativeEvent: { changedTouches: [{ identifier: id, locationX: x, locationY: y }] } });
const center = (i: number) => touch((i % 6 + .5) * size(), (Math.floor(i / 6) + .5) * size());
const drag = async (from: number, to: number) => {
  await act(async () => surface().props.onResponderGrant(center(from)));
  await act(async () => surface().props.onResponderMove(center(to)));
  await act(async () => surface().props.onResponderRelease(center(to)));
};
const press = async (label: string) => act(async () => { const b = screen.root.findAllByType('button').find(n => n.children.includes(label)); expect(b, label).toBeDefined(); b!.props.onPress(); });
const statusText = () => screen.root.findAll(n => n.props.accessibilityLiveRegion === 'polite')[0].children.join('');
const texts = () => screen.root.findAll(n => ['copy', 'heading'].includes(n.type as string)).flatMap(n => n.children.filter(c => typeof c === 'string') as string[]);
const hintRings = () => screen.root.findAllByType('circle' as React.ElementType).filter(n => n.props.stroke === hintColor);
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); env.width = 393; env.height = 852; env.fontScale = 1; env.reader = false; env.pictured = new Set(); env.failPictures = false; });
afterEach(async () => { if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); });

describe('clean board: no paragraphs, plain words', () => {
  it('shows only short labels, with no instruction or jargon sentences', async () => {
    await mount();
    for (const line of texts()) expect(line.length, line).toBeLessThanOrEqual(24);
    const all = JSON.stringify(screen.toJSON());
    for (const old of ['Drag or tap', 'straight line', 'Choose your hunter', 'Take turns', 'Teaching spelling', 'Help · find one word', 'Cancel first letter']) expect(all).not.toContain(old);
    expect(texts()).toContain('0 of 4');
    expect(screen.root.findAllByType('button').map(b => b.children.join(''))).toEqual(expect.arrayContaining(['Undo', 'Redo', 'Hint']));
  });
  it('keeps every control at least 48 points tall', async () => {
    await mount();
    for (const b of screen.root.findAllByType('button').filter(n => ['Undo', 'Redo', 'Hint'].includes(n.children.join('')))) expect(b.props.style.minHeight).toBeGreaterThanOrEqual(48);
  });
  it('crosses a found word off its pill and shows a bolder trail', async () => {
    await mount({ state: searchEngine.step(initial(), ['find', crab.cells[0], crab.cells.at(-1)!, 0], p)!.state });
    const answer = screen.root.findAllByProps({ testID: 'search-answer' })[0];
    expect(answer.props.style.textDecorationLine).toBe('line-through');
    expect(texts()).toContain('1 of 4');
    expect(screen.root.findAllByType('line' as React.ElementType).some(l => l.props.strokeLinecap === 'round' && l.props.opacity >= .3)).toBe(true);
  });
});

describe('forgiving drag-snap', () => {
  it('finds the word when the drag ends one cell short or one cell long, in the word\'s own direction', async () => {
    const dispatch = await mount(), [start, end] = [crab.cells[0], crab.cells.at(-1)!];
    await drag(start, crab.cells[2]);
    expect(dispatch).toHaveBeenLastCalledWith(['find-many', [[start, end, 0]]]);
    dispatch.mockClear();
    await drag(start, 0);
    expect(dispatch).toHaveBeenLastCalledWith(['find-many', [[start, end, 0]]]);
  });
  it('does not guess when the drag is two cells off, the wrong way, or starts mid-word', async () => {
    const dispatch = await mount();
    await drag(crab.cells[0], crab.cells[1]);
    await drag(crab.cells[0], crab.cells[0] - 1);
    await drag(crab.cells[1], crab.cells[3]);
    expect(dispatch).not.toHaveBeenCalled();
    expect(statusText()).toBe('Not a word. Try again.');
  });
  it('accepts either end first, and a repeated drag over a found word is not a second find', async () => {
    const [start, end] = [crab.cells[0], crab.cells.at(-1)!], dispatch = await mount();
    await drag(end, start);
    expect(dispatch).toHaveBeenLastCalledWith(['find-many', [[end, start, 0]]]);
    dispatch.mockClear();
    await act(async () => screen.update(<WordSearchBoard state={searchEngine.step(initial(), ['find', end, start, 0], p)!.state} dispatch={dispatch} active width={353} />));
    await drag(start, end);
    expect(dispatch).not.toHaveBeenCalled();
    expect(statusText()).toBe('Already found.');
  });
  it('snaps diagonal drags in both slants (pure rule, all eight directions)', () => {
    for (let i = 0; i < 8; i++) {
      const q = fixture.puzzles[i + 1] as core.SearchPuzzle, w = q.words[0], cols = q.cells[0].length, dir = core.directions[i];
      const short = core.snapWord(q, [], w.cells[0], dir, w.cells.length - 1), long = core.snapWord(q, [], w.cells[0], dir, w.cells.length + 1);
      expect(short?.end, `short ${i}`).toBe(w.cells.at(-1));
      expect(long?.end, `long ${i}`).toBe(w.cells.at(-1));
      expect(core.snapWord(q, [], w.cells[0], dir, w.cells.length - 2)).toBeNull();
      expect(core.snapWord(q, [[0, 0]], w.cells[0], dir, w.cells.length)).toBeNull();
      expect(core.snapWord(q, [], w.cells[0], null, w.cells.length)).toBeNull();
      expect(cols).toBeGreaterThan(1);
    }
  });
});

describe('Hint reveals public information first, and every reveal is recorded as help', () => {
  const ranges = () => hintRings().map(n => [n.props.cx, n.props.cy]);
  const atCell = (cell: number) => [(cell % 6 + .5) * size(), (Math.floor(cell / 6) + .5) * size()];
  const hintLines = () => screen.root.findAllByType('line' as React.ElementType).filter(l => l.props.stroke === hintColor);
  it('1st press rings the first letter, 2nd adds the way it runs, 3rd finds the word; each press goes through the engine', async () => {
    const live = await mountLive();
    await press('Hint');
    expect(live.log).toEqual([['hint']]); expect(live.state().helped).toBe(true);
    expect(ranges()).toEqual([atCell(crab.cells[0])]); expect(statusText()).toBe('It starts here.'); expect(hintLines()).toHaveLength(0);
    await press('More hint');
    expect(live.log).toEqual([['hint'], ['hint']]);
    expect(statusText()).toBe('It starts here and goes up and left.'); expect(hintLines()).toHaveLength(1);
    await press('Show word');
    expect(live.log).toEqual([['hint'], ['hint'], ['help']]); expect(live.state().found).toEqual([[0, 0]]);
    expect(hintRings()).toHaveLength(0);
  });
  it('shows nothing from the answer until the engine has accepted the help record', async () => {
    const dispatch = await mount();
    await press('Hint');
    expect(dispatch).toHaveBeenCalledWith(['hint']); expect(hintRings()).toHaveLength(0); expect(statusText()).toBe('0 of 4');
  });
  it('never spells an unfound word in the hint text, even when the list is hidden', async () => {
    await mountLive({ state: initial({ ...p, list: 'hidden' }) });
    await press('Hint'); await press('More hint');
    const all = JSON.stringify(screen.toJSON());
    for (const w of p.words) expect(all).not.toContain(w.spelling);
  });
  it('aims at the first word still hidden and starts over for the next one', async () => {
    const live = await mountLive({ state: searchEngine.step(initial(), ['find', crab.cells[0], crab.cells.at(-1)!, 0], p)!.state });
    await press('Hint');
    expect(ranges()).toEqual([atCell(p.words[1].cells[0])]);
    await press('More hint'); await press('Show word');
    expect(live.state().found.map(([i]) => i)).toEqual([0, 1]);
    expect(hintRings()).toHaveLength(0);
    expect(screen.root.findAllByType('button').some(b => b.children.includes('Hint'))).toBe(true);
    await press('Hint');
    expect(ranges()).toEqual([atCell(p.words[2].cells[0])]);
  });
  it('drives the cue from engine state through Undo and Redo, never from stale local state', async () => {
    const live = await mountLive({ state: searchEngine.step(initial(), ['find', crab.cells[0], crab.cells.at(-1)!, 0], p)!.state });
    await press('Hint');
    expect(ranges()).toEqual([atCell(p.words[1].cells[0])]);
    await press('Undo');
    expect(live.state().found).toEqual([]); expect(hintRings()).toHaveLength(0);
    await press('Redo');
    expect(live.state().found).toEqual([[0, 0]]);
    // What the engine recorded is what is drawn: Hint level 1 was granted for word 1, so its ring is still earned.
    expect(live.state().hints[1]).toBe(1); expect(ranges()).toEqual([atCell(p.words[1].cells[0])]);
    expect(screen.root.findAllByType('button').some(b => b.children.includes('More hint'))).toBe(true);
  });
  it('is off once every word is found', async () => {
    let done = initial(); for (const w of p.words) done = searchEngine.step(done, ['find', w.cells[0], w.cells.at(-1)!, 0], p)!.state;
    await mount({ state: done });
    expect(screen.root.findAllByType('button').find(b => b.children.includes('Hint'))!.props.disabled).toBe(true);
    expect(texts()).toContain('All found!');
  });
  it('matches the pure engine: the ring is on the word the full help would reveal', () => {
    const state = initial(), hint = core.hintFor(p, state.found, 2)!, revealed = searchEngine.step(state, ['help'], p)!.state;
    expect(p.words[hint.word].cells[0]).toBe(hint.cell); expect(revealed.found[0][0]).toBe(hint.word);
    expect(core.hintFor(p, p.words.map((_, i) => [i, 0] as [number, number]), 1)).toBeNull();
    expect(core.directionName([-1, 1])).toBe('up and right'); expect(core.directionName([0, -1])).toBe('left'); expect(core.directionName([1, 0])).toBe('down');
  });
});

describe('Hint ring and direction are help in the engine', () => {
  const clean = { ...fixturePuzzles[0], dares: [{ slot: 1500, id: 'synthetic-clean', label: 'Clean', rule: { kind: 'clean' as const }, help: 'independent' as const }] };
  const entry = defineWordSearch([], [clean]);
  const finishAll = (s: ReturnType<typeof entry.start>) => { for (const w of p.words) s = entry.move(s, ['find', w.cells[0], w.cells.at(-1), 0]) ?? s; return s; };
  const start = (tag: string) => entry.start(clean.ref, 'family', tag, emptyChallenge(), { ownRead: false, supportOff: false }, [1500]);
  it('a Level 1 ring marks the round helped, so it cannot finish independent or earn the clean dare', () => {
    const control = finishAll(start('control'));
    expect(control.result?.event).toBe('independent'); expect(control.result?.dares).toEqual([1500]);
    const ringed = entry.move(start('ring'), ['hint'])!;
    expect(ringed).not.toBeNull();
    const done = finishAll(ringed);
    expect(done.result?.event).toBe('helped'); expect(done.result?.dares).toEqual([]);
  });
  it('Level 2 direction and Level 3 show word work through engine state', () => {
    let s = start('ladder'); for (const a of [['hint'], ['hint']]) s = entry.move(s, a)!;
    expect(entry.move(s, ['hint'])).toBeNull();
    s = entry.move(s, ['help'])!; expect(s).not.toBeNull();
    const state = searchEngine.create(p, { version: 1 }, { ownRead: false, supportOff: false });
    const one = searchEngine.step(state, ['hint'], p)!, two = searchEngine.step(one.state, ['hint'], p)!;
    expect([one.event, two.event]).toEqual(['help', 'help']);
    expect(core.hintFor(p, two.state.found, two.state.hints[0] as 1 | 2)?.next).toBe(p.words[0].cells[1]);
    expect(searchEngine.step(two.state, ['hint'], p)).toBeNull();
    expect(searchEngine.step(two.state, ['help'], p)!.state.found).toEqual([[0, 0]]);
  });
  it('the full ladder still fits after ordinary play has used everything it may', () => {
    let s = start('reserve');
    for (let n = 0; n < 600; n++) { const next = entry.move(s, ['find', crab.cells[0], crab.cells.at(-1), 0]) && entry.move(entry.move(s, ['find', crab.cells[0], crab.cells.at(-1), 0])!, ['undo']); if (!next) break; s = next; }
    for (const w of p.words) { if (entry.move(s, ['find', w.cells[0], w.cells.at(-1), 0]) === null) break; }
    let rounds = 0;
    while (!s.result && rounds++ < 20) { const hinted = entry.move(s, ['hint']); if (hinted) { s = hinted; continue; } s = entry.move(s, ['help'])!; expect(s).not.toBeNull(); }
    expect(s.result?.event).toBe('helped'); expect((s.payload as { actions: unknown[] }).actions.length).toBeLessThanOrEqual(512);
  });
  it('keeps saved logs without hints loading and playing unchanged', () => {
    const state = searchEngine.create(p, { version: 1 }, { ownRead: false, supportOff: false });
    expect(state.hints).toEqual(p.words.map(() => 0));
    expect(searchEngine.validAction(['help'])).toBe(true); expect(searchEngine.validAction(['hint'])).toBe(true); expect(searchEngine.validAction(['hint', 1])).toBe(false);
  });
});

describe('status line', () => {
  const statusNode = () => screen.root.findAll(n => n.props.accessibilityLiveRegion === 'polite')[0];
  it('wraps instead of clipping: a minimum height, never a fixed one, on every layout', async () => {
    for (const fontScale of [1, 1.35]) {
      env.fontScale = fontScale; env.width = 393;
      await mount();
      const node = statusNode();
      expect(node.props.style.height).toBeUndefined(); expect(node.props.style.minHeight).toBe(33); expect(node.props.numberOfLines).toBeUndefined();
      await act(async () => screen.unmount());
    }
  });
  it('clears an old notice on Undo and Redo so the count shows again', async () => {
    const live = await mountLive({ state: searchEngine.step(initial(), ['find', crab.cells[0], crab.cells.at(-1)!, 0], p)!.state });
    await drag(p.words[1].cells[0], p.words[1].cells[0] === 0 ? 5 : 0);
    expect(statusText()).toBe('Not a word. Try again.');
    await press('Undo'); expect(live.state().found).toEqual([]);
    expect(statusText()).toBe('0 of 4');
    await drag(p.words[1].cells[0], p.words[1].cells[0] === 0 ? 5 : 0);
    expect(statusText()).toBe('Not a word. Try again.');
    await press('Redo'); expect(statusText()).toBe('1 of 4');
  });
});

describe('snapWord ties', () => {
  it('returns null when two unfound words match equally well, instead of guessing', () => {
    const cells = Array.from({ length: 6 }, () => Array(6).fill('A')), row = (n: number) => Array.from({ length: n }, (_, i) => i);
    const tie = { ...p, cells, words: [{ id: 'a', spelling: 'AAA', cells: row(3), audio: null }, { id: 'b', spelling: 'AAAAA', cells: row(5), audio: null }] } as core.SearchPuzzle;
    expect(core.snapWord(tie, [], 0, [0, 1], 4)).toBeNull();
    expect(core.snapWord(tie, [], 0, [0, 1], 3)).toEqual({ word: 0, end: 2 });
    expect(core.snapWord(tie, [], 0, [0, 1], 6)?.word).toBe(1);
  });
});

describe('bank descriptions', () => {
  const bank = (extra: object) => ({ slot: 81, first: 0, count: 1, packHash: 'a'.repeat(64), rules: 1, band: 'shallows', title: 'Shallows', tier: 2 as const, ...extra });
  const describeBank = (b: ReturnType<typeof bank>) => (defineWordSearch([b]).packed as unknown as { describe: (slot: number) => unknown }).describe(b.slot);
  it('uses the real baked size and directions when the bank records them', () => {
    expect(describeBank(bank({ size: 9, directionCount: 2 }))).toEqual({ size: '9×9', summary: 'Across and down' });
    expect(describeBank(bank({ size: 16, directionCount: 8, band: 'trench', tier: 6 }))).toEqual({ size: '16×16', summary: 'Every direction' });
  });
  it('falls back to the real W2 bake bands, which differ from the starter tiers', () => {
    const expected: [string, number, number, string][] = [['paddling', 1, 6, 'Across and down'], ['shallows', 2, 8, 'Across, down and slanted'], ['lagoon', 3, 10, 'Every direction'], ['reef', 4, 12, 'Every direction'], ['deep', 5, 15, 'Every direction'], ['trench', 6, 16, 'Every direction']];
    for (const [band, tier, size, summary] of expected) expect(describeBank(bank({ band, tier }))).toEqual({ size: `${size}×${size}`, summary });
  });
  it('measures a baked set from its cells and answers', () => {
    const grid = Array.from({ length: 8 }, () => Array(8).fill('A')), word = (a: number, b: number) => ({ cells: [a, b] });
    expect(measureSearchBank([{ cells: grid, words: [word(0, 1), word(0, 8)] }])).toEqual({ size: 8, directionCount: 2 });
    expect(measureSearchBank([{ cells: grid, words: [word(0, 1), word(1, 8)] }])).toEqual({ size: 8, directionCount: 4 });
    expect(measureSearchBank([{ cells: grid, words: [word(0, 9), word(2, 1)] }])).toEqual({ size: 8, directionCount: 8 });
    expect(measureSearchBank([{ cells: grid, words: [word(1, 0)] }])).toEqual({ size: 8, directionCount: 8 });
  });
  it('falls back to the plain tier for an unknown band', () => {
    expect(describeBank(bank({ band: 'unknown', tier: 3 }))).toEqual({ size: '12×12', summary: 'Across, down and slanted' });
  });
});

describe('inactive board', () => {
  it('ignores Hint and drags until it is active again', async () => {
    const dispatch = await mount({ active: false });
    await press('Hint'); await drag(crab.cells[0], crab.cells.at(-1)!);
    expect(hintRings()).toHaveLength(0); expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('Undo and resume', () => {
  it('replays any prefix of finds, undo and redo to the same state', () => {
    const actions: Parameters<typeof searchEngine.step>[1][] = [['find', p.words[0].cells[0], p.words[0].cells.at(-1)!, 0], ['find', p.words[1].cells[0], p.words[1].cells.at(-1)!, 1], ['undo'], ['redo'], ['undo'], ['undo'], ['redo']];
    let live = initial();
    for (const a of actions) { const next = searchEngine.step(live, a, p); if (next) live = next.state; }
    let replay = initial(); for (const a of actions) { const next = searchEngine.step(replay, a, p); if (next) replay = next.state; }
    expect(replay).toEqual(live); expect(live.found).toEqual([[0, 0]]); expect(live.turn).toBe(1);
    expect(searchEngine.step(initial(), ['undo'], p)).toBeNull();
  });
});

describe('two hunters, no score', () => {
  it('on a phone shows whose turn it is as a chip that changes with the trail style', async () => {
    await mount({ together: true });
    const chip = () => screen.root.findByProps({ testID: 'search-turn' });
    expect(texts()).toContain("Green's turn"); expect(chip().props.style.borderStyle).toBe('solid');
    await act(async () => screen.update(<WordSearchBoard state={searchEngine.step(initial(), ['find', crab.cells[0], crab.cells.at(-1)!, 0], p)!.state} dispatch={vi.fn()} active width={353} together />));
    expect(texts()).toContain("Purple's turn"); expect(chip().props.style.borderStyle).toBe('dotted');
  });
  it('on an iPad offers Green and Purple hunters and no turn chip, and never shows points or a winner', async () => {
    env.width = 744; env.height = 1133;
    await mount({ together: true });
    expect(screen.root.findAllByProps({ testID: 'search-turn' })).toHaveLength(0);
    const hunters = screen.root.findAllByType('button').filter(b => ['Green', 'Purple'].includes(b.children.join('')));
    expect(hunters.map(b => b.props.label)).toEqual(['Green hunter, solid trail', 'Purple hunter, dotted trail']);
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/score|points|winner|\bwins?\b/i);
  });
  it('each trail keeps its own colour: green solid and purple dotted', async () => {
    await mount({ together: true, state: searchEngine.step(searchEngine.step(initial(), ['find', crab.cells[0], crab.cells.at(-1)!, 0], p)!.state, ['find', p.words[1].cells[0], p.words[1].cells.at(-1)!, 1], p)!.state });
    const lines = screen.root.findAllByType('line' as React.ElementType);
    expect(lines.some(l => l.props.stroke === '#28796B' && !l.props.strokeDasharray)).toBe(true);
    expect(lines.some(l => l.props.stroke === '#8A4D81' && l.props.strokeDasharray === '2 5')).toBe(true);
  });
});

describe('picture fallback', () => {
  const label = () => screen.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Picture unavailable')).map(n => n.props.accessibilityLabel);
  it('mentions Hear word only when the word has audio', async () => {
    env.pictured = new Set(['CRAB']); env.failPictures = true;
    const easy = { ...p, list: 'words' as const }, withAudio = { ...easy, words: easy.words.map((w, i) => i === 0 ? { ...w, audio: 'crab' } : { ...w, audio: null }) };
    await mount({ state: initial(withAudio) });
    expect(label()).toEqual(['Picture unavailable. Use Hear word.']);
    await act(async () => screen.unmount());
    await mount({ state: initial({ ...easy, words: easy.words.map(w => ({ ...w, audio: null })) }) });
    expect(label()).toEqual(['Picture unavailable.']);
  });
});

describe('optional picture chips on Easy boards', () => {
  const easy = { ...p, list: 'words' as const };
  it('shows a picture only beside words that have one on a 6×6 board', async () => {
    env.pictured = new Set(['CRAB']);
    await mount({ state: initial(easy) });
    expect(screen.root.findAllByType('picture' as React.ElementType)).toHaveLength(1);
    expect(screen.root.findAll(n => n.props.accessibilityLabel === 'Picture unavailable. Use Hear word.')).toHaveLength(0);
  });
  it('shows none when no word has a picture, and none on larger boards', async () => {
    await mount({ state: initial(easy) });
    expect(screen.root.findAllByType('picture' as React.ElementType)).toHaveLength(0);
    await act(async () => screen.unmount());
    env.pictured = new Set(['CRAB']);
    const big = { ...easy, cells: Array.from({ length: 9 }, () => Array(9).fill('A')) };
    await mount({ state: initial(big) });
    expect(screen.root.findAllByType('picture' as React.ElementType)).toHaveLength(0);
  });
});
