import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { LagoonGrid } from '../src/learn/games/logic-lagoon/grid';
import { engine, taskAt, boardAt, type LatinState } from '../src/learn/games/logic-lagoon/engine';
const dimensions = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 1 }));
vi.mock('react-native', () => ({ View: 'view', useWindowDimensions: () => dimensions }));
vi.mock('../src/learn/games/logic-lagoon/native-grid', () => ({ NativeGrid: (p: { width: number }) => React.createElement('view', { 'data-grid-width': p.width }) }));
vi.mock('react-native-svg', () => ({ default: 'svg', Circle: 'circle', Ellipse: 'ellipse', Path: 'path', Rect: 'rect' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Copy: 'text', PressableScale: 'button', C: {} }));
vi.mock('../src/components/Text', async () => { const { createContext } = await import('react'); return { Text: 'text', TextFit: createContext(null) }; });
let screen: ReactTestRenderer | undefined;
afterEach(async () => { if (screen) await act(async () => screen!.unmount()); screen = undefined; vi.unstubAllGlobals(); Object.assign(dimensions, { width: 393, height: 852, fontScale: 1 }); });
it('a hint waits for accepted assistance; its explanation and Check feedback precede the board', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const state = engine.create({ mode: 'solo', pace: 'easy' }, { rng: () => 17 / 0xffffffff, skills: {}, starter: 0, today: 1 }) as LatinState;
  const task = taskAt(state); if (task.kind !== 'grid') throw new Error();
  const help = vi.fn(), reveal = vi.fn();
  const tree = (assisted: boolean) => <LagoonGrid puzzle={task.puzzle!} state={boardAt(state, task.puzzle!)} assisted={assisted} dispatch={() => {}} help={help} reveal={reveal} check={() => {}} title="PUZZLE 1 OF 4" pictures={task.symbols} active width={337} message="Three squares need a change."/>;
  await act(async () => { screen = create(tree(false)); });
  const button = (s: string) => screen!.root.findAllByType('button').find(b => b.children.join('') === s);
  await act(async () => button('Hint')!.props.onPress());
  expect(help).toHaveBeenCalledOnce(); expect(button('Show me')).toBeUndefined();
  await act(async () => screen!.update(tree(true)));
  expect(button('Show me')).toBeDefined();
  const output = JSON.stringify(screen!.toJSON());
  expect(output.indexOf('Three squares need a change.')).toBeLessThan(output.indexOf('logic-status'));
  expect(output.indexOf('Why?')).toBeLessThan(output.indexOf('logic-status'));
  await act(async () => button('Show me')!.props.onPress()); expect(reveal).toHaveBeenCalledOnce();
});
it('keeps the controls beside the numeric workspace in a short AX5 landscape window', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Object.assign(dimensions, { width: 852, height: 393, fontScale: 3.12 });
  const state = engine.create({ mode: 'solo', pace: 'easy', stage: 'stretch' }, { rng: () => 17 / 0xffffffff, skills: {}, starter: 0, today: 1 }) as LatinState;
  const task = taskAt(state); if (task.kind !== 'grid') throw new Error();
  await act(async () => { screen = create(<LagoonGrid puzzle={task.puzzle!} state={boardAt(state, task.puzzle!)} assisted={false} dispatch={() => {}} help={() => {}} reveal={() => {}} check={() => {}} title="Sum cages" active width={710}/>); });
  expect(screen!.root.findByProps({ testID: 'lagoon-workspace' }).props.style.flexDirection).toBe('row');
  expect(screen!.root.findByProps({ testID: 'lagoon-controls' }).props.style.width).toBe(180);
  expect(screen!.root.findByProps({ 'data-grid-width': 304 })).toBeDefined();
  expect(screen!.root.findByProps({ testID: 'lagoon-numeric-fit' }).props.style).toEqual({ width:304, maxWidth:'100%' });
});

it('picture boards show every rule box and name pictures throughout the hint ladder', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const s = { version: 2 as const, catalog: 1 as const, level: 3, seed: 8, index: 0, total: 4 as const, board: null, helped: false };
  const t = taskAt(s); if (t.kind !== 'grid') throw new Error();
  const { search } = await import('../src/puzzles/latin/solver');
  expect(search(t.puzzle!, 2).count).toBe(1);
  expect(search({ ...t.puzzle!, box: 0 }, 2).count).toBe(2);
  const grid = boardAt(s, t.puzzle!);
  await act(async () => { screen = create(<LagoonGrid puzzle={t.puzzle!} state={grid} assisted dispatch={() => {}} help={() => {}} reveal={() => {}} title="Pictures" active width={337} pictures={t.symbols}/>); });
  const cells = screen!.root.findAllByType('button').filter(n => /^Row /.test(n.props.accessibilityLabel ?? ''));
  expect(cells).toHaveLength(16);
  for (let i = 0; i < cells.length; i++) {
    const st = cells[i].props.style;
    expect(st.borderTopWidth).toBe(i >= 8 && i < 12 ? 3 : 1);
    expect(st.borderLeftWidth).toBe(i % 4 === 2 ? 3 : 1);
    if (i >= 8 && i < 12) expect(st.borderTopColor).toBe('#668A66');
    if (i % 4 === 2) expect(st.borderLeftColor).toBe('#668A66');
    expect(cells[i].props.accessibilityState.selected).toBe(grid.selected === i);
  }
  const button = (text: string) => screen!.root.findAllByType('button').find(n => n.children.join('') === text)!;
  await act(async () => button('Hint').props.onPress());
  await act(async () => button('Why?').props.onPress());
  const output = JSON.stringify(screen!.toJSON());
  expect(output).toContain('picture'); expect(output).not.toMatch(/one number|Each number|"[1-4] goes/);
});

it('Challenge ignores ordinary no-op taps before they reach the host', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const { ChallengeBoard } = await import('../src/learn/games/logic-lagoon/challenge-view');
  const { challengeEngine } = await import('../src/learn/games/logic-lagoon/challenge-engine');
  const { puzzles } = await import('../src/learn/games/logic-lagoon/challenge');
  const descriptor = puzzles[0].descriptor, s = challengeEngine.create(descriptor, { version: 1 }, { supportOff: false, ownRead: false });
  const dispatch = vi.fn();
  await act(async () => { screen = create(<ChallengeBoard state={s} dispatch={dispatch} active width={337}/>); });
  const board = screen!.root.findByType(LagoonGrid);
  board.props.dispatch({ type: 'select', cell: s.grid.selected });
  const given = descriptor.puzzle.givens.findIndex(Boolean);
  board.props.dispatch({ type: 'write', cells: [given], value: 1 });
  expect(dispatch).not.toHaveBeenCalled();
});

it('Hint availability on a full Challenge grid does not signal whether it is correct', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const { puzzles } = await import('../src/learn/games/logic-lagoon/challenge');
  const { search } = await import('../src/puzzles/latin/solver');
  const p = puzzles.find(p => p.tier === 4)!.descriptor.puzzle;
  const s = { version: 2 as const, catalog: 1 as const, level: 4, seed: 17, index: 0, total: 4 as const, board: null, helped: false };
  const grid = { ...boardAt(s, p), values: search(p, 1).first! };
  const draw = (wrong: boolean) => <LagoonGrid puzzle={p} state={{ ...grid, values: wrong ? grid.values.map(v => v % 6 + 1) : grid.values }} assisted={false} dispatch={() => {}} help={() => {}} reveal={() => {}} check={() => {}} title="Full grid" active width={337}/>;
  for (const wrong of [false, true]) {
    await act(async () => { if (screen) screen.update(draw(wrong)); else screen = create(draw(wrong)); });
    const hint = screen!.root.findAllByType('button').find(n => n.children.join('') === 'Hint')!;
    expect(hint.props.disabled).toBe(false);
  }
});
